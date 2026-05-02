import { describe, test, expect } from 'bun:test';
import { computeAdminBands } from '../../../../src/components/AdminBands';
import type { Administration } from '../../../../src/types';

const sampleAdmins: Administration[] = [
  { president: 'Clinton', party: 'Democratic', start_date: '1993-01-20', end_date: '2001-01-20', ongoing: 0 },
  { president: 'Bush', party: 'Republican', start_date: '2001-01-20', end_date: '2009-01-20', ongoing: 0 },
  { president: 'Obama', party: 'Democratic', start_date: '2009-01-20', end_date: '2017-01-20', ongoing: 0 },
];

describe('computeAdminBands', () => {
  test('returns correct number of bands', () => {
    const bands = computeAdminBands(sampleAdmins);
    expect(bands).toHaveLength(3);
  });

  test('preserves president and party fields', () => {
    const bands = computeAdminBands(sampleAdmins);
    expect(bands[0].president).toBe('Clinton');
    expect(bands[0].party).toBe('Democratic');
    expect(bands[1].president).toBe('Bush');
    expect(bands[1].party).toBe('Republican');
  });

  test('preserves start and end dates', () => {
    const bands = computeAdminBands(sampleAdmins);
    expect(bands[0].start).toBe('1993-01-20');
    expect(bands[0].end).toBe('2001-01-20');
  });

  test('Democratic bands use blue (#2a6f97)', () => {
    const bands = computeAdminBands(sampleAdmins);
    const demBands = bands.filter(b => b.party === 'Democratic');
    for (const band of demBands) {
      expect(band.color).toBe('#2a6f97');
    }
  });

  test('Republican bands use red (#bc4749)', () => {
    const bands = computeAdminBands(sampleAdmins);
    const repBands = bands.filter(b => b.party === 'Republican');
    for (const band of repBands) {
      expect(band.color).toBe('#bc4749');
    }
  });

  test('all bands have opacity 0.12', () => {
    const bands = computeAdminBands(sampleAdmins);
    for (const band of bands) {
      expect(band.opacity).toBe(0.12);
    }
  });

  test('unknown party gets fallback grey color', () => {
    const admins: Administration[] = [
      { president: 'Independent', party: 'Independent', start_date: '2025-01-20', end_date: '2029-01-20', ongoing: 0 },
    ];
    const bands = computeAdminBands(admins);
    expect(bands[0].color).toBe('#6c757d');
  });

  test('empty input returns empty array', () => {
    expect(computeAdminBands([])).toEqual([]);
  });
});
