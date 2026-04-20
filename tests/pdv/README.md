# Post-Deploy Verification (PDV)

Playwright tests that run against the live `samcaldwell.info` deployment after
every successful `actions/deploy-pages` step. Spec files live flat in this
directory.

## What's covered

| Spec | Checks |
|---|---|
| `home.spec.js` | `/` renders, navbar + brand + three top-level links, analyses grid (two live cards + placeholder), footer copyright + Sonora TX + samcaldwell.net link, favicon |
| `economy.spec.js` | Each `/economy/*.html` loads with correct title, key content strings, expected minimum count of `.html-widget` elements, no uncaught JS errors. Extra checks for reactable + sparkline on `indicators.html`. |
| `presidential.spec.js` | Each `/presidential-economies/*.html` page renders with expected widgets + content. Extra checks for the new fiscal charts and the 6-administration summary table. |
| `seo.spec.js` | `meta[name=author/keywords/geo.*]` present, canonical link correct, JSON-LD Person + WebSite schemas valid, **no `og:*` / `twitter:*` / `fb:*` / `instagram:*` / `tiktok:*` tags anywhere** (platform exclusion policy). |
| `data.spec.js` | All 9 CSVs under `/data/economy/` and `/data/presidential-economies/` return 200, have expected column headers, and meet minimum row counts. |
| `console-errors.spec.js` | For every page: zero `pageerror`, zero `console.error()` (outside a small ignore list), zero same-origin 4xx/5xx resource fetches. |

## Running locally

```sh
cd tests/pdv
npm install
npx playwright install --with-deps chromium
npx playwright test
```

Override the base URL (default: `https://samcaldwell.info`):

```sh
PDV_BASE_URL=http://localhost:8000 npx playwright test
```

## CI

Tests run in the `pdv` job of `.github/workflows/publish.yml`, gated on
`deploy` success. The HTML report is uploaded as an artifact named
`pdv-report` on every run (success or failure), retained for 14 days.
