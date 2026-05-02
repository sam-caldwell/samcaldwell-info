/**
 * sentiment.ts — Assembles public-sentiment views into per-admin summaries.
 *
 * Port of R/build_sentiment.R
 *
 * Outputs:
 *   data/sentiment/umcsent_monthly.csv
 *   data/sentiment/gdelt_tone_monthly.csv
 *   data/sentiment/mediacloud_volume_monthly.csv
 *   data/sentiment/admin_sentiment.csv
 */

import { readCsv, writeCsv, type CsvRow, round } from '../lib/csv.js';
import { parseDate, formatDate } from '../lib/dates.js';
import { log, warn } from '../lib/cache.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Admin tagging (reuses administrations.csv from presidential build)
// ---------------------------------------------------------------------------

interface AdminRef {
  president: string;
  party: string;
  start_date: Date;
  effective_end: Date;
  ongoing: boolean;
}

function loadAdmins(path: string): AdminRef[] {
  const rows = readCsv(path);
  return rows.map(r => ({
    president: String(r.president),
    party: String(r.party),
    start_date: parseDate(String(r.start_date)),
    effective_end: parseDate(String(r.effective_end)),
    ongoing: String(r.ongoing) === 'TRUE',
  }));
}

function tagAdmin(d: Date, admins: AdminRef[]): number | null {
  for (let i = 0; i < admins.length; i++) {
    if (d >= admins[i].start_date && d < admins[i].effective_end) return i;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export async function buildSentiment(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const cacheDir = join(projectRoot, 'data', 'economy', 'cache');
  const sentDir = join(projectRoot, 'data', 'sentiment');
  mkdirSync(sentDir, { recursive: true });

  // --- Load admins ---
  const adminsPath = join(projectRoot, 'data', 'presidential-economies', 'administrations.csv');
  if (!existsSync(adminsPath)) {
    throw new Error('administrations.csv not found — buildPresidential() must run first.');
  }
  const admins = loadAdmins(adminsPath);

  // --- (A) UMCSENT ---
  const umcsentPath = join(cacheDir, 'umcsent.csv');
  let umcsentRaw: CsvRow[] = [];
  if (existsSync(umcsentPath)) {
    umcsentRaw = readCsv(umcsentPath);
  } else {
    warn('sentiment', 'UMCSENT cache missing — run fetch first or use synthetic.');
  }

  const umcsentTagged: CsvRow[] = [];
  for (const r of umcsentRaw) {
    if (r.value === null || r.date === null) continue;
    const d = parseDate(String(r.date));
    if (d < parseDate('1999-01-01')) continue;
    const midMonth = new Date(d.getTime() + 13 * 86400000);
    const idx = tagAdmin(midMonth, admins);
    if (idx === null) continue;
    umcsentTagged.push({
      date: String(r.date),
      umcsent: Number(r.value),
      president: admins[idx].president,
      party: admins[idx].party,
      ongoing: admins[idx].ongoing ? 'TRUE' : 'FALSE',
    });
  }
  writeCsv(join(sentDir, 'umcsent_monthly.csv'), umcsentTagged,
    ['date', 'umcsent', 'president', 'party', 'ongoing']);

  // UMCSENT baseline + per-admin
  let umcsentBaseline: number | null = null;
  if (umcsentTagged.length > 0) {
    let sum = 0;
    for (const r of umcsentTagged) sum += Number(r.umcsent);
    umcsentBaseline = round(sum / umcsentTagged.length, 1);
  }

  const umcByAdmin = new Map<string, { sum: number; n: number; min: number; max: number }>();
  for (const r of umcsentTagged) {
    const pres = String(r.president);
    const v = Number(r.umcsent);
    const e = umcByAdmin.get(pres) || { sum: 0, n: 0, min: Infinity, max: -Infinity };
    e.sum += v; e.n++;
    if (v < e.min) e.min = v;
    if (v > e.max) e.max = v;
    umcByAdmin.set(pres, e);
  }

  // --- (C) GDELT tone ---
  const gdeltCachePath = join(sentDir, 'cache', 'gdelt_tone.csv');
  let gdeltRaw: CsvRow[] = [];
  if (existsSync(gdeltCachePath)) {
    gdeltRaw = readCsv(gdeltCachePath);
  }

  // Aggregate to monthly
  const gdeltByMonth = new Map<string, { toneSum: number; toneN: number; volSum: number; days: number }>();
  for (const r of gdeltRaw) {
    if (r.date === null) continue;
    const dateStr = String(r.date);
    const monthStart = dateStr.slice(0, 7) + '-01';
    const e = gdeltByMonth.get(monthStart) || { toneSum: 0, toneN: 0, volSum: 0, days: 0 };
    if (r.tone !== null) { e.toneSum += Number(r.tone); e.toneN++; }
    if (r.volume !== null) e.volSum += Number(r.volume);
    e.days++;
    gdeltByMonth.set(monthStart, e);
  }

  const gdeltMonthly: CsvRow[] = [];
  for (const [dateStr, e] of [...gdeltByMonth.entries()].sort()) {
    const d = parseDate(dateStr);
    const midMonth = new Date(d.getTime() + 13 * 86400000);
    const idx = tagAdmin(midMonth, admins);
    const row: CsvRow = {
      date: dateStr,
      tone: e.toneN > 0 ? round(e.toneSum / e.toneN, 3) : null,
      volume: Math.round(e.volSum),
      days: e.days,
    };
    if (idx !== null) {
      row.president = admins[idx].president;
      row.party = admins[idx].party;
      row.ongoing = admins[idx].ongoing ? 'TRUE' : 'FALSE';
    }
    gdeltMonthly.push(row);
  }
  writeCsv(join(sentDir, 'gdelt_tone_monthly.csv'), gdeltMonthly,
    ['date', 'tone', 'volume', 'days', 'president', 'party', 'ongoing']);

  let gdeltBaseline: number | null = null;
  if (gdeltMonthly.length > 0) {
    let sum = 0, n = 0;
    for (const r of gdeltMonthly) {
      if (r.tone !== null) { sum += Number(r.tone); n++; }
    }
    if (n > 0) gdeltBaseline = round(sum / n, 3);
  }

  const gdeltByAdmin = new Map<string, { sum: number; n: number; min: number; max: number }>();
  for (const r of gdeltMonthly) {
    if (r.tone === null || r.president === null || r.president === undefined) continue;
    const pres = String(r.president);
    const v = Number(r.tone);
    const e = gdeltByAdmin.get(pres) || { sum: 0, n: 0, min: Infinity, max: -Infinity };
    e.sum += v; e.n++;
    if (v < e.min) e.min = v;
    if (v > e.max) e.max = v;
    gdeltByAdmin.set(pres, e);
  }

  // --- Media Cloud volume ---
  const mcCachePath = join(sentDir, 'cache', 'mediacloud_volume.csv');
  let mcRaw: CsvRow[] = [];
  if (existsSync(mcCachePath)) {
    mcRaw = readCsv(mcCachePath);
  }

  const mcMonthly: CsvRow[] = [];
  for (const r of mcRaw) {
    if (r.date === null) continue;
    const d = parseDate(String(r.date));
    const midMonth = new Date(d.getTime() + 13 * 86400000);
    const idx = tagAdmin(midMonth, admins);
    const row: CsvRow = {
      date: String(r.date),
      mc_relevant: r.relevant !== null ? Number(r.relevant) : null,
      mc_total: r.total !== null ? Number(r.total) : null,
    };
    if (idx !== null) {
      row.president = admins[idx].president;
      row.party = admins[idx].party;
    }
    mcMonthly.push(row);
  }
  writeCsv(join(sentDir, 'mediacloud_volume_monthly.csv'), mcMonthly,
    ['date', 'mc_relevant', 'mc_total', 'president', 'party']);

  const mcByAdmin = new Map<string, { sum: number; total: number; n: number }>();
  for (const r of mcMonthly) {
    if (r.president === null || r.president === undefined) continue;
    const pres = String(r.president);
    const e = mcByAdmin.get(pres) || { sum: 0, total: 0, n: 0 };
    if (r.mc_relevant !== null) e.sum += Number(r.mc_relevant);
    if (r.mc_total !== null) e.total += Number(r.mc_total);
    e.n++;
    mcByAdmin.set(pres, e);
  }

  // --- (B) Gallup approval ---
  const gallupPath = join(sentDir, 'gallup_approval.csv');
  let gallup: CsvRow[] = [];
  if (existsSync(gallupPath)) {
    gallup = readCsv(gallupPath);
  }

  let gallupBaseline: number | null = null;
  if (gallup.length > 0) {
    let sum = 0, n = 0;
    for (const r of gallup) {
      if (r.avg_approval !== null) { sum += Number(r.avg_approval); n++; }
    }
    if (n > 0) gallupBaseline = round(sum / n, 1);
  }

  const gallupByPres = new Map<string, CsvRow>();
  for (const r of gallup) {
    gallupByPres.set(String(r.president), r);
  }

  // --- Merge per-admin sentiment ---
  const adminSentiment: CsvRow[] = [];
  for (const a of admins) {
    const umc = umcByAdmin.get(a.president);
    const g = gallupByPres.get(a.president);
    const gdelt = gdeltByAdmin.get(a.president);
    const mc = mcByAdmin.get(a.president);

    adminSentiment.push({
      president: a.president,
      party: a.party,
      start_date: formatDate(a.start_date),
      end_date: a.ongoing ? null : formatDate(a.effective_end),
      ongoing: a.ongoing ? 'TRUE' : 'FALSE',
      umcsent_avg: umc ? round(umc.sum / umc.n, 1) : null,
      umcsent_min: umc ? round(umc.min, 1) : null,
      umcsent_max: umc ? round(umc.max, 1) : null,
      months: umc?.n ?? null,
      umcsent_vs_baseline: (umc && umcsentBaseline !== null) ? round(umc.sum / umc.n - umcsentBaseline, 1) : null,
      gallup_avg: g?.avg_approval ?? null,
      gallup_min: g?.min_approval ?? null,
      gallup_max: g?.max_approval ?? null,
      gallup_last: g?.last_approval ?? null,
      gallup_vs_baseline: (g?.avg_approval !== null && g?.avg_approval !== undefined && gallupBaseline !== null)
        ? round(Number(g.avg_approval) - gallupBaseline, 1) : null,
      tone_avg: gdelt ? round(gdelt.sum / gdelt.n, 3) : null,
      tone_min: gdelt ? round(gdelt.min, 3) : null,
      tone_max: gdelt ? round(gdelt.max, 3) : null,
      tone_months: gdelt?.n ?? null,
      tone_vs_baseline: (gdelt && gdeltBaseline !== null) ? round(gdelt.sum / gdelt.n - gdeltBaseline, 3) : null,
      mc_stories_per_month_avg: mc && mc.n > 0 ? round(mc.sum / mc.n, 0) : null,
      mc_stories_total: mc ? mc.sum : null,
      mc_months: mc?.n ?? null,
    });
  }

  // Add baseline row
  adminSentiment.push({
    president: 'BASELINE (avg of displayed admins)',
    party: null,
    umcsent_avg: umcsentBaseline,
    gallup_avg: gallupBaseline,
    tone_avg: gdeltBaseline,
  });

  const sentCols = [
    'president', 'party', 'start_date', 'end_date', 'ongoing',
    'umcsent_avg', 'umcsent_min', 'umcsent_max', 'months', 'umcsent_vs_baseline',
    'gallup_avg', 'gallup_min', 'gallup_max', 'gallup_last', 'gallup_vs_baseline',
    'tone_avg', 'tone_min', 'tone_max', 'tone_months', 'tone_vs_baseline',
    'mc_stories_per_month_avg', 'mc_stories_total', 'mc_months',
  ];
  writeCsv(join(sentDir, 'admin_sentiment.csv'), adminSentiment, sentCols);

  log('sentiment', `wrote ${adminSentiment.length - 1} admin rows (+ baseline) to ${sentDir}`);
}
