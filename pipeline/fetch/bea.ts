/**
 * BEA (Bureau of Economic Analysis) fetcher for county-level data:
 *   - CAINC1: per-capita personal income (LineCode 3)
 *   - CAGDP1: county GDP (LineCode 1)
 *
 * Full-replace cache (not incremental) — BEA returns all years in one call.
 */

import { writeCsv, type CsvRow } from '../lib/csv.js';
import { httpGetJson } from '../lib/http.js';
import { log, warn } from '../lib/cache.js';
import { sleep } from '../lib/dates.js';

const BEA_BASE = 'https://apps.bea.gov/api/data/';

/**
 * All 30 counties in the Texas Comptroller's West Texas region + state + US benchmarks.
 * Source: https://comptroller.texas.gov/economy/economic-data/regions/2020/snap-west.php
 */
const GEO_FIPS = [
  '48003', '48033', '48081', '48095', '48103', '48105', '48115', '48135',
  '48165', '48173', '48227', '48235', '48267', '48301', '48317', '48319',
  '48307', '48327', '48329', '48371', '48383', '48389', '48413', '48431',
  '48435', '48443', '48451', '48461', '48475', '48495',
  '48000', '00000',
];

const GEO_KEYS: Record<string, string> = {
  '48003': 'andrews',     '48033': 'borden',      '48081': 'coke',
  '48095': 'concho',      '48103': 'crane',       '48105': 'crockett',
  '48115': 'dawson',      '48135': 'ector',       '48165': 'gaines',
  '48173': 'glasscock',   '48227': 'howard',      '48235': 'irion',
  '48267': 'kimble',      '48301': 'loving',      '48317': 'martin',
  '48319': 'mason',       '48307': 'mcculloch',   '48327': 'menard',
  '48329': 'midland',     '48371': 'pecos',       '48383': 'reagan',
  '48389': 'reeves',      '48413': 'schleicher',  '48431': 'sterling',
  '48435': 'sutton',      '48443': 'terrell',     '48451': 'tom_green',
  '48461': 'upton',       '48475': 'ward',        '48495': 'winkler',
  '48000': 'TX',          '00000': 'US',
};

const GEO_LABELS: Record<string, string> = {
  '48003': 'Andrews Co. (Andrews)',       '48033': 'Borden Co. (Gail)',
  '48081': 'Coke Co. (Robert Lee)',       '48095': 'Concho Co. (Paint Rock)',
  '48103': 'Crane Co. (Crane)',           '48105': 'Crockett Co. (Ozona)',
  '48115': 'Dawson Co. (Lamesa)',         '48135': 'Ector Co. (Odessa)',
  '48165': 'Gaines Co. (Seminole)',       '48173': 'Glasscock Co. (Garden City)',
  '48227': 'Howard Co. (Big Spring)',     '48235': 'Irion Co. (Mertzon)',
  '48267': 'Kimble Co. (Junction)',       '48301': 'Loving Co. (Mentone)',
  '48317': 'Martin Co. (Stanton)',        '48319': 'Mason Co. (Mason)',
  '48307': 'McCulloch Co. (Brady)',       '48327': 'Menard Co. (Menard)',
  '48329': 'Midland Co. (Midland)',       '48371': 'Pecos Co. (Fort Stockton)',
  '48383': 'Reagan Co. (Big Lake)',       '48389': 'Reeves Co. (Pecos)',
  '48413': 'Schleicher Co. (Eldorado)',   '48431': 'Sterling Co. (Sterling City)',
  '48435': 'Sutton Co. (Sonora)',         '48443': 'Terrell Co. (Sanderson)',
  '48451': 'Tom Green Co. (San Angelo)',  '48461': 'Upton Co. (Rankin)',
  '48475': 'Ward Co. (Monahans)',         '48495': 'Winkler Co. (Kermit)',
  '48000': 'Texas',                       '00000': 'United States',
};

interface BeaDataRow {
  GeoFips?: string;
  GeoName?: string;
  TimePeriod?: string;
  DataValue?: string;
}

interface BeaResponse {
  BEAAPI: {
    Results: {
      Data?: BeaDataRow[];
      Error?: { APIErrorDescription?: string };
    };
  };
}

async function fetchTable(
  apiKey: string,
  tableName: string,
  lineCode: string,
  cacheFile: string,
  valueColumn: string,
): Promise<void> {
  const params = new URLSearchParams({
    UserID: apiKey,
    method: 'GetData',
    datasetname: 'Regional',
    TableName: tableName,
    LineCode: lineCode,
    GeoFips: GEO_FIPS.join(','),
    Year: 'ALL',
    ResultFormat: 'JSON',
  });

  const url = `${BEA_BASE}?${params.toString()}`;
  log('bea', `Fetching ${tableName} (LineCode ${lineCode})`);

  let resp: BeaResponse;
  try {
    resp = await httpGetJson<BeaResponse>(url);
  } catch (err: any) {
    warn('bea', `${tableName} fetch failed: ${err.message}`);
    return;
  }

  const error = resp?.BEAAPI?.Results?.Error;
  if (error) {
    warn('bea', `API error: ${error.APIErrorDescription ?? 'unknown'}`);
    return;
  }

  const dataList = resp?.BEAAPI?.Results?.Data;
  if (!dataList || dataList.length === 0) {
    warn('bea', `${tableName}: no data returned`);
    return;
  }

  const rows: CsvRow[] = [];
  for (const d of dataList) {
    const fips = (d.GeoFips ?? '').trim();
    const geo = GEO_KEYS[fips];
    if (!geo) continue;

    const yr = parseInt(d.TimePeriod ?? '', 10);
    if (isNaN(yr)) continue;

    // Filter out non-numeric values
    const raw = (d.DataValue ?? '').replace(/,/g, '');
    if (raw === '(NA)' || raw === '(D)' || raw === '') continue;
    const val = Number(raw);
    if (isNaN(val)) continue;

    rows.push({
      year: yr,
      geo,
      geo_label: GEO_LABELS[fips] ?? fips,
      [valueColumn]: val,
    });
  }

  if (rows.length === 0) {
    warn('bea', `${tableName}: all rows filtered out`);
    return;
  }

  // Sort by year then geo
  rows.sort((a, b) => {
    const ya = a.year as number;
    const yb = b.year as number;
    if (ya !== yb) return ya - yb;
    return String(a.geo).localeCompare(String(b.geo));
  });

  // Full-replace write
  const columns = ['year', 'geo', 'geo_label', valueColumn];
  require('fs').mkdirSync(require('path').dirname(cacheFile), { recursive: true });
  writeCsv(cacheFile, rows, columns);
  log('bea', `${tableName}: wrote ${rows.length} rows to ${cacheFile}`);
}

export async function fetchBeaIncome(apiKey: string): Promise<void> {
  await fetchTable(apiKey, 'CAINC1', '3', 'data/west-texas/cache/bea_income.csv', 'value');
}

export async function fetchBeaGdp(apiKey: string): Promise<void> {
  await fetchTable(apiKey, 'CAGDP1', '1', 'data/west-texas/cache/bea_gdp.csv', 'value');
}

export async function fetchBea(): Promise<void> {
  const apiKey = process.env.BEA_API_KEY;
  if (!apiKey) { warn('bea', 'No API key — skipping'); return; }

  log('bea', 'Starting fetch...');

  await fetchBeaIncome(apiKey);
  await sleep(2000); // rate-limit courtesy
  await fetchBeaGdp(apiKey);

  log('bea', 'Done.');
}
