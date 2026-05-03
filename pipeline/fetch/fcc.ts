/**
 * FCC ULS (Universal Licensing System) bulk data fetcher.
 *
 * Downloads weekly application dumps for Amateur Radio (HA/HV) and GMRS (ZA)
 * from the FCC's public bulk data endpoint:
 *   https://data.fcc.gov/download/pub/uls/complete/
 *
 * Each zip contains pipe-delimited .dat files. We parse:
 *   HD.dat — Application/License header (dates, status, service code, felony flag)
 *   HS.dat — History/transaction log (action dates, status codes)
 *
 * Output: pre-parsed CSV caches in data/fcc/cache/
 *
 * FCC bulk downloads are the recommended approach for data pipelines.
 * See: https://www.fcc.gov/wireless/data/public-access-files-database-downloads
 */

import { writeCsv, type CsvRow } from '../lib/csv.js';
import { httpGet } from '../lib/http.js';
import { log, warn } from '../lib/cache.js';
import { sleep } from '../lib/dates.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const FCC_BASE = 'https://data.fcc.gov/download/pub/uls/complete';

/** Service configs: key used in filenames, zip name, radio_service_codes to keep */
const SERVICES = [
  { key: 'amat', zip: 'a_amat.zip', codes: ['HA', 'HV'] },
  { key: 'gmrs', zip: 'a_gmrs.zip', codes: ['ZA'] },
];

// HD.dat field positions (0-indexed)
const HD = {
  record_type: 0,
  unique_system_identifier: 1,
  uls_file_number: 2,
  call_sign: 4,
  license_status: 5,
  radio_service_code: 6,
  grant_date: 7,
  expired_date: 8,
  cancellation_date: 9,
  revoked: 17,
  convicted: 18,
  adjudged: 19,
  last_action_date: 43,
} as const;

// HS.dat field positions (0-indexed)
const HS = {
  record_type: 0,
  unique_system_identifier: 1,
  uls_file_number: 2,
  call_sign: 3,
  log_date: 4,
  code: 5,
} as const;

/** Parse FCC date MM/DD/YYYY → YYYY-MM-DD, or empty → null */
function parseFccDate(s: string): string | null {
  if (!s || s.trim() === '') return null;
  const t = s.trim();
  // Handle MM/DD/YYYY format
  const parts = t.split('/');
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    if (yyyy && mm && dd) return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  // Handle YYYY-MM-DD format passthrough
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

/** Parse a pipe-delimited .dat line into string array */
function parsePipeLine(line: string): string[] {
  return line.split('|');
}

/** Extract HD.dat from a zip buffer and parse to CsvRow[] */
function parseHdDat(datContent: string, allowedCodes: string[]): CsvRow[] {
  const lines = datContent.split('\n');
  const rows: CsvRow[] = [];
  const codeSet = new Set(allowedCodes);

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = parsePipeLine(line);
    if (fields.length < 44) continue;
    if (fields[HD.record_type] !== 'HD') continue;

    const serviceCode = (fields[HD.radio_service_code] || '').trim();
    if (!codeSet.has(serviceCode)) continue;

    const grantDate = parseFccDate(fields[HD.grant_date]);
    const lastActionDate = parseFccDate(fields[HD.last_action_date]);
    const cancelDate = parseFccDate(fields[HD.cancellation_date]);
    const expiredDate = parseFccDate(fields[HD.expired_date]);
    const status = (fields[HD.license_status] || '').trim();
    const convicted = (fields[HD.convicted] || '').trim().toUpperCase();

    rows.push({
      unique_system_identifier: fields[HD.unique_system_identifier]?.trim() || '',
      uls_file_number: fields[HD.uls_file_number]?.trim() || '',
      call_sign: fields[HD.call_sign]?.trim() || '',
      license_status: status,
      radio_service_code: serviceCode,
      grant_date: grantDate,
      expired_date: expiredDate,
      cancellation_date: cancelDate,
      convicted: convicted === 'Y' ? 'Y' : 'N',
      last_action_date: lastActionDate,
    });
  }

  return rows;
}

/** Extract HS.dat from zip and parse to CsvRow[] */
function parseHsDat(datContent: string): CsvRow[] {
  const lines = datContent.split('\n');
  const rows: CsvRow[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = parsePipeLine(line);
    if (fields.length < 6) continue;
    if (fields[HS.record_type] !== 'HS') continue;

    const logDate = parseFccDate(fields[HS.log_date]);
    const code = (fields[HS.code] || '').trim();

    rows.push({
      unique_system_identifier: fields[HS.unique_system_identifier]?.trim() || '',
      uls_file_number: fields[HS.uls_file_number]?.trim() || '',
      call_sign: fields[HS.call_sign]?.trim() || '',
      log_date: logDate,
      code,
    });
  }

  return rows;
}

