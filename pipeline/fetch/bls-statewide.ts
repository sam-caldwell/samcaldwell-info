/**
 * BLS LAUS fetcher for ALL 254 Texas counties.
 *
 * Fetches the latest year of unemployment rate data for every Texas county
 * using the BLS API v2 batch endpoint (50 series per request).
 *
 * Output: data/west-texas/cache/bls_tx_all_counties.csv
 *   Columns: fips, county, date, unemployment_rate
 */

import { type CsvRow } from '../lib/csv.js';
import { httpPostJson } from '../lib/http.js';
import { loadCache, saveCache, log, warn, type CacheConfig } from '../lib/cache.js';
import { today, year, sleep } from '../lib/dates.js';

const BLS_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

/**
 * Texas county FIPS codes: 48001 through 48507, odd numbers only (254 counties).
 * BLS LAUS series format: LAUCN{5-digit FIPS}0000000003 (unemployment rate)
 */
const TX_COUNTY_FIPS: string[] = [];
for (let i = 1; i <= 507; i += 2) {
  TX_COUNTY_FIPS.push(String(i).padStart(3, '0'));
}

/** Map of 3-digit county FIPS to county name (populated from BLS response or fallback) */
const COUNTY_NAMES: Record<string, string> = {
  '001': 'Anderson', '003': 'Andrews', '005': 'Angelina', '007': 'Aransas',
  '009': 'Archer', '011': 'Armstrong', '013': 'Atascosa', '015': 'Austin',
  '017': 'Bailey', '019': 'Bandera', '021': 'Bastrop', '023': 'Baylor',
  '025': 'Bee', '027': 'Bell', '029': 'Bexar', '031': 'Blanco',
  '033': 'Borden', '035': 'Bosque', '037': 'Bowie', '039': 'Brazoria',
  '041': 'Brazos', '043': 'Brewster', '045': 'Briscoe', '047': 'Brooks',
  '049': 'Brown', '051': 'Burleson', '053': 'Burnet', '055': 'Caldwell',
  '057': 'Calhoun', '059': 'Callahan', '061': 'Cameron', '063': 'Camp',
  '065': 'Carson', '067': 'Cass', '069': 'Castro', '071': 'Chambers',
  '073': 'Cherokee', '075': 'Childress', '077': 'Clay', '079': 'Cochran',
  '081': 'Coke', '083': 'Coleman', '085': 'Collin', '087': 'Collingsworth',
  '089': 'Colorado', '091': 'Comal', '093': 'Comanche', '095': 'Concho',
  '097': 'Cooke', '099': 'Coryell', '101': 'Cottle', '103': 'Crane',
  '105': 'Crockett', '107': 'Crosby', '109': 'Culberson', '111': 'Dallam',
  '113': 'Dallas', '115': 'Dawson', '117': 'Deaf Smith', '119': 'Delta',
  '121': 'Denton', '123': 'DeWitt', '125': 'Dickens', '127': 'Dimmit',
  '129': 'Donley', '131': 'Duval', '133': 'Eastland', '135': 'Ector',
  '137': 'Edwards', '139': 'Ellis', '141': 'El Paso', '143': 'Erath',
  '145': 'Falls', '147': 'Fannin', '149': 'Fayette', '151': 'Fisher',
  '153': 'Floyd', '155': 'Foard', '157': 'Fort Bend', '159': 'Franklin',
  '161': 'Freestone', '163': 'Frio', '165': 'Gaines', '167': 'Galveston',
  '169': 'Garza', '171': 'Gillespie', '173': 'Glasscock', '175': 'Goliad',
  '177': 'Gonzales', '179': 'Gray', '181': 'Grayson', '183': 'Gregg',
  '185': 'Grimes', '187': 'Guadalupe', '189': 'Hale', '191': 'Hall',
  '193': 'Hamilton', '195': 'Hansford', '197': 'Hardeman', '199': 'Hardin',
  '201': 'Harris', '203': 'Harrison', '205': 'Hartley', '207': 'Haskell',
  '209': 'Hays', '211': 'Hemphill', '213': 'Henderson', '215': 'Hidalgo',
  '217': 'Hill', '219': 'Hockley', '221': 'Hood', '223': 'Hopkins',
  '225': 'Houston', '227': 'Howard', '229': 'Hudspeth', '231': 'Hunt',
  '233': 'Hutchinson', '235': 'Irion', '237': 'Jack', '239': 'Jackson',
  '241': 'Jasper', '243': 'Jeff Davis', '245': 'Jefferson', '247': 'Jim Hogg',
  '249': 'Jim Wells', '251': 'Johnson', '253': 'Jones', '255': 'Karnes',
  '257': 'Kaufman', '259': 'Kendall', '261': 'Kenedy', '263': 'Kent',
  '265': 'Kerr', '267': 'Kimble', '269': 'King', '271': 'Kinney',
  '273': 'Kleberg', '275': 'Knox', '277': 'Lamar', '279': 'Lamb',
  '281': 'Lampasas', '283': 'La Salle', '285': 'Lavaca', '287': 'Lee',
  '289': 'Leon', '291': 'Liberty', '293': 'Limestone', '295': 'Lipscomb',
  '297': 'Live Oak', '299': 'Llano', '301': 'Loving', '303': 'Lubbock',
  '305': 'Lynn', '307': 'McCulloch', '309': 'McLennan', '311': 'McMullen',
  '313': 'Madison', '315': 'Marion', '317': 'Martin', '319': 'Mason',
  '321': 'Matagorda', '323': 'Maverick', '325': 'Medina', '327': 'Menard',
  '329': 'Midland', '331': 'Milam', '333': 'Mills', '335': 'Mitchell',
  '337': 'Montague', '339': 'Montgomery', '341': 'Moore', '343': 'Morris',
  '345': 'Motley', '347': 'Nacogdoches', '349': 'Navarro', '351': 'Newton',
  '353': 'Nolan', '355': 'Nueces', '357': 'Ochiltree', '359': 'Oldham',
  '361': 'Orange', '363': 'Palo Pinto', '365': 'Panola', '367': 'Parker',
  '369': 'Parmer', '371': 'Pecos', '373': 'Polk', '375': 'Potter',
  '377': 'Presidio', '379': 'Rains', '381': 'Randall', '383': 'Reagan',
  '385': 'Real', '387': 'Red River', '389': 'Reeves', '391': 'Refugio',
  '393': 'Roberts', '395': 'Robertson', '397': 'Rockwall', '399': 'Runnels',
  '401': 'Rusk', '403': 'Sabine', '405': 'San Augustine', '407': 'San Jacinto',
  '409': 'San Patricio', '411': 'San Saba', '413': 'Schleicher', '415': 'Scurry',
  '417': 'Shackelford', '419': 'Shelby', '421': 'Sherman', '423': 'Smith',
  '425': 'Somervell', '427': 'Starr', '429': 'Stephens', '431': 'Sterling',
  '433': 'Stonewall', '435': 'Sutton', '437': 'Swisher', '439': 'Tarrant',
  '441': 'Taylor', '443': 'Terrell', '445': 'Terry', '447': 'Throckmorton',
  '449': 'Titus', '451': 'Tom Green', '453': 'Travis', '455': 'Trinity',
  '457': 'Tyler', '459': 'Upshur', '461': 'Upton', '463': 'Uvalde',
  '465': 'Val Verde', '467': 'Van Zandt', '469': 'Victoria', '471': 'Walker',
  '473': 'Waller', '475': 'Ward', '477': 'Washington', '479': 'Webb',
  '481': 'Wharton', '483': 'Wheeler', '485': 'Wichita', '487': 'Wilbarger',
  '489': 'Willacy', '491': 'Williamson', '493': 'Wilson', '495': 'Winkler',
  '497': 'Wise', '499': 'Wood', '501': 'Yoakum', '503': 'Young',
  '505': 'Zapata', '507': 'Zavala',
};

