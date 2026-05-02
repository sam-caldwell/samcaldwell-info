import { defineConfig } from 'vite';
import { specifyJsSeoPlugin } from '@asymmetric-effort/specifyjs/build';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const allRoutes = [
  '/#/',
  '/#/economy', '/#/economy/growth', '/#/economy/indicators', '/#/economy/unemployment', '/#/economy/markets', '/#/economy/about',
  '/#/presidential', '/#/presidential/growth', '/#/presidential/markets', '/#/presidential/fiscal', '/#/presidential/about',
  '/#/sentiment', '/#/sentiment/approval', '/#/sentiment/economic', '/#/sentiment/media', '/#/sentiment/society', '/#/sentiment/network', '/#/sentiment/about',
  '/#/cybersecurity', '/#/cybersecurity/threats', '/#/cybersecurity/botnets', '/#/cybersecurity/cves', '/#/cybersecurity/about',
  '/#/energy', '/#/energy/us-markets', '/#/energy/intl-markets', '/#/energy/supply-demand', '/#/energy/events', '/#/energy/forecasts', '/#/energy/prices-map', '/#/energy/change-map', '/#/energy/about',
  '/#/west-texas', '/#/west-texas/unemployment', '/#/west-texas/income', '/#/west-texas/gdp', '/#/west-texas/about',
  '/#/fcc', '/#/fcc/by-type', '/#/fcc/by-year', '/#/fcc/ham-decisions', '/#/fcc/gmrs-decisions', '/#/fcc/gmrs-felony', '/#/fcc/about',
];

export default defineConfig({
  resolve: {
    alias: {
      // Route browser-side specifyjs imports to the unified bundle where hooks
      // and the DOM reconciler share the same currentDispatcher variable.
      // Note: @asymmetric-effort/specifyjs/build is NOT aliased — it's a
      // Node.js Vite plugin that runs at build time, not in the browser.
      'specifyjs': resolve(__dirname, 'lib/specifyjs-unified.esm.js'),
      '@asymmetric-effort/specifyjs/components': resolve(__dirname, 'lib/specifyjs-unified.esm.js'),
      '@asymmetric-effort/specifyjs/dom': resolve(__dirname, 'lib/specifyjs-unified.esm.js'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    specifyJsSeoPlugin({
      siteUrl: 'https://samcaldwell.info',
      title: 'samcaldwell.info \u2014 Analytics',
      description: 'Interactive visual analyses of public topics \u2014 US economy, presidential comparisons, public sentiment, cybersecurity threats, energy markets, West Texas regional data, and FCC license applications.',
      routes: allRoutes,
      author: 'Sam Caldwell',
      license: 'MIT',
      repository: 'https://github.com/sam-caldwell/samcaldwell.info',
    }),
  ],
});
