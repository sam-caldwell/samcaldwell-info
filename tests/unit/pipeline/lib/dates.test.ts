import { describe, test, expect } from 'bun:test';
import {
  parseDate, formatDate, formatYM, year, month, day, quarter,
  addDays, addMonths, diffDays, startOfMonth, endOfMonth, monthRange, utcDate,
} from '../../../../pipeline/lib/dates';

describe('parseDate', () => {
  test('parses YYYY-MM-DD', () => {
    const d = parseDate('2024-01-15');
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(15);
  });

  test('parses YYYY-MM as first of month', () => {
    const d = parseDate('2024-03');
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(2);
    expect(d.getUTCDate()).toBe(1);
  });

  test('parses YYYYMMDD', () => {
    const d = parseDate('20240115');
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(15);
  });
});

describe('formatDate', () => {
  test('produces YYYY-MM-DD', () => {
    const d = utcDate(2024, 1, 15);
    expect(formatDate(d)).toBe('2024-01-15');
  });

  test('pads single-digit months and days', () => {
    const d = utcDate(2024, 3, 5);
    expect(formatDate(d)).toBe('2024-03-05');
  });
});

describe('formatYM', () => {
  test('produces YYYY-MM', () => {
    const d = utcDate(2024, 1, 15);
    expect(formatYM(d)).toBe('2024-01');
  });

  test('pads single-digit month', () => {
    const d = utcDate(2024, 7, 1);
    expect(formatYM(d)).toBe('2024-07');
  });
});

describe('date extractors', () => {
  const d = utcDate(2024, 7, 20);

  test('year', () => { expect(year(d)).toBe(2024); });
  test('month', () => { expect(month(d)).toBe(7); });
  test('day', () => { expect(day(d)).toBe(20); });
  test('quarter Q1', () => { expect(quarter(utcDate(2024, 2, 1))).toBe(1); });
  test('quarter Q2', () => { expect(quarter(utcDate(2024, 4, 1))).toBe(2); });
  test('quarter Q3', () => { expect(quarter(utcDate(2024, 7, 1))).toBe(3); });
  test('quarter Q4', () => { expect(quarter(utcDate(2024, 12, 1))).toBe(4); });
});

describe('addDays', () => {
  test('adds one day', () => {
    const d = utcDate(2024, 1, 15);
    expect(formatDate(addDays(d, 1))).toBe('2024-01-16');
  });

  test('subtracts one day', () => {
    const d = utcDate(2024, 1, 15);
    expect(formatDate(addDays(d, -1))).toBe('2024-01-14');
  });

  test('crosses month boundary', () => {
    const d = utcDate(2024, 1, 31);
    expect(formatDate(addDays(d, 1))).toBe('2024-02-01');
  });
});

describe('addMonths', () => {
  test('adds months', () => {
    const d = utcDate(2024, 1, 15);
    expect(formatDate(addMonths(d, 3))).toBe('2024-04-15');
  });

  test('handles month rollover across year', () => {
    const d = utcDate(2024, 11, 15);
    expect(formatDate(addMonths(d, 3))).toBe('2025-02-15');
  });

  test('subtracts months', () => {
    const d = utcDate(2024, 3, 15);
    expect(formatDate(addMonths(d, -2))).toBe('2024-01-15');
  });
});

describe('diffDays', () => {
  test('calculates positive difference', () => {
    const a = utcDate(2024, 1, 20);
    const b = utcDate(2024, 1, 15);
    expect(diffDays(a, b)).toBe(5);
  });

  test('calculates negative difference', () => {
    const a = utcDate(2024, 1, 10);
    const b = utcDate(2024, 1, 15);
    expect(diffDays(a, b)).toBe(-5);
  });

  test('returns 0 for same date', () => {
    const d = utcDate(2024, 1, 15);
    expect(diffDays(d, d)).toBe(0);
  });
});

describe('startOfMonth', () => {
  test('returns first of same month', () => {
    const d = utcDate(2024, 7, 20);
    expect(formatDate(startOfMonth(d))).toBe('2024-07-01');
  });
});

describe('endOfMonth', () => {
  test('returns last day of month', () => {
    const d = utcDate(2024, 1, 15);
    expect(formatDate(endOfMonth(d))).toBe('2024-01-31');
  });

  test('handles February in leap year', () => {
    const d = utcDate(2024, 2, 10);
    expect(formatDate(endOfMonth(d))).toBe('2024-02-29');
  });

  test('handles February in non-leap year', () => {
    const d = utcDate(2023, 2, 10);
    expect(formatDate(endOfMonth(d))).toBe('2023-02-28');
  });
});

describe('monthRange', () => {
  test('produces correct array length', () => {
    const start = utcDate(2024, 1, 1);
    const end = utcDate(2024, 6, 30);
    const range = monthRange(start, end);
    expect(range).toHaveLength(6);
    expect(formatDate(range[0])).toBe('2024-01-01');
    expect(formatDate(range[5])).toBe('2024-06-01');
  });

  test('returns single month when start equals end month', () => {
    const start = utcDate(2024, 3, 10);
    const end = utcDate(2024, 3, 25);
    const range = monthRange(start, end);
    expect(range).toHaveLength(1);
    expect(formatDate(range[0])).toBe('2024-03-01');
  });

  test('returns empty for end before start', () => {
    const start = utcDate(2024, 6, 1);
    const end = utcDate(2024, 1, 1);
    expect(monthRange(start, end)).toHaveLength(0);
  });
});
