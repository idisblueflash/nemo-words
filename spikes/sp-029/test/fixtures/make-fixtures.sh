#!/usr/bin/env bash
# Rebuilds the tiny SP-029 test grids under test/fixtures/images/ (needs
# ImageMagick). Each grid is 3×3 cells of 30×30 flat gray. A cell's gray
# level is its "picture": the fake captioner reads it back and the mock Jev
# judges it. Levels are 30 apart (RMS 0.118 between neighbours), so a crop of
# one cell matches it clearly (distance 0, next-nearest ≥ 0.1).
set -euo pipefail
cd "$(dirname "$0")/images"
rm -f ./*.png

# grid FILE L1 … L9 — gray levels 0–255, row-major
grid() {
  local f=$1; shift
  local c=()
  for l in "$@"; do c+=("xc:rgb($l,$l,$l)"); done
  magick \( -size 30x30 "${c[0]}" "${c[1]}" "${c[2]}" +append \) \
         \( -size 30x30 "${c[3]}" "${c[4]}" "${c[5]}" +append \) \
         \( -size 30x30 "${c[6]}" "${c[7]}" "${c[8]}" +append \) \
         -append "./$f"
}
# crop GRID CELL OUT
crop() {
  local i=$(( $2 - 1 ))
  magick "./$1" -crop "30x30+$(( i % 3 * 30 ))+$(( i / 3 * 30 ))" +repage "./$3"
}
flat() { magick -size 30x30 "xc:rgb($2,$2,$2)" "./$1"; }

L=(0 30 60 90 120 150 180 210 240)
R=(240 210 180 150 120 90 60 30 0)
S=(15 45 75 105 135 165 195 225 255)

grid alpha.grid.png "${L[@]}";   crop alpha.grid.png 5 alpha.png      # clear, cell 5
grid eta.grid.png "${R[@]}";     crop eta.grid.png 1 eta.png          # clear, cell 1; story only in the card's Back
grid beta.grid.png "${L[@]}";    flat beta.png 45                     # halfway between two cells: no clear match
grid gamma.grid.png "${S[@]}";   grid gamma.grid-2.png "${R[@]}"
crop gamma.grid-2.png 7 gamma.png                                     # crop came from grid-2 (cell 7)
grid -delta-.grid.png "${L[@]}"; crop -delta-.grid.png 2 -delta-.png  # word part
grid eps.grid.png "${L[@]}";     magick -size 60x60 xc:white ./eps.comic.png  # comic only, no single crop
grid zeta.grid.png "${L[@]}";    crop zeta.grid.png 9 zeta.png        # no story
grid theta.grid.png "${R[@]}";   crop theta.grid.png 8 theta.png      # clear, cell 8
