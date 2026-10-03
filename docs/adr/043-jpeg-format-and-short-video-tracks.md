# ADR 043: Explicit JPEG format and short visual tracks

Status: implemented; production batch acceptance follows deployment. Date: 3 October 2026.

The first owned forty-clip preparation batch failed before inference. Inspection found the authored test renderer had produced one-frame video tracks alongside longer audio. The existing decoder also relied on FFmpeg's implicit JPEG pixel format. The production image's encoder refused non-full-range YUV; the private diagnostic preserved the actual stderr and confirmed teardown. These failed attempts are not passing benchmark observations.

Both managed and personal decoders now explicitly select full-range JPEG pixels and bound output encoder threads. Sampling uses a shorter valid video-stream duration when reported, with the format duration retained for audio. Periodic positions align to the sampling grid, preserving the first real image of a short track without assigning it later invented timestamps. Unknown stream duration uses the existing bounded format-duration fallback. Byte, dimension, time, frame and isolation limits remain unchanged.

The corrected owned renderer uses an explicit CFR filter. Its reference media has a real 13.67-second, 164-frame visual track and 13.65-second audio. Forty corrected private clips total 9.34 minutes; the original batch's failed source records and charges remain separate. No transcript is supplied to app analysis.

The original one-frame-track diagnostic passed with the corrected decoder. The reusable isolated test creates a short visual track with thirteen seconds of audio and exercises both actual decoders: one timestamp-zero JPEG, real MP3/PCM and confirmed worker deletion. Run `pnpm exec vitest run --config private/short-video-live.config.ts -t "short visual tracks"`; the other three unrelated worker tests are explicitly unselected. Evidence is outputs/short-video-both-decoders-live.log. This corner-case acceptance is not a forty-clip quality result.
