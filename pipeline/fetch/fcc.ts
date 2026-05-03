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

/**
 * Service configs: key used in filenames, zip name, radio_service_codes to keep.
 *
 * We download BOTH the license archive (l_*.zip) and the application archive
 * (a_*.zip) for each service. The license files contain grant/denial status,
 * grant dates, and license_status. The application files contain the HS.dat
 * history records with filing dates (RECNE events). We merge them on
 * unique_system_identifier in the builder.
 */
const SERVICES = [
  { key: 'amat', licenseZip: 'l_amat.zip', appZip: 'a_amat.zip', codes: ['HA', 'HV'] },
  { key: 'gmrs', licenseZip: 'l_gmrs.zip', appZip: 'a_gmrs.zip', codes: ['ZA'] },
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
  service: { key: string; licenseZip: string; appZip: string; codes: string[] },
): Promise<void> {
  const codesJson = JSON.stringify(service.codes);

  // ── 1. Download and parse the LICENSE archive (HD.dat with grant dates, status) ──
  const licUrl = `${FCC_BASE}/${service.licenseZip}`;
  const licZipPath = join(cacheDir, service.licenseZip);

  const licOk = await downloadZip(licUrl, licZipPath);
  if (!licOk) return;

  log('fcc', `Parsing HD.dat from ${service.licenseZip} (streaming via python3)...`);
  const hdCsvPath = join(cacheDir, `fcc_${service.key}_hd.csv`);
  try {
    const pyHdStream = `
import zipfile, sys, csv, json
zpath, outpath = sys.argv[1], sys.argv[2]
allowed = set(json.loads(sys.argv[3]))
count = 0
def parse_date(s):
    s = s.strip()
    if not s:
        return ''
    if '/' in s:
        p = s.split('/')
        if len(p) == 3:
            return f'{p[2]}-{p[0].zfill(2)}-{p[1].zfill(2)}'
    return s
with zipfile.ZipFile(zpath, 'r') as z:
    with z.open('HD.dat') as f, open(outpath, 'w', newline='') as out:
        w = csv.writer(out)
        w.writerow(['unique_system_identifier','uls_file_number','call_sign',
                     'license_status','radio_service_code','grant_date','expired_date',
                     'cancellation_date','convicted','last_action_date'])
        for raw in f:
            line = raw.decode('latin-1').strip()
            if not line:
                continue
            p = line.split('|')
            if len(p) < 44 or p[0] != 'HD':
                continue
            svc = p[6].strip()
            if svc not in allowed:
                continue
            convicted = 'Y' if p[18].strip().upper() == 'Y' else 'N'
            w.writerow([p[1].strip(), p[2].strip(), p[4].strip(),
                        p[5].strip(), svc, parse_date(p[7]),
                        parse_date(p[8]), parse_date(p[9]),
                        convicted, parse_date(p[43])])
            count += 1
print(count)
`;
    const proc = Bun.spawn(['python3', '-c', pyHdStream, licZipPath, hdCsvPath, codesJson], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    const hdCount = parseInt(output.trim(), 10) || 0;
    log('fcc', `HD.dat: ${hdCount} license records for ${service.codes.join(', ')}`);
  } catch (err: any) {
    warn('fcc', `HD.dat streaming failed: ${err.message}`);
  }
  try { unlinkSync(licZipPath); } catch { /* ignore */ }

  // ── 2. Download and parse the APPLICATION archive (HS.dat with filing dates) ──
  const appUrl = `${FCC_BASE}/${service.appZip}`;
  const appZipPath = join(cacheDir, service.appZip);

  const appOk = await downloadZip(appUrl, appZipPath);
  if (!appOk) {
    log('fcc', `Skipping HS.dat for ${service.key} (application archive unavailable)`);
    return;
  }

  log('fcc', `Parsing HS.dat from ${service.appZip} (streaming via python3)...`);
  const hsCsvPath = join(cacheDir, `fcc_${service.key}_hs.csv`);
  try {
    const pyStream = `
import zipfile, sys, csv
zpath, outpath = sys.argv[1], sys.argv[2]
count = 0
with zipfile.ZipFile(zpath, 'r') as z:
    with z.open('HS.dat') as f, open(outpath, 'w', newline='') as out:
        w = csv.writer(out)
        w.writerow(['unique_system_identifier','uls_file_number','call_sign','log_date','code'])
        for raw in f:
            line = raw.decode('latin-1').strip()
            if not line:
                continue
            parts = line.split('|')
            if len(parts) < 6 or parts[0] != 'HS':
                continue
            d = parts[4].strip()
            if '/' in d:
                p = d.split('/')
                if len(p) == 3:
                    d = f'{p[2]}-{p[0].zfill(2)}-{p[1].zfill(2)}'
            w.writerow([parts[1].strip(), parts[2].strip(), parts[3].strip(), d, parts[5].strip()])
            count += 1
print(count)
`;
    const proc = Bun.spawn(['python3', '-c', pyStream, appZipPath, hsCsvPath], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    const hsCount = parseInt(output.trim(), 10) || 0;
    log('fcc', `HS.dat: ${hsCount} history records`);
  } catch (err: any) {
    warn('fcc', `HS.dat streaming failed: ${err.message}`);
  }
  try { unlinkSync(appZipPath); } catch { /* ignore */ }
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
