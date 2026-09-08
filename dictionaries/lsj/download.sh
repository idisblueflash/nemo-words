#!/usr/bin/env bash
# Clones the LSJLogeion TEI-XML edition of the Liddell-Scott-Jones Greek-English
# Lexicon (Helma Dik, U. of Chicago — github.com/helmadik/LSJLogeion, derived
# from the Perseus Digital Library's manual keyboard entry of LSJ, public
# domain base text) and builds the search index. Idempotent — skips the clone
# if the repo is already present, unless --force is passed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="$SCRIPT_DIR/vendor/LSJLogeion"
URL="https://github.com/helmadik/LSJLogeion.git"

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

if [[ -d "$VENDOR_DIR/.git" && "$FORCE" -eq 0 ]]; then
  echo "LSJLogeion already present at $VENDOR_DIR — skipping clone (use --force to re-clone)."
else
  rm -rf "$VENDOR_DIR"
  echo "Cloning LSJLogeion (~110MB of TEI-XML)…"
  git clone --depth 1 "$URL" "$VENDOR_DIR"
fi

node "$SCRIPT_DIR/build-index.js"
