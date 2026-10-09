# Writes realistic PNGs (PIL-encoded, so real filters) and fixtures/cases.json with an FNV-1a hash of each image's RGBA.
# python3 make-fixtures.py
import json, os, random, struct, zlib
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, 'fixtures')
rnd = random.Random(1)


def fnv(data):
    h = 0x811C9DC5
    for b in data:
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def filters_used(path):
    data = open(path, 'rb').read()
    pos, idat, w, h, ct = 8, b'', 0, 0, 0
    while pos < len(data):
        (n,) = struct.unpack('>I', data[pos:pos + 4])
        t = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + n]
        if t == b'IHDR':
            w, h, _, ct = struct.unpack('>IIBB', body[:10])
        if t == b'IDAT':
            idat += body
        pos += 12 + n
    raw = zlib.decompress(idat)
    bpp = {2: 3, 3: 1, 6: 4}[ct]
    stride = w * bpp + 1
    return sorted({raw[y * stride] for y in range(h)})


def sheet(frames=12, size=24):
    im = Image.new('RGBA', (frames * size, size), (0, 0, 0, 0))
    px = im.load()
    r = size * size / 6.4  # radius² of the body; 90 at 24 px
    for f in range(frames):
        cx, cy = f * size + size // 2, size // 2 + (f % 3) - 1
        for y in range(size):
            for x in range(f * size, (f + 1) * size):
                d = (x - cx) ** 2 + (y - cy) ** 2
                if d < r:
                    px[x, y] = (40 + int(d * 180 / r), 160 - int(d * 90 / r), 80 + f * 10, 255)
                elif d < r * 1.25:
                    px[x, y] = (20, 20, 20, 255)
    return im


def palette_with_trns(im, colors):
    # Index 0 is transparent (as Aseprite exports); opaque pixels quantized into the rest
    rgb = im.convert('RGB').quantize(colors=colors - 1, method=Image.Quantize.MEDIANCUT)
    alpha = im.getchannel('A').load()
    idx = rgb.load()
    out = Image.new('P', im.size)
    px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            px[x, y] = 0 if alpha[x, y] < 128 else idx[x, y] + 1
    out.putpalette([0, 0, 0] + rgb.getpalette()[:(colors - 1) * 3])
    return out


cases = []


def save(name, im, **kw):
    path = os.path.join(out, name)
    im.save(path, **kw)
    rgba = Image.open(path).convert('RGBA')
    cases.append({
        'file': name,
        'width': rgba.width,
        'height': rgba.height,
        'hash': fnv(rgba.tobytes()),
        'bytes': os.path.getsize(path),
        'filters': filters_used(path),
    })


s = sheet()
save('sheet-rgba.png', s)
save('sheet-rgb.png', s.convert('RGB'))
save('sheet-palette.png', s.quantize(colors=32, method=Image.Quantize.FASTOCTREE))
# palette with a transparent index (tRNS)
p = palette_with_trns(s, 32)
save('sheet-palette-trns.png', p, transparency=0)

def all_filters_png(im, path):
    # Each row uses filter (y % 5), so None/Sub/Up/Average/Paeth all appear
    w, h, bpp = im.width, im.height, 4
    src = im.tobytes()
    rows = [src[y * w * bpp:(y + 1) * w * bpp] for y in range(h)]
    raw = bytearray()
    for y, row in enumerate(rows):
        f = y % 5
        prev = rows[y - 1] if y else bytes(len(row))
        raw.append(f)
        for i, x in enumerate(row):
            a = row[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            pred = [0, a, b, (a + b) >> 1, a if pa <= pb and pa <= pc else b if pb <= pc else c][f]
            raw.append((x - pred) & 255)

    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))


all_filters_png(s, os.path.join(out, 'sheet-all-filters.png'))
rgba = Image.open(os.path.join(out, 'sheet-all-filters.png')).convert('RGBA')
cases.append({'file': 'sheet-all-filters.png', 'width': rgba.width, 'height': rgba.height, 'hash': fnv(rgba.tobytes()),
              'bytes': os.path.getsize(os.path.join(out, 'sheet-all-filters.png')),
              'filters': filters_used(os.path.join(out, 'sheet-all-filters.png'))})
# 4-bit palette: expected to fail with a readable error
s.quantize(colors=16, method=Image.Quantize.FASTOCTREE).save(os.path.join(out, 'sheet-palette-4bit.png'), bits=4)
cases.append({'file': 'sheet-palette-4bit.png', 'expectError': True})

# 12×12 frames (decision 0001 size), for the visual test in the band
small = sheet(frames=4, size=12)
save('small-rgba.png', small)
save('small-palette-trns.png', palette_with_trns(small, 32), transparency=0)

noise = Image.frombytes('RGBA', (900, 900), bytes(rnd.getrandbits(8) for _ in range(900 * 900 * 4)))
save('big-noise.png', noise)
smooth = Image.linear_gradient('L').resize((2048, 2048)).convert('RGBA')
save('big-smooth.png', smooth)

json.dump(cases, open(os.path.join(out, 'cases.json'), 'w'), indent=1)
for c in cases:
    print(c)
