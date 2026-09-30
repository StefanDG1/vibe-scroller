"""Regenerate the committed static social card (development-only Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
target = root / "apps" / "starter" / "public" / "social-card.png"
canvas = Image.new("RGB", (1200, 630), "#0b1430")
draw = ImageDraw.Draw(canvas)
def font(size, bold=False):
    candidates = [Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf"), Path("/usr/share/fonts/truetype/dejavu") / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default(size=size)

draw.rounded_rectangle((56, 50, 100, 94), radius=12, fill="#4478ff")
draw.line([(68, 79), (79, 68), (88, 74), (92, 62)], fill="white", width=3)
draw.text((118, 51), "VibeScroller", font=font(32, True), fill="white")
draw.text((58, 142), "Make scrolling", font=font(78, True), fill="white")
draw.text((58, 231), "productive.", font=font(78, True), fill="#81a6ff")
draw.text((62, 339), "Turn saved videos into changes worth building.", font=font(30), fill="#d0d9ef")
labels = ["Saved video", "Evidence", "Project match", "Reviewed plan", "Draft PR"]
for i, label in enumerate(labels):
    x = 62 + i * 224
    draw.rounded_rectangle((x, 438, x + 202, 505), radius=12, fill="#172748", outline="#354b7c", width=2)
    bounds = draw.textbbox((0, 0), label, font=font(21, True))
    draw.text((x + (202 - (bounds[2] - bounds[0])) / 2, 455), label, font=font(21, True), fill="white")
    if i < 4:
        draw.text((x + 208, 456), "›", font=font(23), fill="#81a6ff")
draw.text((62, 555), "scroll.companynerve.com", font=font(24), fill="#a7b8d9")
target.parent.mkdir(parents=True, exist_ok=True)
canvas.save(target, optimize=True)
print(f"Created {target.name}: 1200 x 630")
