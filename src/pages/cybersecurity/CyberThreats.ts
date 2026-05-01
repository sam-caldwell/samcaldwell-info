import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { CurrentThreat } from '../../types.js';

interface ProvinceDailyRow {
  snapshot_date: string;
  country: string;
  region_name: string;
  n: number;
}

export function CyberThreats() {
  useSeoHead(
    'Threat Sources',
    'World map of active threat IPs (FeodoTracker + ThreatFox), geolocated to city/province level with top provinces and ASNs.',
  );

  const threats = getCsv<CurrentThreat>('/data/cybersecurity/current_threats.csv');
  const provinces = getCsv<ProvinceDailyRow>('/data/cybersecurity/province_daily.csv');
  if (!threats || !provinces) return h(Loading, null);

  const haveData = threats.length > 0;
  const haveGeo = haveData && threats.some(t => t.lat != null && !isNaN(t.lat));

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Build threat table grouped by country/city with lat/lon
  const threatsByLocation = haveGeo
    ? Object.values(
        threats
          .filter(t => t.lat != null && !isNaN(t.lat))
          .reduce((acc, t) => {
            const key = `${t.country}|${t.region_name}|${t.city}`;
            if (!acc[key]) {
              acc[key] = {
                country: t.country || '\u2014',
                region: t.region_name || '\u2014',
                city: t.city || '\u2014',
                lat: t.lat,
                lon: t.lon,
                count: 0,
              };
            }
            acc[key].count++;
            return acc;
          }, {} as Record<string, { country: string; region: string; city: string; lat: number; lon: number; count: number }>)
      ).sort((a, b) => b.count - a.count)
    : [];

  // Top provinces from province_daily (latest snapshot)
  const latestDate = provinces.length > 0
    ? provinces.reduce((max, p) => p.snapshot_date > max ? p.snapshot_date : max, '')
    : '';
  const topProvinces = provinces
    .filter(p => p.snapshot_date === latestDate)
    .sort((a, b) => b.n - a.n)
    .slice(0, 25);

  // Top ASNs
  const asnCounts = haveData
    ? Object.entries(
        threats
          .filter(t => t.as_name && t.as_name.trim() !== '')
          .reduce((acc, t) => {
            acc[t.as_name] = (acc[t.as_name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      )
        .map(([as_name, count]) => ({ as_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
    : [];

  return h('div', null,
    h('h1', null, 'Threat Sources'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'World map of active threat IPs (FeodoTracker + ThreatFox), past 24 hrs',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Attribution.'),
        ' Threat data from ',
        h('a', { href: 'https://feodotracker.abuse.ch/', target: '_blank', rel: 'noopener noreferrer' }, 'Abuse.ch FeodoTracker'),
        ' and ',
        h('a', { href: 'https://threatfox.abuse.ch/', target: '_blank', rel: 'noopener noreferrer' }, 'ThreatFox'),
        ' (both CC0). IP\u2192province geolocation by ',
        h('a', { href: 'https://ip-api.com/', target: '_blank', rel: 'noopener noreferrer' }, 'ip-api.com'),
        ' (free non-commercial tier). Hosting location does not identify attackers.',
      ),
    ),

    // Map placeholder
    h('h2', { id: 'map' }, 'World Map of Active Threats'),

    haveGeo
      ? h('div', null,
          h(Callout, { type: 'note', title: 'Map visualization in development' },
            'An interactive geographic map of threat locations is being developed. In the meantime, the table below shows all geolocated threat IPs grouped by country/city with coordinates.',
          ),
          h(VizWrapper, {
            title: `Active threat infrastructure \u2014 ${fmtNum(threatsByLocation.length)} locations across ${fmtNum(new Set(threatsByLocation.map(t => t.country)).size)} countries`,
          },
            h(DataGrid, {
              columns: [
                { key: 'country', header: 'Country', sortable: true },
                { key: 'region', header: 'Province / Region', sortable: true },
                { key: 'city', header: 'City', sortable: true },
                { key: 'lat', header: 'Lat', sortable: true },
                { key: 'lon', header: 'Lon', sortable: true },
                { key: 'count', header: 'Active IPs', sortable: true },
              ],
              data: threatsByLocation.slice(0, 100),
              pageSize: 25,
              striped: true,
              compact: true,
            }),
          ),
        )
      : h(Callout, { type: 'note' },
          "Threat-source data isn't populated yet, or geolocation hasn't completed. The CI pipeline fetches it on first run; check back after the next deploy.",
        ),

    // Top provinces table
    haveData ? h('div', null,
      h('h2', { id: 'provinces' }, 'Top Provinces \u2014 Current 24-Hour Snapshot'),
      h(VizWrapper, { title: 'Top 25 provinces by active threat IPs' },
        h(DataGrid, {
          columns: [
            { key: 'country', header: 'Country', sortable: true },
            { key: 'region_name', header: 'Province / Region', sortable: true },
            { key: 'n', header: 'Active IPs', sortable: true },
          ],
          data: topProvinces,
          pageSize: 25,
          striped: true,
          compact: true,
        }),
      ),
    ) : null,

    // Top ASNs table
    haveData ? h('div', null,
      h('h2', { id: 'asns' }, 'Top Hosting Networks (ASNs) \u2014 Current Snapshot'),
      h(VizWrapper, { title: 'Top 20 autonomous systems by active threat IPs' },
        h(DataGrid, {
          columns: [
            { key: 'as_name', header: 'Autonomous System', sortable: true },
            { key: 'count', header: 'Active Threat IPs', sortable: true },
          ],
          data: asnCounts,
          pageSize: 20,
          striped: true,
          compact: true,
        }),
      ),
    ) : null,
  );
}
