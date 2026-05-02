/**
 * IP geolocation cache using ip-api.com's free batch endpoint.
 *
 * Input:  array of IP strings to resolve.
 * Output: persistent cache at data/cybersecurity/cache/ip_geolocation.csv
 *         with columns: ip, country, country_code, region_code, region_name,
 *                       city, lat, lon, as_name, first_seen
 *
 * Only unseen IPs are looked up; repeated IPs reuse cached geolocation.
 *
 * Rate limits (ip-api.com free tier):
 *   - 45 requests / minute
 *   - Up to 100 IPs per batch request
 * We sleep 2s between batches (~30 batches/min, well under 45).
 *
 * License: ip-api.com free tier is non-commercial only.
 */

import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { readCsv, writeCsv, type CsvRow } from '../lib/csv.js';
import { httpPost } from '../lib/http.js';
import { log, warn } from '../lib/cache.js';
import { today, formatDate, sleep } from '../lib/dates.js';

const GEO_CACHE = 'data/cybersecurity/cache/ip_geolocation.csv';
const IPAPI_BATCH = 'http://ip-api.com/batch?fields=status,query,country,countryCode,region,regionName,city,lat,lon,as';
const BATCH_SIZE = 100;
const BATCH_SLEEP = 2000; // 2 seconds

const GEO_COLUMNS = [
  'ip', 'country', 'country_code', 'region_code', 'region_name',
  'city', 'lat', 'lon', 'as_name', 'first_seen',
];

interface GeoResponse {
  status: string;
  query: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  lat?: number;
  lon?: number;
  as?: string;
}

function loadGeoCache(): CsvRow[] {
  if (!existsSync(GEO_CACHE)) return [];
  return readCsv(GEO_CACHE);
}

function saveGeoCache(rows: CsvRow[]): void {
  mkdirSync(dirname(GEO_CACHE), { recursive: true });
  writeCsv(GEO_CACHE, rows, GEO_COLUMNS);
}

async function geolocateBatch(ips: string[]): Promise<CsvRow[]> {
  if (ips.length === 0) return [];

  let resp: Response;
  try {
    resp = await httpPost(IPAPI_BATCH, ips, {
      retries: 3,
      backoffMs: 10000,
    });
  } catch (err: any) {
    warn('geo', `batch failed: ${err.message}`);
    return [];
  }

  if (!resp.ok) {
    warn('geo', `batch HTTP ${resp.status}`);
    return [];
  }

  const results: GeoResponse[] = await resp.json();
  const dateStr = formatDate(today());
  const rows: CsvRow[] = [];

  for (const r of results) {
    if (r.status !== 'success') continue;
    rows.push({
      ip: r.query,
      country: r.country ?? null,
      country_code: r.countryCode ?? null,
      region_code: r.region ?? null,
      region_name: r.regionName ?? null,
      city: r.city ?? null,
      lat: r.lat ?? null,
      lon: r.lon ?? null,
      as_name: r.as ?? null,
      first_seen: dateStr,
    });
  }

  return rows;
}

/**
 * Geolocate an array of IPs, looking up only those not already cached.
 * Results are merged into the persistent cache at ip_geolocation.csv.
 */
export async function geolocateIps(ips: string[]): Promise<void> {
  // Deduplicate and clean input
  const unique = [...new Set(ips.filter(ip => ip && ip.trim() !== ''))];
  if (unique.length === 0) return;

  const cache = loadGeoCache();
  const cachedIps = new Set(cache.map(r => String(r.ip)));
  const newIps = unique.filter(ip => !cachedIps.has(ip));

  if (newIps.length === 0) {
    log('geo', 'cache covers all IPs; nothing to look up');
    return;
  }

  const batchCount = Math.ceil(newIps.length / BATCH_SIZE);
  log('geo', `resolving ${newIps.length} new IPs in ${batchCount} batches`);

  const allNewRows: CsvRow[] = [];

  for (let i = 0; i < batchCount; i++) {
    const batch = newIps.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const rows = await geolocateBatch(batch);
    allNewRows.push(...rows);

    if (i < batchCount - 1) {
      await sleep(BATCH_SLEEP);
    }
  }

  if (allNewRows.length === 0) return;

  // Merge: append new, dedup on ip, sort by ip
  const merged = [...cache, ...allNewRows];
  const seen = new Set<string>();
  const deduped: CsvRow[] = [];
  for (const row of merged) {
    const ip = String(row.ip);
    if (!seen.has(ip)) {
      seen.add(ip);
      deduped.push(row);
    }
  }
  deduped.sort((a, b) => String(a.ip ?? '').localeCompare(String(b.ip ?? '')));

  saveGeoCache(deduped);
  log('geo', `cache now ${deduped.length} IPs (+${allNewRows.length} new)`);
}
