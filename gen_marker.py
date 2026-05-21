"""Generate an AR.js marker: a printable PNG plus the .patt training file.

The marker is a 16x16 grid:
  - the outer 5-cell-thick frame is BLACK
  - the inner 6x6 area carries the pattern that AR.js trains on

This emits two files:
  marker.png    — printable, 1024x1024 px, large black border for printing
  pattern.patt  — AR.js marker training file (4 orientations x 16x16 x RGB)
"""

import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "/home/claude/ControlTask"
os.makedirs(OUT_DIR, exist_ok=True)

# === Build the 16x16 logical pattern (0=black, 1=white) ===
# Outer 5-cell frame: black. Inner 6x6 area carries the symbol.
GRID = 16
pattern = [[0]*GRID for _ in range(GRID)]

# White interior (everything inside the black frame is white by default)
for r in range(5, 11):
    for c in range(5, 11):
        pattern[r][c] = 1

# Black "S" shape drawn into the 6x6 interior (rows 5..10, cols 5..10)
# Indices below are in the 6x6 local area.
#
#  row  cols
#   0   1 2 3 4
#   1   0
#   2   1 2 3
#   3           4
#   4   0 1 2 3
S_pixels = [
    (0, 1), (0, 2), (0, 3), (0, 4),
    (1, 0),
    (2, 1), (2, 2), (2, 3),
    (3, 4),
    (4, 0), (4, 1), (4, 2), (4, 3),
]
for (r, c) in S_pixels:
    pattern[5 + r][5 + c] = 0   # black

# === Render printable PNG (with extra outer white border for cutting) ===
CELL_PX = 64           # 16 cells * 64 = 1024 px inner image
QUIET_PX = CELL_PX * 2 # white safety border around the marker

img_size = GRID * CELL_PX + 2 * QUIET_PX
img = Image.new("RGB", (img_size, img_size), "white")
draw = ImageDraw.Draw(img)

for r in range(GRID):
    for c in range(GRID):
        x0 = QUIET_PX + c * CELL_PX
        y0 = QUIET_PX + r * CELL_PX
        x1 = x0 + CELL_PX
        y1 = y0 + CELL_PX
        color = "white" if pattern[r][c] else "black"
        draw.rectangle([x0, y0, x1, y1], fill=color)

img.save(os.path.join(OUT_DIR, "marker.png"))
print(f"marker.png written ({img_size}x{img_size})")

# === Build pattern.patt (AR.js training file) ===
# Format: four orientations (rotations 0, 90, 180, 270 degrees),
# each orientation = 3 colour-plane blocks (R, G, B),
# each block = 16 rows of 16 space-separated integers (0..255),
# blocks separated by blank lines.
#
# For a pure black-and-white pattern, each cell's value is 0 (black) or 255 (white)
# in every channel.

def rotate_cw(p):
    """Rotate a 16x16 list-of-lists 90 deg clockwise."""
    n = len(p)
    return [[p[n - 1 - c][r] for c in range(n)] for r in range(n)]

orientations = [pattern]
for _ in range(3):
    orientations.append(rotate_cw(orientations[-1]))

lines = []
for orient in orientations:
    for _channel in range(3):     # R, G, B
        for r in range(GRID):
            row_vals = [255 if orient[r][c] else 0 for c in range(GRID)]
            lines.append(" ".join(f"{v:3d}" for v in row_vals))
        lines.append("")  # blank line between blocks

with open(os.path.join(OUT_DIR, "pattern.patt"), "w") as f:
    f.write("\n".join(lines))
print("pattern.patt written")
