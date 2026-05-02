import { describe, test, expect } from 'bun:test';
import {
  fmtPct, fmtSignedPct, fmtNum, fmtDollars,
  toneBySign, percentileVsHistory, toneColor,
} from '../../../../src/utils/formatters';

describe('fmtPct', () => {
  test('formats number as percentage', () => {
    expect(fmtPct(3.14)).toBe('3.1%');
  });

  test('returns em-dash for null', () => {
    expect(fmtPct(null)).toBe('\u2014');
  });

  test('returns em-dash for undefined', () => {
    expect(fmtPct(undefined)).toBe('\u2014');
  });

  test('returns em-dash for NaN', () => {
    expect(fmtPct(NaN)).toBe('\u2014');
  });

  test('formats zero', () => {
    expect(fmtPct(0)).toBe('0.0%');
  });

  test('respects custom decimals', () => {
    expect(fmtPct(3.14159, 3)).toBe('3.142%');
  });
});

describe('fmtSignedPct', () => {
  test('adds + prefix for positive', () => {
    expect(fmtSignedPct(3.14)).toBe('+3.1%');
  });

  test('shows - for negative', () => {
    expect(fmtSignedPct(-2.5)).toBe('-2.5%');
  });

  test('zero has no sign prefix', () => {
    expect(fmtSignedPct(0)).toBe('0.0%');
  });

  test('returns em-dash for null', () => {
    expect(fmtSignedPct(null)).toBe('\u2014');
  });
});

describe('fmtNum', () => {
  test('formats with commas', () => {
    expect(fmtNum(1234567)).toBe('1,234,567');
  });

  test('returns em-dash for null', () => {
    expect(fmtNum(null)).toBe('\u2014');
  });

  test('formats small number without commas', () => {
    expect(fmtNum(42)).toBe('42');
  });

  test('supports decimals parameter', () => {
    const result = fmtNum(1234.5, 2);
    expect(result).toContain('1,234.50');
  });
});

describe('fmtDollars', () => {
  test('formats dollar amount', () => {
    expect(fmtDollars(3.456)).toBe('$3.46');
  });

  test('returns em-dash for null', () => {
    expect(fmtDollars(null)).toBe('\u2014');
  });

  test('formats whole number', () => {
    expect(fmtDollars(100)).toBe('$100.00');
  });
});

describe('toneBySign', () => {
  test('positive value returns positive', () => {
    expect(toneBySign(1)).toBe('positive');
  });

  test('negative value returns negative', () => {
    expect(toneBySign(-1)).toBe('negative');
  });

  test('zero returns neutral', () => {
    expect(toneBySign(0)).toBe('neutral');
  });

  test('null returns neutral', () => {
    expect(toneBySign(null)).toBe('neutral');
  });

  test('NaN returns neutral', () => {
    expect(toneBySign(NaN)).toBe('neutral');
  });
});

describe('percentileVsHistory', () => {
  test('calculates percentile correctly', () => {
    const series = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentileVsHistory(50, series)).toBe(40);
  });

  test('returns 0 for empty series', () => {
    expect(percentileVsHistory(50, [])).toBe(0);
  });

  test('value below all returns 0', () => {
    expect(percentileVsHistory(1, [10, 20, 30])).toBe(0);
  });

  test('value above all returns 100', () => {
    expect(percentileVsHistory(100, [10, 20, 30])).toBe(100);
  });
});

describe('toneColor', () => {
  test('positive is green', () => {
    expect(toneColor('positive')).toBe('#2f9e44');
  });

  test('negative is red', () => {
    expect(toneColor('negative')).toBe('#bc4749');
  });

  test('neutral is grey', () => {
    expect(toneColor('neutral')).toBe('#6c757d');
  });

  test('warn is amber', () => {
    expect(toneColor('warn')).toBe('#f2c14e');
  });
});
