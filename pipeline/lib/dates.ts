/** UTC date utilities — replaces lubridate */

export function today(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function yesterday(): Date {
  return addDays(today(), -1);
}

export function utcDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

export function parseDate(s: string): Date {
  // Handle YYYY-MM-DD, YYYY-MM, YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));
  }
  if (/^\d{4}-\d{2}$/.test(s)) {
    return new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, 1));
  }
  const d = new Date(s + (s.includes('T') ? '' : 'T00:00:00Z'));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatYM(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function formatYMD8(d: Date): string {
  return formatDate(d).replace(/-/g, '');
}

export function year(d: Date): number { return d.getUTCFullYear(); }
export function month(d: Date): number { return d.getUTCMonth() + 1; }
export function day(d: Date): number { return d.getUTCDate(); }
export function quarter(d: Date): number { return Math.ceil((d.getUTCMonth() + 1) / 3); }

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function startOfMonth(d: Date): Date {
  return utcDate(year(d), month(d), 1);
}

export function endOfMonth(d: Date): Date {
  return addDays(utcDate(year(d), month(d) + 1, 1), -1);
}

/** Generate array of first-of-month dates from start to end */
export function monthRange(start: Date, end: Date): Date[] {
  const result: Date[] = [];
  let cur = startOfMonth(start);
  while (cur <= end) {
    result.push(cur);
    cur = addMonths(cur, 1);
  }
  return result;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
