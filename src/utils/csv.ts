/**
 * Lightweight CSV parser and fetcher.
 * Fetches a CSV file from /data/ and returns typed objects.
 */

/** Parse a CSV string into an array of objects with typed values */
export function parseCsv<T>(text: string): T[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const results: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = parseValue(values[j]);
    }
    results.push(row as T);
  }

  return results;
}

/** Parse a single CSV line, handling quoted fields */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/** Coerce a CSV string value to number, null, or string */
function parseValue(s: string): string | number | null {
  const trimmed = s.trim();
  if (trimmed === '' || trimmed === 'NA' || trimmed === 'NaN') return null;
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  return trimmed;
}

/** Fetch and parse a CSV file, returning typed objects */
export async function fetchCsv<T>(path: string): Promise<T[]> {
  try {
    const resp = await fetch(path);
    if (!resp.ok) {
      console.warn(`fetchCsv: ${path} returned ${resp.status}`);
      return [];
    }
    const text = await resp.text();
    return parseCsv<T>(text);
  } catch (err) {
    console.warn(`fetchCsv: failed to fetch ${path}`, err);
    return [];
  }
}

/** Fetch and parse a JSON file */
export async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const resp = await fetch(path);
    if (!resp.ok) {
      console.warn(`fetchJson: ${path} returned ${resp.status}`);
      return null;
    }
    return await resp.json() as T;
  } catch (err) {
    console.warn(`fetchJson: failed to fetch ${path}`, err);
    return null;
  }
}
