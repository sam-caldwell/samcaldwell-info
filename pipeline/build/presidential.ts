/**
 * presidential.ts — Derives per-administration summaries from economy CSVs.
 *
 * Port of R/build_presidential.R
 *
 * Outputs:
 *   data/presidential-economies/administrations.csv
 *   data/presidential-economies/monthly_admin.csv
 *   data/presidential-economies/admin_summary.csv
 */

import { readCsv, writeCsv, type CsvRow, round } from '../lib/csv.js';
import { formatDate, parseDate, today, utcDate, year, month } from '../lib/dates.js';
import { log } from '../lib/cache.js';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Administration definitions
// ---------------------------------------------------------------------------

interface Admin {
  president: string;
  party: string;
  start_date: Date;
  end_date: Date | null;
  effective_end: Date;
  ongoing: boolean;
  duration_days: number;
}

function buildAdmins(td: Date): Admin[] {
  const defs: { president: string; party: string; start: string; end: string | null }[] = [
    { president: 'Bill Clinton',            party: 'Democratic', start: '1993-01-20', end: '2001-01-20' },
    { president: 'George W. Bush',          party: 'Republican', start: '2001-01-20', end: '2009-01-20' },
    { president: 'Barack Obama',            party: 'Democratic', start: '2009-01-20', end: '2017-01-20' },
    { president: 'Donald Trump (1st term)', party: 'Republican', start: '2017-01-20', end: '2021-01-20' },
    { president: 'Joe Biden',               party: 'Democratic', start: '2021-01-20', end: '2025-01-20' },
    { president: 'Donald Trump (2nd term)', party: 'Republican', start: '2025-01-20', end: null },
  ];

  return defs.map(d => {
    const startDate = parseDate(d.start);
    const endDate = d.end ? parseDate(d.end) : null;
    const effectiveEnd = endDate || td;
    return {
      president: d.president,
      party: d.party,
      start_date: startDate,
      end_date: endDate,
      effective_end: effectiveEnd,
      ongoing: endDate === null,
      duration_days: Math.round((effectiveEnd.getTime() - startDate.getTime()) / 86400000),
    };
  });
}

