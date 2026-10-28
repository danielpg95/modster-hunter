#!/usr/bin/env python3
"""P5-39 spike: builds the test Svgs the art-spike mod shows in the Desktop Code tab.

Reads tidecrown-source.jpg (upscaled pixel art, about 9 screen px per art pixel),
samples it back to its grid (144x91) and to 96x64, makes a 4-frame idle (a 2 px
bob, so frame changes are easy to see) and writes mod/hooks/variants.ts: one
entry per way of drawing it. Run with: python3 make-variants.py
"""
import base64
import io
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
LIMIT = 131072  # the Svg source limit (0042)
FPS = 4
BOB = [0, 1, 2, 1]
BG_TOLERANCE = 60


def art(width, height=None):
    src = Image.open(HERE / 'tidecrown-source.jpg').convert('RGB')
    grid = src.resize((144, 91), Image.NEAREST)
    # JPEG noise makes the grey background many greys: clear everything near it
    bg = grid.getpixel((0, 0))
    rgba = grid.convert('RGBA')
    px = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = px[x, y]
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) < BG_TOLERANCE:
                px[x, y] = (0, 0, 0, 0)
    if width != 144:
        rgba = rgba.resize((width, height), Image.LANCZOS)
        px = rgba.load()
        for y in range(rgba.height):
            for x in range(rgba.width):
                r, g, b, a = px[x, y]
                px[x, y] = (r, g, b, 255 if a >= 128 else 0)
    return rgba


def frames(base):
    out = []
    for dy in BOB:
        canvas = Image.new('RGBA', (base.width, base.height + max(BOB)), (0, 0, 0, 0))
        canvas.paste(base, (0, dy))
        out.append(canvas)
    return out


def png(img):
    # Palette PNG (pixel art has few colours): several times smaller than RGBA
    buf = io.BytesIO()
    img.quantize(colors=32, method=Image.Quantize.FASTOCTREE).save(buf, 'PNG', optimize=True)
    return base64.b64encode(buf.getvalue()).decode()


def apng(imgs):
    buf = io.BytesIO()
    imgs[0].save(buf, format='PNG', save_all=True, append_images=imgs[1:], duration=int(1000 / FPS), loop=0, disposal=1)
    return base64.b64encode(buf.getvalue()).decode()


def sheet(imgs):
    w, h = imgs[0].size
    out = Image.new('RGBA', (w * len(imgs), h), (0, 0, 0, 0))
    for i, img in enumerate(imgs):
        out.paste(img, (i * w, 0))
    return out


def paths(img):
    """One <path> per colour, one box per run along a row: how pixelsToSvg draws today."""
    w, h = img.size
    px = img.load()
    runs = {}
    for y in range(h):
        x = 0
        while x < w:
            c = px[x, y]
            e = x + 1
            while e < w and px[e, y] == c:
                e += 1
            if c[3] >= 128:
                key = '#%02x%02x%02x' % c[:3]
                runs[key] = runs.get(key, '') + f'M{x} {y}h{e - x}v1h-{e - x}z'
            x = e
    return ''.join(f'<path fill="{k}" d="{d}"/>' for k, d in runs.items())


PIXELATED = ' image-rendering="pixelated" style="image-rendering:pixelated"'


def image(data, w, h, extra='', crisp=True):
    return f'<image href="data:image/png;base64,{data}" x="0" y="0" width="{w}" height="{h}"{PIXELATED if crisp else ""}{extra}/>'


def svg(w, h, scale, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w * scale}" height="{h * scale}" viewBox="0 0 {w} {h}" shape-rendering="crispEdges">{body}</svg>'


def looped(groups, dur):
    n = len(groups)
    keys = ';'.join(str(round(i / n, 4)) for i in range(n))
    out = ''
    for i, body in enumerate(groups):
        values = ';'.join('visible' if j == i else 'hidden' for j in range(n))
        out += f'<g visibility="{"visible" if i == 0 else "hidden"}"><animate attributeName="visibility" values="{values}" keyTimes="{keys}" calcMode="discrete" dur="{dur}s" repeatCount="indefinite"/>{body}</g>'
    return out


def variants(width, height, scale):
    """Round 2: the Code tab drew embedded PNGs only in image mode (no isInteractive), so every
    variant is drawn that way, with one interactive control."""
    base = art(width, height)
    fs = frames(base)
    w, h = fs[0].size
    dur = len(fs) / FPS
    size = f'{width}x{height}'
    still = png(fs[0])
    # One sheet, moved one frame at a time behind a frame-sized window
    xs = ';'.join(str(-i * w) for i in range(len(fs)))
    keys = ';'.join(str(round(i / len(fs), 4)) for i in range(len(fs)))
    move = f'<animate attributeName="x" values="{xs}" keyTimes="{keys}" calcMode="discrete" dur="{dur}s" repeatCount="indefinite"/>'
    sheet_body = f'<svg x="0" y="0" width="{w}" height="{h}" viewBox="0 0 {w} {h}" overflow="hidden"><image href="data:image/png;base64,{png(sheet(fs))}" x="0" y="0" width="{w * len(fs)}" height="{h}"{PIXELATED}>{move}</image></svg>'
    # Vector motion on a raster: a smooth bob, not frame steps
    bob = f'<g><animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0" dur="{dur}s" repeatCount="indefinite"/>{image(png(base), base.width, base.height)}</g>'
    out = [
        (f'{size} one sprite-sheet PNG, SMIL steps (should bob)', svg(w, h, scale, sheet_body), False),
        (f'{size} 4 PNG frames, SMIL shows one at a time (should bob)', svg(w, h, scale, looped([image(png(f), w, h) for f in fs], dur)), False),
    ]
    if width == 144:
        out += [
            (f'{size} APNG, the PNG animates itself (should bob)', svg(w, h, scale, image(apng(fs), w, h)), False),
            (f'{size} one PNG, smooth SMIL bob (should glide)', svg(w, h, scale, bob), False),
            (f'{size} PNG, still', svg(w, h, scale, image(still, w, h)), False),
            (f'{size} PNG, still, no pixelated hint (may look blurry)', svg(w, h, scale, image(still, w, h, crisp=False)), False),
            (f'{size} paths, still (how 0042 draws today)', svg(w, h, scale, paths(fs[0])), False),
            (f'{size} control: PNG, still, isInteractive (was blank)', svg(w, h, scale, image(still, w, h)), True),
        ]
    return out


def main():
    rows = []
    for width, height, scale in [(144, 91, 2), (96, 64, 3)]:
        for label, source, interactive in variants(width, height, scale):
            fits = len(source) <= LIMIT
            rows.append({'label': label, 'chars': len(source), 'source': source if fits else '', 'interactive': interactive})
            print(f'{len(source):>8}  {"" if fits else "OVER "}{label}')
    ts = '// Generated by make-variants.py (P5-39 spike); do not edit.\n'
    ts += 'export const VARIANTS: { label: string; chars: number; source: string; interactive: boolean }[] = '
    ts += json.dumps(rows) + '\n'
    (HERE / 'mod' / 'hooks' / 'variants.ts').write_text(ts)
    # A preview page for a browser, with every variant
    page = '<!doctype html><meta charset=utf-8><title>P5-39 variants</title><body style="background:#1e1e1e;color:#ccc;font:12px sans-serif">'
    for i, r in enumerate(rows):
        page += f'<p>{chr(65 + i)}. {r["label"]} · {r["chars"]} chars</p>{r["source"]}'
    (HERE / 'preview.html').write_text(page)


if __name__ == '__main__':
    main()
