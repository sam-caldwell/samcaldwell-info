/**
 * synthetic.ts — Fully synthetic dataset generator. Used as fallback when
 * no FRED_API_KEY is present. Produces the same 6 CSVs as the FRED path.
 *
 * Port of R/build_synthetic.R
 */

import { writeCsv, type CsvRow, round } from '../lib/csv.js';
import { formatDate, today, utcDate, year } from '../lib/dates.js';
import { createNormalGenerator } from '../lib/random.js';
import { log } from '../lib/cache.js';
import { mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Hard-coded annual data (hand-entered from public sources)
// ---------------------------------------------------------------------------

const annualData: CsvRow[] = [
  { year: 1999, gdp_growth: 4.8, unemployment: 4.2, cpi: 2.2, fed_funds: 5.50, ten_year: 6.0, sp500_ret: 21.0, dow_ret: 25.2, nasdaq_ret: 85.6, vix_avg: 24, recession: 0 },
  { year: 2000, gdp_growth: 4.1, unemployment: 4.0, cpi: 3.4, fed_funds: 6.50, ten_year: 6.0, sp500_ret: -9.1, dow_ret: -6.2, nasdaq_ret: -39.3, vix_avg: 23, recession: 0 },
  { year: 2001, gdp_growth: 1.0, unemployment: 4.7, cpi: 2.8, fed_funds: 1.75, ten_year: 5.0, sp500_ret: -11.9, dow_ret: -7.1, nasdaq_ret: -21.1, vix_avg: 26, recession: 1 },
  { year: 2002, gdp_growth: 1.7, unemployment: 5.8, cpi: 1.6, fed_funds: 1.25, ten_year: 4.6, sp500_ret: -22.1, dow_ret: -16.8, nasdaq_ret: -31.5, vix_avg: 27, recession: 0 },
  { year: 2003, gdp_growth: 2.8, unemployment: 6.0, cpi: 2.3, fed_funds: 1.00, ten_year: 4.0, sp500_ret: 28.7, dow_ret: 25.3, nasdaq_ret: 50.0, vix_avg: 22, recession: 0 },
  { year: 2004, gdp_growth: 3.9, unemployment: 5.5, cpi: 2.7, fed_funds: 2.25, ten_year: 4.3, sp500_ret: 10.9, dow_ret: 3.1, nasdaq_ret: 8.6, vix_avg: 15, recession: 0 },
  { year: 2005, gdp_growth: 3.5, unemployment: 5.1, cpi: 3.4, fed_funds: 4.25, ten_year: 4.3, sp500_ret: 4.9, dow_ret: -0.6, nasdaq_ret: 1.4, vix_avg: 13, recession: 0 },
  { year: 2006, gdp_growth: 2.8, unemployment: 4.6, cpi: 3.2, fed_funds: 5.25, ten_year: 4.8, sp500_ret: 15.8, dow_ret: 16.3, nasdaq_ret: 9.5, vix_avg: 13, recession: 0 },
  { year: 2007, gdp_growth: 2.0, unemployment: 4.6, cpi: 2.9, fed_funds: 4.25, ten_year: 4.6, sp500_ret: 5.5, dow_ret: 6.4, nasdaq_ret: 9.8, vix_avg: 18, recession: 0 },
  { year: 2008, gdp_growth: 0.1, unemployment: 5.8, cpi: 3.8, fed_funds: 0.25, ten_year: 3.7, sp500_ret: -37.0, dow_ret: -33.8, nasdaq_ret: -40.5, vix_avg: 33, recession: 1 },
  { year: 2009, gdp_growth: -2.6, unemployment: 9.3, cpi: -0.4, fed_funds: 0.25, ten_year: 3.3, sp500_ret: 26.5, dow_ret: 18.8, nasdaq_ret: 43.9, vix_avg: 32, recession: 1 },
  { year: 2010, gdp_growth: 2.7, unemployment: 9.6, cpi: 1.6, fed_funds: 0.25, ten_year: 3.2, sp500_ret: 15.1, dow_ret: 11.0, nasdaq_ret: 16.9, vix_avg: 23, recession: 0 },
  { year: 2011, gdp_growth: 1.6, unemployment: 8.9, cpi: 3.2, fed_funds: 0.25, ten_year: 2.8, sp500_ret: 2.1, dow_ret: 5.5, nasdaq_ret: -1.8, vix_avg: 24, recession: 0 },
  { year: 2012, gdp_growth: 2.3, unemployment: 8.1, cpi: 2.1, fed_funds: 0.25, ten_year: 1.8, sp500_ret: 16.0, dow_ret: 7.3, nasdaq_ret: 15.9, vix_avg: 18, recession: 0 },
  { year: 2013, gdp_growth: 2.1, unemployment: 7.4, cpi: 1.5, fed_funds: 0.25, ten_year: 2.4, sp500_ret: 32.4, dow_ret: 26.5, nasdaq_ret: 38.3, vix_avg: 14, recession: 0 },
  { year: 2014, gdp_growth: 2.5, unemployment: 6.2, cpi: 1.6, fed_funds: 0.25, ten_year: 2.5, sp500_ret: 13.7, dow_ret: 7.5, nasdaq_ret: 13.4, vix_avg: 14, recession: 0 },
  { year: 2015, gdp_growth: 2.9, unemployment: 5.3, cpi: 0.1, fed_funds: 0.50, ten_year: 2.1, sp500_ret: 1.4, dow_ret: -2.2, nasdaq_ret: 5.7, vix_avg: 17, recession: 0 },
  { year: 2016, gdp_growth: 1.8, unemployment: 4.9, cpi: 1.3, fed_funds: 0.75, ten_year: 1.8, sp500_ret: 12.0, dow_ret: 13.4, nasdaq_ret: 7.5, vix_avg: 16, recession: 0 },
  { year: 2017, gdp_growth: 2.5, unemployment: 4.4, cpi: 2.1, fed_funds: 1.50, ten_year: 2.3, sp500_ret: 21.8, dow_ret: 25.1, nasdaq_ret: 28.2, vix_avg: 11, recession: 0 },
  { year: 2018, gdp_growth: 3.0, unemployment: 3.9, cpi: 2.4, fed_funds: 2.50, ten_year: 2.9, sp500_ret: -4.4, dow_ret: -5.6, nasdaq_ret: -3.9, vix_avg: 16, recession: 0 },
  { year: 2019, gdp_growth: 2.6, unemployment: 3.7, cpi: 1.8, fed_funds: 1.75, ten_year: 2.1, sp500_ret: 31.5, dow_ret: 22.3, nasdaq_ret: 35.2, vix_avg: 15, recession: 0 },
  { year: 2020, gdp_growth: -2.2, unemployment: 8.1, cpi: 1.2, fed_funds: 0.25, ten_year: 0.9, sp500_ret: 18.4, dow_ret: 7.2, nasdaq_ret: 43.6, vix_avg: 29, recession: 1 },
  { year: 2021, gdp_growth: 5.8, unemployment: 5.4, cpi: 4.7, fed_funds: 0.25, ten_year: 1.4, sp500_ret: 28.7, dow_ret: 18.7, nasdaq_ret: 21.4, vix_avg: 20, recession: 0 },
  { year: 2022, gdp_growth: 1.9, unemployment: 3.6, cpi: 8.0, fed_funds: 4.50, ten_year: 3.0, sp500_ret: -18.1, dow_ret: -8.8, nasdaq_ret: -33.1, vix_avg: 26, recession: 0 },
  { year: 2023, gdp_growth: 2.5, unemployment: 3.6, cpi: 4.1, fed_funds: 5.50, ten_year: 4.0, sp500_ret: 26.3, dow_ret: 13.7, nasdaq_ret: 43.4, vix_avg: 17, recession: 0 },
  { year: 2024, gdp_growth: 2.8, unemployment: 4.0, cpi: 2.9, fed_funds: 4.50, ten_year: 4.2, sp500_ret: 25.0, dow_ret: 13.8, nasdaq_ret: 29.6, vix_avg: 16, recession: 0 },
  { year: 2025, gdp_growth: 2.1, unemployment: 4.2, cpi: 2.8, fed_funds: 3.75, ten_year: 4.3, sp500_ret: 12.0, dow_ret: 8.5, nasdaq_ret: 14.8, vix_avg: 18, recession: 0 },
  { year: 2026, gdp_growth: 1.6, unemployment: 4.5, cpi: 2.6, fed_funds: 3.25, ten_year: 4.0, sp500_ret: 4.0, dow_ret: 3.2, nasdaq_ret: 5.1, vix_avg: 20, recession: 0 },
];

const fiscalAnnual: CsvRow[] = [
  { year: 1999, deficit_pct_gdp: 1.3, debt_pct_gdp_eoy: 60.9, debt_trillion_eoy: 5.656 },
  { year: 2000, deficit_pct_gdp: 2.3, debt_pct_gdp_eoy: 55.5, debt_trillion_eoy: 5.629 },
  { year: 2001, deficit_pct_gdp: 1.2, debt_pct_gdp_eoy: 55.5, debt_trillion_eoy: 5.770 },
  { year: 2002, deficit_pct_gdp: -1.5, debt_pct_gdp_eoy: 57.3, debt_trillion_eoy: 6.198 },
  { year: 2003, deficit_pct_gdp: -3.3, debt_pct_gdp_eoy: 60.3, debt_trillion_eoy: 6.760 },
  { year: 2004, deficit_pct_gdp: -3.4, debt_pct_gdp_eoy: 62.6, debt_trillion_eoy: 7.355 },
  { year: 2005, deficit_pct_gdp: -2.5, debt_pct_gdp_eoy: 63.3, debt_trillion_eoy: 7.905 },
  { year: 2006, deficit_pct_gdp: -1.8, debt_pct_gdp_eoy: 63.5, debt_trillion_eoy: 8.451 },
  { year: 2007, deficit_pct_gdp: -1.1, debt_pct_gdp_eoy: 64.4, debt_trillion_eoy: 9.008 },
  { year: 2008, deficit_pct_gdp: -3.1, debt_pct_gdp_eoy: 73.3, debt_trillion_eoy: 10.025 },
  { year: 2009, deficit_pct_gdp: -9.8, debt_pct_gdp_eoy: 86.1, debt_trillion_eoy: 11.876 },
  { year: 2010, deficit_pct_gdp: -8.7, debt_pct_gdp_eoy: 94.2, debt_trillion_eoy: 13.529 },
  { year: 2011, deficit_pct_gdp: -8.4, debt_pct_gdp_eoy: 100.0, debt_trillion_eoy: 14.764 },
  { year: 2012, deficit_pct_gdp: -6.7, debt_pct_gdp_eoy: 103.2, debt_trillion_eoy: 16.066 },
  { year: 2013, deficit_pct_gdp: -4.1, debt_pct_gdp_eoy: 104.1, debt_trillion_eoy: 16.738 },
  { year: 2014, deficit_pct_gdp: -2.8, debt_pct_gdp_eoy: 104.0, debt_trillion_eoy: 17.824 },
  { year: 2015, deficit_pct_gdp: -2.4, debt_pct_gdp_eoy: 103.2, debt_trillion_eoy: 18.151 },
  { year: 2016, deficit_pct_gdp: -3.1, debt_pct_gdp_eoy: 104.9, debt_trillion_eoy: 19.573 },
  { year: 2017, deficit_pct_gdp: -3.4, debt_pct_gdp_eoy: 103.7, debt_trillion_eoy: 20.245 },
  { year: 2018, deficit_pct_gdp: -3.8, debt_pct_gdp_eoy: 104.7, debt_trillion_eoy: 21.516 },
  { year: 2019, deficit_pct_gdp: -4.6, debt_pct_gdp_eoy: 107.0, debt_trillion_eoy: 22.719 },
  { year: 2020, deficit_pct_gdp: -14.7, debt_pct_gdp_eoy: 128.1, debt_trillion_eoy: 26.945 },
  { year: 2021, deficit_pct_gdp: -12.1, debt_pct_gdp_eoy: 121.5, debt_trillion_eoy: 28.429 },
  { year: 2022, deficit_pct_gdp: -5.4, debt_pct_gdp_eoy: 119.8, debt_trillion_eoy: 31.420 },
  { year: 2023, deficit_pct_gdp: -6.2, debt_pct_gdp_eoy: 121.4, debt_trillion_eoy: 34.001 },
  { year: 2024, deficit_pct_gdp: -6.7, debt_pct_gdp_eoy: 123.0, debt_trillion_eoy: 35.464 },
  { year: 2025, deficit_pct_gdp: -6.3, debt_pct_gdp_eoy: 124.5, debt_trillion_eoy: 37.000 },
  { year: 2026, deficit_pct_gdp: -6.5, debt_pct_gdp_eoy: 125.8, debt_trillion_eoy: 38.500 },
];

const fiscalByYear = new Map<number, CsvRow>();
for (const f of fiscalAnnual) fiscalByYear.set(Number(f.year), f);

// ---------------------------------------------------------------------------
// Decomposition helpers (match R's approach)
// ---------------------------------------------------------------------------

function decomposeQuarterly(annualVec: number[], noiseSd: number, rnorm: (m?: number, s?: number) => number): number[] {
  const qtrs: number[] = [];
  for (const v of annualVec) qtrs.push(v, v, v, v);

  const noise: number[] = [];
  for (let i = 0; i < qtrs.length; i++) noise.push(rnorm(0, noiseSd));

  // Zero-center noise within each group of 4
  for (let g = 0; g < annualVec.length; g++) {
    const base = g * 4;
    let sum = 0;
    for (let j = 0; j < 4; j++) sum += noise[base + j];
    const avg = sum / 4;
    for (let j = 0; j < 4; j++) noise[base + j] -= avg;
  }

  return qtrs.map((v, i) => v + noise[i]);
}

function decomposeMonthly(annualVec: number[], noiseSd: number, rnorm: (m?: number, s?: number) => number): number[] {
  const mo: number[] = [];
  for (const v of annualVec) for (let i = 0; i < 12; i++) mo.push(v);

  const noise: number[] = [];
  for (let i = 0; i < mo.length; i++) noise.push(rnorm(0, noiseSd));

  // Zero-center noise within each group of 12
  for (let g = 0; g < annualVec.length; g++) {
    const base = g * 12;
    let sum = 0;
    for (let j = 0; j < 12; j++) sum += noise[base + j];
    const avg = sum / 12;
    for (let j = 0; j < 12; j++) noise[base + j] -= avg;
  }

  return mo.map((v, i) => v + noise[i]);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function buildSynthetic(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const outDir = join(projectRoot, 'data', 'economy');
  mkdirSync(outDir, { recursive: true });

  const rnorm = createNormalGenerator(20260419);
  const td = today();
  const currentYear = year(td);

  // Mark prototype
  for (const row of annualData) {
    row.prototype = Number(row.year) >= currentYear ? 1 : 0;
  }

  // Merge fiscal into annual
  const annual: CsvRow[] = annualData.map(r => {
    const f = fiscalByYear.get(Number(r.year));
    return {
      ...r,
      deficit_pct_gdp: f ? f.deficit_pct_gdp : null,
      debt_pct_gdp_eoy: f ? f.debt_pct_gdp_eoy : null,
    };
  });

  writeCsv(join(outDir, 'annual.csv'), annual, [
    'year', 'gdp_growth', 'unemployment', 'cpi', 'fed_funds', 'ten_year',
    'sp500_ret', 'dow_ret', 'nasdaq_ret', 'vix_avg', 'recession', 'prototype',
    'deficit_pct_gdp', 'debt_pct_gdp_eoy',
  ]);

  // GDP components
  const nRows = annualData.length;
  const gdpComponents: CsvRow[] = annualData.map(r => {
    const y = Number(r.year);
    const invAdj = (y === 2008 || y === 2009 || y === 2020) ? -3 : 0;
    const govAdj = (y === 2020 || y === 2021) ? 1.5 : 0;
    return {
      year: y,
      consumption: round(68 + rnorm(0, 0.6), 2),
      investment:  round(18 + rnorm(0, 0.8) + invAdj, 2),
      government:  round(18 + rnorm(0, 0.4) + govAdj, 2),
      net_exports: round(-4 + rnorm(0, 0.5), 2),
    };
  });
  writeCsv(join(outDir, 'gdp_components.csv'), gdpComponents,
    ['year', 'consumption', 'investment', 'government', 'net_exports']);

  // Quarterly
  const gdpGrowthVec = annualData.map(r => Number(r.gdp_growth));
  const unempVec = annualData.map(r => Number(r.unemployment));
  const cpiVec = annualData.map(r => Number(r.cpi));
  const ffVec = annualData.map(r => Number(r.fed_funds));
  const t10Vec = annualData.map(r => Number(r.ten_year));
  const sp500Vec = annualData.map(r => Number(r.sp500_ret));
  const vixVec = annualData.map(r => Number(r.vix_avg));

  const qGdp = decomposeQuarterly(gdpGrowthVec, 0.6, rnorm);
  const qUnemp = decomposeQuarterly(unempVec, 0.25, rnorm);
  const qCpi = decomposeQuarterly(cpiVec, 0.35, rnorm);
  const qFf = decomposeQuarterly(ffVec, 0.15, rnorm);
  const qT10 = decomposeQuarterly(t10Vec, 0.20, rnorm);
  const qSp500 = decomposeQuarterly(sp500Vec.map(v => v / 4), 3.5, rnorm);
  const qVix = decomposeQuarterly(vixVec, 2.5, rnorm);

  const quarterly: CsvRow[] = [];
  let qi = 0;
  for (const row of annualData) {
    const y = Number(row.year);
    for (let q = 1; q <= 4; q++) {
      const mth = (q - 1) * 3 + 1;
      const d = utcDate(y, mth, 1);
      if (d > td) break;
      quarterly.push({
        year: y,
        quarter: q,
        date: formatDate(d),
        period: `${y}Q${q}`,
        gdp_growth: round(qGdp[qi], 2),
        unemployment: round(qUnemp[qi], 2),
        cpi: round(qCpi[qi], 2),
        fed_funds: round(qFf[qi], 2),
        ten_year: round(qT10[qi], 2),
        sp500_ret_qoq: round(qSp500[qi], 2),
        vix: round(qVix[qi], 2),
      });
      qi++;
    }
  }
  writeCsv(join(outDir, 'quarterly.csv'), quarterly,
    ['year', 'quarter', 'date', 'period', 'gdp_growth', 'unemployment', 'cpi',
     'fed_funds', 'ten_year', 'sp500_ret_qoq', 'vix']);

  // Monthly
  const mUnemp = decomposeMonthly(unempVec, 0.18, rnorm);
  const mCpi = decomposeMonthly(cpiVec, 0.25, rnorm);
  const mFf = decomposeMonthly(ffVec, 0.10, rnorm);
  const mT10 = decomposeMonthly(t10Vec, 0.15, rnorm);
  const mRet = decomposeMonthly(sp500Vec.map(v => v / 12), 2.2, rnorm);
  const mVix = decomposeMonthly(vixVec, 2.0, rnorm);

  const monthly: CsvRow[] = [];
  let mi = 0;
  let sp500Level = 1260;
  for (const row of annualData) {
    const y = Number(row.year);
    for (let m = 1; m <= 12; m++) {
      const d = utcDate(y, m, 1);
      if (d > td) break;
      sp500Level = sp500Level * (1 + mRet[mi] / 100);
      monthly.push({
        year: y,
        month: m,
        date: formatDate(d),
        unemployment: round(mUnemp[mi], 2),
        cpi: round(mCpi[mi], 2),
        fed_funds: round(mFf[mi], 2),
        ten_year: round(mT10[mi], 2),
        vix: round(mVix[mi], 2),
        sp500_level: round(sp500Level, 1),
      });
      mi++;
    }
  }
  writeCsv(join(outDir, 'monthly.csv'), monthly,
    ['year', 'month', 'date', 'unemployment', 'cpi', 'fed_funds', 'ten_year',
     'vix', 'sp500_level']);

  // Fiscal quarterly — linearly interpolate debt within each year
  const fiscalQ: CsvRow[] = [];
  for (let fi = 0; fi < fiscalAnnual.length; fi++) {
    const f = fiscalAnnual[fi];
    const y = Number(f.year);
    const eoyDebt = Number(f.debt_trillion_eoy);
    const eoyPct = Number(f.debt_pct_gdp_eoy);
    const prevDebt = fi > 0 ? Number(fiscalAnnual[fi - 1].debt_trillion_eoy) : eoyDebt;
    const prevPct = fi > 0 ? Number(fiscalAnnual[fi - 1].debt_pct_gdp_eoy) : eoyPct;

    for (let q = 1; q <= 4; q++) {
      const mth = (q - 1) * 3 + 1;
      const d = utcDate(y, mth, 1);
      if (d > td) break;
      fiscalQ.push({
        year: y,
        quarter: q,
        date: formatDate(d),
        debt_trillion: round(prevDebt + (eoyDebt - prevDebt) * (q / 4), 3),
        debt_pct_gdp: round(prevPct + (eoyPct - prevPct) * (q / 4), 1),
      });
    }
  }
  writeCsv(join(outDir, 'fiscal_quarterly.csv'), fiscalQ,
    ['year', 'quarter', 'date', 'debt_trillion', 'debt_pct_gdp']);

  // Sectors
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

  const sectorRows: CsvRow[] = [];
  for (const s of sectors) {
    const b = sectorBeta[s];
    for (const row of annualData) {
      sectorRows.push({
        year: Number(row.year),
        sector: s,
        return_pct: round(Number(row.sp500_ret) * b + rnorm(0, 4), 1),
      });
    }
  }
  writeCsv(join(outDir, 'sectors.csv'), sectorRows, ['year', 'sector', 'return_pct']);

  log('synthetic', `wrote 6 CSVs to ${outDir}`);
}