/** Download a zip file to a temporary path and return path */
async function downloadZip(url: string, destPath: string): Promise<boolean> {
  log('fcc', `Downloading ${url.split('/').pop()}...`);
  try {
    const resp = await httpGet(url, { timeoutMs: 300000, retries: 2, backoffMs: 10000 });
    if (!resp.ok) {
      warn('fcc', `HTTP ${resp.status} downloading ${url.split('/').pop()}`);
      return false;
    }
    const buf = await resp.arrayBuffer();
    writeFileSync(destPath, Buffer.from(buf));
    log('fcc', `Downloaded ${(buf.byteLength / 1048576).toFixed(1)} MB`);
    return true;
  } catch (err: any) {
    warn('fcc', `Download failed: ${err.message}`);
    return false;
  }
}

/** Extract a specific .dat file from a zip archive using python3 zipfile module */
async function extractDatFile(zipPath: string, datName: string, outDir: string): Promise<string | null> {
  const outPath = join(outDir, datName);
  try {
    // Use python3 zipfile to extract — available everywhere, unlike unzip
    const pyScript = `
import zipfile, sys
with zipfile.ZipFile(sys.argv[1], 'r') as z:
    z.extract(sys.argv[2], sys.argv[3])
`;
    const proc = Bun.spawn(['python3', '-c', pyScript, zipPath, datName, outDir], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;
    if (existsSync(outPath)) {
      const content = readFileSync(outPath, 'latin1');
      unlinkSync(outPath); // Clean up extracted file
      return content;
    }
    return null;
  } catch (err: any) {
    warn('fcc', `Failed to extract ${datName}: ${err.message}`);
    return null;
  }
}

/** Fetch and parse one FCC service type */
async function fetchService(
  cacheDir: string,
  service: { key: string; zip: string; codes: string[] },
): Promise<void> {
  const url = `${FCC_BASE}/${service.zip}`;
  const zipPath = join(cacheDir, service.zip);

  // Download the zip
  const ok = await downloadZip(url, zipPath);
  if (!ok) return;

  // Extract and parse HD.dat
  log('fcc', `Parsing HD.dat for ${service.key}...`);
  const hdContent = await extractDatFile(zipPath, 'HD.dat', cacheDir);
  if (!hdContent) {
    warn('fcc', `No HD.dat found in ${service.zip}`);
    unlinkSync(zipPath);
    return;
  }

  const hdRows = parseHdDat(hdContent, service.codes);
  log('fcc', `HD.dat: ${hdRows.length} records for ${service.codes.join(', ')}`);

  writeCsv(join(cacheDir, `fcc_${service.key}_hd.csv`), hdRows, [
    'unique_system_identifier', 'uls_file_number', 'call_sign',
    'license_status', 'radio_service_code', 'grant_date', 'expired_date',
    'cancellation_date', 'convicted', 'last_action_date',
  ]);

  // Extract and parse HS.dat
  log('fcc', `Parsing HS.dat for ${service.key}...`);
  const hsContent = await extractDatFile(zipPath, 'HS.dat', cacheDir);
  if (hsContent) {
    const hsRows = parseHsDat(hsContent);
    log('fcc', `HS.dat: ${hsRows.length} history records`);

    writeCsv(join(cacheDir, `fcc_${service.key}_hs.csv`), hsRows, [
      'unique_system_identifier', 'uls_file_number', 'call_sign',
      'log_date', 'code',
    ]);
  }

  // Clean up zip
  try { unlinkSync(zipPath); } catch { /* ignore */ }
}

export async function fetchFcc(): Promise<void> {
  // FCC bulk downloads are ~450 MB total and take several minutes.
  // Gate behind FCC_FETCH=1 to avoid killing CI runners on routine builds.
  if (!process.env.FCC_FETCH) {
    log('fcc', 'Skipped (set FCC_FETCH=1 to enable bulk download)');
    return;
  }

  const projectRoot = join(import.meta.dir, '..', '..');
  const cacheDir = join(projectRoot, 'data', 'fcc', 'cache');
  mkdirSync(cacheDir, { recursive: true });

  log('fcc', 'Starting FCC ULS bulk data fetch...');

  for (const service of SERVICES) {
    try {
      await fetchService(cacheDir, service);
    } catch (err: any) {
      warn('fcc', `${service.key}: ${err.message}`);
    }
    await sleep(2000); // Courtesy delay between downloads
  }

  log('fcc', 'Done.');
}
