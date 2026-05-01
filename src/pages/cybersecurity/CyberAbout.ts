import { h } from '../../h.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';

const proseStyle = { color: '#495057', maxWidth: '72ch', lineHeight: '1.6', fontSize: '0.98rem' };

export function CyberAbout() {
  useSeoHead(
    'Cybersecurity Methodology & Caveats',
    'How threat data is collected, geolocated, and aggregated \u2014 data sources, cache architecture, and caveats.',
  );

  return h('div', null,
    h('h1', null, 'Methodology & Caveats'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'How threat data is collected, geolocated, and aggregated',
    ),

    // Data sources
    h('h2', null, 'Data Sources'),
    h(VizWrapper, { title: 'Source attribution and licensing' },
      h(DataGrid, {
        columns: [
          { key: 'source', header: 'Source' },
          { key: 'what', header: 'What' },
          { key: 'license', header: 'License' },
          { key: 'refresh', header: 'Refresh' },
        ],
        data: [
          { source: 'Abuse.ch FeodoTracker', what: 'Active botnet C2 IPs (Emotet, Dridex, TrickBot, Qakbot, etc.)', license: 'CC0', refresh: 'Continuous; we snapshot once daily' },
          { source: 'Abuse.ch ThreatFox', what: 'Recent IoCs incl. C2 IPs and ports', license: 'CC0', refresh: 'Recent CSV (rolling window); we snapshot once daily' },
          { source: 'ip-api.com', what: 'IP\u2192country/region/city/lat-lon/AS', license: 'Free non-commercial', refresh: 'On-demand for new IPs only' },
          { source: 'CISA KEV', what: 'Known-exploited CVE catalog', license: 'Public domain (US gov)', refresh: 'When CISA updates' },
          { source: 'FIRST EPSS', what: 'Daily exploit-probability per CVE', license: 'CC-BY-SA', refresh: 'Daily' },
          { source: 'NVD', what: 'CVSS scores per CVE', license: 'Public domain (US gov)', refresh: 'On-demand for new KEV CVEs' },
        ],
        striped: true,
        compact: true,
      }),
    ),

    h('p', { style: proseStyle },
      'All sources are non-commercial-friendly. ip-api.com\'s free tier is explicitly non-commercial; this site has no ads, no products, and no paid content. Attribution is on every page that displays each source.',
    ),

    // Cache architecture
    h('h2', null, 'Cache Architecture'),
    h('p', { style: proseStyle },
      'Daily snapshots accumulate so the site can show both:',
    ),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null, '"as of right now" (latest snapshot)'),
      h('li', null, '"accumulated over N days" (union/sum of last N snapshots)'),
    ),
    h('pre', { style: { background: '#f8f9fa', padding: '16px', borderRadius: '4px', fontSize: '0.85rem', overflow: 'auto', color: '#495057' } },
      `data/cybersecurity/
  cache/
    feodo_YYYY-MM-DD.json         daily Abuse.ch FeodoTracker dump
    threatfox_YYYY-MM-DD.csv      daily ThreatFox export
    kev_YYYY-MM-DD.json           daily CISA KEV dump
    epss_YYYY-MM-DD.csv.gz        daily EPSS snapshot
    epss_history.csv              persistent: first-seen + current per CVE
    nvd_cvss.csv                  persistent: CVSS scores per CVE (lookup once)
    ip_geolocation.csv            persistent: IP \u2192 country/region/city/lat/lon
  current_threats.csv             latest snapshot, joined w/ geo
  current_botnets.csv             FeodoTracker subset of above
  province_daily.csv              per-day per-province IP counts
  malware_family_daily.csv        per-day per-malware counts
  threats_summary.csv             headline figures for index page
  cves_kev.csv                    KEV catalog with EPSS + CVSS joined
  cves_summary.csv                headline figures for CVE page`,
    ),

    // Provincial geolocation
    h('h2', null, 'Provincial Geolocation'),
    h('p', { style: proseStyle },
      'Threat IPs are geolocated to city/province level via ip-api.com\'s batch endpoint (100 IPs per request, 2-second pause between batches). Each unique IP is looked up once and the result is stored in ip_geolocation.csv. Subsequent runs reuse cached geolocations, so a typical daily refresh sends 0\u201350 lookup requests.',
    ),
    h('p', { style: proseStyle },
      'Province/region accuracy varies by country and ISP \u2014 major commercial providers (AWS, Azure, GCP, Cloudflare, OVH) often resolve to the provider\'s primary data-center region, which may differ from where the underlying VM is physically running.',
    ),

    // Caveats
    h('h2', null, 'Caveats'),
    h('ol', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Hosting location \u2260 attacker location.'),
        ' Attackers routinely use rented hosting in countries with weak attribution or extradition. Maps show infrastructure, not perpetrators.',
      ),
      h('li', null,
        h('strong', null, 'Geolocation is approximate.'),
        ' Region/province accuracy depends on the IP\'s WHOIS records and the geolocation provider\'s heuristics. Mobile, VPN, and CDN traffic often resolve to incorrect locations.',
      ),
      h('li', null,
        h('strong', null, 'Snapshot, not stream.'),
        ' We sample once per 24 hours. Threats that come online and disappear within a single day may be missed. The accumulated view captures threats that persist or recur.',
      ),
      h('li', null,
        h('strong', null, 'Daily geolocation budget.'),
        ' ip-api.com\'s free tier limits us to ~64,000 lookups per day. Typical fresh-IP volume is 50\u2013500 per day, so we operate well under the limit, but a sudden surge (e.g. botnet takedown reveals 10,000 new C2s in a day) could exceed it. The fetcher processes IPs in priority order and warns rather than fails.',
      ),
      h('li', null,
        h('strong', null, 'EPSS interpretation.'),
        ' EPSS scores are probabilities, not binary judgments. EPSS = 0.95 means "95% probability of exploit observation in the next 30 days," not "95% severe."',
      ),
      h('li', null,
        h('strong', null, 'KEV is conservative.'),
        ' A CVE not in KEV is not necessarily safe \u2014 CISA only adds CVEs after observing exploitation in operational US federal incident-response cases. Many CVEs are exploited globally without ever appearing in KEV.',
      ),
    ),

    // Privacy note
    h('h2', null, 'Privacy Note on Per-IP Display'),
    h('p', { style: proseStyle },
      'Threat IPs are not displayed individually in the site\'s main views. Aggregations (province, country, AS, malware family) are shown instead. The raw IPs are present in the downloadable CSVs for transparency and reproducibility \u2014 the same IPs appear in the upstream Abuse.ch feeds and KEV catalog, which are themselves public.',
    ),

    // Code license
    h('h2', null, 'Code License'),
    h('p', { style: proseStyle },
      'MIT \u2014 see the ',
      h('a', { href: 'https://github.com/sam-caldwell/samcaldwell.info/blob/main/LICENSE', target: '_blank', rel: 'noopener noreferrer' }, 'LICENSE'),
      ' file.',
    ),
  );
}
