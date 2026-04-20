#!/usr/bin/env bash
# Converts favicon.svg → favicon.ico (multi-size: 16, 32, 48).
# Requires one of: rsvg-convert+ImageMagick, or magick (ImageMagick 7), or
# inkscape. Runs from repo root.
set -euo pipefail

SRC="favicon.svg"
OUT="favicon.ico"

if [ ! -f "$SRC" ]; then
  echo "Missing $SRC" >&2; exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

render_png () {
  local size="$1" dest="$2"
  if   command -v rsvg-convert >/dev/null; then
    rsvg-convert -w "$size" -h "$size" "$SRC" -o "$dest"
  elif command -v magick >/dev/null; then
    magick -background none -density 512 "$SRC" -resize "${size}x${size}" "$dest"
  elif command -v convert >/dev/null; then
    convert -background none -density 512 "$SRC" -resize "${size}x${size}" "$dest"
  elif command -v inkscape >/dev/null; then
    inkscape "$SRC" --export-type=png --export-filename="$dest" -w "$size" -h "$size"
  else
    echo "Need one of: rsvg-convert, magick, convert, inkscape" >&2; exit 1
  fi
}

for s in 16 32 48; do
  render_png "$s" "$tmpdir/fav-$s.png"
done

if command -v magick >/dev/null; then
  magick "$tmpdir/fav-16.png" "$tmpdir/fav-32.png" "$tmpdir/fav-48.png" "$OUT"
elif command -v convert >/dev/null; then
  convert "$tmpdir/fav-16.png" "$tmpdir/fav-32.png" "$tmpdir/fav-48.png" "$OUT"
else
  # Fallback: single-size .ico via Python (Pillow)
  python3 - <<'PY'
from PIL import Image
img = Image.open("favicon.svg") if False else Image.open(__import__('os').environ['TMP'] + '/fav-32.png')
img.save("favicon.ico", sizes=[(16,16),(32,32),(48,48)])
PY
fi

echo "Wrote $OUT"
