/**
 * economy.ts — Transforms FRED cache CSVs + synthetic market overlay into
 * 6 output CSVs: annual, quarterly, monthly, gdp_components, sectors, fiscal_quarterly.
 *
 * Port of R/build_from_fred.R
 */

import { readCsv, writeCsv, type CsvRow, round } from '../lib/csv.js';
import { formatDate, parseDate, year, month, quarter, today, utcDate } from '../lib/dates.js';
import { createNormalGenerator } from '../lib/random.js';
import { log, warn } from '../lib/cache.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Synthetic market overlay (not redistributable from FRED)
// ---------------------------------------------------------------------------

const syntheticMarkets: CsvRow[] = [
  { year: 1999, sp500_ret: 21.0,  dow_ret: 25.2,  nasdaq_ret: 85.6,  vix_avg: 24 },
  { year: 2000, sp500_ret: -9.1,  dow_ret: -6.2,  nasdaq_ret: -39.3, vix_avg: 23 },
  { year: 2001, sp500_ret: -11.9, dow_ret: -7.1,  nasdaq_ret: -21.1, vix_avg: 26 },
  { year: 2002, sp500_ret: -22.1, dow_ret: -16.8, nasdaq_ret: -31.5, vix_avg: 27 },
  { year: 2003, sp500_ret: 28.7,  dow_ret: 25.3,  nasdaq_ret: 50.0,  vix_avg: 22 },
  { year: 2004, sp500_ret: 10.9,  dow_ret: 3.1,   nasdaq_ret: 8.6,   vix_avg: 15 },
  { year: 2005, sp500_ret: 4.9,   dow_ret: -0.6,  nasdaq_ret: 1.4,   vix_avg: 13 },
  { year: 2006, sp500_ret: 15.8,  dow_ret: 16.3,  nasdaq_ret: 9.5,   vix_avg: 13 },
  { year: 2007, sp500_ret: 5.5,   dow_ret: 6.4,   nasdaq_ret: 9.8,   vix_avg: 18 },
  { year: 2008, sp500_ret: -37.0, dow_ret: -33.8, nasdaq_ret: -40.5, vix_avg: 33 },
  { year: 2009, sp500_ret: 26.5,  dow_ret: 18.8,  nasdaq_ret: 43.9,  vix_avg: 32 },
  { year: 2010, sp500_ret: 15.1,  dow_ret: 11.0,  nasdaq_ret: 16.9,  vix_avg: 23 },
  { year: 2011, sp500_ret: 2.1,   dow_ret: 5.5,   nasdaq_ret: -1.8,  vix_avg: 24 },
  { year: 2012, sp500_ret: 16.0,  dow_ret: 7.3,   nasdaq_ret: 15.9,  vix_avg: 18 },
  { year: 2013, sp500_ret: 32.4,  dow_ret: 26.5,  nasdaq_ret: 38.3,  vix_avg: 14 },
  { year: 2014, sp500_ret: 13.7,  dow_ret: 7.5,   nasdaq_ret: 13.4,  vix_avg: 14 },
  { year: 2015, sp500_ret: 1.4,   dow_ret: -2.2,  nasdaq_ret: 5.7,   vix_avg: 17 },
  { year: 2016, sp500_ret: 12.0,  dow_ret: 13.4,  nasdaq_ret: 7.5,   vix_avg: 16 },
  { year: 2017, sp500_ret: 21.8,  dow_ret: 25.1,  nasdaq_ret: 28.2,  vix_avg: 11 },
  { year: 2018, sp500_ret: -4.4,  dow_ret: -5.6,  nasdaq_ret: -3.9,  vix_avg: 16 },
  { year: 2019, sp500_ret: 31.5,  dow_ret: 22.3,  nasdaq_ret: 35.2,  vix_avg: 15 },
  { year: 2020, sp500_ret: 18.4,  dow_ret: 7.2,   nasdaq_ret: 43.6,  vix_avg: 29 },
  { year: 2021, sp500_ret: 28.7,  dow_ret: 18.7,  nasdaq_ret: 21.4,  vix_avg: 20 },
  { year: 2022, sp500_ret: -18.1, dow_ret: -8.8,  nasdaq_ret: -33.1, vix_avg: 26 },
  { year: 2023, sp500_ret: 26.3,  dow_ret: 13.7,  nasdaq_ret: 43.4,  vix_avg: 17 },
  { year: 2024, sp500_ret: 25.0,  dow_ret: 13.8,  nasdaq_ret: 29.6,  vix_avg: 16 },
  { year: 2025, sp500_ret: 12.0,  dow_ret: 8.5,   nasdaq_ret: 14.8,  vix_avg: 18 },
  { year: 2026, sp500_ret: 4.0,   dow_ret: 3.2,   nasdaq_ret: 5.1,   vix_avg: 20 },
];

