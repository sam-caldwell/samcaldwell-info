import { describe, test, expect } from 'bun:test';
import { mergeCache, getLatestDate, getIncrementalStart, log, warn, redact } from '../../../../pipeline/lib/cache';
import type { CsvRow } from '../../../../pipeline/lib/csv';

describe('getLatestDate', () => {
  test('finds latest date string', () => {
    const rows: CsvRow[] = [
      { date: '2024-01-01', val: 1 },
      { date: '2024-06-15', val: 2 },
      { date: '2024-03-10', val: 3 },
    ];
    expect(getLatestDate(rows, 'date')).toBe('2024-06-15');
  });

  test('returns null for empty array', () => {
    expect(getLatestDate([], 'date')).toBeNull();
  });

  test('skips null values', () => {
    const rows: CsvRow[] = [
      { date: '2024-01-01', val: 1 },
      { date: null, val: 2 },
    ];
    expect(getLatestDate(rows, 'date')).toBe('2024-01-01');
  });

  test('skips numeric values (only considers strings)', () => {
    const rows: CsvRow[] = [
      { date: 20240101 as any, val: 1 },
      { date: '2023-06-15', val: 2 },
    ];
    expect(getLatestDate(rows, 'date')).toBe('2023-06-15');
  });
});

describe('getIncrementalStart', () => {
  test('returns day after latest', () => {
    const rows: CsvRow[] = [
      { date: '2024-01-15', val: 1 },
      { date: '2024-06-15', val: 2 },
    ];
    expect(getIncrementalStart(rows, 'date')).toBe('2024-06-16');
  });

  test('returns null for empty array', () => {
    expect(getIncrementalStart([], 'date')).toBeNull();
  });

  test('handles month boundary', () => {
    const rows: CsvRow[] = [{ date: '2024-01-31', val: 1 }];
    expect(getIncrementalStart(rows, 'date')).toBe('2024-02-01');
  });
});

describe('mergeCache', () => {
  const config = {
    path: '/tmp/test.csv',
    keyColumns: ['date', 'series'],
    dateColumn: 'date',
  };

  test('deduplicates on key columns', () => {
    const existing: CsvRow[] = [
      { date: '2024-01-01', series: 'A', val: 1 },
      { date: '2024-01-02', series: 'A', val: 2 },
    ];
    const newRows: CsvRow[] = [
      { date: '2024-01-02', series: 'A', val: 99 }, // duplicate key
      { date: '2024-01-03', series: 'A', val: 3 },
    ];
    const merged = mergeCache(config, existing, newRows);
    expect(merged).toHaveLength(3);
    // existing row wins (first seen)
    const jan2 = merged.find(r => r.date === '2024-01-02');
    expect(jan2!.val).toBe(2);
  });

  test('sorts by date column', () => {
    const existing: CsvRow[] = [
      { date: '2024-03-01', series: 'A', val: 3 },
    ];
    const newRows: CsvRow[] = [
      { date: '2024-01-01', series: 'A', val: 1 },
      { date: '2024-02-01', series: 'A', val: 2 },
    ];
    const merged = mergeCache(config, existing, newRows);
    expect(merged[0].date).toBe('2024-01-01');
    expect(merged[1].date).toBe('2024-02-01');
    expect(merged[2].date).toBe('2024-03-01');
  });

  test('merges without dateColumn sorts nothing', () => {
    const noDatesConfig = { path: '/tmp/test.csv', keyColumns: ['id'] };
    const existing: CsvRow[] = [{ id: 'b', val: 2 }];
    const newRows: CsvRow[] = [{ id: 'a', val: 1 }];
    const merged = mergeCache(noDatesConfig, existing, newRows);
    expect(merged).toHaveLength(2);
    // Order should be insertion order (existing first, then new)
    expect(merged[0].id).toBe('b');
    expect(merged[1].id).toBe('a');
  });
});

describe('log and warn (redaction)', () => {
  test('redact strips API keys from URLs', () => {
    const result = redact('Fetching https://api.example.com/data?api_key=SECRET123&format=json');
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('SECRET123');
  });

  test('redact strips Authorization headers', () => {
    const result = redact('Request with Authorization: BearerToken123abc');
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('BearerToken123abc');
  });

  test('redact passes through messages without keys unchanged', () => {
    const result = redact('Simple message with no secrets');
    expect(result).toBe('Simple message with no secrets');
  });
});
