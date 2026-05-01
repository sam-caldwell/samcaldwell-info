import { useState, useEffect } from 'specifyjs';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { fetchCsv } from '../../utils/csv.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { ValueCard } from '../../components/ValueCard.js';
import { CardRow } from '../../components/CardRow.js';
import { Callout } from '../../components/Callout.js';
import type { CveKev, CvesSummary } from '../../types.js';

function severityColor(sev: string | null | undefined): string {
  if (!sev) return '#6c757d';
  switch (sev.toUpperCase()) {
    case 'CRITICAL': return '#7f1d1d';
    case 'HIGH': return '#bc4749';
    case 'MEDIUM': return '#d68102';
    case 'LOW': return '#2f9e44';
    default: return '#6c757d';
  }
}

function epssDeltaDisplay(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return '\u2014';
  if (Math.abs(v) < 0.001) return '0';
  const sign = v > 0 ? '\u25B2' : '\u25BC';
  return `${sign} ${Math.abs(v).toFixed(3)}`;
}

export function CyberCves() {
  useSeoHead(
    'CVEs in the Wild',
    'CISA KEV catalog with initial vs current EPSS, CVSS v3, and exploit confirmation \u2014 every CVE on this page has been observed exploited in the wild.',
  );

  const [cves, setCves] = useState<CveKev[]>([]);
  const [summary, setSummary] = useState<CvesSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCsv<CveKev>('/data/cybersecurity/cves_kev.csv'),
      fetchCsv<CvesSummary>('/data/cybersecurity/cves_summary.csv'),
    ]).then(([c, s]) => {
      setCves(c);
      setSummary(s);
      setLoading(false);
    });
  }, []);

  if (loading) return h(Loading, null);

  const cs = summary.length > 0 ? summary[0] : null;
  const haveData = cves.length > 0;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Sort CVEs by current_epss descending
  const sortedCves = [...cves].sort((a, b) => (b.current_epss || 0) - (a.current_epss || 0));

  return h('div', null,
    h('h1', null, 'CVEs in the Wild'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'CISA KEV catalog with initial vs current EPSS, CVSS, and exploit confirmation',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Sources.'),
        ' CVEs and "in-wild" status from ',
        h('a', { href: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', target: '_blank', rel: 'noopener noreferrer' }, 'CISA KEV Catalog'),
        ' (US government work, public domain). EPSS (Exploit Prediction Scoring System) from ',
        h('a', { href: 'https://www.first.org/epss/', target: '_blank', rel: 'noopener noreferrer' }, 'FIRST EPSS'),
        ' (CC-BY-SA). CVSS scores from the ',
        h('a', { href: 'https://nvd.nist.gov/', target: '_blank', rel: 'noopener noreferrer' }, 'NVD'),
        ' (US government work, public domain).',
      ),
    ),
    h('p', { style: proseStyle },
      h('strong', null, 'EPSS'),
      ' estimates the probability a CVE will be exploited in the next 30 days. ',
      h('strong', null, 'CVSS'),
      ' is a static severity score for the vulnerability itself. ',
      h('strong', null, 'KEV'),
      ' confirms an exploit has been observed in the wild \u2014 every row on this page is "in wild = TRUE."',
    ),

    // Summary cards
    cs ? h(CardRow, null,
      h(ValueCard, {
        label: 'KEV CVEs total',
        value: fmtNum(cs.kev_total),
        sublabel: `As of ${cs.as_of}`,
        tone: 'negative',
      }),
      h(ValueCard, {
        label: 'New in last 30 days',
        value: fmtNum(cs.kev_added_30d),
        sublabel: 'Newly added by CISA',
        tone: 'warn',
      }),
      h(ValueCard, {
        label: 'Top CVE by current EPSS',
        value: cs.top_epss || '\u2014',
        sublabel: `EPSS = ${cs.top_epss_score?.toFixed(3) || '\u2014'}`,
        tone: 'negative',
      }),
      h(ValueCard, {
        label: 'Median current EPSS (KEV)',
        value: cs.median_epss?.toFixed(3) || '\u2014',
        sublabel: 'Across all KEV-listed CVEs',
        tone: 'warn',
      }),
      h(ValueCard, {
        label: 'Median CVSS v3 (KEV)',
        value: cs.median_cvss_v3?.toFixed(1) || '\u2014',
        sublabel: 'Severity of the vuln itself',
        tone: 'warn',
      }),
    ) : null,

    // Full CVE table
    h('h2', { id: 'table' }, 'All KEV CVEs \u2014 Sortable, Searchable'),
    h('p', { style: proseStyle },
      'EPSS values range 0.0\u20131.0 (probability of exploitation in next 30 days). CVSS v3 ranges 0.0\u201310.0 (severity). The ',
      h('strong', null, 'EPSS \u0394'),
      ' column shows how a CVE\'s predicted exploit probability has moved since we first observed it in our cache.',
    ),

    haveData
      ? h(VizWrapper, { title: `${fmtNum(cves.length)} KEV CVEs sorted by current EPSS` },
          h(DataGrid, {
            columns: [
              {
                key: 'cve',
                header: 'CVE',
                sortable: true,
                render: (v: unknown) => h('a', {
                  href: `https://nvd.nist.gov/vuln/detail/${v}`,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }, v as string),
              },
              { key: 'vendor_project', header: 'Vendor', sortable: true },
              { key: 'product', header: 'Product', sortable: true },
              { key: 'vulnerability_name', header: 'Vulnerability', sortable: true },
              {
                key: 'cvss_v3_base',
                header: 'CVSS v3',
                sortable: true,
                render: (v: unknown) => {
                  const n = v as number;
                  return n != null && !isNaN(n) ? n.toFixed(1) : '\u2014';
                },
              },
              {
                key: 'cvss_v3_severity',
                header: 'Severity',
                sortable: true,
                render: (v: unknown) => {
                  const sev = v as string;
                  if (!sev) return '\u2014';
                  return h('span', {
                    style: {
                      display: 'inline-block',
                      padding: '1px 7px',
                      borderRadius: '3px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: '#fff',
                      background: severityColor(sev),
                    },
                  }, sev.toUpperCase());
                },
              },
              {
                key: 'initial_epss',
                header: 'EPSS (initial)',
                sortable: true,
                render: (v: unknown) => {
                  const n = v as number;
                  return n != null && !isNaN(n) ? n.toFixed(3) : '\u2014';
                },
              },
              {
                key: 'current_epss',
                header: 'EPSS (current)',
                sortable: true,
                render: (v: unknown) => {
                  const n = v as number;
                  return n != null && !isNaN(n) ? n.toFixed(3) : '\u2014';
                },
              },
              {
                key: 'epss_delta',
                header: 'EPSS \u0394',
                sortable: true,
                render: (v: unknown) => {
                  const n = v as number;
                  const display = epssDeltaDisplay(n);
                  const color = n == null || isNaN(n) || Math.abs(n) < 0.001
                    ? '#6c757d'
                    : n > 0 ? '#bc4749' : '#2f9e44';
                  return h('span', { style: { color, fontWeight: '600' } }, display);
                },
              },
              { key: 'date_added', header: 'Added to KEV', sortable: true },
            ],
            data: sortedCves,
            pageSize: 25,
            striped: true,
            compact: true,
          }),
        )
      : h(Callout, { type: 'note' },
          'CVE data not yet populated. CI pipeline will populate on next deploy. Note: NVD lookups are rate-limited; first bootstrap may take ~10 minutes for the full KEV catalog.',
        ),

    // Explanation
    h('h2', null, 'How EPSS and CVSS Differ'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'CVSS v3'),
        ' scores severity on a 0\u201310 scale based on the vulnerability\'s intrinsic characteristics: attack vector, complexity, required privileges, user interaction, scope, and impact on confidentiality/integrity/availability. CVSS does not change much over time.',
      ),
      h('li', null,
        h('strong', null, 'EPSS'),
        ' estimates the probability a vulnerability will be exploited in the next 30 days, based on observed exploit behavior, public discussion, and threat-actor activity. EPSS updates daily and can move a lot \u2014 a CVE might have low CVSS but high EPSS (easy to exploit, attractive target), or vice versa.',
      ),
      h('li', null,
        h('strong', null, 'KEV inclusion'),
        ' is the strongest signal: it confirms exploitation has already been observed by US federal agencies. Every CVE on this page is in KEV.',
      ),
    ),
    h('p', { style: proseStyle },
      'EPSS \u0394 tracks ',
      h('strong', null, 'how predicted-exploit probability has moved'),
      ' since this site first observed the CVE. A large positive \u0394 means EPSS thinks the likelihood went up; large negative means it went down.',
    ),

    // Source notes
    h('h2', null, 'Source Notes'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'CISA KEV'),
        ' updates irregularly (typically several times per month). Refresh: daily.',
      ),
      h('li', null,
        h('strong', null, 'EPSS'),
        ' publishes a daily snapshot of all ~250k tracked CVEs. We retain the first score we see per CVE as initial_epss (immutable) and update current_epss each day.',
      ),
      h('li', null,
        h('strong', null, 'NVD CVSS'),
        ' is fetched on-demand for KEV CVEs we haven\'t yet scored, rate-limited to \u22642 req/sec without an API key.',
      ),
    ),
  );
}