function marketByYear(y: number): CsvRow | undefined {
  return syntheticMarkets.find(r => r.year === y);
}

// ---------------------------------------------------------------------------
// Helpers: read a FRED cache series
// ---------------------------------------------------------------------------

function readFredCache(cacheDir: string, name: string): CsvRow[] {
  const p = join(cacheDir, `${name}.csv`);
  if (!existsSync(p)) return [];
  return readCsv(p);
}

/** Convert date string to {year, month, quarter} */
function dateParts(dateStr: string) {
  const d = parseDate(dateStr);
  return { year: year(d), month: month(d), quarter: quarter(d) };
}

// ---------------------------------------------------------------------------
// Annual aggregation helpers (match R)
// ---------------------------------------------------------------------------

function annualMean(series: CsvRow[]): Map<number, number> {
  const sums = new Map<number, { s: number; n: number }>();
  for (const r of series) {
    if (r.value === null || r.date === null) continue;
    const y = dateParts(String(r.date)).year;
    const e = sums.get(y) || { s: 0, n: 0 };
    e.s += Number(r.value);
    e.n++;
    sums.set(y, e);
  }
  const out = new Map<number, number>();
  for (const [y, e] of sums) out.set(y, e.s / e.n);
  return out;
}

function annualEnd(series: CsvRow[]): Map<number, number> {
  const sorted = [...series].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  const out = new Map<number, number>();
  for (const r of sorted) {
    if (r.value === null || r.date === null) continue;
    out.set(dateParts(String(r.date)).year, Number(r.value));
  }
  return out;
}

function annualMax(series: CsvRow[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const r of series) {
    if (r.value === null || r.date === null) continue;
    const y = dateParts(String(r.date)).year;
    const cur = out.get(y);
    const v = Number(r.value);
    if (cur === undefined || v > cur) out.set(y, v);
  }
  return out;
}

function annualFromYearly(series: CsvRow[]): Map<number, number> {
  const sorted = [...series].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  const out = new Map<number, number>();
  for (const r of sorted) {
    if (r.value === null || r.date === null) continue;
    out.set(dateParts(String(r.date)).year, Number(r.value));
  }
  return out;
}

/** YoY% quarterly: current Q / same Q 4 ago - 1 */
function yoyQuarterly(series: CsvRow[]): CsvRow[] {
  const sorted = [...series]
    .filter(r => r.value !== null && r.date !== null)
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  const out: CsvRow[] = [];
  for (let i = 4; i < sorted.length; i++) {
    const v = Number(sorted[i].value);
    const v4 = Number(sorted[i - 4].value);
    if (v4 === 0) continue;
    out.push({ date: sorted[i].date, yoy: (v / v4 - 1) * 100 });
  }
  return out;
}

