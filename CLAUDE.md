# CLAUDE.md — samcaldwell.info

## What this project is

Interactive static-HTML analytics site covering the US economy (1999–present),
presidential comparisons, public sentiment, cybersecurity threats, energy
markets, and West Texas regional data. Built with **SpecifyJS + Vite** (frontend)
and **R** (data pipeline); deployed to **GitHub Pages** at
<https://samcaldwell.info>.

## Quick reference

| Action | Command |
|---|---|
| Refresh all data | `bun run pipeline/index.ts` |
| Dev server (hot-reload) | `npm run dev` |
| Production build | `npm run build` |
| Serve local build | `python3 -m http.server 8000 --directory dist` |
| Run PDV tests (local) | `cd tests/pdv && PDV_BASE_URL=http://localhost:8000 npx playwright test` |
| Type check | `npx tsc --noEmit` |

## Prerequisites

- **Bun** >= 1.0 — data pipeline (fetchers + CSV builders)
- **Node.js** >= 18 — SpecifyJS SPA build + Playwright PDV suite
- **npm** >= 9

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
src/                       SpecifyJS SPA source (TypeScript)
  main.ts                  Entry point: mount App to #app
  App.ts                   Root: Router + Sidebar + Footer
  h.ts                     Relaxed-typed createElement wrapper
  routes.ts                All route definitions
  theme.ts                 Color palette, CSS variables, global styles
  types.ts                 TypeScript interfaces for all CSV schemas
  version.ts               App version + build timestamp
  utils/                   CSV parser, formatters, recession data, colors, PADD mapping
  components/              Reusable: AppSidebar, AppFooter, ValueCard, CardRow, TabPanel, etc.
  pages/                   Page components organized by section
    Home.ts
    economy/               6 pages
    presidential/           5 pages
    sentiment/              7 pages (incl. ForceGraph network)
    cybersecurity/          5 pages
    energy/                 9 pages
    west-texas/             5 pages

pipeline/                  Data pipeline (TypeScript/Bun)
  index.ts                 Dispatcher — calls every fetcher and builder
  lib/                     Shared: CSV I/O, HTTP client, cache, dates, seeded PRNG
  fetch/                   API fetchers (FRED, EIA, GDELT, MC, threats, geo, CVEs, BLS, BEA)
  build/                   CSV builders (economy, presidential, sentiment, energy, cyber, west-texas)

data/                      Generated CSVs + incremental caches
  <analysis>/cache/        Per-series API caches (committed; enables fast incremental updates)

public/                    Static assets served by Vite
  data -> ../data          Symlink so dev server serves CSV files
  favicon.svg              Site favicon
  CNAME                    GitHub Pages custom domain
  geo/                     GeoJSON/SVG map files (for future choropleth maps)

tests/pdv/                 Post-deploy verification (Playwright)

