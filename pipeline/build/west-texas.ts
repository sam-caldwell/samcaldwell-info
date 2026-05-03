/**
 * west-texas.ts — Assembles West Texas regional analysis CSVs.
 *
 * Port of R/build_west_texas.R
 *
 * Outputs:
 *   data/west-texas/unemployment_monthly.csv
 *   data/west-texas/income_annual.csv
 *   data/west-texas/gdp_annual.csv
 *   data/west-texas/west_texas_summary.csv
 */

import { readCsv, writeCsv, type CsvRow, round } from '../lib/csv.js';
import { formatDate, today } from '../lib/dates.js';
import { log } from '../lib/cache.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Geo labels
// ---------------------------------------------------------------------------

/**
 * All 30 counties in the Texas Comptroller's West Texas region.
 * Source: https://comptroller.texas.gov/economy/economic-data/regions/2020/snap-west.php
 */
const GEO_LABELS: Record<string, string> = {
  andrews: 'Andrews Co. (Andrews)',         borden: 'Borden Co. (Gail)',
  coke: 'Coke Co. (Robert Lee)',           concho: 'Concho Co. (Paint Rock)',
  crane: 'Crane Co. (Crane)',              crockett: 'Crockett Co. (Ozona)',
  dawson: 'Dawson Co. (Lamesa)',           ector: 'Ector Co. (Odessa)',
  gaines: 'Gaines Co. (Seminole)',         glasscock: 'Glasscock Co. (Garden City)',
  howard: 'Howard Co. (Big Spring)',       irion: 'Irion Co. (Mertzon)',
  kimble: 'Kimble Co. (Junction)',         loving: 'Loving Co. (Mentone)',
  martin: 'Martin Co. (Stanton)',          mason: 'Mason Co. (Mason)',
  mcculloch: 'McCulloch Co. (Brady)',      menard: 'Menard Co. (Menard)',
  midland: 'Midland Co. (Midland)',        pecos: 'Pecos Co. (Fort Stockton)',
  reagan: 'Reagan Co. (Big Lake)',         reeves: 'Reeves Co. (Pecos)',
  schleicher: 'Schleicher Co. (Eldorado)', sterling: 'Sterling Co. (Sterling City)',
  sutton: 'Sutton Co. (Sonora)',           terrell: 'Terrell Co. (Sanderson)',
  tom_green: 'Tom Green Co. (San Angelo)', upton: 'Upton Co. (Rankin)',
  ward: 'Ward Co. (Monahans)',             winkler: 'Winkler Co. (Kermit)',
  TX: 'Texas',
  US: 'United States',
};

const COUNTIES = Object.keys(GEO_LABELS).filter(k => k !== 'TX' && k !== 'US');

function readCsvSafe(path: string): CsvRow[] {
  if (!existsSync(path)) return [];
  return readCsv(path);
}

// ---------------------------------------------------------------------------
// Build unemployment_monthly.csv
// ---------------------------------------------------------------------------

function buildUnemployment(wtCache: string, fredCache: string): CsvRow[] {
  const allRows: CsvRow[] = [];

  for (const cty of COUNTIES) {
    const df = readCsvSafe(join(wtCache, `bls_laus_${cty}_ur.csv`));
    for (const r of df) {
      if (r.date === null || r.value === null) continue;
      allRows.push({
        date: String(r.date),
        geo: cty,
        geo_label: GEO_LABELS[cty],
        unemployment_rate: Number(r.value),
      });
    }
  }

  // US national
  const us = readCsvSafe(join(fredCache, 'unemployment.csv'));
  for (const r of us) {
    if (r.date === null || r.value === null) continue;
    allRows.push({
      date: String(r.date),
      geo: 'US',
      geo_label: 'United States',
      unemployment_rate: Number(r.value),
    });
  }

  // Texas state
  const tx = readCsvSafe(join(fredCache, 'tx_unemployment.csv'));
  for (const r of tx) {
    if (r.date === null || r.value === null) continue;
    allRows.push({
      date: String(r.date),
      geo: 'TX',
      geo_label: 'Texas',
      unemployment_rate: Number(r.value),
    });
  }

  // Filter non-null and sort
  const filtered = allRows.filter(r => r.unemployment_rate !== null);
  filtered.sort((a, b) => {
    const dc = String(a.date).localeCompare(String(b.date));
    if (dc !== 0) return dc;
    return String(a.geo).localeCompare(String(b.geo));
  });

  return filtered;
}

// ---------------------------------------------------------------------------
// Build income_annual.csv
// ---------------------------------------------------------------------------

function buildIncome(wtCache: string): CsvRow[] {
  const income = readCsvSafe(join(wtCache, 'bea_income.csv'));
  return income;
}

// ---------------------------------------------------------------------------
// Build gdp_annual.csv
// ---------------------------------------------------------------------------

