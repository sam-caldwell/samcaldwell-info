import { describe, test, expect, mock, beforeEach } from 'bun:test';

const fixtureData: Record<string, any[]> = {};
const writtenFiles: Record<string, any[]> = {};

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: (path: string) => {
    const keys = Object.keys(fixtureData).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (path.endsWith(key)) return fixtureData[key];
    }
    return [];
  },
  writeCsv: (path: string, rows: any[], cols?: string[]) => { writtenFiles[path] = rows; },
  round: (v: number | null | undefined, d: number) => {
    if (v === null || v === undefined || !isFinite(v)) return null;
    const f = Math.pow(10, d);
    return Math.round(v * f) / f;
  },
  parseCsvText: () => [],
}));

mock.module('fs', () => ({
  existsSync: (path: string) => {
    const keys = Object.keys(fixtureData).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (path.endsWith(key)) return true;
    }
    return false;
  },
  mkdirSync: () => {},
}));

mock.module('../../../../pipeline/lib/cache', () => ({
  log: () => {},
  warn: () => {},
}));

import { buildFcc } from '../../../../pipeline/build/fcc';

describe('buildFcc', () => {
  beforeEach(() => {
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
  });

  test('skips build when no cached data', async () => {
    await buildFcc();
    // Should have written nothing or empty files
    expect(Object.keys(writtenFiles).length).toBe(0);
  });

  test('builds apps_by_type from HD data', async () => {
    fixtureData['fcc_amat_hd.csv'] = [
      { unique_system_identifier: '1', radio_service_code: 'HA', license_status: 'A', grant_date: '2024-01-15', convicted: 'N', last_action_date: '2024-01-15' },
      { unique_system_identifier: '2', radio_service_code: 'HV', license_status: 'A', grant_date: '2024-02-10', convicted: 'N', last_action_date: '2024-02-10' },
    ];
    fixtureData['fcc_gmrs_hd.csv'] = [
      { unique_system_identifier: '3', radio_service_code: 'ZA', license_status: 'A', grant_date: '2024-03-01', convicted: 'N', last_action_date: '2024-03-01' },
      { unique_system_identifier: '4', radio_service_code: 'ZA', license_status: 'A', grant_date: '2024-04-01', convicted: 'N', last_action_date: '2024-04-01' },
      { unique_system_identifier: '5', radio_service_code: 'ZA', license_status: 'T', convicted: 'N', last_action_date: '2024-05-01', cancellation_date: '2024-05-01' },
    ];
    fixtureData['fcc_amat_hs.csv'] = [];
    fixtureData['fcc_gmrs_hs.csv'] = [];

    await buildFcc();

    const typeKey = Object.keys(writtenFiles).find(k => k.endsWith('fcc_apps_by_type.csv'));
    expect(typeKey).toBeDefined();
    const types = writtenFiles[typeKey!];
    expect(types.length).toBe(3); // Amateur, Amateur Vanity, GMRS

    const gmrs = types.find((r: any) => r.application_type === 'GMRS');
    expect(gmrs).toBeDefined();
    expect(gmrs.count).toBe(3);

    const amateur = types.find((r: any) => r.application_type === 'Amateur');
    expect(amateur).toBeDefined();
    expect(amateur.count).toBe(1);
  });

  test('builds GMRS by decision correctly', async () => {
    fixtureData['fcc_amat_hd.csv'] = [];
    fixtureData['fcc_gmrs_hd.csv'] = [
      { unique_system_identifier: '1', radio_service_code: 'ZA', license_status: 'A', grant_date: '2024-01-15', convicted: 'N', last_action_date: '2024-01-15' },
      { unique_system_identifier: '2', radio_service_code: 'ZA', license_status: 'A', grant_date: '2024-02-10', convicted: 'N', last_action_date: '2024-02-10' },
      { unique_system_identifier: '3', radio_service_code: 'ZA', license_status: 'T', convicted: 'N', last_action_date: '2024-03-01', cancellation_date: '2024-03-01' },
      { unique_system_identifier: '4', radio_service_code: 'ZA', license_status: '', convicted: 'N', last_action_date: '2024-04-01' },
    ];
    fixtureData['fcc_amat_hs.csv'] = [];
    fixtureData['fcc_gmrs_hs.csv'] = [];

    await buildFcc();

    const decKey = Object.keys(writtenFiles).find(k => k.endsWith('fcc_gmrs_by_decision.csv'));
    expect(decKey).toBeDefined();
    const decisions = writtenFiles[decKey!];

    const granted = decisions.find((r: any) => r.decision === 'Granted');
    expect(granted).toBeDefined();
    expect(granted.count).toBe(2);

    const denied = decisions.find((r: any) => r.decision === 'Denied');
    expect(denied).toBeDefined();
    expect(denied.count).toBe(1);

    const pending = decisions.find((r: any) => r.decision === 'Pending');
    expect(pending).toBeDefined();
    expect(pending.count).toBe(1);
  });

  test('builds HAM by decision', async () => {
    fixtureData['fcc_amat_hd.csv'] = [
      { unique_system_identifier: '1', radio_service_code: 'HA', license_status: 'A', grant_date: '2024-01-01', convicted: 'N', last_action_date: '2024-01-01' },
      { unique_system_identifier: '2', radio_service_code: 'HA', license_status: 'E', convicted: 'N', last_action_date: '2024-01-01' },
    ];
    fixtureData['fcc_gmrs_hd.csv'] = [];
    fixtureData['fcc_amat_hs.csv'] = [];
    fixtureData['fcc_gmrs_hs.csv'] = [];

    await buildFcc();

    const hamKey = Object.keys(writtenFiles).find(k => k.endsWith('fcc_ham_by_decision.csv'));
    expect(hamKey).toBeDefined();
    const ham = writtenFiles[hamKey!];

    const granted = ham.find((r: any) => r.decision === 'Granted');
    expect(granted).toBeDefined();
    expect(granted.count).toBe(1);

    const expired = ham.find((r: any) => r.decision === 'Expired');
    expect(expired).toBeDefined();
    expect(expired.count).toBe(1);
  });

  test('builds felony counts correctly', async () => {
    fixtureData['fcc_amat_hd.csv'] = [];
    fixtureData['fcc_gmrs_hd.csv'] = [
      { unique_system_identifier: '1', radio_service_code: 'ZA', license_status: 'A', grant_date: '2024-01-15', convicted: 'Y', last_action_date: '2024-01-15' },
      { unique_system_identifier: '2', radio_service_code: 'ZA', license_status: 'T', convicted: 'Y', last_action_date: '2024-02-01', cancellation_date: '2024-02-01' },
      { unique_system_identifier: '3', radio_service_code: 'ZA', license_status: 'A', grant_date: '2024-03-01', convicted: 'N', last_action_date: '2024-03-01' },
      { unique_system_identifier: '4', radio_service_code: 'ZA', license_status: 'A', grant_date: '2024-04-01', convicted: 'N', last_action_date: '2024-04-01' },
      { unique_system_identifier: '5', radio_service_code: 'ZA', license_status: 'T', convicted: 'N', last_action_date: '2024-05-01', cancellation_date: '2024-05-01' },
    ];
    fixtureData['fcc_amat_hs.csv'] = [];
    fixtureData['fcc_gmrs_hs.csv'] = [];

    await buildFcc();

    // Felony decision (only convicted=Y)
    const felDecKey = Object.keys(writtenFiles).find(k => k.endsWith('fcc_gmrs_felony_decision.csv'));
    expect(felDecKey).toBeDefined();
    const felDec = writtenFiles[felDecKey!];
    const felGranted = felDec.find((r: any) => r.decision === 'Granted');
    expect(felGranted).toBeDefined();
    expect(felGranted.count).toBe(1);
    const felDenied = felDec.find((r: any) => r.decision === 'Denied');
    expect(felDenied).toBeDefined();
    expect(felDenied.count).toBe(1);

    // Felony counts (all apps, grouped by convicted Y/N x decision)
    const felCntKey = Object.keys(writtenFiles).find(k => k.endsWith('fcc_gmrs_felony_counts.csv'));
    expect(felCntKey).toBeDefined();
    const felCnt = writtenFiles[felCntKey!];
    expect(felCnt.length).toBe(4); // Y/Granted, Y/Denied, N/Granted, N/Denied

    const yGranted = felCnt.find((r: any) => r.convicted === 'Y' && r.decision === 'Granted');
    expect(yGranted.count).toBe(1);

    const nGranted = felCnt.find((r: any) => r.convicted === 'N' && r.decision === 'Granted');
    expect(nGranted.count).toBe(2);

    const nDenied = felCnt.find((r: any) => r.convicted === 'N' && r.decision === 'Denied');
    expect(nDenied.count).toBe(1);
  });

  test('builds 10 output files', async () => {
    fixtureData['fcc_amat_hd.csv'] = [
      { unique_system_identifier: '1', radio_service_code: 'HA', license_status: 'A', grant_date: '2024-01-01', convicted: 'N', last_action_date: '2024-01-01' },
    ];
    fixtureData['fcc_gmrs_hd.csv'] = [
      { unique_system_identifier: '2', radio_service_code: 'ZA', license_status: 'A', grant_date: '2024-01-01', convicted: 'N', last_action_date: '2024-01-01' },
    ];
    fixtureData['fcc_amat_hs.csv'] = [];
    fixtureData['fcc_gmrs_hs.csv'] = [];

    await buildFcc();

    const keys = Object.keys(writtenFiles);
    expect(keys.length).toBe(10);

    const expectedSuffixes = [
      'fcc_apps_by_type.csv',
      'fcc_apps_by_year_type.csv',
      'fcc_ham_by_decision.csv',
      'fcc_gmrs_by_decision.csv',
      'fcc_gmrs_granted_timing.csv',
      'fcc_gmrs_denied_timing.csv',
      'fcc_gmrs_pending_elapsed.csv',
      'fcc_gmrs_felony_decision.csv',
      'fcc_gmrs_felony_timing.csv',
      'fcc_gmrs_felony_counts.csv',
    ];

    for (const suffix of expectedSuffixes) {
      const found = keys.some(k => k.endsWith(suffix));
      expect(found).toBe(true);
    }
  });
});
