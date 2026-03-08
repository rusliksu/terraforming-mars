#!/bin/bash
# Updates the cache-busting hash in assets/index.html after build
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")

MAIN_JS="$PROJECT_DIR/build/main.js"
INDEX_HTML="$PROJECT_DIR/assets/index.html"

if [ ! -f "$MAIN_JS" ]; then
  echo "[postbuild] build/main.js not found, skipping hash update"
  exit 0
fi

HASH=$(md5sum "$MAIN_JS" | cut -c1-8)
sed -i "s/main\.js?v=[a-f0-9]\{8\}/main.js?v=$HASH/" "$INDEX_HTML"
echo "[postbuild] Updated main.js hash to $HASH"
