#!/usr/bin/env bash
# Compose 3 or 4 cells of an N×N grid into a 2×2 comic (ADR-0020/0021/0022).
#
# Usage:
#   scripts/compose-comic.sh INPUT OUT CELL CELL CELL [CELL]
#
#   INPUT  path to the grid image (e.g. images/mnemonic/<word>.grid.png)
#   OUT    output path (e.g. images/mnemonic/<word>.comic.png)
#   CELL   3 or 4 cell numbers, 1-based row-major, in story (reading) order.
#          4 cells fill the 2×2 in Z-order; with 3, the third is centred on
#          the bottom row. A CELL may also be PATH:N to take cell N from a
#          different grid than INPUT (e.g. a follow-up grid for a missing beat).
#   GRID   env var, grid dimension passed to crop-grid-cell.sh (default 3)
#
# Each cell is cropped with crop-grid-cell.sh, shaved 4px, given a 3px black
# border, and laid out with 12px white gutters. Needs ImageMagick (`magick`).
set -euo pipefail

input=${1:?INPUT required}
out=${2:?OUT required}
shift 2
cells=("$@")
if (( ${#cells[@]} < 3 || ${#cells[@]} > 4 )); then
  echo "compose-comic: need 3 or 4 cells, got ${#cells[@]}" >&2
  exit 1
fi

here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

panels=()
for i in "${!cells[@]}"; do
  src=$input; n=${cells[$i]}
  if [[ $n == *:* ]]; then src=${n%:*}; n=${n##*:}; fi
  "$here/crop-grid-cell.sh" "$src" "$n" "$tmp/c$i.png" "${GRID:-3}" >/dev/null
  magick "$tmp/c$i.png" -shave 4x4 -bordercolor black -border 3 +repage "$tmp/p$i.png"
  panels+=("$tmp/p$i.png")
done

g=12
# Gutters go *between* panels here; the outer margin is one border at the end,
# so a centred third panel sits on the same axis as the whole image.
row() { magick "$1" \( "$2" -background white -splice ${g}x0 \) +append +repage "$3"; }
row "${panels[0]}" "${panels[1]}" "$tmp/row1.png"
if (( ${#panels[@]} == 4 )); then
  row "${panels[2]}" "${panels[3]}" "$tmp/row2.png"
else
  w=$(magick identify -format '%w' "$tmp/row1.png")
  magick "${panels[2]}" -background white -gravity center -extent "${w}x" +repage "$tmp/row2.png"
fi
magick "$tmp/row1.png" \( "$tmp/row2.png" -background white -splice 0x${g} \) -append \
  -bordercolor white -border ${g} +repage "$out"

echo "compose-comic: wrote $out  ($(magick identify -format '%wx%h' "$out"), cells ${cells[*]})"
