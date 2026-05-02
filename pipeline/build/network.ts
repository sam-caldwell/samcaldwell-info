/**
 * network.ts — Assembles a JSON graph for the /sentiment/network page.
 *
 * Port of R/build_network.R
 *
 * Outputs:
 *   data/sentiment/network.json
 */

import { readCsv, type CsvRow } from '../lib/csv.js';
import { parseDate, today, formatDate } from '../lib/dates.js';
import { log } from '../lib/cache.js';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Admin key mapping (matches R's admin_key function)
// ---------------------------------------------------------------------------

function adminKey(president: string): string {
  let nm = president.toLowerCase().replace(/\s+/g, '');
  nm = nm.replace(/[()]/g, '');
  nm = nm.replace('donaldtrump1stterm', 'trump1');
  nm = nm.replace('donaldtrump2ndterm', 'trump2');
  nm = nm.replace('georgew.bush', 'bush43');
  nm = nm.replace('billclinton', 'clinton');
  nm = nm.replace('barackobama', 'obama');
  nm = nm.replace('joebiden', 'biden');
  return nm;
}

function adminInOffice(dateStr: string, admins: CsvRow[], td: Date): number | null {
  const d = parseDate(dateStr);
  for (let i = 0; i < admins.length; i++) {
    const start = parseDate(String(admins[i].start_date));
    const endStr = admins[i].end_date;
    const end = (endStr !== null && endStr !== undefined && String(endStr) !== '')
      ? parseDate(String(endStr))
      : new Date(td.getTime() + 86400000);
    if (d >= start && d < end) return i;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export async function buildNetwork(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const sentDir = join(projectRoot, 'data', 'sentiment');
  mkdirSync(sentDir, { recursive: true });

  const td = today();
  const admins = readCsv(join(projectRoot, 'data', 'presidential-economies', 'administrations.csv'));

  // --- President nodes ---
  const presNodes: CsvRow[] = [];
  const presKeysById = new Map<string, string>(); // short key -> node id

  for (const a of admins) {
    const key = adminKey(String(a.president));
    const nodeId = `pres-${key}`;
    presKeysById.set(key, nodeId);
    presNodes.push({
      id: nodeId,
      type: 'president',
      label: String(a.president),
      sentiment: null,
      party: String(a.party),
      date: null,
      start_date: String(a.start_date),
      end_date: a.end_date !== null && a.end_date !== undefined && String(a.end_date) !== '' ? String(a.end_date) : null,
      meta: `Term ${a.start_date} – ${a.end_date !== null && a.end_date !== undefined && String(a.end_date) !== '' ? a.end_date : 'present'}`,
    });
  }

  // --- Events ---
  const eventsPath = join(sentDir, 'events.csv');
  const events = existsSync(eventsPath) ? readCsv(eventsPath) : [];
  const sortedEvents = [...events].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));

  const eventNodes: CsvRow[] = [];
  const eventLinks: CsvRow[] = [];

  sortedEvents.forEach((ev, i) => {
    const id = `evt-${String(i + 1).padStart(3, '0')}`;
    eventNodes.push({
      id,
      type: 'event',
      label: String(ev.event ?? ''),
      sentiment: ev.sentiment !== null ? Number(ev.sentiment) : null,
      party: null,
      date: ev.date !== null ? String(ev.date) : null,
      start_date: null,
      end_date: null,
      meta: `${ev.category ?? ''} · severity=${ev.severity ?? ''}`,
    });

    if (ev.date !== null) {
      const idx = adminInOffice(String(ev.date), admins, td);
      if (idx !== null) {
        const key = adminKey(String(admins[idx].president));
        eventLinks.push({
          source: presKeysById.get(key) || '',
          target: id,
          role: 'in-office',
          weight: 0.6,
        });
      }
    }
  });

  // --- Legislation ---
  const legPath = join(sentDir, 'legislation.csv');
  const leg = existsSync(legPath) ? readCsv(legPath) : [];

  const legNodes: CsvRow[] = [];
  const signedLinks: CsvRow[] = [];
  const supportedLinks: CsvRow[] = [];
  const opposedLinks: CsvRow[] = [];

  for (const l of leg) {
    legNodes.push({
      id: String(l.id ?? ''),
      type: 'legislation',
      label: String(l.name ?? ''),
      sentiment: l.sentiment !== null ? Number(l.sentiment) : null,
      party: null,
      date: l.signed_date !== null ? String(l.signed_date) : null,
      start_date: null,
      end_date: null,
      meta: `${l.category ?? ''} · signed ${l.signed_date ?? ''} · ${l.short_description ?? ''}`,
    });

    // Signed-by link
    if (l.signed_by !== null && l.signed_by !== undefined) {
      const signedKey = String(l.signed_by);
      if (presKeysById.has(signedKey)) {
        signedLinks.push({
          source: presKeysById.get(signedKey)!,
          target: String(l.id),
          role: 'signed',
          weight: 1.0,
        });
      }
    }

    // Supported/opposed links
    const expandLinks = (colValue: string | number | null | undefined, role: string, weight: number) => {
      if (colValue === null || colValue === undefined) return;
      const keys = String(colValue).split(/[,\s]+/).filter(k => k.length > 0 && presKeysById.has(k));
      for (const k of keys) {
        const target = role === 'supported' ? supportedLinks : opposedLinks;
        target.push({
          source: presKeysById.get(k)!,
          target: String(l.id),
          role,
          weight,
        });
      }
    };

    expandLinks(l.supported_by, 'supported', 0.55);
    expandLinks(l.opposed_by, 'opposed', 0.55);
  }

  // --- Assemble graph ---
  const allNodes = [...presNodes, ...legNodes, ...eventNodes];
  const allLinks = [...eventLinks, ...signedLinks, ...supportedLinks, ...opposedLinks];

  // Deduplicate links on source+target+role
  const linkSeen = new Set<string>();
  const dedupedLinks: CsvRow[] = [];
  for (const link of allLinks) {
    const key = `${link.source}|${link.target}|${link.role}`;
    if (!linkSeen.has(key)) {
      linkSeen.add(key);
      dedupedLinks.push(link);
    }
  }

  // Count by type
  const presCount = allNodes.filter(n => n.type === 'president').length;
  const legCount = allNodes.filter(n => n.type === 'legislation').length;
  const evtCount = allNodes.filter(n => n.type === 'event').length;

  const roleCounts: Record<string, number> = {};
  for (const l of dedupedLinks) {
    const role = String(l.role);
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }

  const graph = {
    meta: {
      generated_at: new Date().toISOString(),
      node_counts: { president: presCount, legislation: legCount, event: evtCount },
      link_counts: roleCounts,
    },
    nodes: allNodes.map(n => {
      const obj: Record<string, any> = {};
      for (const [k, v] of Object.entries(n)) {
        obj[k] = v === null ? null : v;
      }
      return obj;
    }),
    links: dedupedLinks.map(l => {
      const obj: Record<string, any> = {};
      for (const [k, v] of Object.entries(l)) {
        obj[k] = v === null ? null : v;
      }
      return obj;
    }),
  };

  const outPath = join(sentDir, 'network.json');
  writeFileSync(outPath, JSON.stringify(graph), 'utf-8');

  log('network', `${allNodes.length} nodes (${presCount}P/${legCount}L/${evtCount}E), ${dedupedLinks.length} links`);
}
