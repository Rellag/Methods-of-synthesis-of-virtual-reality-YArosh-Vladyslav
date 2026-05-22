"""
Generate a custom AR.js marker for the Sievert surface project.

Produces three artefacts in ../assets/:
  - marker-sievert.png        : 512x512 print-ready marker image
  - pattern-sievert.patt      : AR.js .patt file (the 16x16 sampled pattern,
                                in 4 rotations, each channel listed)
  - marker-sievert-print.png  : same marker with crop ticks (handy for printing)

AR.js .patt format reminder:
  - 4 blocks (one per 90-degree rotation), each block has 3 rows of 16 lines
    (one row per RGB channel), each line has 16 space-separated 0..255 values.
  - The "inside region" of the printed marker (the inner 50% of the square)
    is what gets sampled into that 16x16 grid.
  - Outside that inner region: solid black border, surrounded by the white
    paper. Border thickness is 25% of the marker on each side.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# ---------------------------------------------------------------------------
# Marker design
# ---------------------------------------------------------------------------
# We render a 512x512 PNG that is the *printable* marker:
#   - Outer 25% on each side: solid BLACK border
#   - Inner 50%: WHITE square containing our glyph
# The glyph itself is a capital sigma Σ — a clean, asymmetric shape with
# strong corners, which is exactly what AR.js's pattern matcher likes.

SIZE = 512
BORDER_FRAC = 0.25  # AR.js default

img = Image.new('RGB', (SIZE, SIZE), 'white')
draw = ImageDraw.Draw(img)

# Solid black square the size of the full marker
draw.rectangle([0, 0, SIZE - 1, SIZE - 1], fill='black')

# Inner white square (where the pattern lives)
inner_pad = int(SIZE * BORDER_FRAC)
inner_box = [inner_pad, inner_pad, SIZE - inner_pad - 1, SIZE - inner_pad - 1]
draw.rectangle(inner_box, fill='white')

# Try to load a bold font; fall back to default if not available
font = None
for candidate in [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
]:
    if os.path.exists(candidate):
        font = ImageFont.truetype(candidate, size=int(SIZE * 0.40))
        break
if font is None:
    font = ImageFont.load_default()

# Draw Σ centred in the inner square, slightly biased so it's NOT symmetric
# under 90-degree rotation (otherwise AR.js can't disambiguate orientation).
glyph = "Σ"
bbox = draw.textbbox((0, 0), glyph, font=font)
gw = bbox[2] - bbox[0]
gh = bbox[3] - bbox[1]
inner_w = inner_box[2] - inner_box[0]
inner_h = inner_box[3] - inner_box[1]

# Position: centred horizontally, slightly above centre vertically
# (this asymmetry is critical so the marker has a unique "up")
tx = inner_box[0] + (inner_w - gw) // 2 - bbox[0]
ty = inner_box[1] + (inner_h - gh) // 2 - bbox[1] - int(SIZE * 0.04)
draw.text((tx, ty), glyph, fill='black', font=font)

# Add a small solid dot in the bottom-right of the inner square to break
# any residual symmetry — this is the "this side up" indicator.
dot_r = int(SIZE * 0.035)
dot_cx = inner_box[2] - int(SIZE * 0.08)
dot_cy = inner_box[3] - int(SIZE * 0.08)
draw.ellipse(
    [dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
    fill='black'
)

# Save the clean marker
out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(out_dir, exist_ok=True)
marker_png = os.path.join(out_dir, 'marker-sievert.png')
img.save(marker_png)
print(f"Wrote {marker_png}")

# Also save a print version with crop marks + label
print_img = Image.new('RGB', (SIZE + 120, SIZE + 160), 'white')
print_img.paste(img, (60, 60))
pd = ImageDraw.Draw(print_img)
# Crop ticks
tick = 20
for (cx, cy) in [(60, 60), (60 + SIZE, 60), (60, 60 + SIZE), (60 + SIZE, 60 + SIZE)]:
    pd.line([(cx - tick, cy), (cx + tick, cy)], fill='black', width=2)
    pd.line([(cx, cy - tick), (cx, cy + tick)], fill='black', width=2)
# Label
try:
    label_font = ImageFont.truetype(
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', size=22
    )
except Exception:
    label_font = ImageFont.load_default()
pd.text(
    (60, 60 + SIZE + 30),
    "AR.js marker · Sievert surface (Control Task)",
    fill='black', font=label_font
)
pd.text(
    (60, 60 + SIZE + 60),
    "Print at ~80 mm square. Keep the white margin around the black border.",
    fill='#444', font=label_font
)
print_png = os.path.join(out_dir, 'marker-sievert-print.png')
print_img.save(print_png)
print(f"Wrote {print_png}")

# ---------------------------------------------------------------------------
# Pattern (.patt) generation
# ---------------------------------------------------------------------------
# AR.js samples the INNER 50% of the marker (the white square area) into a
# 16x16 grid. We need to write that grid out 4 times (4 rotations), each as
# 3 channels (R, G, B), each channel as 16 rows of 16 numbers.

PATTERN_SIZE = 16

# Crop just the inner region
inner = img.crop(inner_box)
# Downsample to 16x16 with high quality
sampled = inner.resize((PATTERN_SIZE, PATTERN_SIZE), Image.LANCZOS)

def rotate_grid(rgb_grid, k):
    """Rotate a list-of-rows grid 90deg clockwise k times."""
    grid = rgb_grid
    for _ in range(k):
        # Transpose then reverse each row → 90deg clockwise
        grid = [list(row) for row in zip(*grid[::-1])]
    return grid

# Build base RGB grid as list[16][16] of (r,g,b)
base = []
for y in range(PATTERN_SIZE):
    row = []
    for x in range(PATTERN_SIZE):
        row.append(sampled.getpixel((x, y)))
    base.append(row)

patt_lines = []
for rot in range(4):
    rotated = rotate_grid(base, rot)
    # For each channel
    for ch in range(3):
        for y in range(PATTERN_SIZE):
            vals = [str(rotated[y][x][ch]) for x in range(PATTERN_SIZE)]
            patt_lines.append(' '.join(vals))
    patt_lines.append('')  # blank line between rotations (AR.js tolerates this)

patt_path = os.path.join(out_dir, 'pattern-sievert.patt')
with open(patt_path, 'w') as f:
    f.write('\n'.join(patt_lines))
print(f"Wrote {patt_path}")

print("\nDone. Files ready in assets/:")
for p in os.listdir(out_dir):
    print(f"  - {p}")
