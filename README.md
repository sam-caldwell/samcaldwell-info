# samcaldwell.info

Interactive, static-HTML analysis of the US economy — every year since 1999
compared head-to-head, with drill-down from annual indicators to quarterly
and monthly detail, plus economy-vs-market correlations. Built with Quarto
and a pure open-source charting stack; designed to render and deploy to
GitHub Pages.

## Live site

**<https://samcaldwell.info>** (custom domain on GitHub Pages; sibling to
`samcaldwell.net`).

## What's in here

| Path | Purpose |
|---|---|
| `_quarto.yml` | Site config, navbar, shared format settings |
| `index.qmd` | 2026 snapshot, range-vs-history plot, S&P 500 monthly |
| `growth.qmd` | Real GDP — annual, quarterly, components; sunburst drill-down |
| `indicators.qmd` | Unemployment / inflation / rates / VIX — reactable with sparklines and expandable row detail |
| `markets.qmd` | GDP × market scatter, correlations, sector treemap drill, heatmap |
| `about.qmd` | Data provenance, limitations, swap-in instructions |
| `R/generate_data.R` | Builds the CSV dataset in `data/` |
| `R/helpers.R` | Shared loaders, theme, recession-shading helper |
| `data/*.csv` | Annual, quarterly, monthly, GDP components, sector returns |
| `.github/workflows/publish.yml` | Renders the site and publishes to `gh-pages` |

## Stack

All open-source, no commercial components:

