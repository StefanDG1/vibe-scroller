"""Bounded public-media retrieval. Runs without credentials in an isolated worker."""
import json
import math
import os
import pathlib
import resource
import selectors
import signal
import subprocess
import time
import urllib.parse

VERSION = '2026.08.19'
MAX_BYTES = 250_000_000
ROOT = pathlib.Path('/home/user/media')
BINARY = '/usr/local/bin/yt-dlp'


def allowed_url(raw):
    import re
    url = urllib.parse.urlsplit(raw)
    host = (url.hostname or '').removeprefix('www.')
    if url.scheme != 'https' or url.username or url.password or url.port not in (None, 443):
        return False
    paths = {
        'instagram.com': r'/(p|reel|reels)/[A-Za-z0-9_-]{5,30}/?',
        'vimeo.com': r'/[0-9]{5,15}/?',
        'tiktok.com': r'/@[A-Za-z0-9_.]{1,40}/video/[0-9]{10,25}/?',
        'vm.tiktok.com': r'/[A-Za-z0-9]{5,30}/?',
        'youtu.be': r'/[A-Za-z0-9_-]{11}/?',
    }
    if host == 'youtube.com':
        return bool(re.fullmatch(r'/(shorts|embed)/[A-Za-z0-9_-]{11}/?', url.path) or
                    url.path == '/watch' and re.fullmatch(r'[A-Za-z0-9_-]{11}',
                    urllib.parse.parse_qs(url.query).get('v', [''])[0]))
    return host in paths and bool(re.fullmatch(paths[host], url.path))


def child_limits():
    resource.setrlimit(resource.RLIMIT_CPU, (70, 70))
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_BYTES, MAX_BYTES))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    resource.setrlimit(resource.RLIMIT_AS, (1_500_000_000, 1_500_000_000))


def bounded_run(args, timeout, stdout_limit=1_000_000):
    # Drain both pipes concurrently and stop before diagnostics can fill memory.
    # Child output is untrusted and is never exposed to users or provider logs.
    proc = subprocess.Popen(args, cwd=ROOT, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, start_new_session=True,
                            preexec_fn=child_limits,
                            env={'PATH': '/usr/bin:/bin', 'HOME': '/home/user',
                                 'LANG': 'C.UTF-8', 'SSL_CERT_FILE': '/etc/ssl/certs/ca-certificates.crt'})
    buffers = {'out': bytearray(), 'err': bytearray()}
    selector = selectors.DefaultSelector()
    selector.register(proc.stdout, selectors.EVENT_READ, 'out')
    selector.register(proc.stderr, selectors.EVENT_READ, 'err')
    deadline = time.monotonic() + timeout
    try:
        while selector.get_map():
            if time.monotonic() >= deadline:
                raise TimeoutError('retrieval deadline')
            for key, _ in selector.select(min(0.2, max(0, deadline - time.monotonic()))):
                chunk = os.read(key.fileobj.fileno(), 8192)
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                buffers[key.data].extend(chunk)
                cap = stdout_limit if key.data == 'out' else 64_000
                if len(buffers[key.data]) > cap:
                    raise ValueError('diagnostic limit')
        code = proc.wait(timeout=max(0.1, deadline - time.monotonic()))
        return code, bytes(buffers['out']), bytes(buffers['err'])
    finally:
        selector.close()
        if proc.poll() is None:
            os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()
        proc.stdout.close()
        proc.stderr.close()


def failure_status(stderr):
    diagnostic = stderr.decode('utf-8', errors='replace').lower()
    if '429' in diagnostic or 'too many requests' in diagnostic:
        return 'rate_limited'
    if any(word in diagnostic for word in ['login', 'sign in', 'authentication', 'cookies', 'age-restricted']):
        return 'needs_auth'
    if any(word in diagnostic for word in ['unsupported url', 'no video formats', 'no video found']):
        return 'unsupported'
    if any(word in diagnostic for word in ['private', 'unavailable', 'not available', 'removed', '404', '403', 'captcha']):
        return 'unavailable'
    return 'failed'


