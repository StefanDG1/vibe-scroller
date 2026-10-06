# Label untimed source images without video timecodes

Mode: reference. Decision October 6, 2026. Status: implementation candidate.

Two actual recovered carousels contain ten and seven images. Their valid frame references use zero as an untimed placeholder and have visual-only coverage. The evidence UI nevertheless described them as video frames at zero seconds. That copy implies a video timeline the images do not have.

For visual-only sources with multiple saved frames whose timestamps are all zero, show numbered images in source evidence, links and the viewer. Use image navigation and alternatives for assistive technology. Retain timecodes for timed media and single-frame cases where an untimed inference cannot be established. No source, evidence, correction, asset authorization or serialized timestamp is rewritten.

The conservative display rule fixes demonstrated carousel behavior without claiming that older simulated slides or every possible still-image format have explicit media-kind metadata. Verify the real recovered carousels on mobile and desktop, including image navigation and focus restoration. Existing evidence access and failure states remain required.
