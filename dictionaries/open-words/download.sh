#!/usr/bin/env bash
# download.sh — vendor the open_words repo (a pure-Python 3 stdlib port of
# Whitaker's Words) into dictionaries/open-words/vendor/open_words_repo.
#
# Idempotent: if the repo is already cloned there, this is a no-op unless
# --force is passed, in which case it's removed and re-cloned.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="$SCRIPT_DIR/vendor/open_words_repo"
REPO_URL="https://github.com/ArchimedesDigital/open_words.git"

FORCE=0
for arg in "$@"; do
  if [ "$arg" = "--force" ]; then
    FORCE=1
  fi
done

if [ -d "$VENDOR_DIR/.git" ]; then
  if [ "$FORCE" -eq 1 ]; then
    echo "--force given: removing existing $VENDOR_DIR"
    rm -rf "$VENDOR_DIR"
  else
    echo "already vendored at $VENDOR_DIR (use --force to re-clone)"
    exit 0
  fi
fi

echo "cloning $REPO_URL -> $VENDOR_DIR"
git clone --depth 1 "$REPO_URL" "$VENDOR_DIR"
echo "done."
