/**
 * CVE data fetchers for three public-domain sources:
 *
 *   1. CISA KEV — Known Exploited Vulnerabilities Catalog.
 *      Public domain (US government work).
 *      https://www.cisa.gov/known-exploited-vulnerabilities-catalog
 *
 *   2. FIRST EPSS — Exploit Prediction Scoring System.
 *      Daily probability that each CVE will be exploited in the next 30 days.
 *      CC-BY-SA. https://www.first.org/epss/
 *
 *   3. NVD — National Vulnerability Database CVSS scores per CVE.
 *      Public domain (NIST).
 *      https://services.nvd.nist.gov/rest/json/cves/2.0/
 *
 * Snapshots saved to data/cybersecurity/cache/. The EPSS history cache is
 * persistent so we can compare "initial" (first-seen) to "current" EPSS.
 */

import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { readCsv, writeCsv, parseCsvText, type CsvRow } from '../lib/csv.js';
import { httpGet, httpGetJson, httpGetText } from '../lib/http.js';
import { log, warn } from '../lib/cache.js';
import { today, formatDate, sleep } from '../lib/dates.js';

const CYBER_CACHE = 'data/cybersecurity/cache';

const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

function epssUrl(dateStr: string): string {
  return `https://epss.cyentia.com/epss_scores-${dateStr}.csv.gz`;
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// CISA KEV
// ---------------------------------------------------------------------------

interface KevResponse {
  vulnerabilities: Array<{
    cveID: string;
    vendorProject: string;
    product: string;
    vulnerabilityName: string;
    shortDescription: string;
    dateAdded: string;
    requiredAction: string;
    dueDate: string;
  }>;
}

/**
 * Fetch the CISA Known Exploited Vulnerabilities catalog as a dated JSON snapshot.
 */
export async function fetchKev(): Promise<string | null> {
  ensureDir(CYBER_CACHE);
  const dateStr = formatDate(today());
  const snap = join(CYBER_CACHE, `kev_${dateStr}.json`);

  if (existsSync(snap)) {
    log('kev', `snapshot for ${dateStr} already cached`);
    return snap;
  }

  log('kev', `fetching ${KEV_URL}`);

  let body: string;
  try {
    body = await httpGetText(KEV_URL, { retries: 3, backoffMs: 5000 });
  } catch (err: any) {
    warn('kev', `fetch failed: ${err.message}`);
    return null;
  }

  writeFileSync(snap, body, 'utf-8');
  const parsed: KevResponse = JSON.parse(body);
  const count = parsed.vulnerabilities?.length ?? 0;
  log('kev', `cached ${count} vulnerabilities`);
  return snap;
}

// ---------------------------------------------------------------------------
// EPSS
// ---------------------------------------------------------------------------

const EPSS_HISTORY = join(CYBER_CACHE, 'epss_history.csv');

const EPSS_COLUMNS = [
  'cve', 'initial_epss', 'initial_percentile', 'initial_date',
  'current_epss', 'current_percentile', 'current_date',
];

interface EpssRow {
  cve: string;
  epss: number;
  percentile: number;
}

/**
 * Download today's EPSS scores (.csv.gz), decompress, parse, and update
 * the persistent epss_history.csv tracking initial vs current scores.
 */
export async function fetchEpss(): Promise<void> {
  ensureDir(CYBER_CACHE);
  const dateStr = formatDate(today());
  const dailyGz = join(CYBER_CACHE, `epss_${dateStr}.csv.gz`);

  // Download raw .csv.gz if not already present
  if (!existsSync(dailyGz)) {
    const url = epssUrl(dateStr);
    log('epss', `fetching ${url}`);

    let resp: Response;
    try {
      resp = await httpGet(url, { retries: 3, backoffMs: 5000 });
    } catch (err: any) {
      warn('epss', `fetch failed: ${err.message}`);
      return;
    }
    if (!resp.ok) {
      warn('epss', `HTTP ${resp.status} for ${url}`);
      return;
    }

    const buf = Buffer.from(await resp.arrayBuffer());
    writeFileSync(dailyGz, buf);
    log('epss', `saved raw ${dailyGz}`);
  } else {
    log('epss', `${dateStr} raw file already cached`);
  }

  // Decompress and parse
  let csvText: string;
  try {
    const compressed = readFileSync(dailyGz);
    const decompressed = Bun.gunzipSync(compressed);
    csvText = new TextDecoder().decode(decompressed);
  } catch (err: any) {
    warn('epss', `decompress failed: ${err.message}`);
    return;
  }

  // Skip the first line (comment starting with #), then parse as CSV
  const lines = csvText.split('\n');
  const dataLines = lines.filter(l => !l.startsWith('#'));
  const csvContent = dataLines.join('\n');
  const parsed = parseCsvText(csvContent);

  if (parsed.length === 0) {
    warn('epss', 'no data rows after parsing');
    return;
  }

  // Build today's lookup: cve -> { epss, percentile }
  const todayMap = new Map<string, EpssRow>();
  for (const row of parsed) {
    const cve = String(row.cve ?? '');
    if (!cve) continue;
    todayMap.set(cve, {
      cve,
      epss: Number(row.epss ?? 0),
      percentile: Number(row.percentile ?? 0),
    });
  }

  // Load existing history
  const existing = existsSync(EPSS_HISTORY) ? readCsv(EPSS_HISTORY) : [];
  const existingMap = new Map<string, CsvRow>();
  for (const row of existing) {
    existingMap.set(String(row.cve ?? ''), row);
  }

  // Merge: update current for known CVEs, add new CVEs with initial = current
  const merged: CsvRow[] = [];
  const existingCves = new Set(existingMap.keys());

  // Update existing entries
  for (const row of existing) {
    const cve = String(row.cve ?? '');
    const todayData = todayMap.get(cve);
    if (todayData) {
      merged.push({
        ...row,
        current_epss: todayData.epss,
        current_percentile: todayData.percentile,
        current_date: dateStr,
      });
    } else {
      merged.push(row);
    }
  }

  // Add new CVEs
  let newCount = 0;
  for (const [cve, data] of todayMap) {
    if (!existingCves.has(cve)) {
      merged.push({
        cve,
        initial_epss: data.epss,
        initial_percentile: data.percentile,
        initial_date: dateStr,
        current_epss: data.epss,
        current_percentile: data.percentile,
        current_date: dateStr,
      });
      newCount++;
    }
  }

  writeCsv(EPSS_HISTORY, merged, EPSS_COLUMNS);
  log('epss', `history now ${merged.length} CVEs (+${newCount} new)`);
}

// ---------------------------------------------------------------------------
// NVD CVSS
// ---------------------------------------------------------------------------

const NVD_CACHE = join(CYBER_CACHE, 'nvd_cvss.csv');
const NVD_COLUMNS = ['cve', 'cvss_v3_base', 'cvss_v3_severity', 'cvss_v2_base'];

interface NvdResponse {
  vulnerabilities: Array<{
    cve: {
      metrics: {
        cvssMetricV31?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }>;
        cvssMetricV30?: Array<{ cvssData: { baseScore: number; baseSeverity: string } }>;
        cvssMetricV2?: Array<{ cvssData: { baseScore: number } }>;
      };
    };
  }>;
}

