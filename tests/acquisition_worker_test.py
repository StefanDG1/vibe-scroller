"""Downloader CLI contract regressions; synthetic data, no network or decoding."""
import ast
import json
import math
import pathlib
import tempfile
import unittest
import urllib.parse
import importlib.util
import sys
from unittest.mock import patch

tree = ast.parse((pathlib.Path(__file__).parents[1] / 'packages/media/acquire.py').read_text())
functions = ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in ('allowed_url', 'failure_status', 'acquire')], type_ignores=[])

class AcquisitionTests(unittest.TestCase):
    def run_case(self, metadata, fail_download=False):
        calls = []
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            def tool(args, timeout, stdout_limit=1000000):
                calls.append(args)
                if '--dump-single-json' in args:
                    # Actual yt-dlp aborts before dumping this single result if
                    # max-downloads=1 is applied to its metadata-only invocation.
                    if '--max-downloads' in args:
                        return 101, b'', b''
                    return 0, json.dumps(metadata).encode(), b''
                if not fail_download:
                    path = pathlib.Path(args[args.index('--output')+1])
                    path.write_bytes(b'synthetic_transport_bytes')
                return 101, b'', b''
            ns = dict(json=json, math=math, pathlib=pathlib, urllib=urllib, ROOT=root, BINARY='synthetic-tool', VERSION='2026.08.19', MAX_BYTES=250000000, bounded_run=tool, os=__import__('os'))
            exec(compile(functions, '<owned acquisition functions>', 'exec'), ns)
            return ns['acquire']('https://www.instagram.com/reel/Synthetic123/'), calls

    def metadata(self, **extra):
        return {'_type':'video','formats':[{'vcodec':'h264','acodec':'none'},{'vcodec':'none','acodec':'aac'}],**extra}

    def test_unknown_duration_and_separate_streams_are_transport_not_verified_analysis(self):
        result,calls=self.run_case(self.metadata())
        self.assertEqual(result['status'],'downloaded')
        self.assertNotIn('durationSeconds',result)
        self.assertEqual(len(calls),3)
        self.assertNotIn('--max-downloads',calls[0])
        self.assertEqual([pathlib.Path(c[c.index('--output')+1]).name for c in calls[1:]],['input','audio-input'])
        for call in calls[1:]:
            self.assertEqual(call[call.index('--max-downloads')+1],'1')
            self.assertEqual(call[call.index('--fixup')+1],'never')

    def test_playlists_live_and_over_limit_are_rejected_before_download(self):
        for metadata in [self.metadata(_type='playlist'), self.metadata(entries=[]), self.metadata(is_live=True), self.metadata(duration=601), self.metadata(filesize=250000001), self.metadata(duration='unknown')]:
            with self.subTest(metadata=metadata):
                result,calls=self.run_case(metadata)
                self.assertIn(result['status'],['unsupported','over_limit'])
                self.assertEqual(len(calls),1)

    def test_download_stop_code_requires_the_exact_file(self):
        result,_=self.run_case(self.metadata(duration=20),fail_download=True)
        self.assertEqual(result['status'],'failed')

    def test_audio_only_input_does_not_invent_a_video_stream(self):
        result,calls=self.run_case({'_type':'video','formats':[{'vcodec':'none','acodec':'aac'}]})
        self.assertEqual(result['status'],'downloaded')
        self.assertEqual(len(calls),2)
        self.assertEqual(calls[1][calls[1].index('--format')+1],'bestaudio')

spec = importlib.util.spec_from_file_location('acquire', pathlib.Path(__file__).parents[1] / 'packages/media/acquire.py')
worker = importlib.util.module_from_spec(spec)
if sys.platform != 'win32':
    spec.loader.exec_module(worker)

@unittest.skipIf(sys.platform == 'win32', 'Subprocess isolation executes in the verified Linux sandbox.')
class LinuxAcquisitionBoundaryTests(unittest.TestCase):
    def test_output_overflow_and_timeout_kill_the_child(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(worker, 'ROOT', pathlib.Path(directory)):
            with self.assertRaises(ValueError):
                worker.bounded_run([sys.executable, '-c', 'print("x" * 100000)'], 2, 1000)
            with self.assertRaises(TimeoutError):
                worker.bounded_run([sys.executable, '-c', 'import time; time.sleep(2)'], 0.1)

    def test_provider_blocks_are_not_retried_or_replaced_by_a_success(self):
        for diagnostic, expected in [(b'HTTP Error 429: Too Many Requests', 'rate_limited'), (b'Please login with cookies', 'needs_auth'), (b'Private video HTTP 403', 'unavailable')]:
            with patch.object(worker, 'bounded_run', return_value=(1, b'null', diagnostic)) as call:
                self.assertEqual(worker.acquire('https://instagram.com/reel/Synthetic123/')['status'], expected)
                self.assertEqual(call.call_count, 1)

    def test_over_limit_absent_formats_and_carousel_do_not_download(self):
        for info, expected in [({'duration': 601}, 'over_limit'), ({'duration': None}, 'unsupported'), ({'_type': 'playlist', 'duration': 8, 'entries': []}, 'unsupported')]:
            with patch.object(worker, 'bounded_run', return_value=(0, json.dumps(info).encode(), b'')) as call:
                self.assertEqual(worker.acquire('https://instagram.com/reel/Synthetic123/')['status'], expected)
                self.assertEqual(call.call_count, 1)

    def test_one_download_exit_code_requires_a_real_bounded_file(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(worker, 'ROOT', pathlib.Path(directory)):
            info = {'duration': 8, 'formats':[{'vcodec':'none','acodec':'aac'}], 'title': 'Owned sample', 'description': 'Source data', 'extractor_key': 'Fixture'}
            def run(args, *unused):
                self.assertIsInstance(args, list)
                self.assertNotIn('--cookies', args)
                self.assertIn('--no-plugin-dirs', args)
                self.assertEqual(args[-2:], ['--', 'https://instagram.com/reel/Synthetic123/'])
                if '--dump-single-json' in args:
                    return 0, json.dumps(info).encode(), b''
                (worker.ROOT / 'input').write_bytes(b'owned fixture bytes')
                return 101, b'', b''
            with patch.object(worker, 'bounded_run', side_effect=run):
                result = worker.acquire('https://instagram.com/reel/Synthetic123/')
            self.assertEqual(result['status'], 'downloaded')
            self.assertEqual(result['byteLength'], 19)

    def test_untrusted_locations_do_not_invoke_the_downloader(self):
        with patch.object(worker, 'bounded_run') as call:
            for url in ['file:///etc/shadow', 'http://127.0.0.1:80/', 'https://instagram.com/']:
                self.assertEqual(worker.acquire(url)['status'], 'unsupported')
            call.assert_not_called()

if __name__=='__main__':unittest.main()