def acquire(raw):
    base = {'schemaVersion': '1.0.0', 'status': 'failed', 'title': '',
            'description': '', 'extractor': '', 'downloaderVersion': VERSION}
    if not allowed_url(raw):
        return {**base, 'status': 'unsupported'}
    common = [BINARY, '--ignore-config', '--no-plugin-dirs', '--no-cache-dir',
              '--no-playlist', '--no-warnings', '--no-progress', '--socket-timeout', '10',
              '--retries', '0', '--fragment-retries', '0', '--extractor-retries', '0',
              '--max-filesize', str(MAX_BYTES), '--fixup', 'never',
              '--', raw]
    proxy = os.environ.get('VIBE_DOWNLOAD_PROXY')
    if proxy:
        assert proxy == 'http://127.0.0.1:47891'
        common = common[:-2] + ['--proxy', proxy] + common[-2:]
    code, stdout, stderr = bounded_run(common[:-2] + ['--skip-download', '--dump-single-json'] + common[-2:], 25)
    if code != 0 or not stdout.strip():
        return {**base, 'status': failure_status(stderr)}
    info = json.loads(stdout)
    if info.get('_type') in ('playlist', 'multi_video') or info.get('entries') is not None or info.get('is_live'):
        return {**base, 'status': 'unsupported'}
    duration = info.get('duration')
    if duration is not None and (not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0):
        return {**base, 'status': 'unsupported'}
    if (duration is not None and duration > 600) or (info.get('filesize') or 0) > MAX_BYTES:
        return {**base, 'status': 'over_limit'}
    base.update(title=str(info.get('title') or '')[:160],
                description=str(info.get('description') or '')[:6000],
                extractor=str(info.get('extractor_key') or '')[:80])
    if duration is not None:
        base['durationSeconds'] = duration
    formats = info.get('formats') or []
    video = any(f.get('vcodec') not in (None, 'none') for f in formats)
    audio = any(f.get('acodec') not in (None, 'none') for f in formats)
    if not video and not audio:
        return {**base, 'status': 'unsupported'}
    # Instagram can publish video and audio as separate representations. Fetch
    # each directly, then let the network-disabled decoder combine them. Never
    # invoke a postprocessor while the source-network broker is reachable.
    downloads = [('input', 'bestvideo[height<=?1920][width<=?1920]/best[height<=?1920][width<=?1920][vcodec!=none]' if video else 'bestaudio')]
    if video and audio:
        downloads.append(('audio-input', 'bestaudio/best[acodec!=none]'))
    size = 0
    for name, selection in downloads:
        code, _, stderr = bounded_run(common[:-2] + ['--format', selection, '--output', str(ROOT / name),
                                                     '--max-downloads', '1', '--no-part', '--no-overwrites'] + common[-2:], 40, 64_000)
        path = ROOT / name
        # 101 is only accepted after the exact bounded file exists.
        if code not in (0, 101) or not path.is_file() or path.is_symlink():
            return {**base, 'status': failure_status(stderr)}
        size += path.stat().st_size
    if not 0 < size <= MAX_BYTES:
        return {**base, 'status': 'over_limit'}
    # This is transport evidence only. The caller disables all source networking
    # before measuring duration and decoding; absent platform duration is normal.
    return {**base, 'status': 'downloaded', 'byteLength': size}


if __name__ == '__main__':
    ROOT.mkdir(exist_ok=True)
    result = {'schemaVersion': '1.0.0', 'status': 'failed', 'title': '',
              'description': '', 'extractor': '', 'downloaderVersion': VERSION}
    try:
        request = ROOT / 'request.json'
        assert request.stat().st_size <= 3000 and not request.is_symlink()
        data = json.loads(request.read_text())
        assert set(data) == {'url'} and isinstance(data['url'], str)
        result = acquire(data['url'])
    except (ValueError, AssertionError, TimeoutError, OSError, subprocess.SubprocessError):
        pass
    (ROOT / 'acquisition.json').write_text(json.dumps(result))
