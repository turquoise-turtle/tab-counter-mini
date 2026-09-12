#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.9"
# dependencies = ["resvg-py"]
# ///
"""Rasterize the icon color-variant SVGs to PNG.

Chrome cannot use SVG for a toolbar action icon (Firefox can). The default
icon already ships as a PNG set (icons/tabcounter-<size>.png), generated at
some point in the project's history from icons/tabcounter.plain.min.svg --
but the color variants used by the options page's "Icon Color & Style"
picker (gray10, gray90, black, white) only ever existed as SVG, since Firefox
never needed anything else.

This is a one-off asset-generation tool, not part of the Firefox<->Chrome
manifest conversion workflow: run it once whenever a source SVG changes, and
commit the resulting PNGs like any other icon asset.

Uses resvg-py (a Rust SVG renderer with prebuilt wheels) rather than
cairosvg, since cairosvg needs the system Cairo library and this project has
no other reason to require one.

Usage (from the extension's directory):
    uv run generate_icon_variants.py
"""

from pathlib import Path

import resvg_py

ICON_DIR = Path("icons")
SIZES = (16, 32, 38, 64, 96, 128)
VARIANTS = ("tabcounter-black", "tabcounter-gray10", "tabcounter-gray90", "tabcounter-white")


def main() -> None:
    for variant in VARIANTS:
        svg_path = ICON_DIR / f"{variant}.plain.min.svg"
        if not svg_path.exists():
            raise FileNotFoundError(svg_path)
        for size in SIZES:
            png_path = ICON_DIR / f"{variant}-{size}.png"
            png_path.write_bytes(
                resvg_py.svg_to_bytes(svg_path=str(svg_path), width=size, height=size)
            )
            print(f"wrote {png_path}")


if __name__ == "__main__":
    main()
