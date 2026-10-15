"""Stitch tools/out/<prefix>-0..N.png into a grid: python3 tools/stitch.py slash 6 3"""
import struct, sys, zlib

def readpng(path):
    data = open(path, 'rb').read(); pos = 8; idat = b''
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos + 4])[0]; typ = data[pos + 4:pos + 8]; body = data[pos + 8:pos + 8 + ln]; pos += 12 + ln
        if typ == b'IHDR': w, h, bd, ct = struct.unpack('>IIBB', body[:10])
        elif typ == b'IDAT': idat += body
    raw = zlib.decompress(idat); bpp = 4 if ct == 6 else 3; stride = w * bpp; out = bytearray(); prev = bytearray(stride); i = 0
    for y in range(h):
        f = raw[i]; i += 1; line = bytearray(raw[i:i + stride]); i += stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0; b = prev[x]; c = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p_ = a + b - c; pa, pb, pc = abs(p_ - a), abs(p_ - b), abs(p_ - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out += line; prev = line
    return w, h, bpp, out

prefix, n, cols = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
imgs = [readpng(f'tools/out/{prefix}-{i}.png') for i in range(n)]
w, h = imgs[0][0], imgs[0][1]
rows = (n + cols - 1) // cols
W, H = w * cols, h * rows
canvas = bytearray(W * H * 3)
for k, (iw, ih, ib, px) in enumerate(imgs):
    ox, oy = (k % cols) * w, (k // cols) * h
    for y in range(ih):
        for x in range(iw):
            s = (y * iw + x) * ib; d = ((oy + y) * W + ox + x) * 3
            canvas[d:d + 3] = px[s:s + 3]
raw = b''.join(b'\x00' + bytes(canvas[y * W * 3:(y + 1) * W * 3]) for y in range(H))
chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
open(f'tools/out/{prefix}-strip.png', 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))
print(W, H)