/** YoY% monthly: m vs 12 months prior */
function yoyMonthly(series: CsvRow[]): CsvRow[] {
  const sorted = [...series]
    .filter(r => r.value !== null && r.date !== null)
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  const out: CsvRow[] = [];
  for (let i = 12; i < sorted.length; i++) {
    const v = Number(sorted[i].value);
    const v12 = Number(sorted[i - 12].value);
    if (v12 === 0) continue;
    out.push({ date: sorted[i].date, yoy: (v / v12 - 1) * 100 });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Build annual.csv
// ---------------------------------------------------------------------------

interface Cache {
  gdp_real: CsvRow[];
  unemployment: CsvRow[];
  cpi: CsvRow[];
  fed_funds: CsvRow[];
  ten_year: CsvRow[];
  recession: CsvRow[];
  deficit_pct_gdp: CsvRow[];
  debt_pct_gdp: CsvRow[];
  debt_public: CsvRow[];
  gdp_nominal: CsvRow[];
  pce: CsvRow[];
  investment: CsvRow[];
  government: CsvRow[];
  net_exports: CsvRow[];
}

function loadCache(cacheDir: string): Cache {
  return {
    gdp_real:        readFredCache(cacheDir, 'gdp_real'),
    unemployment:    readFredCache(cacheDir, 'unemployment'),
    cpi:             readFredCache(cacheDir, 'cpi'),
    fed_funds:       readFredCache(cacheDir, 'fed_funds'),
    ten_year:        readFredCache(cacheDir, 'ten_year'),
    recession:       readFredCache(cacheDir, 'recession'),
    deficit_pct_gdp: readFredCache(cacheDir, 'deficit_pct_gdp'),
    debt_pct_gdp:    readFredCache(cacheDir, 'debt_pct_gdp'),
    debt_public:     readFredCache(cacheDir, 'debt_public'),
    gdp_nominal:     readFredCache(cacheDir, 'gdp_nominal'),
    pce:             readFredCache(cacheDir, 'pce'),
    investment:      readFredCache(cacheDir, 'investment'),
    government:      readFredCache(cacheDir, 'government'),
    net_exports:     readFredCache(cacheDir, 'net_exports'),
  };
}

function buildAnnual(cache: Cache, currentYear: number): CsvRow[] {
  const years = Array.from({ length: currentYear - 1999 + 1 }, (_, i) => 1999 + i);

  // GDP growth: YoY of quarterly real GDP, then annual average
  const gdpYoyQ = yoyQuarterly(cache.gdp_real);
  const gdpAnnual = new Map<number, { s: number; n: number }>();
  for (const r of gdpYoyQ) {
    const y = dateParts(String(r.date)).year;
    const e = gdpAnnual.get(y) || { s: 0, n: 0 };
    e.s += Number(r.yoy);
    e.n++;
    gdpAnnual.set(y, e);
  }

  const unrateAnnual = annualMean(cache.unemployment);

  // CPI: YoY monthly, then annual average
  const cpiYoyM = yoyMonthly(cache.cpi);
  const cpiAnnual = new Map<number, { s: number; n: number }>();
  for (const r of cpiYoyM) {
    const y = dateParts(String(r.date)).year;
    const e = cpiAnnual.get(y) || { s: 0, n: 0 };
    e.s += Number(r.yoy);
    e.n++;
    cpiAnnual.set(y, e);
  }

  const ffAnnual = annualEnd(cache.fed_funds);
  const t10Annual = annualMean(cache.ten_year);
  const recAnnual = annualMax(cache.recession);
  const deficitAnnual = annualFromYearly(cache.deficit_pct_gdp);

  // Debt % GDP Q4
  const debtPctQ4 = new Map<number, number>();
  for (const r of cache.debt_pct_gdp) {
    if (r.value === null || r.date === null) continue;
    const p = dateParts(String(r.date));
    if (p.quarter === 4) debtPctQ4.set(p.year, Number(r.value));
  }

  // Debt public Q4 (millions -> trillions)
  const debtTrilQ4 = new Map<number, number>();
  for (const r of cache.debt_public) {
    if (r.value === null || r.date === null) continue;
    const p = dateParts(String(r.date));
    if (p.quarter === 4) debtTrilQ4.set(p.year, Number(r.value) / 1e6);
  }

  const rows: CsvRow[] = [];
  let prevDebt: number | null = null;

  for (const y of years) {
    const gdpE = gdpAnnual.get(y);
    const cpiE = cpiAnnual.get(y);
    const mkt = marketByYear(y);
    const rec = recAnnual.get(y);
    const debtTril = debtTrilQ4.get(y) ?? null;
    const debtAdded = (debtTril !== null && prevDebt !== null) ? round(debtTril - prevDebt, 3) : null;

    rows.push({
      year: y,
      gdp_growth: gdpE ? round(gdpE.s / gdpE.n, 2) : null,
      unemployment: round(unrateAnnual.get(y) ?? null, 2),
      cpi: cpiE ? round(cpiE.s / cpiE.n, 2) : null,
      fed_funds: round(ffAnnual.get(y) ?? null, 2),
      ten_year: round(t10Annual.get(y) ?? null, 2),
      recession: (rec !== undefined && rec >= 1) ? 1 : 0,
      deficit_pct_gdp: round(deficitAnnual.get(y) ?? null, 2),
      debt_pct_gdp_eoy: round(debtPctQ4.get(y) ?? null, 1),
      debt_trillion_eoy: round(debtTril, 3),
      sp500_ret: mkt ? Number(mkt.sp500_ret) : null,
      dow_ret: mkt ? Number(mkt.dow_ret) : null,
      nasdaq_ret: mkt ? Number(mkt.nasdaq_ret) : null,
      vix_avg: mkt ? Number(mkt.vix_avg) : null,
      debt_added_trillion: debtAdded,
      prototype: y >= currentYear ? 1 : 0,
    });

    if (debtTril !== null) prevDebt = debtTril;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Build fiscal_quarterly.csv
// ---------------------------------------------------------------------------

function buildFiscalQuarterly(cache: Cache, currentYear: number): CsvRow[] {
  const debtRows: CsvRow[] = [];
  for (const r of cache.debt_public) {
    if (r.value === null || r.date === null) continue;
    const p = dateParts(String(r.date));
    if (p.year < 1999 || p.year > currentYear) continue;
    debtRows.push({
      year: p.year,
      quarter: p.quarter,
      date: String(r.date),
      debt_trillion: round(Number(r.value) / 1e6, 3),
    });
  }

  // Build a map for debt_pct_gdp by year+quarter
  const pctMap = new Map<string, number>();
  for (const r of cache.debt_pct_gdp) {
    if (r.value === null || r.date === null) continue;
    const p = dateParts(String(r.date));
    pctMap.set(`${p.year}-${p.quarter}`, Number(r.value));
  }

  const rows: CsvRow[] = [];
  for (const d of debtRows) {
    const key = `${d.year}-${d.quarter}`;
    rows.push({
      year: d.year,
      quarter: d.quarter,
      date: d.date,
      debt_trillion: d.debt_trillion,
      debt_pct_gdp: round(pctMap.get(key) ?? null, 1),
    });
  }

  rows.sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
  return rows;
}

// ---------------------------------------------------------------------------
// Build gdp_components.csv
// ---------------------------------------------------------------------------

function buildGdpComponents(cache: Cache, currentYear: number): CsvRow[] {
  const assemble = (series: CsvRow[]): Map<number, number> => {
    const sums = new Map<number, { s: number; n: number }>();
    for (const r of series) {
      if (r.value === null || r.date === null) continue;
      const y = dateParts(String(r.date)).year;
      const e = sums.get(y) || { s: 0, n: 0 };
      e.s += Number(r.value);
      e.n++;
      sums.set(y, e);
    }
    const out = new Map<number, number>();
    for (const [y, e] of sums) out.set(y, e.s / e.n);
    return out;
  };

  const gdp = assemble(cache.gdp_nominal);
  const pce = assemble(cache.pce);
  const inv = assemble(cache.investment);
  const gov = assemble(cache.government);
  const nx  = assemble(cache.net_exports);

  const rows: CsvRow[] = [];
  for (let y = 1999; y <= currentYear; y++) {
    const g = gdp.get(y);
    if (!g) { rows.push({ year: y, consumption: null, investment: null, government: null, net_exports: null }); continue; }
    rows.push({
      year: y,
      consumption: round(100 * (pce.get(y) ?? 0) / g, 2),
      investment:  round(100 * (inv.get(y) ?? 0) / g, 2),
      government:  round(100 * (gov.get(y) ?? 0) / g, 2),
      net_exports: round(100 * (nx.get(y) ?? 0) / g, 2),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Build quarterly.csv
// ---------------------------------------------------------------------------

function buildQuarterly(cache: Cache, currentYear: number, currentQtr: number): CsvRow[] {
  const rnorm = createNormalGenerator(19991231);

  const gdpQ = yoyQuarterly(cache.gdp_real);
  const gdpMap = new Map<string, number>();
  for (const r of gdpQ) {
    const p = dateParts(String(r.date));
    gdpMap.set(`${p.year}-${p.quarter}`, Number(r.yoy));
  }

  // Quarterly mean helper
  const qMean = (series: CsvRow[]): Map<string, number> => {
    const sums = new Map<string, { s: number; n: number }>();
    for (const r of series) {
      if (r.value === null || r.date === null) continue;
      const p = dateParts(String(r.date));
      const key = `${p.year}-${p.quarter}`;
      const e = sums.get(key) || { s: 0, n: 0 };
      e.s += Number(r.value);
      e.n++;
      sums.set(key, e);
    }
    const out = new Map<string, number>();
    for (const [k, e] of sums) out.set(k, e.s / e.n);
    return out;
  };

  const unempQ = qMean(cache.unemployment);
  const ffQ = qMean(cache.fed_funds);
  const t10Q = qMean(cache.ten_year);

  // CPI quarterly: YoY monthly then quarter mean
  const cpiYoyM = yoyMonthly(cache.cpi);
  const cpiQ = new Map<string, { s: number; n: number }>();
  for (const r of cpiYoyM) {
    const p = dateParts(String(r.date));
    const key = `${p.year}-${p.quarter}`;
    const e = cpiQ.get(key) || { s: 0, n: 0 };
    e.s += Number(r.yoy);
    e.n++;
    cpiQ.set(key, e);
  }

  const rows: CsvRow[] = [];
  for (let y = 1999; y <= currentYear; y++) {
    for (let q = 1; q <= 4; q++) {
      if (y === currentYear && q > currentQtr) break;
      const key = `${y}-${q}`;
      const mth = (q - 1) * 3 + 1;
      const dateStr = formatDate(utcDate(y, mth, 1));
      const mkt = marketByYear(y);
      const sp500Ret = mkt ? Number(mkt.sp500_ret) : 0;
      const vixAvg = mkt ? Number(mkt.vix_avg) : 0;
      const cpiE = cpiQ.get(key);

      rows.push({
        year: y,
        quarter: q,
        date: dateStr,
        period: `${y}Q${q}`,
        gdp_growth: round(gdpMap.get(key) ?? null, 2),
        unemployment: round(unempQ.get(key) ?? null, 2),
        cpi: cpiE ? round(cpiE.s / cpiE.n, 2) : null,
        fed_funds: round(ffQ.get(key) ?? null, 2),
        ten_year: round(t10Q.get(key) ?? null, 2),
        sp500_ret_qoq: round(sp500Ret / 4 + rnorm(0, 2), 2),
        vix: round(vixAvg + rnorm(0, 2), 2),
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Build monthly.csv
// ---------------------------------------------------------------------------

function buildMonthly(cache: Cache, currentYear: number): CsvRow[] {
  const rnorm = createNormalGenerator(20000101);
  const todayDate = today();

  // Monthly mean for ten_year
  const t10M = new Map<string, { s: number; n: number }>();
  for (const r of cache.ten_year) {
    if (r.value === null || r.date === null) continue;
    const p = dateParts(String(r.date));
    const key = `${p.year}-${p.month}`;
    const e = t10M.get(key) || { s: 0, n: 0 };
    e.s += Number(r.value);
    e.n++;
    t10M.set(key, e);
  }

  // Unemployment monthly (already monthly in FRED)
  const unempM = new Map<string, number>();
  for (const r of cache.unemployment) {
    if (r.value === null || r.date === null) continue;
    const p = dateParts(String(r.date));
    unempM.set(`${p.year}-${p.month}`, Number(r.value));
  }

  // CPI YoY monthly
  const cpiYoyM = yoyMonthly(cache.cpi);
  const cpiM = new Map<string, number>();
  for (const r of cpiYoyM) {
    const p = dateParts(String(r.date));
    cpiM.set(`${p.year}-${p.month}`, Number(r.yoy));
  }

  // Fed funds monthly
  const ffM = new Map<string, number>();
  for (const r of cache.fed_funds) {
    if (r.value === null || r.date === null) continue;
    const p = dateParts(String(r.date));
    ffM.set(`${p.year}-${p.month}`, Number(r.value));
  }

  // Build month frame
  const frameRows: { year: number; month: number; date: string }[] = [];
  for (let y = 1999; y <= currentYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const d = utcDate(y, m, 1);
      if (d > todayDate) break;
      frameRows.push({ year: y, month: m, date: formatDate(d) });
    }
  }

  // Compute monthly returns and build level
  const intermediate: { row: typeof frameRows[0]; mret: number; vix: number }[] = [];
  for (const fr of frameRows) {
    const mkt = marketByYear(fr.year);
    const sp500Ret = mkt ? Number(mkt.sp500_ret) : 0;
    const vixAvg = mkt ? Number(mkt.vix_avg) : 0;
    const mret = round(sp500Ret / 12 + rnorm(0, 1.8), 4)!;
    const vix = round(vixAvg + rnorm(0, 1.6), 2)!;
    intermediate.push({ row: fr, mret, vix });
  }

  // Cumulative product for sp500_level
  let level = 1425;
  const rows: CsvRow[] = [];
  for (const { row, mret, vix } of intermediate) {
    level *= (1 + mret / 100);
    const key = `${row.year}-${row.month}`;
    const t10E = t10M.get(key);
    rows.push({
      year: row.year,
      month: row.month,
      date: row.date,
      unemployment: round(unempM.get(key) ?? null, 2),
      cpi: round(cpiM.get(key) ?? null, 2),
      fed_funds: round(ffM.get(key) ?? null, 2),
      ten_year: t10E ? round(t10E.s / t10E.n, 2) : null,
      vix,
      sp500_level: round(level, 1),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Build sectors.csv
// ---------------------------------------------------------------------------

function buildSectors(currentYear: number): CsvRow[] {
  const sectors = [
    'Information Technology', 'Health Care', 'Financials', 'Consumer Discretionary',
    'Communication Services', 'Industrials', 'Consumer Staples', 'Energy',
    'Utilities', 'Real Estate', 'Materials',
  ];
  const sectorBeta: Record<string, number> = {
    'Information Technology': 1.35, 'Health Care': 0.85, 'Financials': 1.20,
    'Consumer Discretionary': 1.15, 'Communication Services': 1.10, 'Industrials': 1.05,
    'Consumer Staples': 0.70, 'Energy': 1.30, 'Utilities': 0.55,
    'Real Estate': 0.90, 'Materials': 1.05,
  };
  const rnorm = createNormalGenerator(20000101);

  const sm = syntheticMarkets.filter(r => Number(r.year) <= currentYear);
  const rows: CsvRow[] = [];
  for (const s of sectors) {
    const b = sectorBeta[s];
    for (const m of sm) {
      rows.push({
        year: Number(m.year),
        sector: s,
        return_pct: round(Number(m.sp500_ret) * b + rnorm(0, 4), 1),
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function buildEconomy(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const cacheDir = join(projectRoot, 'data', 'economy', 'cache');
  const outDir = join(projectRoot, 'data', 'economy');
  mkdirSync(outDir, { recursive: true });

  const cache = loadCache(cacheDir);
  const td = today();
  const currentYear = year(td);
  const currentQtr = quarter(td);

  const annualDf = buildAnnual(cache, currentYear);
  const componentsDf = buildGdpComponents(cache, currentYear);
  const quarterlyDf = buildQuarterly(cache, currentYear, currentQtr);
  const monthlyDf = buildMonthly(cache, currentYear);
  const sectorsDf = buildSectors(currentYear);
  const fiscalQtrDf = buildFiscalQuarterly(cache, currentYear);

  const annualCols = [
    'year', 'gdp_growth', 'unemployment', 'cpi', 'fed_funds', 'ten_year', 'recession',
    'deficit_pct_gdp', 'debt_pct_gdp_eoy', 'debt_trillion_eoy',
    'sp500_ret', 'dow_ret', 'nasdaq_ret', 'vix_avg',
    'debt_added_trillion', 'prototype',
  ];
  writeCsv(join(outDir, 'annual.csv'), annualDf, annualCols);

  const qtrlyCols = [
    'year', 'quarter', 'date', 'period',
    'gdp_growth', 'unemployment', 'cpi', 'fed_funds', 'ten_year',
    'sp500_ret_qoq', 'vix',
  ];
  writeCsv(join(outDir, 'quarterly.csv'), quarterlyDf, qtrlyCols);

  const monthlyCols = [
    'year', 'month', 'date', 'unemployment', 'cpi', 'fed_funds', 'ten_year',
    'vix', 'sp500_level',
  ];
  writeCsv(join(outDir, 'monthly.csv'), monthlyDf, monthlyCols);

  const compCols = ['year', 'consumption', 'investment', 'government', 'net_exports'];
  writeCsv(join(outDir, 'gdp_components.csv'), componentsDf, compCols);

  const secCols = ['year', 'sector', 'return_pct'];
  writeCsv(join(outDir, 'sectors.csv'), sectorsDf, secCols);

  const fiscalCols = ['year', 'quarter', 'date', 'debt_trillion', 'debt_pct_gdp'];
  writeCsv(join(outDir, 'fiscal_quarterly.csv'), fiscalQtrDf, fiscalCols);

  log('economy', `wrote 6 CSVs covering 1999-${currentYear}`);
}
