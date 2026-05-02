/**
 * fcc.ts — Builds FCC application analysis CSVs from cached ULS bulk data.
 *
 * Outputs (all in data/fcc/):
 *   fcc_apps_by_type.csv           — Application counts by purpose code
 *   fcc_apps_by_year_type.csv      — Application counts by year and purpose code
 *   fcc_ham_by_decision.csv        — HAM license counts by decision status
 *   fcc_gmrs_by_decision.csv       — GMRS license counts by decision status
 *   fcc_gmrs_granted_timing.csv    — GMRS granted: min/max/avg days filing→decision
 *   fcc_gmrs_denied_timing.csv     — GMRS denied: min/max/avg days filing→decision
 *   fcc_gmrs_pending_elapsed.csv   — GMRS pending: elapsed time distribution
 *   fcc_gmrs_felony_decision.csv   — GMRS felony-flagged apps by decision
 *   fcc_gmrs_felony_timing.csv     — GMRS felony-flagged: duration filing→decision
 *   fcc_gmrs_felony_counts.csv     — GMRS granted/denied by felony question answer
 */

import { readCsv, writeCsv, type CsvRow, round } from '../lib/csv.js';
import { formatDate, today, parseDate } from '../lib/dates.js';
import { log } from '../lib/cache.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

function readCsvSafe(path: string): CsvRow[] {
  if (!existsSync(path)) return [];
  return readCsv(path);
}

/** Determine decision status from license_status + grant_date */
function getDecision(row: CsvRow): string {
  const status = String(row.license_status || '').toUpperCase();
  const grantDate = row.grant_date;
  const cancelDate = row.cancellation_date;

  if (status === 'A' && grantDate) return 'Granted';
  if (status === 'T' || status === 'C') return 'Denied';
  if (status === 'E') return 'Expired';
  // If has a grant_date, it was granted at some point
  if (grantDate) return 'Granted';
  if (cancelDate) return 'Denied';
  return 'Pending';
}

/** Infer the filing date from HS.dat history or fall back to last_action_date */
function getFilingDate(
  row: CsvRow,
  hsMap: Map<string, CsvRow[]>,
): string | null {
  const uid = String(row.unique_system_identifier || '');
  const history = hsMap.get(uid);

  if (history && history.length > 0) {
    // Look for RECNE (new application received) event
    const recne = history.find(h => String(h.code || '') === 'RECNE');
    if (recne && recne.log_date) return String(recne.log_date);

    // Fall back to earliest history entry
    const sorted = [...history]
      .filter(h => h.log_date)
      .sort((a, b) => String(a.log_date).localeCompare(String(b.log_date)));
    if (sorted.length > 0) return String(sorted[0].log_date);
  }

  // Fall back to last_action_date minus estimated processing time
  // or just return last_action_date as approximation
  return row.last_action_date ? String(row.last_action_date) : null;
}

/** Compute days between two YYYY-MM-DD date strings */
function daysBetween(startStr: string, endStr: string): number | null {
  try {
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return diff >= 0 ? diff : null;
  } catch {
    return null;
  }
}

/** Build filing→decision date using HS records and grant/cancel dates */
function getDecisionDate(row: CsvRow): string | null {
  const grantDate = row.grant_date ? String(row.grant_date) : null;
  const cancelDate = row.cancellation_date ? String(row.cancellation_date) : null;
  const lastAction = row.last_action_date ? String(row.last_action_date) : null;
  return grantDate || cancelDate || lastAction;
}

// ---------------------------------------------------------------------------
// 1. Applications by type
// ---------------------------------------------------------------------------

function buildAppsByType(amatHd: CsvRow[], gmrsHd: CsvRow[]): CsvRow[] {
  const all = [...amatHd, ...gmrsHd];
  const counts = new Map<string, number>();

  for (const row of all) {
    const svc = String(row.radio_service_code || 'Unknown');
    const label = svc === 'HA' ? 'Amateur'
      : svc === 'HV' ? 'Amateur Vanity'
      : svc === 'ZA' ? 'GMRS'
      : svc;
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ application_type: type, count }));
}

// ---------------------------------------------------------------------------
// 2. Applications by year and type
// ---------------------------------------------------------------------------