function buildGdp(wtCache: string): CsvRow[] {
  const gdp = readCsvSafe(join(wtCache, 'bea_gdp.csv'));
  if (gdp.length === 0) return [];

  // Sort by geo, year and compute YoY growth
  const sorted = [...gdp].sort((a, b) => {
    const gc = String(a.geo ?? '').localeCompare(String(b.geo ?? ''));
    if (gc !== 0) return gc;
    return Number(a.year ?? 0) - Number(b.year ?? 0);
  });

  const result: CsvRow[] = [];
  let prevGeo: string | null = null;
  let prevGdp: number | null = null;

  for (const r of sorted) {
    const geo = String(r.geo ?? '');
    const gdpVal = r.value !== null ? Number(r.value) : null;
    let growth: number | null = null;

    if (geo === prevGeo && prevGdp !== null && gdpVal !== null && prevGdp !== 0) {
      growth = round((gdpVal / prevGdp - 1) * 100, 2);
    }

    result.push({
      ...r,
      gdp_growth_pct: growth,
    });

    prevGeo = geo;
    prevGdp = gdpVal;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build west_texas_summary.csv
// ---------------------------------------------------------------------------

function buildSummary(unemp: CsvRow[], income: CsvRow[], gdp: CsvRow[]): CsvRow[] {
  const latestUr = (geo: string): number | null => {
    const rows = unemp.filter(r => r.geo === geo);
    if (rows.length === 0) return null;
    const last = rows.reduce((mx, r) => String(r.date) > String(mx.date) ? r : mx, rows[0]);
    return last.unemployment_rate !== null ? Number(last.unemployment_rate) : null;
  };

  const latestIncome = (geo: string): number | null => {
    if (income.length === 0) return null;
    const rows = income.filter(r => r.geo === geo);
    if (rows.length === 0) return null;
    const last = rows.reduce((mx, r) => Number(r.year ?? 0) > Number(mx.year ?? 0) ? r : mx, rows[0]);
    return last.value !== null ? Number(last.value) : null;
  };

  const countyUrs = COUNTIES.map(latestUr).filter(v => v !== null) as number[];
  const regionalAvgUr = countyUrs.length > 0 ? countyUrs.reduce((a, b) => a + b, 0) / countyUrs.length : null;

  const countyIncomes = COUNTIES.map(latestIncome).filter(v => v !== null) as number[];
  const regionalAvgIncome = countyIncomes.length > 0 ? countyIncomes.reduce((a, b) => a + b, 0) / countyIncomes.length : null;

  const td = today();
  const row: CsvRow = {
    as_of: formatDate(td),
    us_ur: latestUr('US'),
    tx_ur: latestUr('TX'),
    regional_avg_ur: round(regionalAvgUr, 1),
    county_count: countyUrs.length,
    us_income: latestIncome('US'),
    tx_income: latestIncome('TX'),
    regional_avg_income: round(regionalAvgIncome, 0),
  };

  // Add per-county UR and income dynamically
  for (const cty of COUNTIES) {
    row[`${cty}_ur`] = latestUr(cty);
    row[`${cty}_income`] = latestIncome(cty);
  }

  return [row];
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function buildWestTexas(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const wtCache = join(projectRoot, 'data', 'west-texas', 'cache');
  const fredCache = join(projectRoot, 'data', 'economy', 'cache');
  const outDir = join(projectRoot, 'data', 'west-texas');
  mkdirSync(outDir, { recursive: true });

  const unemp = buildUnemployment(wtCache, fredCache);
  writeCsv(join(outDir, 'unemployment_monthly.csv'), unemp,
    ['date', 'geo', 'geo_label', 'unemployment_rate']);
  log('west-texas', `unemployment_monthly.csv — ${unemp.length} rows`);

  const income = buildIncome(wtCache);
  if (income.length > 0) {
    writeCsv(join(outDir, 'income_annual.csv'), income);
    log('west-texas', `income_annual.csv — ${income.length} rows`);
  } else {
    writeCsv(join(outDir, 'income_annual.csv'), [],
      ['year', 'geo', 'geo_label', 'value']);
    log('west-texas', 'income_annual.csv — 0 rows (no BEA data)');
  }

  const gdp = buildGdp(wtCache);
  if (gdp.length > 0) {
    writeCsv(join(outDir, 'gdp_annual.csv'), gdp);
    log('west-texas', `gdp_annual.csv — ${gdp.length} rows`);
  } else {
    writeCsv(join(outDir, 'gdp_annual.csv'), [],
      ['year', 'geo', 'geo_label', 'value', 'gdp_growth_pct']);
    log('west-texas', 'gdp_annual.csv — 0 rows (no BEA data)');
  }

  const summary = buildSummary(unemp, income, gdp);
  // Dynamic columns: fixed fields + per-county UR and income
  const summaryColumns = [
    'as_of', 'us_ur', 'tx_ur', 'regional_avg_ur', 'county_count',
    ...COUNTIES.map(c => `${c}_ur`),
    'us_income', 'tx_income', 'regional_avg_income',
    ...COUNTIES.map(c => `${c}_income`),
  ];
  writeCsv(join(outDir, 'west_texas_summary.csv'), summary, summaryColumns);

  log('west-texas', `summary written`);
}
