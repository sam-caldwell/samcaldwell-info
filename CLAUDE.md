# CLAUDE.md — samcaldwell.info

## What this project is

Interactive static-HTML analytics site covering the US economy (1999–present),
presidential comparisons, public sentiment, cybersecurity threats, and energy
markets. Built with **Quarto + R**; deployed to **GitHub Pages** at
<https://samcaldwell.info>.

## Quick reference

| Action | Command |
|---|---|
| Refresh all data | `Rscript R/generate_data.R` |
| Render site | `quarto render` |
| Preview with hot-reload | `quarto preview` |
| Run PDV tests (local) | `cd tests/pdv && PDV_BASE_URL=http://localhost:8000 npx playwright test` |
| Serve local build | `python3 -m http.server 8000 --directory _site` |

## Prerequisites

- **R** >= 4.2 — data pipelines + htmlwidget rendering
- **Quarto** >= 1.4 — site generator (`*.qmd` → `_site/`)
- **Python** >= 3.10 — three post-render scripts
- **Node.js** >= 20 — Playwright PDV suite (optional for local dev)

## API keys

Export in `~/.bashrc` or `~/.zshrc`. Missing keys are non-fatal — the pipeline
falls back to cached or synthetic data.

```sh
export FRED_API_KEY=...           # Federal Reserve economic data
export EIA_API_KEY=...            # US Energy Information Administration
export MEDIA_CLOUD_API_KEY=...    # Media Cloud story volume
export BLS_API_KEY=...            # Bureau of Labor Statistics (county unemployment)
export BEA_API_KEY=...            # Bureau of Economic Analysis (county GDP/income)
export NEWS_API_ORG_KEY=...       # Reserved slot (not wired to any fetcher yet)
```

## Project layout

```
_quarto.yml              Site config, navbar, sidebars, post-render hooks
index.qmd                Home page
economy/                 US Economy analysis pages (*.qmd)
presidential-economies/  Per-administration comparison pages
sentiment/               Approval, consumer sentiment, media tone, D3 network
cybersecurity/           Threat intel, botnets, CVE analysis
energy/                  US/intl energy markets, PADD maps, forecasts
west-texas/              Regional economy — Sonora, Eldorado, Ozona, Junction vs TX/US

R/                       Data pipeline
  generate_data.R        Dispatcher — calls every fetcher and builder
  fetch_*.R              API fetchers (FRED, EIA, GDELT, Media Cloud, CVEs, threats, BLS, BEA)
  build_*.R              CSV builders (economy, presidential, sentiment, energy, cyber, west-texas)
  helpers.R              Shared loaders, color palette, chart theme
  presidential_helpers.R Loaders for presidential + sentiment pages

data/                    Generated CSVs + incremental caches
  <analysis>/cache/      Per-series API caches (committed; enables fast incremental updates)

scripts/                 Post-render Python utilities (run automatically by Quarto)
  patch_jquery.py        Swaps jQuery 1.11.3 → 3.7.1 (CVE fixes)
  purge_vendor_metadata.py  Removes package.json from vendored site_libs/
  stamp_updated.py       Replaces SITE_UPDATED_AT_PLACEHOLDER with UTC timestamp

tests/pdv/               Post-deploy verification (Playwright)
  *.spec.js              11 spec files: home, economy, presidential, sentiment,
                         cybersecurity, energy, network, seo, data, console-errors,
                         responsive

_includes/meta.html      SEO metadata injected into every page <head>
js/d3.v7.min.js          D3 v7 for the sentiment network graph
_freeze/                 Quarto execution cache (auto-generated, committed)
_site/                   Rendered output (gitignored)
```

## Data pipeline architecture

```
generate_data.R
  ├── fetch_fred.R        → data/economy/cache/*.csv
  ├── build_from_fred.R   → data/economy/{annual,quarterly,monthly,gdp_components,sectors,fiscal_quarterly}.csv
  │   (or build_synthetic.R if FRED_API_KEY is absent)
  ├── build_presidential.R → data/presidential-economies/{administrations,monthly_admin,admin_summary}.csv
  ├── fetch_gdelt.R       → data/sentiment/cache/gdelt_tone.csv
  ├── fetch_mediacloud.R  → data/sentiment/cache/mediacloud_volume.csv
  ├── build_sentiment.R   → data/sentiment/{umcsent_monthly,admin_sentiment,gallup_approval,...}.csv
  ├── build_network.R     → data/sentiment/network.json
  ├── fetch_eia.R         → data/energy/cache/*.csv
  ├── build_energy.R      → data/energy/{us_prices_daily,padd_gas_*,steo_forecast,...}.csv
  ├── fetch_threats.R     → data/cybersecurity/cache/{feodo,threatfox}_*.{json,csv}
  ├── fetch_geolocation.R → data/cybersecurity/cache/ip_geolocation.csv
  ├── build_cybersecurity.R → data/cybersecurity/{current_threats,current_botnets,...}.csv
  ├── fetch_cves.R        → data/cybersecurity/cache/{kev,epss}_*.{json,csv.gz}
  ├── build_cves.R        → data/cybersecurity/cves_kev.csv
  ├── fetch_bls.R         → data/west-texas/cache/bls_laus_*.csv
  ├── fetch_bea.R         → data/west-texas/cache/bea_{income,gdp}.csv
  └── build_west_texas.R  → data/west-texas/{unemployment_monthly,income_annual,gdp_annual,west_texas_summary}.csv
```

