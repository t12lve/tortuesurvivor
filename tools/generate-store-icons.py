"""Regenerate Android launcher icons + Play Store graphics from logo_splash.png"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "www" / "source" / "logo_splash.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
STORE = ROOT / "docs" / "play-store" / "graphics"
BG = (28, 22, 48, 255)  # deep purple matching turtle vibe

SIZES = {
    "mipmap-ldpi": 36,
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
# Adaptive icon layers are typically 108dp; densites:
FG_SIZES = {
    "mipmap-ldpi": 81,
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def fit_logo(img: Image.Image, box: int, pad_ratio: float = 0.14) -> Image.Image:
    canvas = Image.new("RGBA", (box, box), (0, 0, 0, 0))
    inner = int(box * (1 - 2 * pad_ratio))
    logo = img.convert("RGBA")
    logo.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (box - logo.width) // 2
    y = (box - logo.height) // 2
    canvas.paste(logo, (x, y), logo)
    return canvas


def solid(size: int, color=BG) -> Image.Image:
    return Image.new("RGBA", (size, size), color)


def main():
    if not LOGO.exists():
        raise SystemExit(f"Missing logo: {LOGO}")
    src = Image.open(LOGO)
    STORE.mkdir(parents=True, exist_ok=True)

    for folder, size in SIZES.items():
        d = RES / folder
        d.mkdir(parents=True, exist_ok=True)
        icon = Image.new("RGBA", (size, size), BG)
        layer = fit_logo(src, size, 0.12)
        icon = Image.alpha_composite(icon, layer)
        icon.convert("RGB").save(d / "ic_launcher.png", "PNG")
        # round: same with circle mask
        round_icon = icon.copy()
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(round_icon, (0, 0))
        out.putalpha(mask)
        out.save(d / "ic_launcher_round.png", "PNG")

    for folder, size in FG_SIZES.items():
        d = RES / folder
        d.mkdir(parents=True, exist_ok=True)
        solid(size).save(d / "ic_launcher_background.png", "PNG")
        fit_logo(src, size, 0.18).save(d / "ic_launcher_foreground.png", "PNG")

    # Play Store icon 512
    store_icon = Image.new("RGBA", (512, 512), BG)
    store_icon = Image.alpha_composite(store_icon, fit_logo(src, 512, 0.1))
    store_icon.convert("RGB").save(STORE / "icon-512.png", "PNG")

    # Feature graphic 1024x500
    fg = Image.new("RGBA", (1024, 500), BG)
    draw = ImageDraw.Draw(fg)
    # subtle vignette bars
    draw.rectangle((0, 0, 1024, 500), fill=BG)
    logo = src.convert("RGBA")
    logo.thumbnail((420, 420), Image.Resampling.LANCZOS)
    fg.paste(logo, (60, (500 - logo.height) // 2), logo)
    try:
        font = ImageFont.truetype("arialbd.ttf", 64)
        font_small = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
        font_small = font
    draw = ImageDraw.Draw(fg)
    draw.text((520, 180), "TORTUE Survivor", fill=(255, 120, 180, 255), font=font)
    draw.text((520, 270), "Sauvez la République.", fill=(230, 230, 240, 255), font=font_small)
    fg.convert("RGB").save(STORE / "feature-graphic-1024x500.png", "PNG")

    print(f"Icons updated under {RES}")
    print(f"Store graphics -> {STORE}")


if __name__ == "__main__":
    main()
