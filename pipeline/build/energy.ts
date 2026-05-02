/**
 * energy.ts — Assembles energy analysis CSVs from FRED + EIA caches.
 *
 * Port of R/build_energy.R
 *
 * Outputs:
 *   data/energy/us_prices_daily.csv
 *   data/energy/us_gas_retail_weekly.csv
 *   data/energy/us_electricity_monthly.csv
 *   data/energy/us_supply_demand.csv      (placeholder)
 *   data/energy/padd_gasoline_weekly.csv
 *   data/energy/padd_gas_current.csv
 *   data/energy/padd_gas_10y.csv
 *   data/energy/intl_prices.csv
 *   data/energy/steo_forecast.csv
 *   data/energy/energy_summary.csv
 *   data/energy/events_energy.csv         (passthrough if exists)
 */

import { readCsv, writeCsv, type CsvRow, round } from '../lib/csv.js';
import { formatDate, parseDate, today } from '../lib/dates.js';
import { log, warn } from '../lib/cache.js';
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFred(cacheDir: string, name: string): CsvRow[] {
  const p = join(cacheDir, `${name}.csv`);
  if (!existsSync(p)) return [];
  return readCsv(p).filter(r => r.date !== null && r.value !== null);
}

function readEiaCache(cacheDir: string, name: string): CsvRow[] {
  const p = join(cacheDir, `${name}.csv`);
  if (!existsSync(p)) return [];
  return readCsv(p);
}

