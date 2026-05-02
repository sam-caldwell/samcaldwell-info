/**
 * HTTP client with retry, timeout, and rate limiting.
 *
 * Security note: All API endpoints use HTTPS except ip-api.com free tier
 * which requires HTTP. The geolocation fetcher attempts HTTPS first and
 * falls back to HTTP only for public threat-infrastructure IPs (not user PII).
 */

import { sleep } from './dates.js';

export interface HttpOptions {
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
  rateLimitMs?: number;
  headers?: Record<string, string>;
}

const lastRequestTime = new Map<string, number>();

function getDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

/** Strip query parameters from URLs to prevent logging API keys */
function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.search) return `${u.origin}${u.pathname}?[REDACTED]`;
    return url;
  } catch { return url; }
}

async function rateLimitWait(url: string, ms: number): Promise<void> {
  const domain = getDomain(url);
  const last = lastRequestTime.get(domain) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < ms) await sleep(ms - elapsed);
  lastRequestTime.set(domain, Date.now());
}

export async function httpGet(url: string, opts: HttpOptions = {}): Promise<Response> {
  const { retries = 3, backoffMs = 5000, timeoutMs = 60000, rateLimitMs, headers } = opts;
  if (rateLimitMs) await rateLimitWait(url, rateLimitMs);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'samcaldwell.info-research/1.0 (non-commercial)',
          ...headers,
        },
      });
      clearTimeout(timer);
      if (resp.ok) return resp;
      if (resp.status >= 400 && resp.status < 500) return resp; // Don't retry client errors
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    } catch (err: any) {
      if (attempt === retries) throw err;
      console.warn(`  [http] ${safeUrl(url)} attempt ${attempt}/${retries} failed: ${err.message}`);
      await sleep(backoffMs * attempt);
    }
  }
  throw new Error('Unreachable');
}

export async function httpGetJson<T>(url: string, opts: HttpOptions = {}): Promise<T> {
  const resp = await httpGet(url, opts);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${safeUrl(url)}`);
  return resp.json() as Promise<T>;
}

export async function httpGetText(url: string, opts: HttpOptions = {}): Promise<string> {
  const resp = await httpGet(url, opts);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${safeUrl(url)}`);
  return resp.text();
}

export async function httpPost(url: string, body: unknown, opts: HttpOptions = {}): Promise<Response> {
  const { retries = 3, backoffMs = 5000, timeoutMs = 60000, rateLimitMs, headers } = opts;
  if (rateLimitMs) await rateLimitWait(url, rateLimitMs);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'samcaldwell.info-research/1.0 (non-commercial)',
          ...headers,
        },
        body: JSON.stringify(body),
      });
      clearTimeout(timer);
      if (resp.ok) return resp;
      if (resp.status >= 400 && resp.status < 500) return resp;
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    } catch (err: any) {
      if (attempt === retries) throw err;
      console.warn(`  [http] POST ${safeUrl(url)} attempt ${attempt}/${retries} failed: ${err.message}`);
      await sleep(backoffMs * attempt);
    }
  }
  throw new Error('Unreachable');
}

export async function httpPostJson<T>(url: string, body: unknown, opts: HttpOptions = {}): Promise<T> {
  const resp = await httpPost(url, body, opts);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for POST ${safeUrl(url)}`);
  return resp.json() as Promise<T>;
}
