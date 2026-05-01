import { BarGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { CurrentBotnet } from '../../types.js';

export function CyberBotnets() {
  useSeoHead(
    'Botnet Hosts',
    'Active C2 infrastructure from Abuse.ch FeodoTracker \u2014 botnet command-and-control servers, malware family breakdown, and hosting networks.',
  );

  const botnets = getCsv<CurrentBotnet>('/data/cybersecurity/current_botnets.csv');
  if (!botnets) return h(Loading, null);

  const haveData = botnets.length > 0;

  // Malware family counts
  const familyCounts = haveData
    ? Object.entries(
        botnets
          .filter(b => b.malware_family && b.malware_family.trim() !== '')
          .reduce((acc, b) => {
            acc[b.malware_family] = (acc[b.malware_family] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      )
        .map(([family, count]) => ({ family, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    : [];

  const familyBarData = familyCounts.map(f => ({
    label: f.family,
    value: f.count,
    color: '#6a4c93',
  }));

  // Status breakdown
  const statusCounts = haveData
    ? Object.entries(
        botnets
          .filter(b => b.status && b.status.trim() !== '')
          .reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      )
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  // Top ASNs
  const asnCounts = haveData
    ? Object.entries(
        botnets
          .filter(b => b.as_name && b.as_name.trim() !== '')
          .reduce((acc, b) => {
            acc[b.as_name] = (acc[b.as_name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      )
        .map(([as_name, count]) => ({ as_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    : [];

  // Botnet hosts DataGrid
  const botnetRows = haveData
    ? botnets.map(b => ({
        ip: b.ip,
        port: b.port,
        malware_family: b.malware_family || '\u2014',
        country: b.country || '\u2014',
        region: b.region_name || '\u2014',
        city: b.city || '\u2014',
        status: b.status || '\u2014',
        first_seen: b.first_seen || '\u2014',
      }))
    : [];

  return h('div', null,
    h('h1', null, 'Botnet Hosts'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Active C2 infrastructure from Abuse.ch FeodoTracker, past 24 hrs',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Attribution.'),
        ' Botnet C2 data from ',
        h('a', { href: 'https://feodotracker.abuse.ch/', target: '_blank', rel: 'noopener noreferrer' }, 'Abuse.ch FeodoTracker'),
        ' (CC0). FeodoTracker specifically tracks command-and-control servers used by major banking-trojan and ransomware-loader botnets (Emotet, Dridex, TrickBot, Qakbot, IcedID, BazarLoader, etc.). IP\u2192province geolocation by ',
        h('a', { href: 'https://ip-api.com/', target: '_blank', rel: 'noopener noreferrer' }, 'ip-api.com'),
        '.',
      ),
    ),

    !haveData
      ? h(Callout, { type: 'warning' },
          'Botnet data is not populated yet. CI pipeline will fetch on next run.',
        )
      : null,

    // Botnet hosts DataGrid
    haveData ? h('div', null,
      h('h2', { id: 'hosts' }, 'Botnet C2 Hosts'),
      h(VizWrapper, { title: `${botnetRows.length} active C2 servers` },
        h(DataGrid, {
          columns: [
            { key: 'ip', header: 'IP', sortable: true },
            { key: 'port', header: 'Port', sortable: true },
            { key: 'malware_family', header: 'Malware Family', sortable: true },
            { key: 'country', header: 'Country', sortable: true },
            { key: 'region', header: 'Region', sortable: true },
            { key: 'city', header: 'City', sortable: true },
            { key: 'status', header: 'Status', sortable: true },
          ],
          data: botnetRows,
          pageSize: 25,
          striped: true,
          compact: true,
        }),
      ),
    ) : null,

    // Malware family breakdown
    haveData && familyBarData.length > 0 ? h('div', null,
      h('h2', { id: 'families' }, 'Malware Family Breakdown'),
      h(VizWrapper, { title: 'Active botnet C2 IPs by malware family' },
        h(BarGraph, {
          data: familyBarData,
          height: 360,
          showValues: true,
          title: 'Active botnet C2 IPs by malware family',
        }),
      ),
    ) : null,

    // Online vs offline
    haveData && statusCounts.length > 0 ? h('div', null,
      h('h2', { id: 'status' }, 'Online vs Offline'),
      h('p', { style: { color: '#495057', lineHeight: '1.5', maxWidth: '65ch' } },
        'FeodoTracker labels each tracked C2 as "online" (currently reachable) or "offline" (recently seen but not currently responding).',
      ),
      h(VizWrapper, { title: 'C2 status breakdown' },
        h(DataGrid, {
          columns: [
            { key: 'status', header: 'Status', sortable: true },
            { key: 'count', header: 'Count', sortable: true },
          ],
          data: statusCounts,
          striped: true,
          compact: true,
        }),
      ),
    ) : null,

    // Top ASNs
    haveData && asnCounts.length > 0 ? h('div', null,
      h('h2', { id: 'asn' }, 'Top Hosting Networks for Botnet C2s'),
      h(VizWrapper, { title: 'Top 15 autonomous systems by botnet C2 IPs' },
        h(DataGrid, {
          columns: [
            { key: 'as_name', header: 'Autonomous System', sortable: true },
            { key: 'count', header: 'Active Botnet C2s', sortable: true },
          ],
          data: asnCounts,
          pageSize: 15,
          striped: true,
          compact: true,
        }),
      ),
    ) : null,
  );
}
