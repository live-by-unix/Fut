#!/usr/bin/env python3
"""Generates build/icon.png — the app icon used by electron-builder."""
import os
from PIL import Image, ImageDraw, ImageFont

SIZE = 1024
OUT = os.path.join(os.path.dirname(__file__), "..", "build", "icon.png")

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Rounded square background with a vertical gradient (accent purple).
radius = 220
top = (139, 124, 246)
bottom = (99, 84, 206)
grad = Image.new("RGB", (1, SIZE))
for y in range(SIZE):
    t = y / (SIZE - 1)
    grad.putpixel(
        (0, y),
        tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)),
    )
grad = grad.resize((SIZE, SIZE))

mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=radius, fill=255)
img.paste(grad, (0, 0), mask)

# Letter "F".
font = None
for path in [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]:
    if os.path.exists(path):
        font = ImageFont.truetype(path, 620)
        break
if font is None:
    font = ImageFont.load_default()

text = "F"
bbox = draw.textbbox((0, 0), text, font=font)
w = bbox[2] - bbox[0]
h = bbox[3] - bbox[1]
draw.text(
    ((SIZE - w) / 2 - bbox[0], (SIZE - h) / 2 - bbox[1] - 30),
    text,
    font=font,
    fill=(255, 255, 255, 255),
)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT)
print("wrote", os.path.abspath(OUT))
