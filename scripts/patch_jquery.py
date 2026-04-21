#!/usr/bin/env python3
"""
Post-render jQuery patch.

Quarto + the `sparkline` R package bundle jQuery 1.11.3, which has multiple
known CVEs (CVE-2019-11358, CVE-2020-11022, CVE-2020-11023, others).
Replace the bundled content with jQuery 3.7.1 while keeping the directory
name `jquery-1.11.3` so existing <script src="..."> references still
resolve without requiring any changes to page HTML.

This is safe because jQuery Sparkline 2.1.2 uses only APIs that remain
backward-compatible in jQuery 3.x (DOM manipulation, events, $.extend,
$.each). We still run PDV tests post-patch to verify no regressions.
"""
from __future__ import annotations
import os, shutil, sys
from pathlib import Path

SITE_DIR = Path(os.environ.get("QUARTO_PROJECT_OUTPUT_DIR", "_site"))
PATCHED  = Path(__file__).parent / "jquery-3.7.1.min.js"

TARGETS = ("jquery.min.js", "jquery.js")
# Every bundled jQuery dir older than 3.5.0 must be patched.
DIR_NAMES_TO_PATCH = ("jquery-1.11.3",)


def main() -> int:
    if not SITE_DIR.is_dir():
        print(f"[patch_jquery] site dir not found: {SITE_DIR}", file=sys.stderr)
        return 1
    if not PATCHED.is_file():
        print(f"[patch_jquery] patched jQuery not found: {PATCHED}", file=sys.stderr)
        return 1

    patched = 0
    for old_dir_name in DIR_NAMES_TO_PATCH:
        for d in SITE_DIR.rglob(old_dir_name):
            if not d.is_dir():
                continue
            for name in TARGETS:
                t = d / name
                if t.exists():
                    shutil.copy2(PATCHED, t)
                    print(f"[patch_jquery] overwrote {t.relative_to(SITE_DIR)} with jQuery 3.7.1")
                    patched += 1

    print(f"[patch_jquery] done — {patched} files updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
