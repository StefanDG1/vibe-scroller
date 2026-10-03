"""Personal route: normalized PCM and bounded frames in the isolated sandbox."""
import json, subprocess, pathlib, resource, hashlib
from PIL import Image, ImageChops, ImageStat
root = pathlib.Path('/home/user/media')
def bounded_candidates(paths, duration, step_ms):
    assert duration > 0 and step_ms > 0
    # FFmpeg's FPS rounding can emit a terminal image after the source ends.
    return [path for index, path in enumerate(paths) if index * step_ms < duration * 1000]
resource.setrlimit(resource.RLIMIT_FSIZE, (300_000_000, 300_000_000))
resource.setrlimit(resource.RLIMIT_CPU, (180, 180))
source = root / 'input'
assert source.is_file() and not source.is_symlink() and source.stat().st_size <= 250_000_000
def run(args, timeout=60):
    return subprocess.run(args, check=True, capture_output=True, timeout=timeout, cwd=root)
extra_audio = root / 'audio-input'
if extra_audio.exists():
    assert extra_audio.is_file() and not extra_audio.is_symlink()
    assert source.stat().st_size + extra_audio.stat().st_size <= 250_000_000
    combined = root / 'combined-input'
    run(['ffmpeg','-nostdin','-threads','2','-protocol_whitelist','file','-i',str(source),
         '-protocol_whitelist','file','-i',str(extra_audio),'-map','0:v:0','-map','1:a:0',
         '-c','copy','-t','601','-f','matroska',str(combined)],45)
    assert combined.is_file() and combined.stat().st_size <= 250_000_000
    source = combined
probe = json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(source)],15).stdout)
duration = float(probe['format'].get('duration', 0))
assert 0 < duration <= 600
streams = probe['streams']
assert len(streams) <= 4
video = [s for s in streams if s['codec_type']=='video']
audio = [s for s in streams if s['codec_type']=='audio']
assert len(video) <= 1 and len(audio) <= 2
for s in video:
    assert s['width'] <= 4096 and s['height'] <= 4096
assert video or audio
manifest = {'durationSeconds':duration,'frames':[],'coverage':'full_sampled' if video and audio else 'audio_only' if audio else 'visual_only'}
if audio:
    run(['ffmpeg','-nostdin','-threads','2','-i',str(source),'-vn','-t','600','-ac','1','-ar','16000','-c:a','pcm_s16le','-f','wav',str(root/'audio.wav')],120)
    manifest['audio']='audio.wav'
    assert (root/'audio.wav').stat().st_size <= 19_500_000
if video:
    # Dense candidates catch fast cuts. Work remains bounded to 600 small images
    # and 48 full-size frames; these are samples, not exhaustive scene coverage.
    fps = 4 if duration <= 90 else 2 if duration <= 300 else 1
    step_ms = 1000 // fps
    run(['ffmpeg','-nostdin','-threads','2','-i',str(source),'-vf',f'fps={fps},scale=160:-2',
         '-frames:v','600','-q:v','8',str(root/'candidate-%03d.jpg')],90)
    candidates = bounded_candidates(sorted(root.glob('candidate-*.jpg')), duration, step_ms)
    changes, previous = [], None
    for index, path in enumerate(candidates):
        with Image.open(path) as image:
            current = image.convert('L')
            if previous is not None:
                score = ImageStat.Stat(ImageChops.difference(previous, current)).mean[0]
                if score >= 2: changes.append((score, index * step_ms))
            previous = current.copy()
    count=min(16,max(2,int(duration/2)))
    selected = {int(duration*i/count*1000): 'periodic sample' for i in range(count)}
    if candidates:
        selected[(len(candidates)-1) * step_ms] = 'periodic sample'
    for score, ms in sorted(changes, reverse=True):
        if len(selected) >= 48: break
        if not any(abs(ms - old) < step_ms for old in selected):
            selected[ms] = 'visible change within sampled frames'
    for i, (ms, reason) in enumerate(sorted(selected.items())):
        name=f'frame-{i:03}.jpg'
        run(['ffmpeg','-nostdin','-threads','2','-ss',str(ms/1000),'-i',str(source),'-frames:v','1','-vf','scale=960:-2','-q:v','4',str(root/name)],15)
        manifest['frames'].append({'id':name,'timestampMs':ms,'selectionReason':reason})
(root/'manifest.json').write_text(json.dumps(manifest))
