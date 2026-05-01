/**
 * Module-level data cache.
 *
 * Fetches CSVs once and caches results at the module level.
 * Components read from the cache synchronously during render.
 * When data arrives, we trigger a root re-render via a global callback.
 *
 * This avoids depending on useState/useEffect for data loading,
 * sidestepping the reconciler re-mount issue.
 */

import { parseCsv } from './csv.js';

const cache = new Map<string, unknown[]>();
const pending = new Set<string>();

/** Global re-render trigger — set by main.ts */
let rerender: (() => void) | null = null;

export function setRerenderCallback(fn: () => void) {
  rerender = fn;
}

async function fetchAndCache(path: string): Promise<void> {
  try {
    const resp = await fetch(path);
    if (!resp.ok) {
      console.warn(`data-cache: ${path} returned ${resp.status}`);
      cache.set(path, []);
    } else {
      const text = await resp.text();
      cache.set(path, parseCsv<unknown>(text));
    }
  } catch (err) {
    console.warn(`data-cache: failed to fetch ${path}`, err);
    cache.set(path, []);
  }
  pending.delete(path);
  if (rerender) rerender();
}

async function fetchJsonAndCache(path: string): Promise<void> {
  try {
    const resp = await fetch(path);
    if (!resp.ok) {
      cache.set(path, []);
    } else {
      cache.set(path, [await resp.json()]);
    }
  } catch {
    cache.set(path, []);
  }
  pending.delete(path);
  if (rerender) rerender();
}

/**
 * Get CSV data synchronously. Returns null if not yet loaded.
 * Kicks off fetch on first call.
 */
export function getCsv<T>(path: string): T[] | null {
  if (cache.has(path)) return cache.get(path) as T[];
  if (!pending.has(path)) {
    pending.add(path);
    fetchAndCache(path);
  }
  return null;
}

/**
 * Get JSON data synchronously. Returns null if not yet loaded.
 */
export function getJson<T>(path: string): T | null {
  if (cache.has(path)) {
    const arr = cache.get(path) as unknown[];
    return arr.length > 0 ? arr[0] as T : null;
  }
  if (!pending.has(path)) {
    pending.add(path);
    fetchJsonAndCache(path);
  }
  return null;
}
