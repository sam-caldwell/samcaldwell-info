/**
 * Cybersecurity threat feed fetchers — daily snapshots from Abuse.ch.
 *
 * Sources:
 *   - FeodoTracker: active botnet C2 infrastructure (JSON)
 *   - ThreatFox:    recent malicious IoCs incl. IP:port C2s (CSV)
 *
 * Each run saves a dated snapshot under data/cybersecurity/cache/ so that
 * daily history accumulates. Existing snapshots for the same date are kept.
 *
 * Attribution (required on every page rendering this data):
 *   FeodoTracker  https://feodotracker.abuse.ch/
 *   ThreatFox     https://threatfox.abuse.ch/
 */

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { httpGetJson, httpGetText } from '../lib/http.js';
import { log, warn } from '../lib/cache.js';
import { today, formatDate, sleep } from '../lib/dates.js';

const CYBER_CACHE = 'data/cybersecurity/cache';
const FEODO_URL = 'https://feodotracker.abuse.ch/downloads/ipblocklist.json';
const THREATFOX_URL = 'https://threatfox.abuse.ch/export/csv/recent/';

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/**
 * Fetch FeodoTracker botnet C2 blocklist as a dated JSON snapshot.
 * Response is a JSON array of objects with fields:
 *   ip_address, port, status, as_number, as_name, country, malware,
 *   first_seen, last_online
 */
export async function fetchFeodoTracker(): Promise<string | null> {
  ensureDir(CYBER_CACHE);
  const dateStr = formatDate(today());
  const snap = join(CYBER_CACHE, `feodo_${dateStr}.json`);

  if (existsSync(snap)) {
    log('feodo', `snapshot for ${dateStr} already cached`);
    return snap;
  }

  log('feodo', `fetching ${FEODO_URL}`);

  let data: unknown[];
  try {
    data = await httpGetJson<unknown[]>(FEODO_URL, {
      retries: 3,
      backoffMs: 5000,
    });
  } catch (err: any) {
    warn('feodo', `fetch failed: ${err.message}`);
    return null;
  }

  writeFileSync(snap, JSON.stringify(data, null, 2), 'utf-8');
  log('feodo', `cached ${data.length} rows to ${snap}`);
  return snap;
}

/**
 * Fetch ThreatFox recent IoC export as a dated CSV snapshot.
 * Response is CSV with # comment header lines to skip.
 * Columns: first_seen_utc, ioc_id, ioc_value, ioc_type, threat_type,
 *          fk_malware, malware_alias, malware_printable, last_seen_utc,
 *          confidence_level, is_compromised, reference, tags, anonymous, reporter
 */
export async function fetchThreatFox(): Promise<string | null> {
  ensureDir(CYBER_CACHE);
  const dateStr = formatDate(today());
  const snap = join(CYBER_CACHE, `threatfox_${dateStr}.csv`);

  if (existsSync(snap)) {
    log('threatfox', `snapshot for ${dateStr} already cached`);
    return snap;
  }

  log('threatfox', `fetching ${THREATFOX_URL}`);

  let body: string;
  try {
    body = await httpGetText(THREATFOX_URL, {
      retries: 3,
      backoffMs: 5000,
    });
  } catch (err: any) {
    warn('threatfox', `fetch failed: ${err.message}`);
    return null;
  }

  writeFileSync(snap, body, 'utf-8');
  const dataLines = body.split('\n').filter(l => !l.startsWith('#') && l.trim() !== '');
  // Subtract 1 for the header row among data lines (if present)
  const rowCount = Math.max(0, dataLines.length - 1);
  log('threatfox', `cached ~${rowCount} rows to ${snap}`);
  return snap;
}

/** Fetch all threat feed snapshots. */
export async function fetchAllThreats(): Promise<void> {
  log('threats', 'Fetching cybersecurity threat feeds');
  await fetchFeodoTracker();
  await fetchThreatFox();
}
