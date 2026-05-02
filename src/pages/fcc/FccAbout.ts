import { h } from '../../h.js';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { useSeoHead } from '../../components/SeoHead.js';

const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

export function FccAbout() {
  useSeoHead(
    'FCC Applications Methodology',
    'Data sources, field definitions, and pipeline details for FCC application analysis.',
  );

  return h('div', null,
    h('h1', null, 'Methodology'),

    h('h2', null, 'Data Source'),
    h('p', { style: proseStyle },
      'All data is sourced from the FCC Universal Licensing System (ULS) bulk data downloads, available at ',
      h('a', { href: 'https://www.fcc.gov/wireless/data/public-access-files-database-downloads', target: '_blank' },
        'fcc.gov/wireless/data/public-access-files-database-downloads'),
      '. The FCC rebuilds these files every Sunday morning. This pipeline downloads the complete application archives for Amateur Radio and GMRS services.',
    ),

    h(VizWrapper, { title: 'Source files and radio service codes' },
      h(DataGrid, {
        columns: [
          { key: 'file', header: 'Archive' },
          { key: 'service', header: 'Service' },
          { key: 'codes', header: 'Radio Service Codes' },
          { key: 'format', header: 'Format' },
        ],
        data: [
          { file: 'a_amat.zip', service: 'Amateur Radio', codes: 'HA (Amateur), HV (Vanity)', format: 'Pipe-delimited .dat' },
          { file: 'a_gmrs.zip', service: 'GMRS', codes: 'ZA', format: 'Pipe-delimited .dat' },
        ],
        striped: true,
        compact: true,
      }),
    ),

    h('h2', null, 'Parsed Record Types'),
    h(VizWrapper, { title: 'ULS record types used' },
      h(DataGrid, {
        columns: [
          { key: 'file', header: 'File' },
          { key: 'type', header: 'Record Type' },
          { key: 'description', header: 'Description' },
          { key: 'key_fields', header: 'Key Fields Used' },
        ],
        data: [
          { file: 'HD.dat', type: 'HD', description: 'Application/License Header', key_fields: 'license_status, radio_service_code, grant_date, convicted, last_action_date' },
          { file: 'HS.dat', type: 'HS', description: 'History/Transaction Log', key_fields: 'log_date, code (RECNE = new application received)' },
        ],
        striped: true,
        compact: true,
      }),
    ),

    h('h2', null, 'Decision Classification'),
    h('p', { style: proseStyle },
      'Application decisions are inferred from the license_status and date fields:',
    ),
    h(VizWrapper, { title: 'Decision classification logic' },
      h(DataGrid, {
        columns: [
          { key: 'decision', header: 'Decision' },
          { key: 'criteria', header: 'Criteria' },
        ],
        data: [
          { decision: 'Granted', criteria: 'Status = A (Active) with a grant_date, or any record with a grant_date' },
          { decision: 'Denied', criteria: 'Status = T (Terminated) or C (Canceled), or has a cancellation_date' },
          { decision: 'Expired', criteria: 'Status = E (Expired)' },
          { decision: 'Pending', criteria: 'No grant_date and no cancellation_date, status not T/C/E' },
        ],
        striped: true,
        compact: true,
      }),
    ),

    h('h2', null, 'Basic Qualification Question'),
    h('p', { style: proseStyle },
      'Field 19 (convicted) in the HD record indicates the applicant\'s response to the FCC\'s basic qualification question: "Has the Applicant or any party to this application or amendment, or any party directly or indirectly controlling the Applicant, ever been convicted of a felony by any state or federal court?" Values: Y (Yes), N (No), or blank.',
    ),

    h('h2', null, 'Filing Date Estimation'),
    h('p', { style: proseStyle },
      'Filing dates are determined from the HS.dat history records. The pipeline looks for RECNE (New Application Received) events first, then falls back to the earliest history entry, or the HD record\'s last_action_date as a final approximation.',
    ),

    h('h2', null, 'Pipeline'),
    h('pre', { style: { background: '#f8f9fa', padding: '16px', borderRadius: '4px', fontSize: '0.9rem', overflow: 'auto' } },
      `pipeline/fetch/fcc.ts
  \u2514\u2500 Downloads a_amat.zip, a_gmrs.zip from data.fcc.gov
  \u2514\u2500 Extracts HD.dat, HS.dat from each zip
  \u2514\u2500 Parses pipe-delimited records
  \u2514\u2500 Writes: data/fcc/cache/fcc_{amat,gmrs}_{hd,hs}.csv

pipeline/build/fcc.ts
  \u2514\u2500 Reads cached HD + HS CSVs
  \u2514\u2500 Builds 10 analysis CSVs:
      fcc_apps_by_type.csv
      fcc_apps_by_year_type.csv
      fcc_ham_by_decision.csv
      fcc_gmrs_by_decision.csv
      fcc_gmrs_granted_timing.csv
      fcc_gmrs_denied_timing.csv
      fcc_gmrs_pending_elapsed.csv
      fcc_gmrs_felony_decision.csv
      fcc_gmrs_felony_timing.csv
      fcc_gmrs_felony_counts.csv`,
    ),

    h('h2', null, 'Caveats'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Filing date accuracy.'),
        ' Filing dates are estimated from HS.dat transaction history. Applications without RECNE events use the earliest available date, which may slightly overestimate processing times.',
      ),
      h('li', null,
        h('strong', null, 'Bulk data lag.'),
        ' FCC bulk archives are rebuilt weekly (Sundays). Daily transactions between rebuilds are not included in this analysis.',
      ),
      h('li', null,
        h('strong', null, 'Application vs. license.'),
        ' The application archive (a_*.zip) contains application records, not license records. Some applications may correspond to renewals, modifications, or vanity call sign changes rather than new licenses.',
      ),
      h('li', null,
        h('strong', null, 'Felony question.'),
        ' The convicted field reflects the applicant\'s self-reported answer on FCC Form 605. A "Y" response does not necessarily mean the application will be denied.',
      ),
    ),

    h('h2', null, 'References'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('a', { href: 'https://www.fcc.gov/wireless/data/public-access-files-database-downloads', target: '_blank' },
          'FCC Public Access Files \u2014 Database Downloads'),
      ),
      h('li', null,
        h('a', { href: 'https://www.fcc.gov/uls/transactions/daily-weekly', target: '_blank' },
          'FCC ULS Daily & Weekly Transaction Files'),
      ),
      h('li', null,
        h('a', { href: 'https://www.fcc.gov/sites/default/files/public_access_database_definitions_20240215.pdf', target: '_blank' },
          'FCC ULS Data Dictionary (PDF)'),
      ),
    ),
  );
}