interface BlsObservation {
  year: string;
  period: string;
  value: string;
}

interface BlsSeries {
  seriesID: string;
  data: BlsObservation[];
}

interface BlsResponse {
  status: string;
  message?: string[];
  Results: {
    series: BlsSeries[];
  };
}

function seriesIdForFips(countyFips: string): string {
  return `LAUCN48${countyFips}0000000003`;
}

function fipsFromSeriesId(seriesId: string): string {
  // LAUCN48XXX0000000003 -> XXX
  return seriesId.slice(7, 10);
}

export async function fetchBlsStatewide(): Promise<void> {
  const apiKey = process.env.BLS_API_KEY;
  if (!apiKey) {
    warn('bls-statewide', 'No BLS_API_KEY — skipping statewide county fetch (requires registered key for batch requests)');
    return;
  }

  log('bls-statewide', 'Fetching unemployment rates for all 254 Texas counties...');

  const currentYear = year(today());
  const allRows: CsvRow[] = [];

  // BLS API allows up to 50 series per request with a registered key
  const batchSize = 50;
  const allSeriesIds = TX_COUNTY_FIPS.map(seriesIdForFips);

  for (let i = 0; i < allSeriesIds.length; i += batchSize) {
    const batch = allSeriesIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(allSeriesIds.length / batchSize);

    log('bls-statewide', `Batch ${batchNum}/${totalBatches}: fetching ${batch.length} series...`);

    const body = {
      seriesid: batch,
      startyear: String(currentYear - 1), // Fetch last 2 years to ensure we have recent data
      endyear: String(currentYear),
      registrationkey: apiKey,
    };

    let resp: BlsResponse;
    try {
      resp = await httpPostJson<BlsResponse>(BLS_URL, body);
    } catch (err: any) {
      warn('bls-statewide', `Batch ${batchNum} failed: ${err.message}`);
      continue;
    }

    if (resp.status !== 'REQUEST_SUCCEEDED') {
      warn('bls-statewide', `Batch ${batchNum} API error: ${resp.message?.join('; ') ?? 'unknown'}`);
      continue;
    }

    const seriesList = resp.Results?.series;
    if (!seriesList) continue;

    for (const series of seriesList) {
      const fips = fipsFromSeriesId(series.seriesID);
      const countyName = COUNTY_NAMES[fips] || `FIPS ${fips}`;

      for (const obs of series.data) {
        if (obs.period === 'M13') continue; // skip annual average
        const m = parseInt(obs.period.replace('M', ''), 10);
        if (isNaN(m) || m < 1 || m > 12) continue;
        const val = Number(obs.value);
        if (isNaN(val)) continue;
        const date = `${obs.year}-${String(m).padStart(2, '0')}-01`;
        allRows.push({ fips: `48${fips}`, county: countyName, date, unemployment_rate: val });
      }
    }

    // Rate-limit courtesy between batches
    if (i + batchSize < allSeriesIds.length) {
      await sleep(1500);
    }
  }

  if (allRows.length === 0) {
    warn('bls-statewide', 'No data returned');
    return;
  }

  // Save to cache
  const cache: CacheConfig = {
    path: 'data/west-texas/cache/bls_tx_all_counties.csv',
    keyColumns: ['fips', 'date'],
    dateColumn: 'date',
  };
  const existing = loadCache(cache);
  saveCache(cache, existing, allRows);

  log('bls-statewide', `Saved ${allRows.length} rows for ${new Set(allRows.map(r => r.fips)).size} counties`);
}
