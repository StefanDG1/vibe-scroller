# Optional Moondream vision route

Mode: explanation. Status: adapter implemented, disabled pending operator licensing and free-unit quote verification. Recorded 2026-09-30.

The staged Llama vision request currently fails its provider license requirement. VibeScroller correctly reports audio-only coverage. A failed visual request never becomes fabricated visual evidence and never switches to a paid route.

Cloudflare documents [Moondream 3.1](https://developers.cloudflare.com/workers-ai/models/moondream3.1-9B-A2B/) as an image-to-text endpoint with a query task, image data URI and an answer field. Its model is governed by [Moondream Model License 1.0](https://moondream.ai/licenses/model/1.0), effective July 7, 2026. Domain-specific commercial applications are permitted subject to its conditions. General-purpose hosted model services are restricted. Using the model accepts the license and represents authority to bind the organization. No owner acceptance or legal review is claimed.

The adapter asks only for visible observations with uncertainty, disables reasoning output, caps the image at one million bytes and output at 400 tokens, and reads only the answer field. Existing output credential detection and private evidence ownership validation still apply. The selected vision model is included in the media stage fingerprint, preventing reuse across a model change.

Activation requires `VISION_MODEL=@cf/moondream/moondream3.1-9B-A2B`, the exact `MOONDREAM_LICENSE_ACCEPTED_VERSION=model/1.0`, named authorized acceptance and timestamp, and `MOONDREAM_QUOTE_VERIFIED=true`. The last flag requires verification of the 650-neuron bounded request ceiling against the actual provider contract. It must not be set solely because a unit test passes. The selected free-plan and operator daily budget checks remain mandatory. Operator records belong in reviewed configuration, not secrets or user content.

Two unit cases check the pre-request license/setup rejection, unsupported model rejection, image bound and documented query/answer mapping. No request has been sent to Moondream. Real audiovisual evaluation remains an external staging gate.
