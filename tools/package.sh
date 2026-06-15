#!/usr/bin/env bash
# Build dist/paper-boats.zip with logic.js + index.html + assets/ at the archive ROOT
# (the layout the Higgsfield apps engine expects). Run from the project root.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
OUT="$ROOT/dist/paper-boats.zip"
mkdir -p "$ROOT/dist"
rm -f "$OUT"
cd "$ROOT/public"
# zip everything in public/ at the archive root
zip -r -q "$OUT" . -x '.*'
echo "built: $OUT"
unzip -l "$OUT" | tail -n +2 | head -40
