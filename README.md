# samcaldwell.info

Interactive, static-HTML analysis of the US economy — 2026 placed against the
prior 25 years, with drill-down comparisons between economic fundamentals and
market performance. Built with Quarto and a pure open-source charting stack;
designed to render and deploy to GitHub Pages.

## Live site

Once GitHub Pages is enabled for this repo the site is served at the address
configured in the repo settings (typically `https://<owner>.github.io/<repo>/`
or a custom domain).

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

## Prerequisites

- R ≥ 4.2
- Quarto ≥ 1.4

Install R package dependencies:

```r
install.packages(c(
  "echarts4r", "plotly", "reactable", "sparkline", "crosstalk",
  "dplyr", "tidyr", "readr", "purrr", "scales", "htmltools", "rprojroot"
))
```

## Build locally

```sh
# (Re)generate the CSV dataset — only needed if R/generate_data.R changed
Rscript R/generate_data.R

# Render the site into _site/
quarto render

# Or preview with live-reload
quarto preview
```

Open `_site/index.html` in a browser, or let `quarto preview` do it for you.

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