/** Full outer join on 'date' for a list of single-column series */
function reduceFullJoin(tbls: { rows: CsvRow[]; col: string }[]): CsvRow[] {
  const dateMap = new Map<string, CsvRow>();
  for (const { rows, col } of tbls) {
    for (const r of rows) {
      const d = String(r.date);
      if (!dateMap.has(d)) dateMap.set(d, { date: d });
      dateMap.get(d)![col] = r[col] ?? null;
    }
  }
  return [...dateMap.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function lastValue(rows: CsvRow[], col: string): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][col] !== null && rows[i][col] !== undefined) return Number(rows[i][col]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export async function buildEnergy(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const fredCache = join(projectRoot, 'data', 'economy', 'cache');
  const energyDir = join(projectRoot, 'data', 'energy');
  const energyCache = join(energyDir, 'cache');
  mkdirSync(energyDir, { recursive: true });

  const td = today();

  // --- US daily prices ---
  const wti = readFred(fredCache, 'wti').map(r => ({ date: r.date, wti: r.value }));
  const brent = readFred(fredCache, 'brent').map(r => ({ date: r.date, brent: r.value }));
  const natgas = readFred(fredCache, 'natgas_henry_hub').map(r => ({ date: r.date, natgas: r.value }));
  const gasRetail = readFred(fredCache, 'gas_retail_us').map(r => ({ date: r.date, retail_gas: r.value }));
  const elec = readFred(fredCache, 'elec_retail_us').map(r => ({ date: r.date, electricity: r.value }));

  const usPrices = reduceFullJoin([
    { rows: wti, col: 'wti' },
    { rows: brent, col: 'brent' },
    { rows: natgas, col: 'natgas' },
  ]);
  writeCsv(join(energyDir, 'us_prices_daily.csv'), usPrices, ['date', 'wti', 'brent', 'natgas']);

  const gasRetailSorted = [...gasRetail].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  writeCsv(join(energyDir, 'us_gas_retail_weekly.csv'), gasRetailSorted, ['date', 'retail_gas']);

  const elecSorted = [...elec].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  writeCsv(join(energyDir, 'us_electricity_monthly.csv'), elecSorted, ['date', 'electricity']);

  // Supply/demand placeholder
  writeCsv(join(energyDir, 'us_supply_demand.csv'), [],
    ['date', 'us_crude_prod', 'us_crude_stocks', 'us_gas_demand']);

  // --- PADD gasoline ---
  const paddRaw = readEiaCache(energyCache, 'padd_gasoline_weekly');
  const padd: CsvRow[] = [];
  for (const r of paddRaw) {
    const dateStr = String(r.period ?? '');
    const d = dateStr.match(/^\d{4}-\d{2}-\d{2}$/) ? parseDate(dateStr) : null;
    const v = r.value !== null ? Number(r.value) : null;
    if (d === null || v === null || isNaN(v)) continue;
    padd.push({
      date: formatDate(d),
      duoarea: r.duoarea ?? null,
      area_name: r.area_name ?? null,
      product: r.product ?? null,
      value: v,
    });
  }
  writeCsv(join(energyDir, 'padd_gasoline_weekly.csv'), padd,
    ['date', 'duoarea', 'area_name', 'product', 'value']);

  if (padd.length > 0) {
    const latestDate = padd.reduce((mx, r) => String(r.date) > mx ? String(r.date) : mx, '');
    const priorWeek = formatDate(new Date(parseDate(latestDate).getTime() - 7 * 86400000));
    const tenYearsAgo = new Date(parseDate(latestDate).getTime() - 365.25 * 10 * 86400000);

    // Current price per PADD
    const currentMap = new Map<string, { duoarea: string; area_name: string; sum: number; n: number }>();
    for (const r of padd) {
      if (String(r.date) !== latestDate) continue;
      const key = String(r.duoarea);
      const e = currentMap.get(key) || { duoarea: key, area_name: String(r.area_name ?? ''), sum: 0, n: 0 };
      e.sum += Number(r.value);
      e.n++;
      currentMap.set(key, e);
    }

    // Prior week nearest per PADD
    const priorMap = new Map<string, { value: number; diff: number }>();
    for (const r of padd) {
      const d = parseDate(String(r.date));
      const diff = Math.abs(d.getTime() - parseDate(priorWeek).getTime());
      const key = String(r.duoarea);
      const existing = priorMap.get(key);
      if (!existing || diff < existing.diff) {
        priorMap.set(key, { value: Number(r.value), diff });
      }
    }

    // Ten years ago nearest per PADD
    const tenMap = new Map<string, { value: number; date: string; diff: number }>();
    for (const r of padd) {
      const d = parseDate(String(r.date));
      const diff = Math.abs(d.getTime() - tenYearsAgo.getTime());
      const key = String(r.duoarea);
      const existing = tenMap.get(key);
      if (!existing || diff < existing.diff) {
        tenMap.set(key, { value: Number(r.value), date: String(r.date), diff });
      }
    }

    const paddCurrent: CsvRow[] = [];
    const padd10y: CsvRow[] = [];
    for (const [key, cur] of currentMap) {
      const priceNow = round(cur.sum / cur.n, 3)!;
      const prior = priorMap.get(key);
      paddCurrent.push({
        duoarea: cur.duoarea,
        area_name: cur.area_name,
        price_now: priceNow,
        price_prior: prior ? round(prior.value, 3) : null,
        wow_change: prior ? round(priceNow - prior.value, 3) : null,
      });

      const ten = tenMap.get(key);
      padd10y.push({
        duoarea: cur.duoarea,
        area_name: cur.area_name,
        price_now: priceNow,
        price_10y_ago: ten ? round(ten.value, 3) : null,
        pct_change_10y: ten ? round(100 * (priceNow - ten.value) / ten.value, 1) : null,
        abs_change_10y: ten ? round(priceNow - ten.value, 3) : null,
        date_10y_ago: ten?.date ?? null,
      });
    }

    writeCsv(join(energyDir, 'padd_gas_current.csv'), paddCurrent,
      ['duoarea', 'area_name', 'price_now', 'price_prior', 'wow_change']);
    writeCsv(join(energyDir, 'padd_gas_10y.csv'), padd10y,
      ['duoarea', 'area_name', 'price_now', 'price_10y_ago', 'pct_change_10y', 'abs_change_10y', 'date_10y_ago']);
  } else {
    writeCsv(join(energyDir, 'padd_gas_current.csv'), [],
      ['duoarea', 'area_name', 'price_now', 'price_prior', 'wow_change']);
    writeCsv(join(energyDir, 'padd_gas_10y.csv'), [],
      ['duoarea', 'area_name', 'price_now', 'price_10y_ago', 'pct_change_10y', 'abs_change_10y', 'date_10y_ago']);
  }

  // --- International prices ---
  const intlRaw = readEiaCache(energyCache, 'intl_gasoline_monthly');
  const intl: CsvRow[] = [];
  for (const r of intlRaw) {
    const periodStr = String(r.period ?? '');
    const dateStr = periodStr.match(/^\d{4}-\d{2}$/) ? `${periodStr}-01` : periodStr;
    const d = dateStr.match(/^\d{4}-\d{2}-\d{2}$/) ? parseDate(dateStr) : null;
    const v = r.value !== null ? Number(r.value) : null;
    if (d === null || v === null || isNaN(v)) continue;
    intl.push({
      country: r.duoarea ?? null,
      country_name: r.area_name ?? null,
      period: formatDate(d),
      product: r.product ?? null,
      value: v,
    });
  }
  writeCsv(join(energyDir, 'intl_prices.csv'), intl,
    ['country', 'country_name', 'period', 'product', 'value']);

  // --- STEO forecast ---
  const steoRaw = readEiaCache(energyCache, 'steo_monthly');
  const steo: CsvRow[] = [];
  for (const r of steoRaw) {
    const periodStr = String(r.period ?? '');
    const dateStr = periodStr.match(/^\d{4}-\d{2}$/) ? `${periodStr}-01` : periodStr;
    const d = dateStr.match(/^\d{4}-\d{2}-\d{2}$/) ? parseDate(dateStr) : null;
    const v = r.value !== null ? Number(r.value) : null;
    if (d === null || v === null || isNaN(v)) continue;
    steo.push({
      date: formatDate(d),
      series_id: r.series_id ?? null,
      value: v,
    });
  }
  writeCsv(join(energyDir, 'steo_forecast.csv'), steo, ['date', 'series_id', 'value']);

  // --- Events passthrough ---
  const eventsPath = join(energyDir, 'events_energy.csv');
  if (existsSync(eventsPath)) {
    // Already present as hand-curated; leave as-is
    log('energy', 'events_energy.csv exists — passthrough');
  }

  // --- Summary ---
  const latestWti = lastValue(wti, 'wti');
  const latestBrent = lastValue(brent, 'brent');
  const latestGas = lastValue(gasRetail, 'retail_gas');
  const latestNatgas = lastValue(natgas, 'natgas');

  const summary: CsvRow[] = [{
    as_of: formatDate(td),
    wti_spot: round(latestWti, 2),
    brent_spot: round(latestBrent, 2),
    us_retail_gasoline: round(latestGas, 3),
    henry_hub_natgas: round(latestNatgas, 3),
    us_crude_production_mbd: null,  // retired FRED series
    padd_coverage: padd.length > 0 ? 'TRUE' : 'FALSE',
    intl_coverage: intl.length > 0 ? 'TRUE' : 'FALSE',
    steo_coverage: steo.length > 0 ? 'TRUE' : 'FALSE',
  }];
  writeCsv(join(energyDir, 'energy_summary.csv'), summary,
    ['as_of', 'wti_spot', 'brent_spot', 'us_retail_gasoline', 'henry_hub_natgas',
     'us_crude_production_mbd', 'padd_coverage', 'intl_coverage', 'steo_coverage']);

  log('energy', `WTI=${latestWti}, Brent=${latestBrent}, gas=${latestGas}, natgas=${latestNatgas}; PADD=${padd.length > 0}, INTL=${intl.length > 0}, STEO=${steo.length > 0}`);
}
