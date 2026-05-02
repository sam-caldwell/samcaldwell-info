/** CSV read/write — matches R's readr output */

import { existsSync } from 'fs';

export type CsvRow = Record<string, string | number | null>;

/** Read a CSV file, returning typed rows */
export function readCsv(path: string): CsvRow[] {
  if (!existsSync(path)) return [];
  const text = Bun.file(path).text ? undefined : undefined; // type hint
  const content = require('fs').readFileSync(path, 'utf-8') as string;
  return parseCsvText(content);
}

/** Read CSV async (preferred) */
export async function readCsvAsync(path: string): Promise<CsvRow[]> {
  if (!existsSync(path)) return [];
  const content = await Bun.file(path).text();
  return parseCsvText(content);
}

/** Parse CSV text into rows */
export function parseCsvText(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length !== headers.length) continue;
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = coerce(vals[j]);
    }
    rows.push(row);
  }
  return rows;
}

/** Parse a single CSV line handling quoted fields */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/** Coerce CSV field to number, null, or string */
function coerce(s: string): string | number | null {
  const t = s.trim();
  if (t === '' || t === 'NA' || t === 'NaN') return null;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t)) return Number(t);
  return t;
}

/** Write rows as CSV, matching readr output (LF, no BOM, minimal quoting) */
export function writeCsv(path: string, rows: CsvRow[], columns?: string[]): void {
  const cols = columns || (rows.length > 0 ? Object.keys(rows[0]) : []);
  const lines: string[] = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map(c => formatField(row[c])).join(','));
  }
  const content = lines.join('\n') + '\n';
  require('fs').mkdirSync(require('path').dirname(path), { recursive: true });
  require('fs').writeFileSync(path, content, 'utf-8');
}

/** Format a single CSV field */
function formatField(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (!isFinite(v)) return '';
    return String(v);
  }
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Round a number to n decimal places */
export function round(v: number | null | undefined, decimals: number): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}
