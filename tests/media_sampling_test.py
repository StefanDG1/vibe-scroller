"""Actual decoder boundary shared by managed MP3 and personal PCM routes."""
import ast
import unittest
from pathlib import Path


def decoder_selection(filename):
    source = ast.parse((Path(__file__).parents[1] / "packages/media" / filename).read_text(encoding="utf-8"))
    function = next(node for node in source.body if isinstance(node, ast.FunctionDef) and node.name == "bounded_candidates")
    scope = {}
    exec(compile(ast.Module(body=[function], type_ignores=[]), filename, "exec"), scope)
    return scope["bounded_candidates"]


class FrameBoundaryTests(unittest.TestCase):
    def test_rounded_terminal_frame_is_excluded_in_both_decoders(self):
        for name in ("decode.py", "decode-personal.py"):
            with self.subTest(decoder=name):
                select = decoder_selection(name)
                frames = list(range(50))
                self.assertEqual(select(frames, 12.166667, 250), list(range(49)))
                self.assertEqual(select(frames, 12, 250), list(range(48)))

    def test_short_clip_keeps_the_real_first_frame(self):
        for name in ("decode.py", "decode-personal.py"):
            self.assertEqual(decoder_selection(name)(["first", "rounded"], .1, 250), ["first"])

    def test_missing_frames_stay_missing_and_invalid_timing_is_refused(self):
        for name in ("decode.py", "decode-personal.py"):
            select = decoder_selection(name)
            self.assertEqual(select([], 12, 250), [])
            for duration, step in ((0, 250), (12, 0), (-1, 250)):
                with self.assertRaises(AssertionError):
                    select(["first"], duration, step)


if __name__ == "__main__":
    unittest.main()
