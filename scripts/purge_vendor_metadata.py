#!/usr/bin/env python3
"""
Post-render cleanup: delete npm/node metadata files bundled inside vendored
htmlwidget libraries.

R packages like `sparkline` and `reactable` ship copies of upstream JS
libraries (jQuery Sparkline, core-js, etc.) with their original
`package.json` intact. Browsers never parse these files, but GitHub's
vulnerability scanner reads them and raises alerts about the upstream
library's *devDependencies* (grunt, karma, etc.) — tools those libraries
used at build time and that never execute on our site.

Deleting the `package.json` files:
  * silences the Dependabot alerts (no JSON → nothing to scan)
  * shrinks the deploy artifact slightly
  * does not change site behavior (these files are not referenced at runtime)

Targets:
  - package.json
  - package-lock.json
  - yarn.lock
  - .npmignore / .npmrc
  - bower.json

Scope: only inside `_site/site_libs/` and `_freeze/site_libs/`. Never
touches our own `tests/pdv/package.json`.
"""
from __future__ import annotations
import os, sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SITE_DIR     = Path(os.environ.get("QUARTO_PROJECT_OUTPUT_DIR",
                                   str(PROJECT_ROOT / "_site")))
FREEZE_DIR   = PROJECT_ROOT / "_freeze"

PURGE_NAMES = {
    "package.json",
    "package-lock.json",
    "yarn.lock",
    ".npmignore",
    ".npmrc",
    "bower.json",
}


def purge_under(root: Path) -> int:
    if not root.is_dir():
        return 0
    removed = 0
    # Only touch site_libs/ subtrees — not our own tests/pdv/ directory.
    for site_libs in root.rglob("site_libs"):
        if not site_libs.is_dir():
            continue
        for f in site_libs.rglob("*"):
            if f.is_file() and f.name in PURGE_NAMES:
                try:
                    f.unlink()
                    removed += 1
                    print(f"[purge] {f.relative_to(PROJECT_ROOT)}")
                except OSError as e:
                    print(f"[purge] could not remove {f}: {e}", file=sys.stderr)
    return removed


def main() -> int:
    total = purge_under(SITE_DIR) + purge_under(FREEZE_DIR)
    print(f"[purge] removed {total} vendor-metadata files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
