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
import type { ThreatsSummary, CvesSummary } from '../../types.js';

export function CyberIndex() {
  useSeoHead(
    'Cybersecurity Threats',
    'Active threat infrastructure and known-exploited vulnerabilities \u2014 daily snapshots of botnet C2s, malware hosts, and CISA KEV CVEs with EPSS scores.',
  );

  const [threatsSummary, setThreatsSummary] = useState<ThreatsSummary[]>([]);
  const [cvesSummary, setCvesSummary] = useState<CvesSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCsv<ThreatsSummary>('/data/cybersecurity/threats_summary.csv'),
      fetchCsv<CvesSummary>('/data/cybersecurity/cves_summary.csv'),
    ]).then(([ts, cs]) => {
      setThreatsSummary(ts);
      setCvesSummary(cs);
      setLoading(false);
    });
  }, []);

  if (loading) return h(Loading, null);

  const ts = threatsSummary.length > 0 ? threatsSummary[0] : null;
  const cs = cvesSummary.length > 0 ? cvesSummary[0] : null;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  return h('div', null,
    h('h1', null, 'Cybersecurity Threats'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Active threat infrastructure + known-exploited vulnerabilities',
    ),

    h('p', { style: proseStyle },
      'This report tracks two complementary cybersecurity signals:',
    ),
    h('ol', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Active threat infrastructure'),
        ' \u2014 IP addresses currently used for malicious purposes (botnet C2s, malware hosts, phishing kits) drawn from public feeds and geolocated to the city/province level.',
      ),
      h('li', null,
        h('strong', null, 'Known-exploited vulnerabilities'),
        ' \u2014 the CISA KEV catalog, enriched with FIRST EPSS scores (initial vs current) and NVD CVSS scores so you can see not just which CVEs are being exploited but how their predicted-exploit probability is moving.',
      ),
    ),

    h('p', { style: proseStyle },
      'Daily snapshots accumulate over time so we can show trends, not just the "as of right now" view.',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Hosting location \u2260 attacker location.'),
        ' Attackers routinely use rented hosting in countries with weak attribution. This report shows where malicious ',
        h('em', null, 'infrastructure'),
        ' is, not where its operators sit.',
      ),
    ),

    // Snapshot cards
    h('h2', { id: 'snapshot' }, "Today's Snapshot"),

    ts ? h(CardRow, null,
      h(ValueCard, {
        label: 'Active threat IPs',
        value: fmtNum(ts.total_ips_today),
        sublabel: `As of ${ts.as_of}`,
        tone: 'warn',
      }),
      h(ValueCard, {
        label: 'Botnet C2 hosts',
        value: fmtNum(ts.total_botnet_ips_today),
        sublabel: 'FeodoTracker, currently online',
        tone: 'negative',
      }),
      h(ValueCard, {
        label: 'Provinces affected',
        value: fmtNum(ts.provinces_today),
        sublabel: `Across ${fmtNum(ts.countries_today)} countries`,
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'Top malware family',
        value: ts.top_malware_today || '\u2014',
        sublabel: "Most-reported in today's snapshot",
        tone: 'warn',
      }),
      h(ValueCard, {
        label: 'Daily snapshots stored',
        value: fmtNum(ts.snapshots_accumulated),
        sublabel: 'Each one a 24-hour view; cache grows daily',
        tone: 'neutral',
      }),
      cs ? h(ValueCard, {
        label: 'KEV CVEs (in-wild)',
        value: fmtNum(cs.kev_total),
        sublabel: `+${fmtNum(cs.kev_added_30d)} added in last 30 days`,
        tone: 'negative',
      }) : null,
    ) : h(Callout, { type: 'warning' },
      'Cybersecurity data is not yet populated. The CI pipeline fetches it on first run; check back after the next deploy.',
    ),

    // Summary tables
    ts ? h('div', null,
      h('h2', { id: 'threats-summary' }, 'Threats Summary'),
      h(VizWrapper, { title: 'Current threat overview' },
        h(DataGrid, {
          columns: [
            { key: 'metric', header: 'Metric', sortable: false },
            { key: 'value', header: 'Value', sortable: false },
          ],
          data: [
            { metric: 'Total active IPs', value: fmtNum(ts.total_ips_today) },
            { metric: 'Botnet C2 IPs', value: fmtNum(ts.total_botnet_ips_today) },
            { metric: 'Provinces', value: fmtNum(ts.provinces_today) },
            { metric: 'Countries', value: fmtNum(ts.countries_today) },
            { metric: 'Top malware family', value: ts.top_malware_today || '\u2014' },
            { metric: 'Snapshots accumulated', value: fmtNum(ts.snapshots_accumulated) },
          ],
          striped: true,
          compact: true,
        }),
      ),
    ) : null,

    cs ? h('div', null,
      h('h2', { id: 'cve-summary' }, 'CVE Summary'),
      h(VizWrapper, { title: 'Known-exploited vulnerabilities overview' },
        h(DataGrid, {
          columns: [
            { key: 'metric', header: 'Metric', sortable: false },
            { key: 'value', header: 'Value', sortable: false },
          ],
          data: [
            { metric: 'KEV CVEs total', value: fmtNum(cs.kev_total) },
            { metric: 'Added in last 30 days', value: fmtNum(cs.kev_added_30d) },
            { metric: 'Top CVE by current EPSS', value: cs.top_epss },
            { metric: 'Top EPSS score', value: cs.top_epss_score?.toFixed(3) || '\u2014' },
            { metric: 'Median EPSS (KEV)', value: cs.median_epss?.toFixed(3) || '\u2014' },
            { metric: 'Median CVSS v3 (KEV)', value: cs.median_cvss_v3?.toFixed(1) || '\u2014' },
          ],
          striped: true,
          compact: true,
        }),
      ),
    ) : null,

    // Navigation
    h('h2', { id: 'sections' }, "What's in here"),
    h('ul', { style: { lineHeight: '2', fontSize: '1rem' } },
      h('li', null,
        h('a', { href: '#/cybersecurity/threats' }, h('strong', null, 'Threat Sources \u2192')),
        ' \u2014 World map of every active threat IP geolocated to its city/province; province aggregation table; top ASNs.',
      ),
      h('li', null,
        h('a', { href: '#/cybersecurity/botnets' }, h('strong', null, 'Botnet Hosts \u2192')),
        ' \u2014 FeodoTracker C2 infrastructure specifically; malware-family breakdown; online vs offline.',
      ),
      h('li', null,
        h('a', { href: '#/cybersecurity/cves' }, h('strong', null, 'CVEs in the Wild \u2192')),
        ' \u2014 CISA KEV catalog with initial vs current EPSS, CVSS v3, and "in wild" flag. Sorted by current EPSS.',
      ),
      h('li', null,
        h('a', { href: '#/cybersecurity/about' }, h('strong', null, 'Methodology \u2192')),
        ' \u2014 Sources, attribution, refresh cadence, caveats.',
      ),
    ),

    // Update cadence table
    h('h2', { id: 'cadence' }, 'Update Cadence'),
    h('p', { style: proseStyle }, 'The CI pipeline fetches all four feeds once daily:'),
    h(VizWrapper, { title: 'Feed refresh schedule' },
      h(DataGrid, {
        columns: [
          { key: 'feed', header: 'Feed', sortable: false },
          { key: 'what', header: 'What', sortable: false },
          { key: 'license', header: 'License', sortable: false },
          { key: 'cadence', header: 'Cadence', sortable: false },
        ],
        data: [
          { feed: 'Abuse.ch FeodoTracker', what: 'Active botnet C2 IPs', license: 'CC0', cadence: 'Continuous; we snapshot daily' },
          { feed: 'Abuse.ch ThreatFox', what: 'Recent IoCs incl. C2 IPs', license: 'CC0', cadence: 'Recent-window CSV; snapshot daily' },
          { feed: 'CISA KEV', what: 'Known-exploited CVEs', license: 'Public domain', cadence: 'When CISA updates (\u2248weekly)' },
          { feed: 'FIRST EPSS', what: 'Daily exploit-probability per CVE', license: 'CC-BY-SA', cadence: 'Daily' },
          { feed: 'ip-api.com', what: 'IP\u2192province geolocation', license: 'Free non-commercial', cadence: 'On-demand for new IPs' },
        ],
        striped: true,
        compact: true,
      }),
    ),

    h('p', { style: { ...proseStyle, color: '#6c757d', fontSize: '0.9rem' } },
      'Per-IP geolocations are looked up once and cached forever, so daily runs only resolve newly-seen IPs.',
    ),
  );
}
