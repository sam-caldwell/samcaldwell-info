/**
 * cybersecurity.ts — Aggregates daily threat snapshots into site-consumable CSVs.
 *
 * Port of R/build_cybersecurity.R
 *
 * Outputs:
 *   data/cybersecurity/current_threats.csv
 *   data/cybersecurity/current_botnets.csv
 *   data/cybersecurity/province_daily.csv
 *   data/cybersecurity/malware_family_daily.csv
 *   data/cybersecurity/threats_summary.csv
 */

import { readCsv, writeCsv, type CsvRow } from '../lib/csv.js';
import { formatDate, parseDate, today } from '../lib/dates.js';
import { log, warn } from '../lib/cache.js';
import { existsSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Parse snapshots
// ---------------------------------------------------------------------------

function parseFeodoSnapshot(path: string): CsvRow[] {
  const basename = path.split('/').pop() || '';
  const dateMatch = basename.match(/^feodo_(\d{4}-\d{2}-\d{2})\.json$/);
  if (!dateMatch) return [];
  const snapshotDate = dateMatch[1];

  let body: any[];
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    body = Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }

  const rows: CsvRow[] = [];
  for (const entry of body) {
    const ip = entry.ip_address ?? null;
    if (!ip) continue;
    rows.push({
      snapshot_date: snapshotDate,
      source: 'FeodoTracker',
      ip: String(ip),
      port: entry.port !== undefined ? Number(entry.port) : null,
      status: entry.status ?? null,
      as_number: entry.as_number !== undefined ? Number(entry.as_number) : null,
      as_name: entry.as_name ?? null,
      country_feed: entry.country ?? null,
      malware_family: entry.malware ?? null,
      first_seen: entry.first_seen ?? null,
      last_online: entry.last_online ?? null,
    });
  }
  return rows;
}

function parseThreatfoxSnapshot(path: string): CsvRow[] {
  const basename = path.split('/').pop() || '';
  const dateMatch = basename.match(/^threatfox_(\d{4}-\d{2}-\d{2})\.csv$/);
  if (!dateMatch) return [];
  const snapshotDate = dateMatch[1];

  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch {
    return [];
  }

  // Skip comment lines, parse CSV manually
  const lines = content.split('\n').filter(l => !l.startsWith('#') && l.trim().length > 0);
  if (lines.length === 0) return [];

  // ThreatFox columns (15-col layout)
  const tfCols = [
    'first_seen_utc', 'ioc_id', 'ioc_value', 'ioc_type',
    'threat_type', 'fk_malware', 'malware_alias', 'malware_printable',
    'last_seen_utc', 'confidence_level', 'is_compromised',
    'reference', 'tags', 'anonymous', 'reporter',
  ];

  const rows: CsvRow[] = [];
  for (const line of lines) {
    const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    if (parts.length < 8) continue;

    const iocType = parts[3] ?? '';
    if (iocType !== 'ip:port' && iocType !== 'ip') continue;

    const iocValue = parts[2] ?? '';
    const ip = iocValue.replace(/:.*$/, '');
    const port = iocValue.includes(':') ? Number(iocValue.replace(/^[^:]+:/, '')) : null;

    if (!ip || ip.length === 0) continue;

    const malwarePrintable = parts[7] ?? '';
    const fkMalware = parts[5] ?? '';
    const malwareFamily = malwarePrintable.length > 0 ? malwarePrintable : fkMalware;

    const firstSeen = parts[0] ?? '';
    const lastSeen = parts[8] ?? '';

    rows.push({
      snapshot_date: snapshotDate,
      source: 'ThreatFox',
      ip,
      port: port !== null && !isNaN(port) ? port : null,
      status: null,
      as_number: null,
      as_name: null,
      country_feed: null,
      malware_family: malwareFamily.length > 0 ? malwareFamily : null,
      first_seen: firstSeen.match(/^\d{4}-\d{2}-\d{2}/) ? firstSeen.slice(0, 10) : null,
      last_online: lastSeen.match(/^\d{4}-\d{2}-\d{2}/) ? lastSeen.slice(0, 10) : null,
    });
  }
  return rows;
}

