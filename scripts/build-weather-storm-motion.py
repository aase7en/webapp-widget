#!/usr/bin/env python3
"""Rebuild four transparent Luxury weather APNG sprites (128x128, 96x50 ms).

Procedural source is deterministic. Never read or change environmental data.
Run: python3 scripts/build-weather-storm-motion.py
Requires Pillow. Original repo weather scene WebP and all other condition sprites stay intact.
"""
from __future__ import annotations

from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "v2" / "weather-assets"
SIZE = 128
SCALE = 2
HI = SIZE * SCALE
FRAMES = 96
FRAME_MS = 50
TAU = math.tau

def rgba():
    return Image.new("RGBA", (HI, HI), (0, 0, 0, 0))

def ellipse(draw, bounds, fill, outline=None, width=1):
    draw.ellipse(tuple(int(v * SCALE) for v in bounds), fill=fill, outline=outline,
                 width=width * SCALE)

def stroke(draw, points, color, width=2, joint="curve"):
    draw.line([(round(x * SCALE), round(y * SCALE)) for x, y in points],
              fill=color, width=max(1, round(width * SCALE)), joint=joint)

def silhouette():
    # Contiguous swollen cloud, deliberately taller than the old flat 3D sprite.
    mask = Image.new("L", (HI, HI), 0)
    d = ImageDraw.Draw(mask)
    ellipses = [
        (21, 53, 113, 79), (24, 46, 65, 75), (33, 40, 75, 76),
        (45, 31, 88, 73), (68, 36, 106, 74), (85, 47, 114, 76),
        (29, 58, 108, 83), (45, 53, 93, 83),
    ]
    for bounds in ellipses:
        ellipse(d, bounds, 255)
    return mask

MASK = silhouette()

def make_cloud(night=False):
    # Storm clouds are slate-grey (especially at night), not background-blue.
    # Keep shaded crests and a luminous high-contrast rim at native LED size.
    top, bottom = ((92, 103, 121), (22, 28, 42)) if night else ((103, 135, 175), (31, 49, 78))
    pixels = Image.new("RGBA", (HI, HI))
    colors = []
    for y in range(HI):
        for x in range(HI):
            px, py = x / SCALE, y / SCALE
            t = max(0.0, min(1.0, (py - 30) / 56))
            fold = .14 * math.sin(px * .17 + py * .12) + .09 * math.sin(px * .43 - py * .21)
            glint = .18 * math.exp(-((px - 51) ** 2 / 700 + (py - 42) ** 2 / 135))
            f = max(0., min(1., 1. - t * .83 + fold + glint))
            colors.append(tuple(int(bottom[c] + (top[c] - bottom[c]) * f) for c in range(3)) + (255,))
    pixels.putdata(colors)
    pixels.putalpha(MASK)
    # White outside stroke survives the 128px sprite downscale and dark sky.
    edge = ImageChops.subtract(MASK.filter(ImageFilter.MaxFilter(9)), MASK)
    edge_layer = Image.new("RGBA", (HI, HI), (251, 254, 255, 0))
    edge_layer.putalpha(edge.point(lambda a: min(235, int(a * .92))))
    result = rgba()
    result.alpha_composite(edge_layer)
    result.alpha_composite(pixels)
    d = ImageDraw.Draw(result, "RGBA")
    # Puffy curved highlight crests and dimensional face details.
    for box, color, width in [
        ((29, 44, 64, 70), (175, 220, 255, 125), 1),
        ((48, 34, 86, 71), (205, 231, 255, 175), 1),
        ((74, 42, 105, 70), (156, 213, 255, 120), 1),
    ]:
        d.arc(tuple(round(v * SCALE) for v in box), 197, 335, fill=color, width=width * SCALE)
    stroke(d, [(30, 74), (50, 77), (80, 78), (108, 73)], (11, 28, 73, 155), 2)
    stroke(d, [(36, 70), (56, 73), (90, 72)], (111, 175, 248, 110), 1)
    return result

CLOUD_DAY = make_cloud()
CLOUD_NIGHT = make_cloud(night=True)

def moon_layer():
    m = rgba()
    d = ImageDraw.Draw(m, "RGBA")
    for rad, alpha in [(25, 10), (21, 20), (18, 30)]:
        ellipse(d, (62-rad, 30-rad, 62+rad, 30+rad), (250, 191, 80, alpha))
    ellipse(d, (48, 15, 76, 43), (251, 216, 124, 255),
            (255, 241, 180, 230), width=1)
    ellipse(d, (51, 18, 73, 40), (255, 236, 176, 225))
    # A clean luminous disc reads better than small dark crater marks on LED.
    return m

MOON = moon_layer()

