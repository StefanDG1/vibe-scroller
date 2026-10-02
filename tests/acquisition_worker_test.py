"""Linux worker boundary tests. Never contact a source or inference provider."""
import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('acquire', pathlib.Path(__file__).parents[1] / 'packages/media/acquire.py')
worker = importlib.util.module_from_spec(spec)
if sys.platform != 'win32':
    spec.loader.exec_module(worker)


@unittest.skipIf(sys.platform == 'win32', 'Acquisition executes in the verified Linux sandbox.')
class AcquisitionTests(unittest.TestCase):
    def test_output_overflow_and_timeout_kill_the_child(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(worker, 'ROOT', pathlib.Path(directory)):
            with self.assertRaises(ValueError):
                worker.bounded_run([sys.executable, '-c', 'print("x" * 100000)'], 2, 1000)
            with self.assertRaises(TimeoutError):
                worker.bounded_run([sys.executable, '-c', 'import time; time.sleep(2)'], 0.1)

    def test_provider_blocks_are_not_retried_or_replaced_by_a_success(self):
        for diagnostic, expected in [(b'HTTP Error 429: Too Many Requests', 'rate_limited'),
                                     (b'Please login with cookies', 'needs_auth'),
                                     (b'Private video HTTP 403', 'unavailable')]:
            with patch.object(worker, 'bounded_run', return_value=(1, b'null', diagnostic)) as call:
                self.assertEqual(worker.acquire('https://instagram.com/reel/Synthetic123/')['status'], expected)
                self.assertEqual(call.call_count, 1)

    def test_over_limit_unknown_duration_and_carousel_do_not_download(self):
        for info, expected in [({'duration': 601}, 'over_limit'), ({'duration': None}, 'unsupported'),
                               ({'_type': 'playlist', 'duration': 8, 'entries': []}, 'unsupported')]:
            with patch.object(worker, 'bounded_run', return_value=(0, json.dumps(info).encode(), b'')) as call:
                self.assertEqual(worker.acquire('https://instagram.com/reel/Synthetic123/')['status'], expected)
                self.assertEqual(call.call_count, 1)

    def test_one_download_exit_code_requires_a_real_bounded_file(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(worker, 'ROOT', pathlib.Path(directory)):
            info = {'duration': 8, 'title': 'Owned sample', 'description': 'Source data', 'extractor_key': 'Fixture'}
            def run(args, *unused):
                self.assertIsInstance(args, list)
                self.assertNotIn('--cookies', args)
                self.assertIn('--no-plugin-dirs', args)
                self.assertEqual(args[-2:], ['--', 'https://instagram.com/reel/Synthetic123/'])
                if '--dump-single-json' in args:
                    return 101, json.dumps(info).encode(), b''
                (worker.ROOT / 'input').write_bytes(b'owned fixture bytes')
                return 101, b'', b''
            with patch.object(worker, 'bounded_run', side_effect=run):
                result = worker.acquire('https://instagram.com/reel/Synthetic123/')
            self.assertEqual(result['status'], 'acquired')
            self.assertEqual(result['byteLength'], 19)

    def test_untrusted_locations_do_not_invoke_the_downloader(self):
        with patch.object(worker, 'bounded_run') as call:
            for url in ['file:///etc/shadow', 'http://127.0.0.1:80/', 'https://instagram.com/']:
                self.assertEqual(worker.acquire(url)['status'], 'unsupported')
            call.assert_not_called()


if __name__ == '__main__':
    unittest.main()
