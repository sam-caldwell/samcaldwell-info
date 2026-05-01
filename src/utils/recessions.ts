/** US recession periods for overlay on charts */
export interface RecessionPeriod {
  start: string;  // ISO date
  end: string;    // ISO date
  label: string;
}

export const recessions: RecessionPeriod[] = [
  { start: '2001-03-01', end: '2001-11-30', label: 'Dot-com' },
  { start: '2007-12-01', end: '2009-06-30', label: 'Great Financial Crisis' },
  { start: '2020-02-01', end: '2020-04-30', label: 'COVID-19' },
];

/** Check if a date falls within any recession */
export function isInRecession(dateStr: string): boolean {
  return recessions.some(r => dateStr >= r.start && dateStr <= r.end);
}

/** Get recession periods that overlap with a date range */
export function recessionOverlaps(startDate: string, endDate: string): RecessionPeriod[] {
  return recessions.filter(r => r.end >= startDate && r.start <= endDate);
}
