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

/** Inject global CSS variables and base styles */
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
    }

    *, *::before, *::after { box-sizing: border-box; }

    html {
      font-family: var(--font-stack);
      font-size: 16px;
      line-height: 1.6;
      color: #212529;
      -webkit-font-smoothing: antialiased;
    }

    body {
      margin: 0;
      padding: 0;
      background: #f8f9fa;
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

    h1 { font-size: 1.75rem; font-weight: 600; color: #1d3557; margin: 0 0 8px; }
    h2 { font-size: 1.35rem; font-weight: 600; color: #1d3557; margin: 24px 0 12px; }
    h3 { font-size: 1.15rem; font-weight: 600; color: #1d3557; margin: 20px 0 8px; }

    p { margin: 0 0 12px; color: #495057; }

    a { color: ${palette.growth}; text-decoration: none; }
    a:hover { text-decoration: underline; }

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
