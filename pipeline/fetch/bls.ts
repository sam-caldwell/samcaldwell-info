/**
 * BLS LAUS (Local Area Unemployment Statistics) fetcher for
 * four West Texas counties: Sutton, Schleicher, Crockett, Kimble.
 */

import { type CsvRow } from '../lib/csv.js';
import { httpPostJson } from '../lib/http.js';
import { loadCache, saveCache, getLatestDate, log, warn, type CacheConfig } from '../lib/cache.js';
import { today, year, sleep } from '../lib/dates.js';

const BLS_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

const LAUS_SERIES: Record<string, string> = {
  sutton:     'LAUCN484350000000003',
  schleicher: 'LAUCN484130000000003',
  crockett:   'LAUCN481050000000003',
  kimble:     'LAUCN482670000000003',
};

interface BlsObservation {
  year: string;
  period: string;
  value: string;
}

interface BlsSeries {
  seriesID: string;
  data: BlsObservation[];
}

interface BlsResponse {
  status: string;
  message?: string[];
  Results: {
    series: BlsSeries[];
  };
}

function parseBlsSeries(data: BlsObservation[]): CsvRow[] {
  const rows: CsvRow[] = [];
  for (const obs of data) {
    if (obs.period === 'M13') continue; // skip annual average
    const m = parseInt(obs.period.replace('M', ''), 10);
    if (isNaN(m) || m < 1 || m > 12) continue;
    const val = Number(obs.value);
    if (isNaN(val)) continue;
    const date = `${obs.year}-${String(m).padStart(2, '0')}-01`;
    rows.push({ date, value: val });
  }
  return rows;
}

async function fetchCounty(apiKey: string | undefined, county: string, seriesId: string): Promise<void> {
  const cache: CacheConfig = {
    path: `data/west-texas/cache/bls_laus_${county}_ur.csv`,
    keyColumns: ['date'],
    dateColumn: 'date',
  };
  const existing = loadCache(cache);
  const latestDate = getLatestDate(existing, 'date');

  // BLS API allows 20-year windows. Start from the year of latest cache.
  const startYear = latestDate ? parseInt(latestDate.slice(0, 4), 10) : 2005;
  const endYear = year(today());

  if (startYear > endYear) {
    log('bls', `${county}: cache up-to-date`);
    return;
  }

  log('bls', `${county}: fetching ${seriesId} from ${startYear} to ${endYear}`);

  const body: Record<string, unknown> = {
    seriesid: [seriesId],
    startyear: String(startYear),
    endyear: String(endYear),
  };
  if (apiKey) body.registrationkey = apiKey;

  let resp: BlsResponse;
  try {
    resp = await httpPostJson<BlsResponse>(BLS_URL, body);
  } catch (err: any) {
    warn('bls', `${county} fetch failed: ${err.message}`);
    return;
  }

  if (resp.status !== 'REQUEST_SUCCEEDED') {
    warn('bls', `${county} API error: ${resp.message?.join('; ') ?? 'unknown'}`);
    return;
  }

  const series = resp.Results?.series;
  if (!series || series.length === 0) {
    log('bls', `${county}: no data returned`);
    return;
  }

  const newRows = parseBlsSeries(series[0].data);
  if (newRows.length === 0) {
    log('bls', `${county}: no new observations`);
    return;
  }

  saveCache(cache, existing, newRows);
  log('bls', `${county}: +${newRows.length} rows`);
}

export async function fetchBls(): Promise<void> {
  const apiKey = process.env.BLS_API_KEY;
  if (!apiKey) {
    warn('bls', 'No API key — using unauthenticated access (25 req/day limit)');
  }

  log('bls', 'Starting fetch...');

  for (const [county, seriesId] of Object.entries(LAUS_SERIES)) {
    await fetchCounty(apiKey, county, seriesId);
    await sleep(1000); // rate-limit courtesy
  }

  log('bls', 'Done.');
}