/**
 * Fetch CVSS scores from NVD for a list of CVE IDs.
 * Only looks up CVEs not already in the persistent cache.
 * Rate-limited to ~2 requests/second (0.6s between requests).
 */
export async function fetchNvdCvss(cveIds: string[]): Promise<void> {
  ensureDir(CYBER_CACHE);

  const cache = existsSync(NVD_CACHE) ? readCsv(NVD_CACHE) : [];
  const cachedCves = new Set(cache.map(r => String(r.cve)));
  const missing = cveIds.filter(id => !cachedCves.has(id));

  if (missing.length === 0) {
    log('nvd', 'all CVEs already cached');
    return;
  }

  log('nvd', `looking up ${missing.length} CVEs (2 req/sec)`);
  const newRows: CsvRow[] = [];

  for (const cveId of missing) {
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0/?cveId=${cveId}`;

    let v3Base: number | null = null;
    let v3Severity: string | null = null;
    let v2Base: number | null = null;

    try {
      const data = await httpGetJson<NvdResponse>(url, {
        retries: 3,
        backoffMs: 10000,
        timeoutMs: 30000,
      });

      if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        const metrics = data.vulnerabilities[0].cve.metrics;

        // Prefer CVSS v3.1, fall back to v3.0
        if (metrics.cvssMetricV31 && metrics.cvssMetricV31.length > 0) {
          v3Base = metrics.cvssMetricV31[0].cvssData.baseScore;
          v3Severity = metrics.cvssMetricV31[0].cvssData.baseSeverity;
        } else if (metrics.cvssMetricV30 && metrics.cvssMetricV30.length > 0) {
          v3Base = metrics.cvssMetricV30[0].cvssData.baseScore;
          v3Severity = metrics.cvssMetricV30[0].cvssData.baseSeverity;
        }

        // CVSS v2
        if (metrics.cvssMetricV2 && metrics.cvssMetricV2.length > 0) {
          v2Base = metrics.cvssMetricV2[0].cvssData.baseScore;
        }
      }
    } catch (err: any) {
      warn('nvd', `${cveId} lookup failed: ${err.message}`);
    }

    newRows.push({
      cve: cveId,
      cvss_v3_base: v3Base,
      cvss_v3_severity: v3Severity,
      cvss_v2_base: v2Base,
    });

    await sleep(600); // 0.6s — stay under 2 req/sec without API key
  }

  const merged = [...cache, ...newRows];
  // Dedup on CVE ID
  const seen = new Set<string>();
  const deduped: CsvRow[] = [];
  for (const row of merged) {
    const cve = String(row.cve);
    if (!seen.has(cve)) {
      seen.add(cve);
      deduped.push(row);
    }
  }

  writeCsv(NVD_CACHE, deduped, NVD_COLUMNS);
  log('nvd', `cache now ${deduped.length} CVEs (+${newRows.length} new)`);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Fetch all CVE data sources (KEV + EPSS).
 * NVD CVSS is on-demand via fetchNvdCvss() as build discovers which CVEs need scores.
 */
export async function fetchAllCves(): Promise<void> {
  log('cves', 'Fetching CVE data (CISA KEV, EPSS, NVD CVSS)');
  await fetchKev();
  await fetchEpss();
  // NVD CVSS is filled in by the build step as it discovers which CVEs need scores
}