| Piece | Role | License |
|---|---|---|
| [Quarto](https://quarto.org) | Authoring / site generator | MIT |
| [echarts4r](https://echarts4r.john-coene.com/) → [Apache ECharts](https://echarts.apache.org/) | Drill-down charts (sunburst, treemap, bars, lines, heatmap) | Apache 2.0 |
| [plotly](https://plotly-r.com/) | Linked scatter / hover charts | MIT |
| [reactable](https://glin.github.io/reactable/) | Interactive tables with expandable rows | MIT |
| [sparkline](https://github.com/htmlwidgets/sparkline) | Inline mini-charts inside table cells | BSD-3 |
| [crosstalk](https://rstudio.github.io/crosstalk/) | Client-side linked filtering | MIT |

## Getting started

### Prerequisites

| Tool | Minimum | Role |
|---|---|---|
| **R** | 4.2+ | Data pipelines (fetchers, builders, shared helpers) + htmlwidget chart rendering |
| **Quarto** | 1.4+ | Site generator — turns `*.qmd` into `_site/` |
| **Python** | 3.10+ | Three post-render scripts: `patch_jquery.py`, `purge_vendor_metadata.py`, `stamp_updated.py` |
| **Node.js** | 20+ | Playwright PDV suite — run only if you want to execute the post-deploy verification locally |

macOS: `brew install r quarto python node`. Linux: your package manager. Windows: install each from its vendor's site.

### 1 · Clone the repository

```sh
git clone https://github.com/sam-caldwell/samcaldwell.info.git
cd samcaldwell.info
```

### 2 · Install R packages

The data pipelines depend on a mix of chart / table / HTTP / tidyverse libraries:

```r
install.packages(c(
  # Charts + tables (htmlwidgets)
  "echarts4r", "plotly", "reactable", "sparkline", "crosstalk",

  # Tidyverse core
  "dplyr", "tidyr", "readr", "purrr", "lubridate", "tibble",

  # Utilities
  "scales", "htmltools", "rprojroot", "stringr",

  # API clients
  "fredr", "httr2", "jsonlite"
))
```

On first `quarto render`, Quarto may install additional R deps into its own library — let it.

### 3 · Configure API keys (for live data)

Export these in `~/.zshrc` (or `~/.bashrc`) before running the pipeline. Without them the pipeline still runs but falls back to synthetic / cached values for the affected analyses.

```sh
# Federal Reserve economic data — GDP, inflation, rates, etc.
export FRED_API_KEY=...           # https://fredaccount.stlouisfed.org/apikeys

# US energy — PADD gas prices, STEO forecasts
export EIA_API_KEY=...            # https://www.eia.gov/opendata/register.php

# Media volume for the sentiment/media page
export MEDIA_CLOUD_API_KEY=...    # https://search.mediacloud.org/
```

`NEWS_API_ORG_KEY` is passed to CI as a reserved slot — it's not wired into any fetcher right now (see commit history for rationale).

For CI, set the same variables as **repository secrets** under Settings → Secrets and variables → Actions.

### 4 · Refresh the dataset

```sh
Rscript R/generate_data.R
```

The dispatcher in `R/generate_data.R` calls every fetcher and builder:

- **FRED** — daily macro + energy series (incremental; seconds after first run)
- **GDELT** — monthly US-politics news tone (1 query / 6s; a couple of minutes on first bootstrap)
- **Media Cloud** — US-news story volume (few seconds)
- **CISA KEV + FIRST EPSS + NVD CVSS** — cybersecurity CVE pipeline. **First run is ~12 minutes** (NVD lookups rate-limited at 2 req/s for ~1500 KEV CVEs). Subsequent runs: a few seconds.
- **Abuse.ch feeds** (FeodoTracker + ThreatFox) — daily threat snapshot
- **EIA** — PADD gasoline (~2 min on first bootstrap, 10 years × 5 regions), STEO forecasts
- **Build scripts** — assemble `data/<analysis>/` CSVs from the per-series caches

All caches are under `data/<analysis>/cache/` and committed to `main` so CI (and other machines) can do fast incremental updates.

### 5 · Render the site

```sh
quarto render              # full build → _site/
# or
quarto preview             # local dev server with hot reload
```

Post-render scripts run automatically after every render:

1. `scripts/patch_jquery.py` — swaps bundled jQuery 1.11.3 → 3.7.1 inside vendored widget libs
2. `scripts/purge_vendor_metadata.py` — deletes `package.json` / lockfiles inside `_site/site_libs/` (silences Dependabot alerts for library-author-only devDeps)
3. `scripts/stamp_updated.py` — replaces the `SITE_UPDATED_AT_PLACEHOLDER` sentinel in the footer with a UTC build timestamp

Open `_site/index.html` directly or let `quarto preview` pop the browser.

### 6 · Run the Post-Deploy Verification suite (optional)

```sh
cd tests/pdv
npm ci
npx playwright install --with-deps chromium

# In another shell, serve the local build
python3 -m http.server 8000 --directory ../../_site &

# Run the tests against the local server
PDV_BASE_URL=http://localhost:8000 npx playwright test
```

The suite currently has **141 tests** across page renders, SEO metadata, JSON-LD structured data, CSV data availability, chart widget presence, responsive layouts (iPhone / Pixel / iPad / desktop), jQuery version gate, and no-console-errors on every page.

### Troubleshooting

- **`quarto render` exits silently without producing HTML.** Usually the `_freeze/` cache is stale after a data-shape change. `rm -rf _freeze && quarto render` to force a full re-execute.
- **`Rscript R/generate_data.R` fails on an API call.** Every fetcher is wrapped in `tryCatch`; a failure warns and continues with the prior cache. Re-run once the upstream is back.
- **Chart titles / legends overlap in my downstream edits.** The layout budget is documented in `R/helpers.R` next to the theme JSON — don't put widgets inside panels narrower than ~600 px.

## Publishing

The workflow at `.github/workflows/publish.yml` runs on every push to `main`,
renders the site, and deploys `_site/` to the `gh-pages` branch.

To enable GitHub Pages for this repo:

1. Push to `main` at least once so the workflow creates the `gh-pages` branch.
2. **Settings → Pages → Build and deployment → Source** → `Deploy from a branch`
3. **Branch** → `gh-pages` / `/ (root)` → **Save**

For a custom domain, add a `CNAME` file to the repo root (Quarto will copy it
into `_site/` when listed under `resources:` in `_quarto.yml`).

## Data

The current dataset is a **calibrated synthetic** prototype — see
[`about.qmd`](about.qmd) for full provenance. Historical values for 2001–2024
are hand-entered from BEA / BLS / Federal Reserve / NBER public releases;
values for 2025 and 2026 are *illustrative*, not forecasts.

### Swap in live FRED data

`R/generate_data.R` is the only place data is produced. To replace the
synthetic annual block with live FRED pulls:

```r
install.packages("fredr")
fredr::fredr_set_key(Sys.getenv("FRED_API_KEY"))

# then replace the tribble() call in generate_data.R with
# fredr::fredr(series_id = "GDPC1", ...) etc.
```

Series IDs: `GDPC1` (real GDP), `UNRATE` (unemployment), `CPIAUCSL` (CPI),
`FEDFUNDS`, `DGS10` (10Y Treasury), `SP500`, `DJIA`, `NASDAQCOM`, `VIXCLS`,
`USREC` (NBER recession indicator).

## License

Code: MIT. Data: synthetic / derived from public-domain US government series.
