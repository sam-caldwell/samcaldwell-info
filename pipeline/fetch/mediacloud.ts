/**
 * Media Cloud monthly story-volume fetcher.
 * Complements GDELT tone with a volume signal back to 2008.
 */

import { type CsvRow } from '../lib/csv.js';
import { httpGetJson } from '../lib/http.js';
import { loadCache, saveCache, getLatestDate, log, warn, type CacheConfig } from '../lib/cache.js';
import { today, formatDate, addMonths, addDays, parseDate, year, month, utcDate, monthRange, sleep } from '../lib/dates.js';

const MC_URL = 'https://search.mediacloud.org/api/search/total-count';
const MC_QUERY = '("white house" OR president OR presidential)';
const MC_SLEEP = 300; // ms between requests
const BOOTSTRAP = '2008-01-01';

interface McResponse {
  count: { relevant: number; total: number };
}

async function fetchMonth(y: number, m: number, apiKey: string): Promise<CsvRow | null> {
  const start = utcDate(y, m, 1);
  const end = addDays(addMonths(start, 1), -1);

  const params = new URLSearchParams({
    q: MC_QUERY,
    start: formatDate(start),
    end: formatDate(end),
  });

  const url = `${MC_URL}?${params.toString()}`;
  let resp: McResponse;
  try {
    resp = await httpGetJson<McResponse>(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });
  } catch (err: any) {
    warn('mediacloud', `${y}-${String(m).padStart(2, '0')} failed: ${err.message}`);
    return null;
  }

  const relevant = resp?.count?.relevant;
  const total = resp?.count?.total;
  if (relevant == null) return null;

  return {
    year: y,
    month: m,
    date: formatDate(start),
    relevant,
    total: total ?? null,
  };
}

export async function fetchMediacloud(): Promise<void> {
  const apiKey = process.env.MEDIA_CLOUD_API_KEY;
  if (!apiKey) { warn('mediacloud', 'No API key — skipping'); return; }

  log('mediacloud', 'Starting fetch...');

  const cache: CacheConfig = {
    path: 'data/sentiment/cache/mediacloud_volume.csv',
    keyColumns: ['year', 'month'],
    dateColumn: 'date',
    columns: ['year', 'month', 'date', 'relevant', 'total'],
  };
  const existing = loadCache(cache);
  const latestDate = getLatestDate(existing, 'date');

  let startDate: Date;
  if (latestDate) {
    // Start from the month after the latest cached month
    startDate = addMonths(parseDate(latestDate), 1);
  } else {
    startDate = parseDate(BOOTSTRAP);
  }

  // End at the start of the current month
  const now = today();
  const endDate = utcDate(year(now), month(now), 1);

  if (startDate > endDate) {
    log('mediacloud', 'Cache up-to-date');
    return;
  }

  const months = monthRange(startDate, endDate);
  log('mediacloud', `Fetching ${months.length} months from ${formatDate(startDate)} to ${formatDate(endDate)}`);

  const newRows: CsvRow[] = [];
  for (let i = 0; i < months.length; i++) {
    const d = months[i];
    const row = await fetchMonth(year(d), month(d), apiKey);
    if (row) newRows.push(row);

    if ((i + 1) % 24 === 0) {
      log('mediacloud', `${i + 1}/${months.length} months fetched`);
    }
    await sleep(MC_SLEEP);
  }

  if (newRows.length === 0) {
    log('mediacloud', 'No new data');
    return;
  }

  saveCache(cache, existing, newRows);
  log('mediacloud', `Done. ${newRows.length} new rows.`);
}
