"""Prepare transparent pixel studies and a nearest-neighbour comparison of the two figures."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).parent
DESIGNS = (
    ("skardi", "Skardi Ironbrow", "#cf8d64"),
    ("ylva", "Ylva Wolf-Tooth", "#83b4a8"),
)


def reduce_study(name):
    original = Image.open(ROOT / (name + ".png")).convert("RGBA")
    mask = original.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    original = original.crop(mask.getbbox())
    size = (round(original.width * 128 / original.height), 128)
    small = original.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")
    alpha = small.getchannel("A").point(lambda a: 255 if a >= 132 else 0)
    rgb = small.convert("RGB").filter(ImageFilter.UnsharpMask(0.7, 85, 4))
    # Quantize the actual paint. Hidden RGB from the transparent border should
    # contribute neither a palette entry nor a coloured fringe.
    swatch = Image.new("RGB", rgb.size, "#252322")
    swatch.paste(rgb, mask=alpha)
    pixels = swatch.quantize(colors=48, dither=Image.Dither.NONE).convert("RGBA")
    pixels.putalpha(alpha)
    pixels.save(ROOT / (name + "-study.png"), optimize=True)
    return pixels


def font(name, size):
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default(size=size)


def build():
    board = Image.new("RGB", (1040, 604), "#1c2529")
    draw = ImageDraw.Draw(board)
    title = font("georgia.ttf", 37)
    subtitle = font("segoeui.ttf", 18)
    for i, (name, label, accent) in enumerate(DESIGNS):
        pixels = reduce_study(name)
        if i == 1:
            pixels = ImageOps.mirror(pixels)
        x0 = i * 520
        # Consistent ground line and magnification keep their builds comparable.
        draw.rectangle((x0, 0, x0 + 519, 467), fill="#344047" if i == 0 else "#303f42")
        draw.rectangle((x0, 467, x0 + 519, 469), fill=accent)
        hero = pixels.resize((pixels.width * 3, pixels.height * 3), Image.Resampling.NEAREST)
        board.paste(hero, (x0 + (520 - hero.width) // 2, 425 - hero.height), hero)
        draw.text((x0 + 35, 489), label, font=title, fill="#f2e8d5")
        tagline = ("Iron helm  /  Bear mantle" if i == 0 else "War paint  /  Wolf mantle")
        draw.text((x0 + 37, 547), tagline, font=subtitle, fill="#b5c1be")
    draw.line((519, 0, 519, 604), fill="#182226", width=2)
    board.save(ROOT / "berserker-designs.png", optimize=True)


if __name__ == "__main__":
    build()
