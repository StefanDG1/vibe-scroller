"""Boundary tests for local normalized audio; no model or provider call."""
import importlib.util
import json
import struct
import tempfile
import unittest
import wave
from pathlib import Path

spec = importlib.util.spec_from_file_location("local_whisper", Path(__file__).parents[1] / "packages/media/local_whisper.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PCMTests(unittest.TestCase):
    def test_normalized_audio_and_digest(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "audio.wav"
            with wave.open(str(path), "wb") as output:
                output.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
                output.writeframes(struct.pack("<h", 10) * 16000)
            pcm, duration, digest = module.normalized_pcm(path)
            self.assertEqual((len(pcm), duration, len(digest)), (32000, 1, 64))

    def test_other_rates_and_truncation_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "audio.wav"
            with wave.open(str(path), "wb") as output:
                output.setparams((1, 2, 44100, 0, "NONE", "not compressed"))
                output.writeframes(b"\0\0" * 44100)
            with self.assertRaisesRegex(ValueError, "NORMALIZED_PCM_REQUIRED"):
                module.normalized_pcm(path)
            data = bytearray(path.read_bytes())
            data[24:28] = struct.pack("<I", 16000)
            path.write_bytes(data[:-100])
            with self.assertRaisesRegex(ValueError, "TRUNCATED_INPUT"):
                module.normalized_pcm(path)

    def test_empty_missing_and_oversized_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "audio.wav"
            with self.assertRaisesRegex(ValueError, "INPUT_INVALID"):
                module.normalized_pcm(path)
            path.write_bytes(b"")
            with self.assertRaisesRegex(ValueError, "INPUT_LIMIT"):
                module.normalized_pcm(path)
            with path.open("wb") as output:
                output.truncate(19_500_001)
            with self.assertRaisesRegex(ValueError, "INPUT_LIMIT"):
                module.normalized_pcm(path)

    def test_untrusted_weight_manifest_and_changed_weights_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            manifest = {"repository": "Systran/faster-whisper-small.en", "revision": "a" * 40,
                        "files": {"model.bin": "0" * 64, "config.json": "0" * 64, "tokenizer.json": "0" * 64}}
            for name in manifest["files"]:
                (path / name).write_bytes(b"synthetic test data")
            (path / "vibescroller-model.json").write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, "MODEL_CHANGED"):
                module.verify_model(path)
            manifest["files"]["../outside.bin"] = "0" * 64
            (path / "vibescroller-model.json").write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, "MODEL_INVALID"):
                module.verify_model(path)


if __name__ == "__main__":
    unittest.main()
