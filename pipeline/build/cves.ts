/**
 * cves.ts — Assembles a per-CVE table joining CISA KEV, EPSS, and NVD CVSS.
 *
 * Port of R/build_cves.R
 *
 * Outputs:
 *   data/cybersecurity/cves_kev.csv
 *   data/cybersecurity/cves_summary.csv
 */

import { readCsv, writeCsv, type CsvRow, round } from '../lib/csv.js';
import { formatDate, today } from '../lib/dates.js';
import { log, warn } from '../lib/cache.js';
import { existsSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Read latest KEV snapshot
// ---------------------------------------------------------------------------

function readLatestKev(cacheDir: string): CsvRow[] {
  if (!existsSync(cacheDir)) return [];
  const files = readdirSync(cacheDir)
    .filter(f => /^kev_\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse();
  if (files.length === 0) return [];

  const latest = join(cacheDir, files[0]);
  let body: any;
  try {
    body = JSON.parse(readFileSync(latest, 'utf-8'));
  } catch {
    return [];
  }

  if (!body || !body.vulnerabilities || !Array.isArray(body.vulnerabilities)) return [];

  return body.vulnerabilities.map((v: any) => ({
    cve: v.cveID ?? null,
    vendor_project: v.vendorProject ?? null,
    product: v.product ?? null,
    vulnerability_name: v.vulnerabilityName ?? null,
    short_description: v.shortDescription ?? null,
    date_added: v.dateAdded ?? null,
    required_action: v.requiredAction ?? null,
    due_date: v.dueDate ?? null,
    in_wild: 'TRUE',
  }));
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export async function buildCves(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const cyberDir = join(projectRoot, 'data', 'cybersecurity');
  const cyberCache = join(cyberDir, 'cache');
  mkdirSync(cyberDir, { recursive: true });

  const td = today();
  const kev = readLatestKev(cyberCache);

  if (kev.length === 0) {
    warn('cves', 'no KEV snapshot available; skipping CVE build');
    return;
  }

  // EPSS history
  const epssPath = join(cyberCache, 'epss_history.csv');
  const epss = existsSync(epssPath) ? readCsv(epssPath) : [];
  const epssMap = new Map<string, CsvRow>();
  for (const r of epss) {
    if (r.cve) epssMap.set(String(r.cve), r);
  }

  // NVD CVSS
  const nvdPath = join(cyberCache, 'nvd_cvss.csv');
  const nvd = existsSync(nvdPath) ? readCsv(nvdPath) : [];
  const nvdMap = new Map<string, CsvRow>();
  for (const r of nvd) {
    if (r.cve) nvdMap.set(String(r.cve), r);
  }

  // Join
  const joined: CsvRow[] = kev.map(k => {
    const cveId = String(k.cve);
    const e = epssMap.get(cveId);
    const n = nvdMap.get(cveId);

    const initialEpss = e?.initial_epss !== null && e?.initial_epss !== undefined ? Number(e.initial_epss) : null;
    const currentEpss = e?.current_epss !== null && e?.current_epss !== undefined ? Number(e.current_epss) : null;

    return {
      cve: k.cve,
      vendor_project: k.vendor_project,
      product: k.product,
      vulnerability_name: k.vulnerability_name,
      short_description: k.short_description,
      date_added: k.date_added,
      cvss_v3_base: n?.cvss_v3_base ?? null,
      cvss_v3_severity: n?.cvss_v3_severity ?? null,
      cvss_v2_base: n?.cvss_v2_base ?? null,
      initial_epss: initialEpss,
      initial_percentile: e?.initial_percentile ?? null,
      initial_date: e?.initial_date ?? null,
      current_epss: currentEpss,
      current_percentile: e?.current_percentile ?? null,
      current_date: e?.current_date ?? null,
      epss_delta: (currentEpss !== null && initialEpss !== null) ? round(currentEpss - initialEpss, 4) : null,
      required_action: k.required_action,
      due_date: k.due_date,
      in_wild: k.in_wild,
    };
  });

  // Sort by current_epss desc, then cvss_v3_base desc
  joined.sort((a, b) => {
    const ea = a.current_epss !== null ? Number(a.current_epss) : -1;
    const eb = b.current_epss !== null ? Number(b.current_epss) : -1;
    if (eb !== ea) return eb - ea;
    const ca = a.cvss_v3_base !== null ? Number(a.cvss_v3_base) : -1;
    const cb = b.cvss_v3_base !== null ? Number(b.cvss_v3_base) : -1;
    return cb - ca;
  });

  const kevCols = [
    'cve', 'vendor_project', 'product', 'vulnerability_name', 'short_description',
    'date_added', 'cvss_v3_base', 'cvss_v3_severity', 'cvss_v2_base',
    'initial_epss', 'initial_percentile', 'initial_date',
    'current_epss', 'current_percentile', 'current_date',
    'epss_delta', 'required_action', 'due_date', 'in_wild',
  ];
  writeCsv(join(cyberDir, 'cves_kev.csv'), joined, kevCols);

  // Summary
  const thirtyDaysAgo = formatDate(new Date(td.getTime() - 30 * 86400000));
  const kevAdded30d = kev.filter(k => k.date_added !== null && String(k.date_added) >= thirtyDaysAgo).length;

  // Top EPSS
  let topEpss: string | null = null;
  let topEpssScore: number | null = null;
  const epssValues: number[] = [];
  const cvssValues: number[] = [];

  for (const r of joined) {
    if (r.current_epss !== null) {
      const v = Number(r.current_epss);
      epssValues.push(v);
      if (topEpssScore === null || v > topEpssScore) {
        topEpssScore = v;
        topEpss = String(r.cve);
      }
    }
    if (r.cvss_v3_base !== null) cvssValues.push(Number(r.cvss_v3_base));
  }

  const medianOf = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const summary: CsvRow[] = [{
    as_of: formatDate(td),
    kev_total: kev.length,
    kev_added_30d: kevAdded30d,
    top_epss: topEpss,
    top_epss_score: topEpssScore,
    median_epss: medianOf(epssValues),
    median_cvss_v3: medianOf(cvssValues),
  }];
  writeCsv(join(cyberDir, 'cves_summary.csv'), summary,
    ['as_of', 'kev_total', 'kev_added_30d', 'top_epss', 'top_epss_score', 'median_epss', 'median_cvss_v3']);

  log('cves', `${kev.length} KEV CVEs (${kevAdded30d} added in last 30 days); top EPSS ${topEpss} = ${topEpssScore}`);
}
