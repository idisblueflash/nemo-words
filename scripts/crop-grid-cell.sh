#!/usr/bin/env bash
# Crop one cell out of an N×N contact-sheet / grid image.
#
# Usage:
#   scripts/crop-grid-cell.sh INPUT CELL [OUT] [GRID]
#
#   INPUT  path to the grid image (e.g. a 3×3 imagegen sheet)
#   CELL   which cell to extract, 1-based, row-major:
#            1 2 3
#            4 5 6
#            7 8 9
#   OUT    output path (default: <INPUT-dir>/<INPUT-stem>.cell<CELL>.png)
#   GRID   grid dimension, default 3 (3 => 3×3 => 9 cells)
#
# Needs ImageMagick (`magick`). Cells are assumed equal-sized; any leftover
# pixels from a non-divisible dimension stay on the right/bottom edge.
set -euo pipefail

input=${1:?INPUT required}
cell=${2:?CELL required}
grid=${4:-3}

[ -f "$input" ] || { echo "crop-grid-cell: no such file: $input" >&2; exit 1; }
case "$cell$grid" in *[!0-9]*) echo "crop-grid-cell: CELL and GRID must be integers" >&2; exit 1;; esac

count=$(( grid * grid ))
if (( cell < 1 || cell > count )); then
  echo "crop-grid-cell: CELL $cell out of range 1..$count for a ${grid}×${grid} grid" >&2
  exit 1
fi

stem=$(basename "$input"); stem=${stem%.*}
out=${3:-"$(dirname "$input")/${stem}.cell${cell}.png"}

dims=$(magick identify -format '%w %h' "$input[0]")
W=${dims% *}; H=${dims#* }
cw=$(( W / grid )); ch=$(( H / grid ))
idx=$(( cell - 1 )); row=$(( idx / grid )); col=$(( idx % grid ))
x=$(( col * cw )); y=$(( row * ch ))

magick "$input[0]" -crop "${cw}x${ch}+${x}+${y}" +repage "$out"
echo "crop-grid-cell: wrote $out  (${cw}×${ch}, cell $cell of ${grid}×${grid} grid, offset +${x}+${y})"
