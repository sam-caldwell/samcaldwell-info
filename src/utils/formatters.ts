/** Format a number as a percentage string with 1 decimal place */
export function fmtPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || isNaN(v)) return '\u2014';
  return `${v.toFixed(decimals)}%`;
}

/** Format a number as a signed percentage (e.g., "+2.3%" or "-1.1%") */
export function fmtSignedPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || isNaN(v)) return '\u2014';
  const prefix = v > 0 ? '+' : '';
  return `${prefix}${v.toFixed(decimals)}%`;
}

/** Format a number with commas (e.g., 1,234,567) */
export function fmtNum(v: number | null | undefined, decimals = 0): string {
  if (v == null || isNaN(v)) return '\u2014';
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Format a dollar amount (e.g., "$3.45") */
export function fmtDollars(v: number | null | undefined, decimals = 2): string {
  if (v == null || isNaN(v)) return '\u2014';
  return `$${v.toFixed(decimals)}`;
}

/** Map positive/negative to semantic tone */
export function toneBySign(v: number | null | undefined): 'positive' | 'negative' | 'neutral' {
  if (v == null || isNaN(v) || v === 0) return 'neutral';
  return v > 0 ? 'positive' : 'negative';
}

/** Calculate a value's percentile within a number series */
export function percentileVsHistory(value: number, series: number[]): number {
  if (series.length === 0) return 0;
  const below = series.filter(v => v < value).length;
  return Math.round((below / series.length) * 100);
}

/** Get the color for a tone */
export function toneColor(tone: 'positive' | 'negative' | 'neutral' | 'warn'): string {
  switch (tone) {
    case 'positive': return '#2f9e44';
    case 'negative': return '#bc4749';
    case 'warn': return '#f2c14e';
    default: return '#6c757d';
  }
}
