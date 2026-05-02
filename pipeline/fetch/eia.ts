/**
 * EIA (Energy Information Administration) API v2 fetcher.
 * Covers PADD-level gasoline, STEO forecasts, and international prices.
 */

import { type CsvRow } from '../lib/csv.js';
import { httpGetJson } from '../lib/http.js';
import { loadCache, saveCache, getLatestDate, log, warn, type CacheConfig } from '../lib/cache.js';
import { sleep } from '../lib/dates.js';

const EIA_BASE = 'https://api.eia.gov/v2';

interface EiaRow {
  period?: string;
  value?: number | string | null;
  series?: string;
  seriesId?: string;
  duoarea?: string;
  countryRegionId?: string;
  'area-name'?: string;
  countryRegionName?: string;
  seriesDescription?: string;
  product?: string;
  productId?: string;
}

interface EiaResponse {
  response: {
    data: EiaRow[];
  };
}

interface DatasetConfig {
  key: string;
  path: string;
  facets: Record<string, string[]>;
  frequency: string;
  bootstrapStart: string;
}

const DATASETS: DatasetConfig[] = [
  {
    key: 'padd_gasoline_weekly',
    path: '/petroleum/pri/gnd/data/',
    facets: {
      duoarea: ['R10', 'R20', 'R30', 'R40', 'R50'],
      product: ['EPMR'],
    },
    frequency: 'weekly',
    bootstrapStart: '2015-01-01',
  },
  {
    key: 'steo_monthly',
    path: '/steo/data/',
    facets: {
      seriesId: ['WTIPUUS', 'COPRPUS', 'PATCPUS', 'NGHHMCF', 'TETCPUS'],
    },
    frequency: 'monthly',
    bootstrapStart: '2018-01',
  },
  {
    key: 'intl_gasoline_monthly',
    path: '/international/data/',
    facets: {
      countryRegionId: ['USA', 'CAN', 'GBR', 'DEU', 'FRA', 'ITA', 'JPN', 'KOR', 'MEX', 'CHN', 'IND', 'BRA', 'AUS'],
      productId: ['57'],
      activityId: ['6'],
    },
    frequency: 'monthly',
    bootstrapStart: '2005-01',
  },
];

function buildUrl(apiKey: string, ds: DatasetConfig, start: string): string {
  const params = new URLSearchParams();
  params.set('api_key', apiKey);
  params.set('data[0]', 'value');
  params.set('sort[0][column]', 'period');
  params.set('sort[0][direction]', 'asc');
  params.set('length', '5000');
  params.set('offset', '0');
  params.set('start', start);
  params.set('frequency', ds.frequency);

  let url = `${EIA_BASE}${ds.path}?${params.toString()}`;

  // Append facets as duplicate-key params: facets[name][]=val
  for (const [fname, vals] of Object.entries(ds.facets)) {
    for (const v of vals) {
      url += `&facets%5B${encodeURIComponent(fname)}%5D%5B%5D=${encodeURIComponent(v)}`;
    }
  }

  return url;
}

function normalizeRow(r: EiaRow): CsvRow {
  return {
    period: String(r.period ?? ''),
    value: r.value != null ? Number(r.value) : null,
    series_id: String(r.series ?? r.seriesId ?? ''),
    duoarea: String(r.duoarea ?? r.countryRegionId ?? ''),
    area_name: String(r['area-name'] ?? r.countryRegionName ?? r.seriesDescription ?? ''),
    product: String(r.product ?? r.productId ?? ''),
  };
}

function getNextPeriod(period: string): string {
  if (period.length >= 10) {
    // YYYY-MM-DD date format — next day
    const d = new Date(period + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (period.length === 7) {
    // YYYY-MM — next month
    const d = new Date(period + '-01T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + 1);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  return period;
}

async function fetchDataset(apiKey: string, ds: DatasetConfig): Promise<void> {
  const cache: CacheConfig = {
    path: `data/energy/cache/${ds.key}.csv`,
    keyColumns: ['period', 'series_id', 'duoarea'],
    dateColumn: 'period',
    columns: ['period', 'value', 'series_id', 'duoarea', 'area_name', 'product'],
  };
  const existing = loadCache(cache);
  const latestPeriod = getLatestDate(existing, 'period');
  const startPeriod = latestPeriod ? getNextPeriod(latestPeriod) : ds.bootstrapStart;

  log('eia', `${ds.key}: fetching from ${startPeriod}`);

  const url = buildUrl(apiKey, ds, startPeriod);
  let resp: EiaResponse;
  try {
    resp = await httpGetJson<EiaResponse>(url);
  } catch (err: any) {
    warn('eia', `${ds.key} fetch failed: ${err.message}`);
    return;
  }

  const rawRows = resp?.response?.data ?? [];
  if (rawRows.length === 0) {
    log('eia', `${ds.key}: no new rows`);
    return;
  }

  const newRows = rawRows.map(normalizeRow).filter(r => r.value !== null);
  saveCache(cache, existing, newRows);
  log('eia', `${ds.key}: +${newRows.length} rows`);
}

export async function fetchEia(): Promise<void> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) { warn('eia', 'No API key — skipping'); return; }

  log('eia', 'Starting fetch...');

  for (const ds of DATASETS) {
    await fetchDataset(apiKey, ds);
    await sleep(2000); // rate limit: 2s between requests
  }

  log('eia', 'Done.');
}