function readAllSnapshots(cacheDir: string): CsvRow[] {
  if (!existsSync(cacheDir)) return [];
  const files = readdirSync(cacheDir);
  const feodoFiles = files.filter(f => /^feodo_\d{4}-\d{2}-\d{2}\.json$/.test(f)).map(f => join(cacheDir, f));
  const tfFiles = files.filter(f => /^threatfox_\d{4}-\d{2}-\d{2}\.csv$/.test(f)).map(f => join(cacheDir, f));

  const all: CsvRow[] = [];
  for (const f of feodoFiles) all.push(...parseFeodoSnapshot(f));
  for (const f of tfFiles) all.push(...parseThreatfoxSnapshot(f));
  return all;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export async function buildCybersecurity(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const cyberDir = join(projectRoot, 'data', 'cybersecurity');
  const cyberCache = join(cyberDir, 'cache');
  mkdirSync(cyberDir, { recursive: true });

  const snapshots = readAllSnapshots(cyberCache);

  // Load IP geolocation cache
  const geoPath = join(cyberCache, 'ip_geolocation.csv');
  const geo = existsSync(geoPath) ? readCsv(geoPath) : [];
  const geoMap = new Map<string, CsvRow>();
  for (const r of geo) {
    if (r.ip) geoMap.set(String(r.ip), r);
  }

  // Enrich with geo
  const enriched: CsvRow[] = snapshots.map(r => {
    const g = geoMap.get(String(r.ip));
    return {
      ...r,
      country: r.country_feed ?? (g ? g.country : null),
      region_name: g?.region_name ?? null,
      city: g?.city ?? null,
      lat: g?.lat ?? null,
      lon: g?.lon ?? null,
      as_name: r.as_name ?? (g ? g.as_name : null),
    };
  });

  const td = today();
  const latestDate = snapshots.length > 0
    ? snapshots.reduce((mx, r) => String(r.snapshot_date) > mx ? String(r.snapshot_date) : mx, '')
    : formatDate(td);

  // Current threats (latest snapshot)
  const currentThreats = enriched.filter(r => String(r.snapshot_date) === latestDate);
  const threatCols = [
    'snapshot_date', 'source', 'ip', 'port', 'status', 'malware_family',
    'country', 'region_name', 'city', 'lat', 'lon', 'as_name',
    'first_seen', 'last_online',
  ];
  writeCsv(join(cyberDir, 'current_threats.csv'), currentThreats, threatCols);

  // Current botnets (FeodoTracker only)
  const currentBotnets = currentThreats.filter(r => r.source === 'FeodoTracker');
  writeCsv(join(cyberDir, 'current_botnets.csv'), currentBotnets, threatCols);

  // Province daily
  const provKey = (r: CsvRow) => `${r.snapshot_date}|${r.source}|${r.country}|${r.region_name}`;
  const provGroups = new Map<string, { row: CsvRow; ips: Set<string> }>();
  for (const r of enriched) {
    if (!r.country || !r.region_name || String(r.region_name).length === 0) continue;
    const key = provKey(r);
    if (!provGroups.has(key)) {
      provGroups.set(key, { row: r, ips: new Set() });
    }
    provGroups.get(key)!.ips.add(String(r.ip));
  }
  const provDaily: CsvRow[] = [...provGroups.values()]
    .map(({ row, ips }) => ({
      snapshot_date: row.snapshot_date,
      source: row.source,
      country: row.country,
      region_name: row.region_name,
      n: ips.size,
    }))
    .sort((a, b) => {
      const dc = String(b.snapshot_date).localeCompare(String(a.snapshot_date));
      if (dc !== 0) return dc;
      return Number(b.n) - Number(a.n);
    });
  writeCsv(join(cyberDir, 'province_daily.csv'), provDaily,
    ['snapshot_date', 'source', 'country', 'region_name', 'n']);

  // Malware family daily
  const malKey = (r: CsvRow) => `${r.snapshot_date}|${r.source}|${r.malware_family}`;
  const malGroups = new Map<string, { row: CsvRow; ips: Set<string> }>();
  for (const r of enriched) {
    if (!r.malware_family || String(r.malware_family).length === 0) continue;
    const key = malKey(r);
    if (!malGroups.has(key)) {
      malGroups.set(key, { row: r, ips: new Set() });
    }
    malGroups.get(key)!.ips.add(String(r.ip));
  }
  const malDaily: CsvRow[] = [...malGroups.values()]
    .map(({ row, ips }) => ({
      snapshot_date: row.snapshot_date,
      source: row.source,
      malware_family: row.malware_family,
      n: ips.size,
    }))
    .sort((a, b) => {
      const dc = String(b.snapshot_date).localeCompare(String(a.snapshot_date));
      if (dc !== 0) return dc;
      return Number(b.n) - Number(a.n);
    });
  writeCsv(join(cyberDir, 'malware_family_daily.csv'), malDaily,
    ['snapshot_date', 'source', 'malware_family', 'n']);

  // Summary
  const todayThreats = currentThreats;
  const uniqueIps = new Set(todayThreats.map(r => String(r.ip)));
  const botnetIps = new Set(currentBotnets.map(r => String(r.ip)));
  const countries = new Set(todayThreats.filter(r => r.country).map(r => String(r.country)));
  const provinces = new Set(
    todayThreats
      .filter(r => r.region_name && String(r.region_name).length > 0)
      .map(r => `${r.country}|${r.region_name}`)
  );
  const sourcesActive = new Set(todayThreats.map(r => String(r.source)));

  // Top malware family
  const malCounts = new Map<string, number>();
  for (const r of todayThreats) {
    if (r.malware_family && String(r.malware_family).length > 0) {
      const fam = String(r.malware_family);
      malCounts.set(fam, (malCounts.get(fam) || 0) + 1);
    }
  }
  let topMalware: string | null = null;
  let topCount = 0;
  for (const [fam, count] of malCounts) {
    if (count > topCount) { topMalware = fam; topCount = count; }
  }

  const snapshotDates = new Set(snapshots.map(r => String(r.snapshot_date)));

  const summary: CsvRow[] = [{
    as_of: latestDate,
    sources_active: sourcesActive.size,
    total_ips_today: uniqueIps.size,
    total_botnet_ips_today: botnetIps.size,
    countries_today: countries.size,
    provinces_today: provinces.size,
    top_malware_today: topMalware,
    snapshots_accumulated: snapshotDates.size,
  }];
  writeCsv(join(cyberDir, 'threats_summary.csv'), summary,
    ['as_of', 'sources_active', 'total_ips_today', 'total_botnet_ips_today',
     'countries_today', 'provinces_today', 'top_malware_today', 'snapshots_accumulated']);

  log('cybersecurity', `${uniqueIps.size} IPs today (${botnetIps.size} botnet), ${provinces.size} provinces, ${snapshotDates.size} snapshots accumulated`);
}
