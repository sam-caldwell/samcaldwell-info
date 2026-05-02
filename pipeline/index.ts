#!/usr/bin/env bun
/**
 * Data pipeline dispatcher — replaces R/generate_data.R
 *
 * Execution order matches the R pipeline exactly.
 * Every fetcher is wrapped in try/catch — a single API failure
 * warns and continues with the prior cache.
 *
 * Usage: bun run pipeline/index.ts
 */

// Fetchers
import { fetchFred } from './fetch/fred.js';
import { fetchEia } from './fetch/eia.js';
import { fetchGdelt } from './fetch/gdelt.js';
import { fetchMediacloud } from './fetch/mediacloud.js';
import { fetchAllThreats } from './fetch/threats.js';
import { geolocateIps } from './fetch/geolocation.js';
import { fetchAllCves } from './fetch/cves.js';
import { fetchBls } from './fetch/bls.js';
import { fetchBea } from './fetch/bea.js';

// Builders
import { buildEconomy } from './build/economy.js';
import { buildSynthetic } from './build/synthetic.js';
import { buildPresidential } from './build/presidential.js';
import { buildSentiment } from './build/sentiment.js';
import { buildNetwork } from './build/network.js';
import { buildEnergy } from './build/energy.js';
import { buildCybersecurity } from './build/cybersecurity.js';
import { buildCves } from './build/cves.js';
import { buildWestTexas } from './build/west-texas.js';

// Utilities
import { readCsv } from './lib/csv.js';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

function info(msg: string) { console.log(`\n=== ${msg} ===`); }
function fail(section: string, err: unknown) {
  console.warn(`[${section}] WARNING: ${err instanceof Error ? err.message : String(err)}`);
}

/** Collect unique IPs from all threat snapshots for geolocation */
function collectThreatIps(): string[] {
  const cacheDir = 'data/cybersecurity/cache';
  if (!existsSync(cacheDir)) return [];
  const ips = new Set<string>();

  // FeodoTracker JSON snapshots
  for (const f of readdirSync(cacheDir).filter(f => f.startsWith('feodo_') && f.endsWith('.json'))) {
    try {
      const data = JSON.parse(require('fs').readFileSync(join(cacheDir, f), 'utf-8'));
      if (Array.isArray(data)) {
        for (const entry of data) {
          if (entry.ip_address) ips.add(entry.ip_address);
        }
      }
    } catch { /* skip corrupt files */ }
  }

  // ThreatFox CSV snapshots
  for (const f of readdirSync(cacheDir).filter(f => f.startsWith('threatfox_') && f.endsWith('.csv'))) {
    try {
      const lines = require('fs').readFileSync(join(cacheDir, f), 'utf-8').split('\n');
      for (const line of lines) {
        if (line.startsWith('#') || line.trim() === '') continue;
        const parts = line.split(',');
        if (parts.length >= 3) {
          // ioc_value is column index 2, may contain "ip:port"
          const ioc = (parts[2] || '').replace(/"/g, '').trim();
          const ip = ioc.split(':')[0];
          if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) ips.add(ip);
        }
      }
    } catch { /* skip corrupt files */ }
  }

  return [...ips];
}

async function main() {
  const start = Date.now();
  console.log(`Data pipeline started at ${new Date().toISOString()}`);

  // ── 1. Economy data ──────────────────────────────────────────────
  info('Economy');
  if (process.env.FRED_API_KEY) {
    try {
      await fetchFred();
      await buildEconomy();
    } catch (e) { fail('economy', e); }
  } else {
    console.log('[economy] No FRED_API_KEY — using synthetic fallback');
    try { await buildSynthetic(); } catch (e) { fail('synthetic', e); }
  }

  // ── 2. Presidential comparisons ──────────────────────────────────
  info('Presidential');
  try { await buildPresidential(); } catch (e) { fail('presidential', e); }

  // ── 3. Sentiment data ────────────────────────────────────────────
  info('Sentiment');
  try { await fetchGdelt(); } catch (e) { fail('gdelt', e); }
  try { await fetchMediacloud(); } catch (e) { fail('mediacloud', e); }
  try { await buildSentiment(); } catch (e) { fail('sentiment', e); }
  try { await buildNetwork(); } catch (e) { fail('network', e); }

  // ── 4. Energy data ───────────────────────────────────────────────
  info('Energy');
  try { await fetchEia(); } catch (e) { fail('eia', e); }
  try { await buildEnergy(); } catch (e) { fail('energy', e); }

  // ── 5. West Texas regional ───────────────────────────────────────
  info('West Texas');
  try { await fetchBls(); } catch (e) { fail('bls', e); }
  try { await fetchBea(); } catch (e) { fail('bea', e); }
  try { await buildWestTexas(); } catch (e) { fail('west-texas', e); }

  // ── 6. Cybersecurity ─────────────────────────────────────────────
  info('Cybersecurity');
  try { await fetchAllThreats(); } catch (e) { fail('threats', e); }
  try {
    const ips = collectThreatIps();
    if (ips.length > 0) await geolocateIps(ips);
  } catch (e) { fail('geolocation', e); }
  try { await buildCybersecurity(); } catch (e) { fail('cybersecurity', e); }
  try { await fetchAllCves(); } catch (e) { fail('cves-fetch', e); }
  try { await buildCves(); } catch (e) { fail('cves-build', e); }

  // ── Done ─────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nData pipeline completed in ${elapsed}s`);
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
