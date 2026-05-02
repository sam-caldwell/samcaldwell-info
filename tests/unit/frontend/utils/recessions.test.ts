import { describe, test, expect } from 'bun:test';
import { recessions, isInRecession, recessionOverlaps } from '../../../../src/utils/recessions';

describe('recessions data', () => {
  test('has 3 entries', () => {
    expect(recessions).toHaveLength(3);
  });

  test('includes Dot-com, GFC, and COVID', () => {
    const labels = recessions.map(r => r.label);
    expect(labels).toContain('Dot-com');
    expect(labels).toContain('Great Financial Crisis');
    expect(labels).toContain('COVID-19');
  });
});

describe('isInRecession', () => {
  test('COVID period returns true', () => {
    expect(isInRecession('2020-03-15')).toBe(true);
  });

  test('normal period returns false', () => {
    expect(isInRecession('2019-06-15')).toBe(false);
  });

  test('start boundary of Dot-com returns true', () => {
    expect(isInRecession('2001-03-01')).toBe(true);
  });

  test('end boundary of Dot-com returns true', () => {
    expect(isInRecession('2001-11-30')).toBe(true);
  });

  test('day before Dot-com returns false', () => {
    expect(isInRecession('2001-02-28')).toBe(false);
  });

  test('day after Dot-com returns false', () => {
    expect(isInRecession('2001-12-01')).toBe(false);
  });

  test('GFC midpoint returns true', () => {
    expect(isInRecession('2008-06-15')).toBe(true);
  });
});

describe('recessionOverlaps', () => {
  test('range covering COVID returns 1 result', () => {
    const overlaps = recessionOverlaps('2020-01-01', '2020-12-31');
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].label).toBe('COVID-19');
  });

  test('range outside any recession returns empty', () => {
    const overlaps = recessionOverlaps('2015-01-01', '2015-12-31');
    expect(overlaps).toHaveLength(0);
  });

  test('range covering all recessions returns 3', () => {
    const overlaps = recessionOverlaps('2000-01-01', '2025-01-01');
    expect(overlaps).toHaveLength(3);
  });

  test('range partially overlapping GFC', () => {
    const overlaps = recessionOverlaps('2009-01-01', '2010-01-01');
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].label).toBe('Great Financial Crisis');
  });

  test('range ending exactly at recession start', () => {
    const overlaps = recessionOverlaps('2000-01-01', '2001-03-01');
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].label).toBe('Dot-com');
  });
});
