#!/usr/bin/env python3
"""
Post-render: replace the @@UPDATED_AT@@ placeholder in every HTML file with
the current UTC timestamp, so the site footer advertises when it was last
built. Uses UTC so visitors anywhere see the same absolute time.
"""
from __future__ import annotations
import os, sys
from datetime import datetime, timezone
from pathlib import Path

SITE_DIR    = Path(os.environ.get("QUARTO_PROJECT_OUTPUT_DIR", "_site"))
# Plain-text sentinel that Pandoc/markdown won't interpret. Avoid "@@…@@"
# (citation syntax) and other pattern-based markers.
PLACEHOLDER = "SITE_UPDATED_AT_PLACEHOLDER"
STAMP       = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def main() -> int:
    if not SITE_DIR.is_dir():
        print(f"[stamp] site dir not found: {SITE_DIR}", file=sys.stderr)
        return 1
    count = 0
    for f in SITE_DIR.rglob("*.html"):
        try:
            text = f.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        if PLACEHOLDER in text:
            f.write_text(text.replace(PLACEHOLDER, STAMP), encoding="utf-8")
            count += 1
    print(f"[stamp] stamped {count} HTML files with '{STAMP}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
