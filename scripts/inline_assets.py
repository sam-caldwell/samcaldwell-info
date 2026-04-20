#!/usr/bin/env python3
"""
Post-render asset inliner.

Walks every HTML file under $QUARTO_PROJECT_OUTPUT_DIR (default: _site/) and
inlines every local reference:

  <script src="site_libs/..."></script>       → <script>...js...</script>
  <link rel="stylesheet" href="site_libs/..."> → <style>...css...</style>
  url(site_libs/fonts/X.woff2) inside CSS     → url(data:font/woff2;base64,...)

Remote URLs (http(s)://, //, data:, mailto:, javascript:, fragments) are left
alone. Files that don't resolve to a real file inside the output directory are
left alone. Idempotent: re-running against already-inlined HTML is a no-op.

Pure stdlib — no pip installs required.
"""

from __future__ import annotations
import os, re, sys, base64, mimetypes
from pathlib import Path

SITE_DIR = Path(os.environ.get("QUARTO_PROJECT_OUTPUT_DIR", "_site")).resolve()

REMOTE_PREFIXES = ("http://", "https://", "//", "data:", "#", "mailto:", "javascript:", "tel:")


def is_remote(url: str) -> bool:
    return not url or url.startswith(REMOTE_PREFIXES)


def resolve_local(base: Path, url: str) -> Path | None:
    """Resolve a URL relative to `base` (dir of the HTML/CSS). Returns the real
    path only if it exists inside SITE_DIR; otherwise None."""
    u = url.split("#", 1)[0].split("?", 1)[0]
    if is_remote(u) or not u:
        return None
    target = (base / u).resolve()
    try:
        target.relative_to(SITE_DIR)
    except ValueError:
        return None
    return target if target.is_file() else None


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


_URL_RE = re.compile(r"url\(\s*([^)]+?)\s*\)")

def inline_css_urls(css_text: str, css_file: Path) -> str:
    """Rewrite url(...) refs inside a CSS blob, relative to the CSS file's dir."""
    def repl(m: re.Match) -> str:
        raw = m.group(1).strip().strip("'\"")
        target = resolve_local(css_file.parent, raw)
        if target is None:
            return m.group(0)
        return f"url({data_uri(target)})"
    return _URL_RE.sub(repl, css_text)


_SCRIPT_RE = re.compile(
    r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\'][^>]*>\s*</script>',
    re.IGNORECASE | re.DOTALL,
)

_LINK_RE = re.compile(r"<link\b[^>]*/?>", re.IGNORECASE)

_HREF_RE = re.compile(r'\bhref\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
_REL_RE  = re.compile(r'\brel\s*=\s*["\']?([^"\'>\s]+)["\']?',  re.IGNORECASE)


def inline_html(path: Path) -> tuple[int, int]:
    """Inline scripts + stylesheets in one HTML file. Returns (scripts, styles) counts."""
    text = path.read_text(encoding="utf-8")
    orig = text
    script_count = 0
    style_count  = 0

    def script_sub(m: re.Match) -> str:
        nonlocal script_count
        full, src = m.group(0), m.group(1)
        target = resolve_local(path.parent, src)
        if target is None:
            return full
        try:
            js = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return full
        # Prevent the inlined JS from prematurely closing the <script> tag
        js = js.replace("</script", "<\\/script")
        script_count += 1
        return f"<script>{js}</script>"

    text = _SCRIPT_RE.sub(script_sub, text)

    def link_sub(m: re.Match) -> str:
        nonlocal style_count
        full = m.group(0)
        rel = _REL_RE.search(full)
        if not rel or rel.group(1).lower() != "stylesheet":
            return full
        href = _HREF_RE.search(full)
        if not href:
            return full
        target = resolve_local(path.parent, href.group(1))
        if target is None:
            return full
        try:
            css = target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            return full
        css = inline_css_urls(css, target)
        style_count += 1
        return f"<style>{css}</style>"

    text = _LINK_RE.sub(link_sub, text)

    if text != orig:
        path.write_text(text, encoding="utf-8")
    return script_count, style_count


def main() -> int:
    if not SITE_DIR.is_dir():
        print(f"[inline_assets] site dir not found: {SITE_DIR}", file=sys.stderr)
        return 1
    html_files = sorted(SITE_DIR.rglob("*.html"))
    tot_js = tot_css = 0
    for f in html_files:
        js, css = inline_html(f)
        tot_js += js
        tot_css += css
        if js or css:
            print(f"[inline_assets] {f.relative_to(SITE_DIR)}: +{js} scripts, +{css} stylesheets")
    print(f"[inline_assets] done: {len(html_files)} HTML, {tot_js} scripts, {tot_css} stylesheets inlined")
    return 0


if __name__ == "__main__":
    sys.exit(main())