function buildAppsByYearType(amatHd: CsvRow[], gmrsHd: CsvRow[], hsMap: Map<string, CsvRow[]>): CsvRow[] {
  const all = [...amatHd, ...gmrsHd];
  const buckets = new Map<string, number>();

  for (const row of all) {
    const svc = String(row.radio_service_code || 'Unknown');
    const label = svc === 'HA' ? 'Amateur'
      : svc === 'HV' ? 'Amateur Vanity'
      : svc === 'ZA' ? 'GMRS'
      : svc;

    // Determine year from filing date or grant date
    const filing = getFilingDate(row, hsMap);
    const grantDate = row.grant_date ? String(row.grant_date) : null;
    const dateStr = filing || grantDate;
    if (!dateStr) continue;

    const year = dateStr.slice(0, 4);
    if (!year || isNaN(Number(year))) continue;

    const key = `${year}|${label}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return [...buckets.entries()]
    .map(([key, count]) => {
      const [year, type] = key.split('|');
      return { year: Number(year), application_type: type, count };
    })
    .sort((a, b) => Number(a.year) - Number(b.year) || String(a.application_type).localeCompare(String(b.application_type)));
}

// ---------------------------------------------------------------------------
// 3. HAM by decision
// ---------------------------------------------------------------------------

function buildHamByDecision(amatHd: CsvRow[]): CsvRow[] {
  const counts = new Map<string, number>();
  for (const row of amatHd) {
    const decision = getDecision(row);
    counts.set(decision, (counts.get(decision) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([decision, count]) => ({ decision, count }));
}

// ---------------------------------------------------------------------------
// 4. GMRS by decision
// ---------------------------------------------------------------------------

function buildGmrsByDecision(gmrsHd: CsvRow[]): CsvRow[] {
  const counts = new Map<string, number>();
  for (const row of gmrsHd) {
    const decision = getDecision(row);
    counts.set(decision, (counts.get(decision) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([decision, count]) => ({ decision, count }));
}

// ---------------------------------------------------------------------------
// 5. GMRS granted timing
// ---------------------------------------------------------------------------

function buildGmrsGrantedTiming(gmrsHd: CsvRow[], hsMap: Map<string, CsvRow[]>): CsvRow[] {
  const granted = gmrsHd.filter(r => getDecision(r) === 'Granted');
  const yearBuckets = new Map<number, number[]>();

  for (const row of granted) {
    const filingDate = getFilingDate(row, hsMap);
    const decisionDate = getDecisionDate(row);
    if (!filingDate || !decisionDate) continue;

    const days = daysBetween(filingDate, decisionDate);
    if (days === null || days < 0) continue;

    const year = Number(decisionDate.slice(0, 4));
    if (isNaN(year)) continue;

    if (!yearBuckets.has(year)) yearBuckets.set(year, []);
    yearBuckets.get(year)!.push(days);
  }

  return [...yearBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, durations]) => ({
      year,
      count: durations.length,
      min_days: Math.min(...durations),
      max_days: Math.max(...durations),
      avg_days: round(durations.reduce((a, b) => a + b, 0) / durations.length, 1),
    }));
}

// ---------------------------------------------------------------------------
// 6. GMRS denied timing
// ---------------------------------------------------------------------------

function buildGmrsDeniedTiming(gmrsHd: CsvRow[], hsMap: Map<string, CsvRow[]>): CsvRow[] {
  const denied = gmrsHd.filter(r => getDecision(r) === 'Denied');
  const yearBuckets = new Map<number, number[]>();

  for (const row of denied) {
    const filingDate = getFilingDate(row, hsMap);
    const decisionDate = getDecisionDate(row);
    if (!filingDate || !decisionDate) continue;

    const days = daysBetween(filingDate, decisionDate);
    if (days === null || days < 0) continue;

    const year = Number(decisionDate.slice(0, 4));
    if (isNaN(year)) continue;

    if (!yearBuckets.has(year)) yearBuckets.set(year, []);
    yearBuckets.get(year)!.push(days);
  }

  return [...yearBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, durations]) => ({
      year,
      count: durations.length,
      min_days: Math.min(...durations),
      max_days: Math.max(...durations),
      avg_days: round(durations.reduce((a, b) => a + b, 0) / durations.length, 1),
    }));
}

// ---------------------------------------------------------------------------
// 7. GMRS pending elapsed
// ---------------------------------------------------------------------------

function buildGmrsPendingElapsed(gmrsHd: CsvRow[], hsMap: Map<string, CsvRow[]>): CsvRow[] {
  const pending = gmrsHd.filter(r => getDecision(r) === 'Pending');
  const todayStr = formatDate(today());
  const buckets: Record<string, number> = {
    '0-30 days': 0,
    '31-90 days': 0,
    '91-180 days': 0,
    '181-365 days': 0,
    '1-2 years': 0,
    '2+ years': 0,
  };

  const details: CsvRow[] = [];

  for (const row of pending) {
    const filingDate = getFilingDate(row, hsMap);
    if (!filingDate) continue;

    const days = daysBetween(filingDate, todayStr);
    if (days === null) continue;

    let bucket: string;
    if (days <= 30) bucket = '0-30 days';
    else if (days <= 90) bucket = '31-90 days';
    else if (days <= 180) bucket = '91-180 days';
    else if (days <= 365) bucket = '181-365 days';
    else if (days <= 730) bucket = '1-2 years';
    else bucket = '2+ years';

    buckets[bucket]++;
  }

  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

// ---------------------------------------------------------------------------
// 8. GMRS felony question by decision
// ---------------------------------------------------------------------------

function buildGmrsFelonyDecision(gmrsHd: CsvRow[]): CsvRow[] {
  const felony = gmrsHd.filter(r => String(r.convicted || '').toUpperCase() === 'Y');
  const counts = new Map<string, number>();

  for (const row of felony) {
    const decision = getDecision(row);
    counts.set(decision, (counts.get(decision) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([decision, count]) => ({ decision, count, convicted: 'Y' }));
}

// ---------------------------------------------------------------------------
// 9. GMRS felony timing
// ---------------------------------------------------------------------------

function buildGmrsFelonyTiming(gmrsHd: CsvRow[], hsMap: Map<string, CsvRow[]>): CsvRow[] {
  const felony = gmrsHd.filter(r =>
    String(r.convicted || '').toUpperCase() === 'Y' &&
    (getDecision(r) === 'Granted' || getDecision(r) === 'Denied'),
  );

  const decisionBuckets = new Map<string, number[]>();

  for (const row of felony) {
    const decision = getDecision(row);
    const filingDate = getFilingDate(row, hsMap);
    const decisionDate = getDecisionDate(row);
    if (!filingDate || !decisionDate) continue;

    const days = daysBetween(filingDate, decisionDate);
    if (days === null || days < 0) continue;

    if (!decisionBuckets.has(decision)) decisionBuckets.set(decision, []);
    decisionBuckets.get(decision)!.push(days);
  }

  return [...decisionBuckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([decision, durations]) => ({
      decision,
      count: durations.length,
      min_days: Math.min(...durations),
      max_days: Math.max(...durations),
      avg_days: round(durations.reduce((a, b) => a + b, 0) / durations.length, 1),
    }));
}

// ---------------------------------------------------------------------------
// 10. GMRS granted/denied by felony question
// ---------------------------------------------------------------------------

function buildGmrsFelonyCounts(gmrsHd: CsvRow[]): CsvRow[] {
  const results: CsvRow[] = [];

  for (const convicted of ['Y', 'N']) {
    const subset = gmrsHd.filter(r => String(r.convicted || '').toUpperCase() === convicted);
    for (const decision of ['Granted', 'Denied']) {
      const count = subset.filter(r => getDecision(r) === decision).length;
      results.push({
        convicted,
        convicted_label: convicted === 'Y' ? 'Felony: Yes' : 'Felony: No',
        decision,
        count,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export async function buildFcc(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const cacheDir = join(projectRoot, 'data', 'fcc', 'cache');
  const outDir = join(projectRoot, 'data', 'fcc');
  mkdirSync(outDir, { recursive: true });

  // Load cached data
  const amatHd = readCsvSafe(join(cacheDir, 'fcc_amat_hd.csv'));
  const gmrsHd = readCsvSafe(join(cacheDir, 'fcc_gmrs_hd.csv'));
  const amatHs = readCsvSafe(join(cacheDir, 'fcc_amat_hs.csv'));
  const gmrsHs = readCsvSafe(join(cacheDir, 'fcc_gmrs_hs.csv'));

  if (amatHd.length === 0 && gmrsHd.length === 0) {
    log('fcc', 'No FCC data cached — skipping build. Run fetchFcc() first.');
    return;
  }

  log('fcc', `Loaded: ${amatHd.length} amateur HD, ${gmrsHd.length} GMRS HD, ${amatHs.length} amateur HS, ${gmrsHs.length} GMRS HS`);

  // Build history lookup map (all services combined)
  const hsMap = new Map<string, CsvRow[]>();
  for (const row of [...amatHs, ...gmrsHs]) {
    const uid = String(row.unique_system_identifier || '');
    if (!hsMap.has(uid)) hsMap.set(uid, []);
    hsMap.get(uid)!.push(row);
  }

  // 1. Apps by type
  const appsByType = buildAppsByType(amatHd, gmrsHd);
  writeCsv(join(outDir, 'fcc_apps_by_type.csv'), appsByType, ['application_type', 'count']);
  log('fcc', `fcc_apps_by_type.csv — ${appsByType.length} rows`);

  // 2. Apps by year and type
  const appsByYearType = buildAppsByYearType(amatHd, gmrsHd, hsMap);
  writeCsv(join(outDir, 'fcc_apps_by_year_type.csv'), appsByYearType, ['year', 'application_type', 'count']);
  log('fcc', `fcc_apps_by_year_type.csv — ${appsByYearType.length} rows`);

  // 3. HAM by decision
  const hamByDecision = buildHamByDecision(amatHd);
  writeCsv(join(outDir, 'fcc_ham_by_decision.csv'), hamByDecision, ['decision', 'count']);
  log('fcc', `fcc_ham_by_decision.csv — ${hamByDecision.length} rows`);

  // 4. GMRS by decision
  const gmrsByDecision = buildGmrsByDecision(gmrsHd);
  writeCsv(join(outDir, 'fcc_gmrs_by_decision.csv'), gmrsByDecision, ['decision', 'count']);
  log('fcc', `fcc_gmrs_by_decision.csv — ${gmrsByDecision.length} rows`);

  // 5. GMRS granted timing
  const gmrsGrantedTiming = buildGmrsGrantedTiming(gmrsHd, hsMap);
  writeCsv(join(outDir, 'fcc_gmrs_granted_timing.csv'), gmrsGrantedTiming,
    ['year', 'count', 'min_days', 'max_days', 'avg_days']);
  log('fcc', `fcc_gmrs_granted_timing.csv — ${gmrsGrantedTiming.length} rows`);

  // 6. GMRS denied timing
  const gmrsDeniedTiming = buildGmrsDeniedTiming(gmrsHd, hsMap);
  writeCsv(join(outDir, 'fcc_gmrs_denied_timing.csv'), gmrsDeniedTiming,
    ['year', 'count', 'min_days', 'max_days', 'avg_days']);
  log('fcc', `fcc_gmrs_denied_timing.csv — ${gmrsDeniedTiming.length} rows`);

  // 7. GMRS pending elapsed
  const gmrsPendingElapsed = buildGmrsPendingElapsed(gmrsHd, hsMap);
  writeCsv(join(outDir, 'fcc_gmrs_pending_elapsed.csv'), gmrsPendingElapsed, ['range', 'count']);
  log('fcc', `fcc_gmrs_pending_elapsed.csv — ${gmrsPendingElapsed.length} rows`);

  // 8. GMRS felony by decision
  const gmrsFelonyDecision = buildGmrsFelonyDecision(gmrsHd);
  writeCsv(join(outDir, 'fcc_gmrs_felony_decision.csv'), gmrsFelonyDecision,
    ['decision', 'count', 'convicted']);
  log('fcc', `fcc_gmrs_felony_decision.csv — ${gmrsFelonyDecision.length} rows`);

  // 9. GMRS felony timing
  const gmrsFelonyTiming = buildGmrsFelonyTiming(gmrsHd, hsMap);
  writeCsv(join(outDir, 'fcc_gmrs_felony_timing.csv'), gmrsFelonyTiming,
    ['decision', 'count', 'min_days', 'max_days', 'avg_days']);
  log('fcc', `fcc_gmrs_felony_timing.csv — ${gmrsFelonyTiming.length} rows`);

  // 10. GMRS felony counts (granted/denied by felony answer)
  const gmrsFelonyCounts = buildGmrsFelonyCounts(gmrsHd);
  writeCsv(join(outDir, 'fcc_gmrs_felony_counts.csv'), gmrsFelonyCounts,
    ['convicted', 'convicted_label', 'decision', 'count']);
  log('fcc', `fcc_gmrs_felony_counts.csv — ${gmrsFelonyCounts.length} rows`);

  log('fcc', 'Build complete.');
}
