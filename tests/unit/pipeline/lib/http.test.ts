import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

// We test httpGet/httpPost by replacing globalThis.fetch.
// To handle Bun versions where fetch may be sealed, we use
// Object.defineProperty with configurable:true as a fallback.
const originalFetch = globalThis.fetch;

function installMockFetch(handler: (url: string | URL | Request, init?: RequestInit) => Promise<Response>) {
  try {
    globalThis.fetch = handler as typeof globalThis.fetch;
  } catch {
    Object.defineProperty(globalThis, 'fetch', {
      value: handler,
      writable: true,
      configurable: true,
    });
  }
}

function restoreFetch() {
  try {
    globalThis.fetch = originalFetch;
  } catch {
    Object.defineProperty(globalThis, 'fetch', {
      value: originalFetch,
      writable: true,
      configurable: true,
    });
  }
}

// Import AFTER defining helpers (the module reads fetch at call time, not import time)
import { httpGet, httpGetJson, httpPost } from '../../../../pipeline/lib/http';

afterEach(() => restoreFetch());

describe('httpGet', () => {
  test('returns response on success', async () => {
    installMockFetch(async () => new Response('ok', { status: 200 }));
    const resp = await httpGet('https://example.com/data', { retries: 1 });
    expect(resp.ok).toBe(true);
    expect(resp.status).toBe(200);
  });

  test('retries on 500', async () => {
    let attempts = 0;
    installMockFetch(async () => {
      attempts++;
      if (attempts < 3) throw new Error('HTTP 500 Internal Server Error');
      return new Response('ok', { status: 200 });
    });
    const resp = await httpGet('https://example.com/data', { retries: 3, backoffMs: 10 });
    expect(resp.ok).toBe(true);
    expect(attempts).toBe(3);
  });

  test('does NOT retry on 4xx', async () => {
    let attempts = 0;
    installMockFetch(async () => {
      attempts++;
      return new Response('not found', { status: 404 });
    });
    const resp = await httpGet('https://example.com/data', { retries: 3, backoffMs: 10 });
    expect(resp.status).toBe(404);
    expect(attempts).toBe(1);
  });

  test('throws after exhausting retries', async () => {
    installMockFetch(async () => { throw new Error('network error'); });
    try {
      await httpGet('https://example.com/data', { retries: 2, backoffMs: 10 });
      expect(true).toBe(false); // should not reach
    } catch (e: any) {
      expect(e.message).toBe('network error');
    }
  });
});

describe('httpGetJson', () => {
  test('parses JSON response', async () => {
    installMockFetch(async () => new Response(JSON.stringify({ value: 42 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const data = await httpGetJson<{ value: number }>('https://example.com/api');
    expect(data.value).toBe(42);
  });

  test('throws on non-ok response', async () => {
    installMockFetch(async () => new Response('bad', { status: 403 }));
    try {
      await httpGetJson('https://example.com/api', { retries: 1 });
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain('403');
    }
  });
});

describe('httpPost', () => {
  test('sends JSON body', async () => {
    let capturedBody: string | undefined;
    installMockFetch(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response('ok', { status: 200 });
    });
    const resp = await httpPost('https://example.com/api', { key: 'value' }, { retries: 1 });
    expect(resp.ok).toBe(true);
    expect(capturedBody).toBe(JSON.stringify({ key: 'value' }));
  });

  test('does not retry on 4xx', async () => {
    let attempts = 0;
    installMockFetch(async () => {
      attempts++;
      return new Response('bad request', { status: 400 });
    });
    const resp = await httpPost('https://example.com/api', {}, { retries: 3, backoffMs: 10 });
    expect(resp.status).toBe(400);
    expect(attempts).toBe(1);
  });
});

describe('safeUrl redaction', () => {
  test('redacts query parameters in error', async () => {
    installMockFetch(async () => new Response('forbidden', { status: 403 }));
    try {
      await httpGetJson('https://api.example.com/data?api_key=SECRET&format=json', { retries: 1 });
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain('[REDACTED]');
      expect(e.message).not.toContain('SECRET');
    }
  });
});
