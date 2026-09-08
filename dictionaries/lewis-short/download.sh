#!/usr/bin/env bash
# Downloads the plaintext Lewis & Short Latin-English dictionary corpus and
# builds the search index. Idempotent: skips the download if the corpus file
# already exists, unless --force is passed.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$DIR/data"
TXT_PATH="$DATA_DIR/lewis-short.txt"
URL="https://raw.githubusercontent.com/telemachus/plaintext-lewis-short/main/lewis-short.txt"

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

mkdir -p "$DATA_DIR"

if [[ -f "$TXT_PATH" && "$FORCE" -eq 0 ]]; then
  echo "Corpus already present at $TXT_PATH (use --force to re-download)."
else
  echo "Downloading Lewis & Short corpus to $TXT_PATH ..."
  curl -sL -o "$TXT_PATH" "$URL"
  echo "Download complete."
fi

echo "Building index..."
node "$DIR/build-index.js"
