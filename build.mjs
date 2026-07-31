import { build } from '@asymmetric-effort/steamroller';
import { specifyJsSeoPlugin } from '@asymmetric-effort/specifyjs/build';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const outDir = 'dist';

// Clean output directory
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true });
}
mkdirSync(outDir, { recursive: true });
mkdirSync(resolve(outDir, 'assets'), { recursive: true });

// Step 1: Transpile TypeScript to JavaScript
console.log('Transpiling TypeScript...');
const tsBuildDir = '.ts-out';
if (existsSync(tsBuildDir)) {
  rmSync(tsBuildDir, { recursive: true });
}
execSync(
  `npx tsc --outDir ${tsBuildDir} --module ESNext --moduleResolution bundler ` +
  `--target ES2022 --jsx react-jsx --jsxImportSource specifyjs ` +
  `--skipLibCheck --esModuleInterop --allowSyntheticDefaultImports ` +
  `--noEmit false --declaration false --sourceMap false ` +
  `--strict --resolveJsonModule --isolatedModules`,
  { stdio: 'inherit' }
);

// Step 2: Inject define constants into transpiled source before bundling
const appVersion = JSON.stringify(pkg.version);
const buildTimestamp = JSON.stringify(new Date().toISOString());
const versionPath = resolve(`${tsBuildDir}/version.js`);
if (existsSync(versionPath)) {
  let versionCode = readFileSync(versionPath, 'utf-8');
  versionCode = versionCode.replace(/\b__APP_VERSION__\b/g, appVersion);
  versionCode = versionCode.replace(/\b__BUILD_TIMESTAMP__\b/g, buildTimestamp);
  writeFileSync(versionPath, versionCode);
}

// Step 3: Bundle project code with steamroller (specifyjs as external)
console.log('Bundling with steamroller...');
const result = await build({
  entryPoints: [resolve(`${tsBuildDir}/main.js`)],
  outdir: resolve(outDir, 'assets'),
  format: 'esm',
  bundle: true,
  external: [
    'specifyjs',
    '@asymmetric-effort/specifyjs/dom',
    '@asymmetric-effort/specifyjs/components',
    'specifyjs/jsx-runtime',
  ],
});

if (result.errors.length > 0) {
  console.error('Build errors:', result.errors);
  process.exit(1);
}

// Write the bundled output with content hash for cache busting
const bundleFile = result.outputFiles[0];
const bundleCode = bundleFile.text;
const hash = createHash('md5').update(bundleCode).digest('hex').slice(0, 8);
const bundleFileName = `index-${hash}.js`;
writeFileSync(resolve(outDir, 'assets', bundleFileName), bundleCode);

// Step 4: Copy the pre-built specifyjs unified bundle
console.log('Copying specifyjs runtime...');
const unifiedSrc = resolve('lib/specifyjs-unified.esm.js');
const unifiedDest = resolve(outDir, 'assets/specifyjs-unified.esm.js');
cpSync(unifiedSrc, unifiedDest);

// Step 5: Generate index.html with import map + script reference
console.log('Generating index.html...');
let html = readFileSync('index.html', 'utf-8');

const importMap = {
  imports: {
    'specifyjs': '/assets/specifyjs-unified.esm.js',
    '@asymmetric-effort/specifyjs/dom': '/assets/specifyjs-unified.esm.js',
    '@asymmetric-effort/specifyjs/components': '/assets/specifyjs-unified.esm.js',
    'specifyjs/jsx-runtime': '/assets/specifyjs-unified.esm.js',
  }
};

html = html.replace(
  /<script type="module" src="\/src\/main\.ts"><\/script>/,
  `<script type="importmap">\n${JSON.stringify(importMap, null, 2)}\n</script>\n  <script type="module" src="/assets/${bundleFileName}"></script>`
);
writeFileSync(resolve(outDir, 'index.html'), html);

// Step 6: Copy static assets
console.log('Copying static assets...');
for (const src of ['favicon.svg', 'CNAME']) {
  for (const base of ['public/', '']) {
    const p = `${base}${src}`;
    if (existsSync(p)) cpSync(p, resolve(outDir, src), { force: true });
  }
}
if (existsSync('public/geo')) {
  cpSync('public/geo', resolve(outDir, 'geo'), { recursive: true });
}

// Step 7: Run SEO plugin closeBundle hook
console.log('Generating SEO files...');
const seoPlugin = specifyJsSeoPlugin({
  siteUrl: 'https://samcaldwell.info',
  title: 'samcaldwell.info \u2014 Analytics',
  description: 'Interactive visual analyses of public topics \u2014 US economy, presidential comparisons, public sentiment, cybersecurity threats, energy markets, West Texas regional data, and FCC license applications.',
  routes: [
    '/#/',
    '/#/economy', '/#/economy/growth', '/#/economy/indicators', '/#/economy/unemployment', '/#/economy/markets', '/#/economy/about',
    '/#/presidential', '/#/presidential/growth', '/#/presidential/markets', '/#/presidential/fiscal', '/#/presidential/about',
    '/#/sentiment', '/#/sentiment/approval', '/#/sentiment/economic', '/#/sentiment/media', '/#/sentiment/society', '/#/sentiment/network', '/#/sentiment/about',
    '/#/cybersecurity', '/#/cybersecurity/threats', '/#/cybersecurity/botnets', '/#/cybersecurity/cves', '/#/cybersecurity/about',
    '/#/energy', '/#/energy/us-markets', '/#/energy/intl-markets', '/#/energy/supply-demand', '/#/energy/events', '/#/energy/forecasts', '/#/energy/prices-map', '/#/energy/change-map', '/#/energy/about',
    '/#/west-texas', '/#/west-texas/unemployment', '/#/west-texas/income', '/#/west-texas/gdp', '/#/west-texas/about',
    '/#/fcc', '/#/fcc/by-type', '/#/fcc/by-year', '/#/fcc/ham-decisions', '/#/fcc/gmrs-decisions', '/#/fcc/gmrs-felony', '/#/fcc/about',
  ],
  author: 'Sam Caldwell',
  license: 'MIT',
  repository: 'https://github.com/sam-caldwell/samcaldwell.info',
});

if (seoPlugin.closeBundle) {
  await seoPlugin.closeBundle.call({});
}

// Step 8: Clean up temp directory
rmSync(tsBuildDir, { recursive: true, force: true });

console.log(`\nBuild complete \u2192 ${outDir}/`);
console.log(`  assets/${bundleFileName}  ${(bundleCode.length / 1024).toFixed(1)} kB`);
console.log(`  assets/specifyjs-unified.esm.js  ${(readFileSync(unifiedDest).length / 1024).toFixed(1)} kB`);
