import { describe, test, expect, mock, beforeEach } from 'bun:test';

const fixtureData: Record<string, any[]> = {};
let writtenJson: any = null;
const writtenFiles: Record<string, any[]> = {};

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: (path: string) => {
    for (const [key, val] of Object.entries(fixtureData)) {
      if (path.endsWith(key)) return val;
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
    if (path.endsWith('events.csv')) return 'events.csv' in fixtureData;
    if (path.endsWith('legislation.csv')) return 'legislation.csv' in fixtureData;
    return true;
  },
  writeFileSync: (path: string, content: string) => {
    if (path.endsWith('.json')) writtenJson = JSON.parse(content);
  },
  mkdirSync: () => {},
}));

import { buildNetwork } from '../../../../pipeline/build/network';

describe('buildNetwork', () => {
  beforeEach(() => {
    writtenJson = null;
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];

    fixtureData['administrations.csv'] = [
      { president: 'Joe Biden', party: 'Democratic', start_date: '2021-01-20', end_date: '2025-01-20', ongoing: 'FALSE' },
      { president: 'Donald Trump (2nd term)', party: 'Republican', start_date: '2025-01-20', end_date: '', ongoing: 'TRUE' },
    ];
  });

  test('node types: president, legislation, event', async () => {
    fixtureData['events.csv'] = [
      { date: '2021-06-15', event: 'Infrastructure Summit', sentiment: 0.3, category: 'policy', severity: 3 },
    ];
    fixtureData['legislation.csv'] = [
      { id: 'leg-001', name: 'Infrastructure Act', signed_date: '2021-11-15', sentiment: 0.5, category: 'spending', short_description: 'Roads and bridges', signed_by: 'biden', supported_by: null, opposed_by: null },
    ];

    await buildNetwork();

    expect(writtenJson).not.toBeNull();
    const nodes = writtenJson.nodes;

    const presNodes = nodes.filter((n: any) => n.type === 'president');
    expect(presNodes.length).toBe(2);

    const legNodes = nodes.filter((n: any) => n.type === 'legislation');
    expect(legNodes.length).toBe(1);
    expect(legNodes[0].label).toBe('Infrastructure Act');

    const evtNodes = nodes.filter((n: any) => n.type === 'event');
    expect(evtNodes.length).toBe(1);
    expect(evtNodes[0].label).toBe('Infrastructure Summit');
  });

  test('link types: signed, in-office, supported, opposed', async () => {
    fixtureData['events.csv'] = [
      { date: '2021-06-15', event: 'Test Event', sentiment: 0.1, category: 'test', severity: 1 },
    ];
    fixtureData['legislation.csv'] = [
      { id: 'leg-001', name: 'Test Bill', signed_date: '2021-06-01', sentiment: 0.2, category: 'test', short_description: 'test', signed_by: 'biden', supported_by: 'biden', opposed_by: 'trump2' },
    ];

    await buildNetwork();

    expect(writtenJson).not.toBeNull();
    const links = writtenJson.links;

    const roles = new Set(links.map((l: any) => l.role));
    expect(roles.has('in-office')).toBe(true);
    expect(roles.has('signed')).toBe(true);
    expect(roles.has('supported')).toBe(true);
    expect(roles.has('opposed')).toBe(true);
  });

  test('total node/link counts match expectations', async () => {
    fixtureData['events.csv'] = [
      { date: '2021-06-15', event: 'E1', sentiment: 0.1, category: 'test', severity: 1 },
      { date: '2025-03-01', event: 'E2', sentiment: -0.2, category: 'test', severity: 2 },
    ];
    fixtureData['legislation.csv'] = [
      { id: 'leg-001', name: 'Bill A', signed_date: '2021-06-01', sentiment: 0.5, category: 'test', short_description: 'a', signed_by: 'biden', supported_by: null, opposed_by: null },
    ];

    await buildNetwork();

    expect(writtenJson).not.toBeNull();

    // 2 presidents + 1 legislation + 2 events = 5 nodes
    expect(writtenJson.nodes.length).toBe(5);

    // meta should have correct counts
    expect(writtenJson.meta.node_counts.president).toBe(2);
    expect(writtenJson.meta.node_counts.legislation).toBe(1);
    expect(writtenJson.meta.node_counts.event).toBe(2);
  });
});
