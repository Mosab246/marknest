"""Strip near-white background from marknestlogo.png for tray/desktop icons."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "logo" / "marknestlogo.png"
OUT = ROOT / "logo" / "marknestlogo-transparent.png"
# Pixels with R,G,B all above this become transparent (tune for off-white logo bg).
# Light grey export edges (e.g. 241,241,241) count as background.
WHITE_CUTOFF = 240


def main() -> None:
    if not SRC.exists():
        print(f"Missing {SRC}", file=sys.stderr)
        sys.exit(1)

    im = Image.open(SRC).convert("RGBA")
    pixels = list(im.getdata())
    new = []
    for r, g, b, a in pixels:
        if r >= WHITE_CUTOFF and g >= WHITE_CUTOFF and b >= WHITE_CUTOFF:
            new.append((r, g, b, 0))
        else:
            new.append((r, g, b, max(a, 255)))
    im.putdata(new)
    im.save(OUT, "PNG")
    print(f"Wrote {OUT} ({im.size[0]}x{im.size[1]}, RGBA)")


if __name__ == "__main__":
    main()
