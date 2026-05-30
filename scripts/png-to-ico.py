"""Write logo/marknestlogo.ico from marknestlogo.png (Windows shortcut / installer)."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PNG = ROOT / "logo" / "marknestlogo.png"
ICO = ROOT / "logo" / "marknestlogo.ico"

SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def main() -> None:
    if not PNG.exists():
        raise SystemExit(f"Missing {PNG}")
    im = Image.open(PNG).convert("RGBA")
    im.save(ICO, format="ICO", sizes=[(w, h) for w, h in SIZES])
    print(f"Wrote {ICO}")


if __name__ == "__main__":
    main()