/** Find admin index for a date (mid-month or mid-year) */
function tagAdmin(d: Date, admins: Admin[]): number | null {
  for (let i = 0; i < admins.length; i++) {
    if (d >= admins[i].start_date && d < admins[i].effective_end) return i;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export async function buildPresidential(): Promise<void> {
  const projectRoot = join(import.meta.dir, '..', '..');
  const economyDir = join(projectRoot, 'data', 'economy');
  const outDir = join(projectRoot, 'data', 'presidential-economies');
  mkdirSync(outDir, { recursive: true });

  const td = today();
  const admins = buildAdmins(td);

  const monthlyRaw = readCsv(join(economyDir, 'monthly.csv'));
  const annualRaw = readCsv(join(economyDir, 'annual.csv'));

  const fiscalQPath = join(economyDir, 'fiscal_quarterly.csv');
  const fiscalQ: CsvRow[] = existsSync(fiscalQPath) ? readCsv(fiscalQPath) : [];

  // --- administrations.csv ---
  const adminRows: CsvRow[] = admins.map(a => ({
    president: a.president,
    party: a.party,
    start_date: formatDate(a.start_date),
    end_date: a.end_date ? formatDate(a.end_date) : null,
    effective_end: formatDate(a.effective_end),
    ongoing: a.ongoing ? 'TRUE' : 'FALSE',
    duration_days: a.duration_days,
  }));
  writeCsv(join(outDir, 'administrations.csv'), adminRows,
    ['president', 'party', 'start_date', 'end_date', 'effective_end', 'ongoing', 'duration_days']);

  // --- Tag monthly data with admin ---
  const monthlyTagged: CsvRow[] = [];
  for (const row of monthlyRaw) {
    if (row.date === null) continue;
    const d = parseDate(String(row.date));
    // mid-month = date + 13 days (1st + 13 = 14th)
    const midMonth = new Date(d.getTime() + 13 * 86400000);
    const idx = tagAdmin(midMonth, admins);
    if (idx === null) continue;
    monthlyTagged.push({
      ...row,
      president: admins[idx].president,
      party: admins[idx].party,
      ongoing: admins[idx].ongoing ? 'TRUE' : 'FALSE',
    });
  }

  writeCsv(join(outDir, 'monthly_admin.csv'), monthlyTagged,
    ['year', 'month', 'date', 'unemployment', 'cpi', 'fed_funds', 'ten_year',
     'vix', 'sp500_level', 'president', 'party', 'ongoing']);

  // --- Per-admin monthly aggregates ---
  interface MonthlyStats {
    president: string;
    party: string;
    ongoing: string;
    window_first: string;
    window_last: string;
    months: number;
    unemployment_start: number | null;
    unemployment_end: number | null;
    unemployment_change: number | null;
    cpi_avg: number | null;
    fed_funds_start: number | null;
    fed_funds_end: number | null;
    fed_funds_change: number | null;
    ten_year_avg: number | null;
    sp500_start_level: number | null;
    sp500_end_level: number | null;
    vix_avg: number | null;
  }

  const grouped = new Map<string, CsvRow[]>();
  for (const r of monthlyTagged) {
    const key = String(r.president);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  const monthlyStatsMap = new Map<string, MonthlyStats>();
  for (const [pres, rows] of grouped) {
    const sorted = [...rows].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    let cpiSum = 0, cpiN = 0, t10Sum = 0, t10N = 0, vixSum = 0, vixN = 0;
    for (const r of sorted) {
      if (r.cpi !== null) { cpiSum += Number(r.cpi); cpiN++; }
      if (r.ten_year !== null) { t10Sum += Number(r.ten_year); t10N++; }
      if (r.vix !== null) { vixSum += Number(r.vix); vixN++; }
    }

    const ue_start = first.unemployment !== null ? Number(first.unemployment) : null;
    const ue_end = last.unemployment !== null ? Number(last.unemployment) : null;
    const ff_start = first.fed_funds !== null ? Number(first.fed_funds) : null;
    const ff_end = last.fed_funds !== null ? Number(last.fed_funds) : null;

    monthlyStatsMap.set(pres, {
      president: pres,
      party: String(first.party),
      ongoing: String(first.ongoing),
      window_first: String(first.date),
      window_last: String(last.date),
      months: sorted.length,
      unemployment_start: ue_start,
      unemployment_end: ue_end,
      unemployment_change: (ue_end !== null && ue_start !== null) ? round(ue_end - ue_start, 2) : null,
      cpi_avg: cpiN > 0 ? round(cpiSum / cpiN, 2) : null,
      fed_funds_start: ff_start,
      fed_funds_end: ff_end,
      fed_funds_change: (ff_end !== null && ff_start !== null) ? round(ff_end - ff_start, 2) : null,
      ten_year_avg: t10N > 0 ? round(t10Sum / t10N, 2) : null,
      sp500_start_level: first.sp500_level !== null ? Number(first.sp500_level) : null,
      sp500_end_level: last.sp500_level !== null ? Number(last.sp500_level) : null,
      vix_avg: vixN > 0 ? round(vixSum / vixN, 1) : null,
    });
  }

  // --- Per-admin annual GDP stats (year assigned by July 1) ---
  const gdpByAdmin = new Map<string, { gdpSum: number; gdpN: number; yearsInData: number; recessionYears: number; deficitSum: number; deficitN: number; debtAddedSum: number; debtAddedN: number }>();
  for (const row of annualRaw) {
    const y = Number(row.year);
    const midYear = utcDate(y, 7, 1);
    const idx = tagAdmin(midYear, admins);
    if (idx === null) continue;
    const pres = admins[idx].president;
    const e = gdpByAdmin.get(pres) || { gdpSum: 0, gdpN: 0, yearsInData: 0, recessionYears: 0, deficitSum: 0, deficitN: 0, debtAddedSum: 0, debtAddedN: 0 };
    if (row.gdp_growth !== null) { e.gdpSum += Number(row.gdp_growth); e.gdpN++; }
    e.yearsInData++;
    if (Number(row.recession) === 1) e.recessionYears++;
    if (row.deficit_pct_gdp !== null) { e.deficitSum += Number(row.deficit_pct_gdp); e.deficitN++; }
    if (row.debt_added_trillion !== null) { e.debtAddedSum += Number(row.debt_added_trillion); e.debtAddedN++; }
    gdpByAdmin.set(pres, e);
  }

  // --- Per-admin fiscal (debt) stats from quarterly ---
  const fiscalByAdmin = new Map<string, { debtStart: number; debtEnd: number; pctStart: number; pctEnd: number }>();
  if (fiscalQ.length > 0) {
    const sortedFQ = [...fiscalQ].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
    const fqGrouped = new Map<string, CsvRow[]>();
    for (const r of sortedFQ) {
      if (r.date === null) continue;
      const d = parseDate(String(r.date));
      const midQ = new Date(d.getTime() + 45 * 86400000);
      const idx = tagAdmin(midQ, admins);
      if (idx === null) continue;
      const pres = admins[idx].president;
      if (!fqGrouped.has(pres)) fqGrouped.set(pres, []);
      fqGrouped.get(pres)!.push(r);
    }
    for (const [pres, rows] of fqGrouped) {
      const sorted = [...rows].sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      fiscalByAdmin.set(pres, {
        debtStart: Number(first.debt_trillion ?? 0),
        debtEnd: Number(last.debt_trillion ?? 0),
        pctStart: Number(first.debt_pct_gdp ?? 0),
        pctEnd: Number(last.debt_pct_gdp ?? 0),
      });
    }
  }

  // --- Assemble admin_summary ---
  const summaryRows: CsvRow[] = [];
  for (const a of admins) {
    const ms = monthlyStatsMap.get(a.president);
    const gdp = gdpByAdmin.get(a.president);
    const fiscal = fiscalByAdmin.get(a.president);

    const sp500Start = ms?.sp500_start_level ?? null;
    const sp500End = ms?.sp500_end_level ?? null;
    const windowFirst = ms?.window_first ?? null;
    const windowLast = ms?.window_last ?? null;

    let yearsSpan = 1 / 12;
    if (windowFirst && windowLast) {
      const d1 = parseDate(windowFirst);
      const d2 = parseDate(windowLast);
      yearsSpan = Math.max((d2.getTime() - d1.getTime()) / (365.25 * 86400000), 1 / 12);
    }

    const sp500TotalReturn = (sp500Start && sp500End) ? round(100 * (sp500End / sp500Start - 1), 1) : null;
    const sp500AnnReturn = (sp500Start && sp500End && yearsSpan > 0)
      ? round(100 * (Math.pow(sp500End / sp500Start, 1 / yearsSpan) - 1), 1) : null;

    summaryRows.push({
      president: a.president,
      party: a.party,
      start_date: formatDate(a.start_date),
      end_date: a.end_date ? formatDate(a.end_date) : null,
      ongoing: a.ongoing ? 'TRUE' : 'FALSE',
      window_first: windowFirst,
      window_last: windowLast,
      months: ms?.months ?? null,
      unemployment_start: ms?.unemployment_start ?? null,
      unemployment_end: ms?.unemployment_end ?? null,
      unemployment_change: ms?.unemployment_change ?? null,
      cpi_avg: ms?.cpi_avg ?? null,
      fed_funds_start: ms?.fed_funds_start ?? null,
      fed_funds_end: ms?.fed_funds_end ?? null,
      fed_funds_change: ms?.fed_funds_change ?? null,
      ten_year_avg: ms?.ten_year_avg ?? null,
      sp500_start_level: sp500Start,
      sp500_end_level: sp500End,
      vix_avg: ms?.vix_avg ?? null,
      years: round(yearsSpan, 4),
      sp500_total_return: sp500TotalReturn,
      sp500_annualized_return: sp500AnnReturn,
      gdp_growth_avg: gdp ? round(gdp.gdpSum / gdp.gdpN, 2) : null,
      years_in_data: gdp?.yearsInData ?? null,
      recession_years: gdp?.recessionYears ?? null,
      avg_deficit_pct_gdp: gdp && gdp.deficitN > 0 ? round(gdp.deficitSum / gdp.deficitN, 2) : null,
      avg_annual_debt_added_trillion: gdp && gdp.debtAddedN > 0 ? round(gdp.debtAddedSum / gdp.debtAddedN, 3) : null,
      debt_start_trillion: fiscal ? round(fiscal.debtStart, 3) : null,
      debt_end_trillion: fiscal ? round(fiscal.debtEnd, 3) : null,
      debt_added_trillion: fiscal ? round(fiscal.debtEnd - fiscal.debtStart, 3) : null,
      debt_pct_gdp_start: fiscal ? round(fiscal.pctStart, 1) : null,
      debt_pct_gdp_end: fiscal ? round(fiscal.pctEnd, 1) : null,
      debt_pct_gdp_change: fiscal ? round(fiscal.pctEnd - fiscal.pctStart, 1) : null,
    });
  }

  const summaryCols = [
    'president', 'party', 'start_date', 'end_date', 'ongoing',
    'window_first', 'window_last', 'months',
    'unemployment_start', 'unemployment_end', 'unemployment_change',
    'cpi_avg', 'fed_funds_start', 'fed_funds_end', 'fed_funds_change',
    'ten_year_avg', 'sp500_start_level', 'sp500_end_level', 'vix_avg',
    'years', 'sp500_total_return', 'sp500_annualized_return',
    'gdp_growth_avg', 'years_in_data', 'recession_years',
    'avg_deficit_pct_gdp', 'avg_annual_debt_added_trillion',
    'debt_start_trillion', 'debt_end_trillion', 'debt_added_trillion',
    'debt_pct_gdp_start', 'debt_pct_gdp_end', 'debt_pct_gdp_change',
  ];
  writeCsv(join(outDir, 'admin_summary.csv'), summaryRows, summaryCols);

  log('presidential', `wrote 3 CSVs (${summaryRows.length} admin rows) to ${outDir}`);
}
