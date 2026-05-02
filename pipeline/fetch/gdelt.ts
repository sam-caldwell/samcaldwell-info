/**
 * GDELT Doc 2.0 API fetcher — daily average tone of English-language
 * US news mentioning the US presidency / White House.
 *
 * Coverage: GDELT GKG starts April 2015.
 * License: CC-BY-NC.
 */

import { type CsvRow } from '../lib/csv.js';
import { httpGetText } from '../lib/http.js';
import { loadCache, saveCache, getIncrementalStart, log, warn, type CacheConfig } from '../lib/cache.js';
import { today, addDays, addMonths, formatDate, parseDate, sleep } from '../lib/dates.js';

const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_QUERY = '("white house" OR president OR presidential) sourcelang:eng sourcecountry:US';
const CHUNK_MONTHS = 3;
const SLEEP_MS = 6000;
const BOOTSTRAP = '2015-04-01';

interface GdeltDataPoint {
  date: string;
  value: number;
  norm?: number;
}

interface GdeltResponse {
  timeline: Array<{ data: GdeltDataPoint[] }>;
}

function formatDt(d: Date): string {
  return formatDate(d).replace(/-/g, '') + '000000';
}

async function fetchRange(start: Date, end: Date): Promise<CsvRow[]> {
  const endPlusOne = addDays(end, 1);
  const params = new URLSearchParams({
    query: GDELT_QUERY,
    mode: 'timelinetone',
    format: 'json',
    startdatetime: formatDt(start),
    enddatetime: formatDt(endPlusOne),
  });

  const url = `${GDELT_URL}?${params.toString()}`;
  let body: string;
  try {
    body = await httpGetText(url, { timeoutMs: 60000 });
  } catch (err: any) {
    warn('gdelt', `HTTP error for ${formatDate(start)}-${formatDate(end)}: ${err.message}`);
    return [];
  }

  // GDELT returns plain text for rate-limit/error; JSON only on success
  const trimmed = body.trim();
  if (!trimmed.startsWith('{')) {
    warn('gdelt', `non-JSON response for ${formatDate(start)}-${formatDate(end)}`);
    return [];
  }

  let parsed: GdeltResponse;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    warn('gdelt', `JSON parse error for ${formatDate(start)}-${formatDate(end)}`);
    return [];
  }

  if (!parsed.timeline || parsed.timeline.length === 0) return [];
  const dataPoints = parsed.timeline[0].data || [];

  const rows: CsvRow[] = [];
  for (const pt of dataPoints) {
    // date field: "20260322T000000Z" or "20260322..." — extract YYYYMMDD
    const dateStr = String(pt.date).slice(0, 8);
    if (!/^\d{8}$/.test(dateStr)) continue;
    const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    const tone = pt.value;
    if (tone == null || isNaN(tone)) continue;
    const volume = pt.norm != null ? Math.round(pt.norm) : null;
    rows.push({ date, tone, volume });
  }

  return rows;
}

export async function fetchGdelt(): Promise<void> {
  log('gdelt', 'Starting fetch...');

  const cache: CacheConfig = {
    path: 'data/sentiment/cache/gdelt_tone.csv',
    keyColumns: ['date'],
    dateColumn: 'date',
    columns: ['date', 'tone', 'volume'],
  };
  const existing = loadCache(cache);
  const startStr = getIncrementalStart(existing, 'date') || BOOTSTRAP;
  const startDate = parseDate(startStr);
  const endDate = addDays(today(), -1); // yesterday

  if (startDate > endDate) {
    log('gdelt', `cache up-to-date`);
    return;
  }

  log('gdelt', `Fetching from ${formatDate(startDate)} to ${formatDate(endDate)} (${CHUNK_MONTHS}-month chunks)`);

  // Build chunk boundaries
  const edges: Date[] = [];
  let cur = startDate;
  while (cur < endDate) {
    edges.push(cur);
    cur = addMonths(cur, CHUNK_MONTHS);
  }
  edges.push(endDate);

  const allNew: CsvRow[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const s = edges[i];
    const e = i + 1 < edges.length - 1 ? addDays(edges[i + 1], -1) : endDate;
    log('gdelt', `chunk ${i + 1}/${edges.length - 1}: ${formatDate(s)} to ${formatDate(e)}`);

    const chunk = await fetchRange(s, e);
    if (chunk.length > 0) {
      allNew.push(...chunk);
      log('gdelt', `  +${chunk.length} rows`);
    }

    if (i < edges.length - 2) await sleep(SLEEP_MS);
  }

  if (allNew.length === 0) {
    log('gdelt', 'No new data fetched');
    return;
  }

  saveCache(cache, existing, allNew);
  log('gdelt', `Done. ${allNew.length} new rows.`);
}
