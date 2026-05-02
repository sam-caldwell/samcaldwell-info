/** Incremental cache management */

import { readCsv, writeCsv, type CsvRow } from './csv.js';
import { formatDate, parseDate } from './dates.js';

export interface CacheConfig {
  path: string;
  keyColumns: string[];
  dateColumn?: string;
  columns?: string[];
}

/** Read existing cache from disk */
export function loadCache(config: CacheConfig): CsvRow[] {
  return readCsv(config.path);
}

/** Get the latest date value in the cache */
export function getLatestDate(rows: CsvRow[], dateColumn: string): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    const v = row[dateColumn];
    if (v !== null && typeof v === 'string' && v > (latest || '')) {
      latest = v;
    }
  }
  return latest;
}

/** Get the next day after the latest cached date */
export function getIncrementalStart(rows: CsvRow[], dateColumn: string): string | null {
  const latest = getLatestDate(rows, dateColumn);
  if (!latest) return null;
  const d = parseDate(latest);
  d.setUTCDate(d.getUTCDate() + 1);
  return formatDate(d);
}

/** Merge new rows into existing cache, dedup on key columns, sort by date */
export function mergeCache(config: CacheConfig, existing: CsvRow[], newRows: CsvRow[]): CsvRow[] {
  const all = [...existing, ...newRows];
  // Dedup on key columns
  const seen = new Set<string>();
  const deduped: CsvRow[] = [];
  for (const row of all) {
    const key = config.keyColumns.map(k => String(row[k] ?? '')).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(row);
    }
  }
  // Sort by date column if specified
  if (config.dateColumn) {
    deduped.sort((a, b) => {
      const da = String(a[config.dateColumn!] ?? '');
      const db = String(b[config.dateColumn!] ?? '');
      return da.localeCompare(db);
    });
  }
  return deduped;
}

/** Full cache cycle: load, merge, write, return */
export function saveCache(config: CacheConfig, existing: CsvRow[], newRows: CsvRow[]): CsvRow[] {
  const merged = mergeCache(config, existing, newRows);
  writeCsv(config.path, merged, config.columns);
  return merged;
}

/** Redact API keys from log messages */
function redact(msg: string): string {
  // Redact common API key patterns in URLs
  return msg
    .replace(/[?&](api_key|apikey|key|token|UserID|registrationkey)=[^&\s]+/gi, (m) => {
      const eq = m.indexOf('=');
      return m.substring(0, eq + 1) + '[REDACTED]';
    })
    .replace(/Authorization:\s*\S+(\s+\S+)?/gi, 'Authorization: [REDACTED]');
}

/** Log helper */
export function log(section: string, msg: string): void {
  console.log(`[${section}] ${redact(msg)}`);
}

export function warn(section: string, msg: string): void {
  console.warn(`[${section}] WARNING: ${redact(msg)}`);
}
