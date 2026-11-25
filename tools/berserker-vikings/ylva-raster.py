"""Archived painted proposal. Register the transparent original at twofold density."""
import argparse
import base64
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def register(source):
    original = Image.open(source).convert("RGBA")
    alpha = original.getchannel("A")
    box = alpha.point(lambda v: 255 if v > 125 else 0).getbbox()
    if not box:
        raise ValueError("The source contains no opaque art.")
    cropped = original.crop(box)
    width = round(cropped.width * 76 / cropped.height)
    # PIL's premultiplied RGBA resize keeps transparent black out of the
    # highlights on the blade and the fur tips.
    native = cropped.resize((width, 76), Image.Resampling.LANCZOS)
    alpha = np.asarray(native.getchannel("A"))
    visible = alpha >= 128
    edge_color = native.convert("RGB").filter(ImageFilter.UnsharpMask(radius=.78, percent=120, threshold=5))
    # Bring back the drawn eye, braids and etched hem, whose darkest line
    # can otherwise average completely into the skin or cloth around it.
    ink = cropped.resize((width,76), Image.Resampling.NEAREST)
    color = Image.blend(edge_color, Image.composite(ink.convert("RGB"), edge_color, ink.getchannel("A")), .30)
    rgb = np.asarray(color)
    swatches = np.ascontiguousarray(rgb[visible].reshape((-1, 1, 3)))
    quantized = Image.fromarray(swatches, "RGB").quantize(120, method=Image.Quantize.MEDIANCUT,
                                                          dither=Image.Dither.NONE)
    table = np.asarray(quantized.getpalette(), dtype=np.uint8).reshape((-1, 3))
    indices = np.zeros(visible.shape, dtype=np.uint8)
    indices[visible] = np.asarray(quantized).ravel() + 1
    palette = [0] + [int(r) | (int(g) << 8) | (int(b) << 16) | 0xff000000 for r, g, b in table]
    preview = np.zeros((*visible.shape, 4), dtype=np.uint8)
    preview[visible, :3] = table[indices[visible]-1]
    preview[visible, 3] = 255
    return Image.fromarray(preview), {"w": width, "h":76, "palette":palette,
                                      "pixels":base64.b64encode(indices.tobytes()).decode("ascii")}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    native_image, data = register(args.source)
    destination = Path(__file__).with_name("ylva-model.js")
    destination.write_text("// Generated from the Ylva Wolf-Tooth raster by ylva-raster.py.\n"
                           + "export default " + json.dumps(data, separators=(",", ":")) + ";\n",
                           encoding="utf-8")
    if args.preview:
        native_image.resize((native_image.width*8,native_image.height*8),
                            Image.Resampling.NEAREST).save(args.preview)
    print(f"{destination.name}: {data['w']} x {data['h']}, {len(data['palette'])-1} paint colors")
