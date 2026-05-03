/** Color palette matching R/helpers.R palette_econ */
export const palette = {
  growth: '#2a6f97',
  labor: '#e07a5f',
  inflation: '#bc4749',
  rates: '#6a4c93',
  markets: '#2f9e44',
  recession: '#000000',
  dark: '#343a40',
  mid: '#6c757d',
  lite: '#adb5bd',
  positive: '#2f9e44',
  negative: '#bc4749',
  warn: '#f2c14e',
} as const;

/** Party colors matching R/presidential_helpers.R */
export const partyColors = {
  Democratic: '#2a6f97',
  Republican: '#bc4749',
} as const;

/** System font stack matching _quarto.yml mainfont */
export const fontStack = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** Inject global CSS variables and base styles with dark mode support */
export function injectGlobalStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --color-growth: ${palette.growth};
      --color-labor: ${palette.labor};
      --color-inflation: ${palette.inflation};
      --color-rates: ${palette.rates};
      --color-markets: ${palette.markets};
      --color-recession: ${palette.recession};
      --color-dark: ${palette.dark};
      --color-mid: ${palette.mid};
      --color-lite: ${palette.lite};
      --color-positive: ${palette.positive};
      --color-negative: ${palette.negative};
      --color-warn: ${palette.warn};
      --font-stack: ${fontStack};

      /* Semantic theme tokens — light mode defaults */
      --bg-page: #f8f9fa;
      --bg-surface: #ffffff;
      --bg-surface-hover: #f3f4f6;
      --bg-surface-selected: #eff6ff;
      --bg-code: #f8f9fa;
      --text-primary: #212529;
      --text-secondary: #495057;
      --text-muted: #6c757d;
      --text-heading: #1d3557;
      --text-link: ${palette.growth};
      --border-color: #e5e7eb;
      --border-light: #dee2e6;
    }

    [data-theme="dark"] {
      --bg-page: #121212;
      --bg-surface: #1e1e1e;
      --bg-surface-hover: #2a2a2a;
      --bg-surface-selected: #1a2744;
      --bg-code: #2a2a2a;
      --text-primary: #e0e0e0;
      --text-secondary: #b0b0b0;
      --text-muted: #888888;
      --text-heading: #a8c8e8;
      --text-link: #5ba3d9;
      --border-color: #333333;
      --border-light: #3a3a3a;
    }

    *, *::before, *::after { box-sizing: border-box; }

    html {
      font-family: var(--font-stack);
      font-size: 16px;
      line-height: 1.6;
      color: var(--text-primary);
      -webkit-font-smoothing: antialiased;
    }

    body {
      margin: 0;
      padding: 0;
      background: var(--bg-page);
      transition: background-color 0.2s, color 0.2s;
    }

    #app {
      display: flex;
      min-height: 100vh;
    }

    .app-layout {
      display: flex;
      width: 100%;
      min-height: 100vh;
    }

    .app-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow-x: hidden;
    }

    .app-content {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 32px;
    }

    h1 { font-size: 1.75rem; font-weight: 600; color: var(--text-heading); margin: 0 0 8px; }
    h2 { font-size: 1.35rem; font-weight: 600; color: var(--text-heading); margin: 24px 0 12px; }
    h3 { font-size: 1.15rem; font-weight: 600; color: var(--text-heading); margin: 20px 0 8px; }

    p { margin: 0 0 12px; color: var(--text-secondary); }

    a { color: var(--text-link); text-decoration: none; }
    a:hover { text-decoration: underline; }

    pre { background: var(--bg-code) !important; color: var(--text-secondary); }

    /* SpecifyJS Sidebar dark mode overrides */
    [data-theme="dark"] nav[aria-label="Sidebar"] {
      background-color: var(--bg-surface) !important;
      border-color: var(--border-color) !important;
    }
    [data-theme="dark"] nav[aria-label="Sidebar"] button {
      color: var(--text-primary) !important;
    }
    [data-theme="dark"] nav[aria-label="Sidebar"] button[aria-selected="true"] {
      background-color: var(--bg-surface-selected) !important;
      color: var(--text-link) !important;
    }
    [data-theme="dark"] nav[aria-label="Sidebar"] button:hover {
      background-color: var(--bg-surface-hover) !important;
    }
    /* Sidebar collapse toggle */
    [data-theme="dark"] nav[aria-label="Sidebar"] > button {
      border-color: var(--border-color) !important;
      color: var(--text-muted) !important;
    }

    /* SpecifyJS DataGrid dark mode overrides */
    [data-theme="dark"] table {
      color: var(--text-primary);
    }
    [data-theme="dark"] table th {
      background-color: var(--bg-surface) !important;
      color: var(--text-heading) !important;
      border-color: var(--border-color) !important;
    }
    [data-theme="dark"] table td {
      border-color: var(--border-color) !important;
      color: var(--text-primary) !important;
    }
    [data-theme="dark"] table tr:nth-child(even) td {
      background-color: var(--bg-surface-hover) !important;
    }
    [data-theme="dark"] table tr:hover td {
      background-color: var(--bg-surface-selected) !important;
    }
    /* DataGrid pagination and controls */
    [data-theme="dark"] input,
    [data-theme="dark"] select {
      background-color: var(--bg-surface) !important;
      color: var(--text-primary) !important;
      border-color: var(--border-color) !important;
    }

    /* SpecifyJS VizWrapper / chart container overrides */
    [data-theme="dark"] [class*="viz"],
    [data-theme="dark"] [style*="border: 1px solid"] {
      border-color: var(--border-color) !important;
    }

    /* SVG chart text readability in dark mode */
    [data-theme="dark"] svg text {
      fill: var(--text-secondary) !important;
    }
    [data-theme="dark"] svg line,
    [data-theme="dark"] svg .tick line {
      stroke: var(--border-color) !important;
    }

    /* SpecifyJS ValueCard overrides */
    [data-theme="dark"] [style*="background: #fff"],
    [data-theme="dark"] [style*="background-color: #fff"],
    [data-theme="dark"] [style*="background: white"],
    [data-theme="dark"] [style*="background-color: white"],
    [data-theme="dark"] [style*="background: rgb(255"],
    [data-theme="dark"] [style*="background-color: rgb(255"] {
      background-color: var(--bg-surface) !important;
    }

    /* SpecifyJS Callout overrides */
    [data-theme="dark"] [role="alert"],
    [data-theme="dark"] [role="note"] {
      background-color: var(--bg-surface-hover) !important;
      border-color: var(--border-color) !important;
      color: var(--text-primary) !important;
    }

    /* Footer in dark mode */
    [data-theme="dark"] .app-footer,
    [data-theme="dark"] footer {
      background-color: var(--bg-surface) !important;
      color: var(--text-muted) !important;
      border-color: var(--border-color) !important;
    }

    /* Generic overrides for inline light-mode colors in dark mode */
    [data-theme="dark"] [style*="color: #495057"],
    [data-theme="dark"] [style*="color: rgb(73, 80, 87)"] {
      color: var(--text-secondary) !important;
    }
    [data-theme="dark"] [style*="color: #6c757d"],
    [data-theme="dark"] [style*="color: rgb(108, 117, 125)"] {
      color: var(--text-muted) !important;
    }
    [data-theme="dark"] [style*="color: #1d3557"],
    [data-theme="dark"] [style*="color: rgb(29, 53, 87)"] {
      color: var(--text-heading) !important;
    }
    [data-theme="dark"] [style*="color: #212529"],
    [data-theme="dark"] [style*="color: rgb(33, 37, 41)"] {
      color: var(--text-primary) !important;
    }
    [data-theme="dark"] [style*="color: #1f2937"] {
      color: var(--text-primary) !important;
    }
    [data-theme="dark"] [style*="background: #f8f9fa"],
    [data-theme="dark"] [style*="background-color: #f8f9fa"] {
      background-color: var(--bg-code) !important;
    }

    /* Responsive sidebar collapse */
    @media (max-width: 768px) {
      .app-content { padding: 16px; }
      h1 { font-size: 1.5rem; }
      h2 { font-size: 1.2rem; }
    }

    /* Print */
    @media print {
      .app-sidebar, .app-footer { display: none !important; }
      .app-content { max-width: 100%; padding: 0; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialize dark mode based on system preference.
 * Sets data-theme="dark" on <html> when prefers-color-scheme: dark matches.
 * Listens for changes to track system setting in real time.
 */
export function initDarkMode(): void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');

  function apply(dark: boolean) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  apply(mq.matches);
  mq.addEventListener('change', (e) => apply(e.matches));
}
