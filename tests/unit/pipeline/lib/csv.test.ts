import { describe, test, expect } from 'bun:test';
import { parseCsvText, round } from '../../../../pipeline/lib/csv';

describe('parseCsvText', () => {
  test('parses simple CSV', () => {
    const text = 'name,age\nAlice,30\nBob,25\n';
    const rows = parseCsvText(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Alice', age: 30 });
    expect(rows[1]).toEqual({ name: 'Bob', age: 25 });
  });

  test('handles quoted fields with commas', () => {
    const text = 'city,state\n"New York, NY",active\n';
    const rows = parseCsvText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].city).toBe('New York, NY');
    expect(rows[0].state).toBe('active');
  });

  test('handles escaped quotes', () => {
    const text = 'label,value\n"He said ""hello""",1\n';
    const rows = parseCsvText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('He said "hello"');
  });

  test('converts "NA" to null', () => {
    const text = 'a,b\nNA,1\n';
    const rows = parseCsvText(text);
    expect(rows[0].a).toBeNull();
    expect(rows[0].b).toBe(1);
  });

  test('converts numeric strings to numbers', () => {
    const text = 'val\n3.14\n-2\n1e5\n';
    const rows = parseCsvText(text);
    expect(rows[0].val).toBe(3.14);
    expect(rows[1].val).toBe(-2);
    expect(rows[2].val).toBe(100000);
  });

  test('returns [] for empty input', () => {
    expect(parseCsvText('')).toEqual([]);
    expect(parseCsvText('header_only')).toEqual([]);
  });

  test('converts "NaN" to null', () => {
    const text = 'a\nNaN\n';
    const rows = parseCsvText(text);
    expect(rows[0].a).toBeNull();
  });

  test('converts empty string fields to null', () => {
    const text = 'a,b\n,1\n';
    const rows = parseCsvText(text);
    expect(rows[0].a).toBeNull();
  });

  test('skips rows with mismatched column count', () => {
    const text = 'a,b\n1,2\n3\n4,5\n';
    const rows = parseCsvText(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ a: 1, b: 2 });
    expect(rows[1]).toEqual({ a: 4, b: 5 });
  });
});

describe('round', () => {
  test('rounds to specified decimal places', () => {
    expect(round(3.14159, 2)).toBe(3.14);
  });

  test('rounds to 0 decimal places', () => {
    expect(round(3.7, 0)).toBe(4);
  });

  test('returns null for null input', () => {
    expect(round(null, 2)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(round(undefined, 2)).toBeNull();
  });

  test('returns null for NaN input', () => {
    expect(round(NaN, 2)).toBeNull();
  });

  test('returns null for Infinity', () => {
    expect(round(Infinity, 2)).toBeNull();
  });

  test('handles negative numbers', () => {
    expect(round(-3.456, 1)).toBe(-3.5);
  });
});