def rainfall_layer(frame, storm=False):
    layer = rgba()
    d = ImageDraw.Draw(layer, "RGBA")
    # Pixel-snapped streaks; 96-frame circular paths ensure a seamless loop.
    for i in range(27 if storm else 23):
        col = i % 10
        row = i // 10
        seed_x = 26 + ((i * 41 + 13) % 77)
        drift = 2.2 * math.sin(TAU * frame / FRAMES + i * .37)
        x = seed_x + drift + (3 if storm else 0)
        speed = [2, 3, 4, 4, 5][i % 5]
        y = 75 + ((i * 17 + row * 7 + frame * speed) % 49)
        # Small, medium, large mixed; larger drops flash a clear aqua-white head.
        typ = i % 7
        wide = 4.0 if typ in (0, 5) else (2.6 if typ in (1, 3, 6) else 1.45)
        length = 10 if typ in (0, 5) else (7 if typ in (1, 3, 6) else 4)
        alpha = 255 if typ in (0, 1, 5) else (218 if typ in (3, 6) else 165)
        color = (111, 231, 255, alpha) if typ in (0, 1, 3, 5) else (32, 178, 247, alpha)
        if wide > 2:
            stroke(d, [(x - .5, y), (x - 2, y + length)], (9, 93, 212, 95), wide + 2)
        stroke(d, [(x, y), (x - 1.5, y + length)], color, wide)
        if wide > 2:
            ellipse(d, (x - 1.4, y - 1.3, x + 1.4, y + 1.3), (226, 252, 255, 245))
    return layer

def lightning_level(frame):
    # Shared phase for bolt AND cloud illumination: no unsynchronised strobe.
    bursts = ((10, 15), (33, 39), (62, 68), (83, 87))
    level = 0.
    for a, b in bursts:
        if a <= frame <= b:
            t = (frame - a) / max(1, b - a)
            level = max(level, math.sin(math.pi * t) ** .45)
    return level

def lightning_layer(frame, dark=False):
    # Stronger but localized branched bolt, synchronized to cloud glow.
    level = lightning_level(frame)
    layer = rgba()
    if level <= 0:
        return layer
    bolt = [(79, 68), (63, 94), (76, 94), (54, 124), (61, 100),
            (51, 100), (69, 68)]
    soft = rgba()
    brush = ImageDraw.Draw(soft, "RGBA")
    stroke(brush, bolt, (70, 189, 255, round(240 * level)), 15)
    soft = soft.filter(ImageFilter.GaussianBlur(5.2 * SCALE))
    layer.alpha_composite(soft)
    brush = ImageDraw.Draw(layer, "RGBA")
    stroke(brush, bolt, (43, 175, 255, round(245 * level)), 9)
    stroke(brush, bolt, (255, 214, 96, round(255 * level)), 6)
    stroke(brush, bolt, (255, 254, 242, round(255 * level)), 3.2)
    # Angled branch to explicitly convey thunderstorm.
    stroke(brush, [(65, 94), (88, 103), (83, 119)], (255, 235, 155, round(245 * level)), 3.5)
    return layer

def wind_layer(frame):
    l = rgba()
    d = ImageDraw.Draw(l, "RGBA")
    shift = 8 * math.sin(TAU * frame / FRAMES)
    for n, y in enumerate((62, 70, 82)):
        x = 11 + shift + n * 3
        stroke(d, [(x, y), (x + 18, y - 2), (x + 31, y - 2)], (133, 218, 255, 180 - 25*n), 1.7)
    return l

def frame_image(frame, kind):
    night = kind.startswith("night-")
    storm = "thunderstorm" in kind
    img = rgba()
    if night:
        img.alpha_composite(MOON)
    # Gentle 1px bob only, keeping the cloud broadly centered at LED scale.
    delta = round(math.sin(TAU * frame / FRAMES) * SCALE)
    cloud = CLOUD_NIGHT if night else CLOUD_DAY
    flash = lightning_level(frame) if storm else 0.
    if flash:
        # Illuminate cloud mass only during visible lightning frames.
        aura = Image.new("RGBA", (HI, HI), (175, 226, 255, 0))
        aura.putalpha(MASK.filter(ImageFilter.GaussianBlur(7 * SCALE)).point(
            lambda a: round(a * .28 * flash)))
        img.alpha_composite(aura, (0, delta))
        lit = Image.new("RGBA", (HI, HI), (223, 242, 255, 0))
        lit.putalpha(MASK.point(lambda a: round(a * .72 * flash)))
        cloud = Image.alpha_composite(cloud, lit)
    img.alpha_composite(cloud, (0, delta))
    if storm:
        img.alpha_composite(wind_layer(frame))
    img.alpha_composite(rainfall_layer(frame, storm))
    if storm:
        img.alpha_composite(lightning_layer(frame, night))
    return img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for kind in ("rain", "thunderstorm", "night-rain", "night-thunderstorm"):
        frames = [frame_image(i,kind) for i in range(FRAMES)]
        # Full-frame SOURCE replacement on each frame; transparency maintained.
        apng = OUT / (kind + ".apng")
        frames[0].save(apng, save_all=True, append_images=frames[1:],
                       duration=[FRAME_MS] * FRAMES, loop=0, disposal=0, blend=0,
                       optimize=True)
        poster = OUT / (kind + "-led-poster.png")
        frames[12 if "thunderstorm" in kind else 0].save(poster)
        with Image.open(apng) as verify:
            assert verify.n_frames == FRAMES, (kind, verify.n_frames)
            assert verify.size == (SIZE, SIZE)
        print(f"{kind}: {FRAMES} frames x {FRAME_MS}ms, transparent 128px; {apng.stat().st_size} bytes")

if __name__ == "__main__":
    main()
