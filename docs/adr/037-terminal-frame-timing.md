# Exclude rounded terminal frame candidates

Mode: reference. Decision date: October 3, 2026. WP07, WP08 and WP17 apply.

The exact twelve-second authored clip decoded successfully, but FFmpeg's FPS filter generated a final candidate at 12,250 ms while the probed duration was 12.166667 seconds. The strict application manifest correctly rejected that candidate. This was a decoder selection defect, not an inference failure or unavailable upload.

Both managed MP3 and personal PCM decoders now exclude candidates whose sampled time is at or after the actual source duration before selecting change frames or the last periodic frame. They keep the final valid candidate. The timestamp contract is unchanged, and no out-of-range timestamp is clamped to a fabricated valid position. Decoder hashes invalidate earlier extraction caches.

Three portable tests exercise the actual selection function from both decoders: the reproduced non-integer duration, exact-duration boundary, very short clips, missing images and invalid timing. The same owned shortened file passed actual production-selected isolated decoding after the correction; its prior manifest failure remains in the implementation record. Automatic full analysis and processing receipt acceptance are separate next checks.