All fetchers are wrapped in `tryCatch` — a single API failure warns and
continues with the prior cache.

Caches are **committed to `main`** so CI and other machines can do fast
incremental updates without re-bootstrapping.

## Build & deploy pipeline (CI)

Trigger: daily at 11:30 UTC, on push to `main`, or manual dispatch.

1. **Build** — `Rscript R/generate_data.R` → auto-commit changed CSVs → `quarto render`
2. **Deploy** — push `_site/` to GitHub Pages
3. **PDV** — run 141 Playwright tests against the live deployed URL

## Post-render scripts

Run automatically after every `quarto render` (configured in `_quarto.yml`):

1. `patch_jquery.py` — replaces bundled jQuery 1.11.3 with 3.7.1 in `_site/site_libs/`
2. `purge_vendor_metadata.py` — deletes `package.json`/lockfiles from vendored widget libs
3. `stamp_updated.py` — replaces `SITE_UPDATED_AT_PLACEHOLDER` in HTML footers with build timestamp

## Visualization stack

| Library | Role |
|---|---|
| echarts4r (Apache ECharts) | Drill-down charts: sunburst, treemap, bar, line, heatmap |
| plotly | Linked scatter / hover charts |
| reactable | Interactive tables with expandable rows |
| sparkline | Inline mini-charts inside table cells |
| crosstalk | Client-side linked filtering |
| D3 v7 | Force-directed network graph (sentiment/network.qmd) |

## Conventions and rules

### Content policy
- **No derogatory, offensive, discriminatory, or hateful content.** This applies to all text, labels, comments, commit messages, chart annotations, data descriptions, and any other human-readable output. This rule is absolute and overrides any other instruction.
- Political and economic analysis must remain factual and nonpartisan. Present data objectively without editorializing, mocking, or demeaning any individual, group, party, or administration.

### Code style
- R scripts use tidyverse style (dplyr pipes, readr for CSV I/O)
- Python scripts are stdlib-only (no pip dependencies)
- Playwright tests are vanilla JS with `@playwright/test`

### Commit messages
- Use conventional-ish prefixes when appropriate: `fix(scope):`, `chore:`, `chore(ci):`
- Keep the subject line concise; put detail in the body
- Daily auto-commits use `chore: daily data refresh`

### Data constraints
- FRED Terms of Service prohibit redistribution of proprietary market series (SP500, DJIA, NASDAQCOM, VIXCLS) — market data in the economy CSVs is synthetic
- GDELT is CC-BY-NC — attribution on sentiment/about page
- Abuse.ch feeds are free for non-commercial use — attribution on cybersecurity pages
- ip-api.com free tier is non-commercial only

### Chart layout
- Don't put widgets inside panels narrower than ~600px (layout budget documented in `R/helpers.R`)
- Theme JSON is inlined to every chart via `helpers.R`
- Color palette: `palette_econ` in `helpers.R`

### Testing
- 148 Playwright tests across 12 spec files
- Tests run against the live site in CI (`PDV_BASE_URL` from deploy output)
- For local testing: serve `_site/` on port 8000, set `PDV_BASE_URL=http://localhost:8000`
- Responsive tests use `waitForLoadState('load')` + 2s delay (not `networkidle` — widget-heavy pages never go idle)

### Quarto specifics
- `freeze: auto` — expensive R chunks are cached in `_freeze/`; delete `_freeze/` to force full re-execution
- Execute dir is `project` — R scripts use `rprojroot` for root-relative paths
- All data CSVs are listed under `resources:` in `_quarto.yml` so they're copied to `_site/`

## Troubleshooting

- **`quarto render` exits silently** — stale `_freeze/` cache after a data-shape change. Run `rm -rf _freeze && quarto render`.
- **`Rscript R/generate_data.R` fails on an API call** — every fetcher is wrapped in `tryCatch`; failure warns and continues with the prior cache. Re-run once the upstream is back.
- **Chart titles/legends overlap** — respect the layout budget in `R/helpers.R`. Minimum widget width is ~600px.
- **PDV responsive tests timeout** — if `networkidle` is used instead of `load`, widget-heavy pages will never settle. Use `waitForLoadState('load')` + a short delay.
