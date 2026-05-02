/**
 * FRED (Federal Reserve Economic Data) incremental fetcher.
 * One CSV cache per series under data/economy/cache/.
 * Only public-domain US-government series are fetched.
 */

import { readCsv, writeCsv, type CsvRow } from '../lib/csv.js';
import { httpGetJson } from '../lib/http.js';
import { loadCache, saveCache, getIncrementalStart, log, warn, type CacheConfig } from '../lib/cache.js';
import { today, formatDate, parseDate, sleep } from '../lib/dates.js';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

const FRED_SERIES: Record<string, string> = {
  gdp_real:         'GDPC1',
  gdp_nominal:      'GDP',
  pce:              'PCEC',
  investment:       'GPDI',
  government:       'GCE',
  net_exports:      'NETEXP',
  unemployment:     'UNRATE',
  cpi:              'CPIAUCSL',
  fed_funds:        'FEDFUNDS',
  ten_year:         'DGS10',
  recession:        'USREC',
  debt_public:      'GFDEBTN',
  debt_pct_gdp:     'GFDEGDQ188S',
  deficit_nominal:  'FYFSD',
  deficit_pct_gdp:  'FYFSGDA188S',
  umcsent:          'UMCSENT',
  wti:              'DCOILWTICO',
  brent:            'DCOILBRENTEU',
  gas_retail_us:    'GASREGW',
  natgas_henry_hub: 'DHHNGSP',
  elec_retail_us:   'APU000074714',
  tx_unemployment:  'TXUR',
  tx_rgsp:          'TXRGSP',
};

interface FredResponse {
  observations: Array<{ date: string; value: string }>;
}

async function fetchSeries(apiKey: string, keyName: string, seriesId: string): Promise<void> {
  const cache: CacheConfig = {
    path: `data/economy/cache/${keyName}.csv`,
    keyColumns: ['date'],
    dateColumn: 'date',
  };
  const existing = loadCache(cache);
  const startDate = getIncrementalStart(existing, 'date') || '1998-01-01';
  const endDate = formatDate(today());

  if (startDate > endDate) {
    log('fred', `${keyName}: cache up-to-date`);
    return;
  }

  log('fred', `${keyName}: fetching ${seriesId} from ${startDate}`);

  const url = `${FRED_BASE}?api_key=${apiKey}&series_id=${seriesId}&observation_start=${startDate}&observation_end=${endDate}&file_type=json`;
  let data: FredResponse;
  try {
    data = await httpGetJson<FredResponse>(url);
  } catch (err: any) {
    warn('fred', `${keyName} fetch failed: ${err.message}`);
    return;
  }

  const newRows: CsvRow[] = [];
  for (const obs of data.observations || []) {
    if (obs.value === '.') continue;
    const val = Number(obs.value);
    if (isNaN(val)) continue;
    newRows.push({ date: obs.date, value: val });
  }

  if (newRows.length === 0) {
    log('fred', `${keyName}: no new observations`);
    return;
  }

  saveCache(cache, existing, newRows);
  log('fred', `${keyName}: +${newRows.length} rows`);
}

export async function fetchFred(): Promise<void> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) { warn('fred', 'No API key — skipping'); return; }

  log('fred', 'Starting fetch...');

  for (const [key, seriesId] of Object.entries(FRED_SERIES)) {
    await fetchSeries(apiKey, key, seriesId);
    await sleep(200); // rate-limit courtesy
  }

  log('fred', 'Done.');
}
