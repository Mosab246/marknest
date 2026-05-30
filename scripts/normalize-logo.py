"""Ensure logo/marknestlogo.png is a real PNG (convert JPEG/WebP if needed)."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "logo" / "marknestlogo.png"


def main() -> None:
    if not LOGO.exists():
        raise SystemExit(f"Missing {LOGO}")
    raw = LOGO.read_bytes()[:12]
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        print("marknestlogo.png is already PNG")
        return
    im = Image.open(LOGO)
    im.save(LOGO, format="PNG")
    print(f"Converted to PNG ({im.size[0]}x{im.size[1]}, {im.mode})")


if __name__ == "__main__":
    main()