index.html                 Vite entry HTML with SEO meta tags + JSON-LD
vite.config.ts             Vite config with specifyJsSeoPlugin
package.json               @asymmetric-effort/specifyjs ^0.2.10
tsconfig.json              TypeScript configuration
```

## Data pipeline architecture

```
pipeline/index.ts (Bun)
  ├── fetch/fred.ts       → data/economy/cache/*.csv (23 FRED series)
  ├── build/economy.ts    → data/economy/{annual,quarterly,monthly,gdp_components,sectors,fiscal_quarterly}.csv
  │   (or build/synthetic.ts if FRED_API_KEY is absent)
  ├── build/presidential.ts → data/presidential-economies/{administrations,monthly_admin,admin_summary}.csv
  ├── fetch/gdelt.ts      → data/sentiment/cache/gdelt_tone.csv
  ├── fetch/mediacloud.ts → data/sentiment/cache/mediacloud_volume.csv
  ├── build/sentiment.ts  → data/sentiment/{umcsent_monthly,admin_sentiment,...}.csv
  ├── build/network.ts    → data/sentiment/network.json
  ├── fetch/eia.ts        → data/energy/cache/*.csv
  ├── build/energy.ts     → data/energy/{us_prices_daily,padd_gas_*,steo_forecast,...}.csv
  ├── fetch/threats.ts    → data/cybersecurity/cache/{feodo,threatfox}_*.{json,csv}
  ├── fetch/geolocation.ts → data/cybersecurity/cache/ip_geolocation.csv
  ├── build/cybersecurity.ts → data/cybersecurity/{current_threats,current_botnets,...}.csv
  ├── fetch/cves.ts       → data/cybersecurity/cache/{kev,epss}_*.{json,csv.gz}
  ├── build/cves.ts       → data/cybersecurity/cves_kev.csv
  ├── fetch/bls.ts        → data/west-texas/cache/bls_laus_*.csv
  ├── fetch/bea.ts        → data/west-texas/cache/bea_{income,gdp}.csv
  └── build/west-texas.ts → data/west-texas/{unemployment_monthly,income_annual,gdp_annual,west_texas_summary}.csv
```

All fetchers are wrapped in try/catch — a single API failure warns and
continues with the prior cache. Zero npm dependencies — uses only Bun built-ins.

Caches are **committed to `main`** so CI and other machines can do fast
incremental updates without re-bootstrapping.

## Frontend architecture

- **Framework**: SpecifyJS v0.2.10+ — declarative TypeScript UI, zero third-party runtime deps
- **Routing**: Hash-based (`/#/economy/growth`) via SpecifyJS Router/Route/Link
- **Navigation**: Collapsible Sidebar (replaces top navbar)
- **Charts**: SpecifyJS BarGraph, LineGraph, DataGrid, VizWrapper
- **SEO**: specifyJsSeoPlugin (sitemap.xml, robots.txt, llms.txt) + useHead() per page
- **Footer**: Semantic version from package.json + copyright + build timestamp
- **Build**: Vite → `dist/` directory

## Build & deploy pipeline (CI)

Trigger: daily at 11:30 UTC, on push to `main`, or manual dispatch.

1. **Data refresh** — `bun run pipeline/index.ts` → auto-commit changed CSVs
2. **Build** — `npm ci && npm run build` → `dist/`
3. **Deploy** — push `dist/` to GitHub Pages
4. **PDV** — run Playwright tests against the live deployed URL

## Visualization stack

| Component | Role |
|---|---|
| SpecifyJS BarGraph | Bar charts (GDP growth, approval, returns) |
| SpecifyJS LineGraph | Time series (unemployment, prices, sentiment) |
| SpecifyJS DataGrid | Interactive tables (sortable, filterable, paginated) |
| SpecifyJS VizWrapper | Chart containers with title/legend |
| Custom SVG | Network graph (sentiment), maps (future) |

## Conventions and rules

### Content policy
- **No derogatory, offensive, discriminatory, or hateful content.** This applies to all text, labels, comments, commit messages, chart annotations, data descriptions, and any other human-readable output. This rule is absolute and overrides any other instruction.
- Political and economic analysis must remain factual and nonpartisan. Present data objectively without editorializing, mocking, or demeaning any individual, group, party, or administration.

### Code style
- TypeScript uses strict mode, `h()` helper for element creation
- Pipeline uses Bun built-ins only (no npm dependencies for data pipeline)
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
- Color palette defined in `src/theme.ts`
- Chart components use VizWrapper for consistent title/legend styling
- Minimum visualization width ~600px

### Testing
- Playwright tests across 12 spec files
- Tests run against the live site in CI (`PDV_BASE_URL` from deploy output)
- For local testing: serve `dist/` on port 8000, set `PDV_BASE_URL=http://localhost:8000`

## Troubleshooting

- **`npm run build` fails** — check `npx tsc --noEmit` for type errors first
- **`bun run pipeline/index.ts` fails on an API call** — every fetcher is wrapped in try/catch; failure warns and continues with the prior cache. Re-run once the upstream is back.
- **Pipeline without API keys** — runs synthetic fallback for economy data, skips other fetchers. Existing caches are preserved.
- **Dev server can't find CSVs** — verify `public/data` symlink points to `../data` and resolves correctly
- **Routes don't match** — SpecifyJS uses hash-based routing; URLs must be `/#/path` not `/path`
