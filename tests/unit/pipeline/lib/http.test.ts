import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { httpGet, httpGetJson, httpPost } from '../../../../pipeline/lib/http';

// Save original fetch
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = handler as typeof globalThis.fetch;
}

describe('httpGet', () => {
  test('returns response on success', async () => {
    mockFetch(async () => new Response('ok', { status: 200 }));
    const resp = await httpGet('https://example.com/data', { retries: 1 });
    expect(resp.ok).toBe(true);
    expect(await resp.text()).toBe('ok');
  });

  test('retries on 500', async () => {
    let attempts = 0;
    mockFetch(async () => {
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
    mockFetch(async () => {
      attempts++;
      return new Response('not found', { status: 404 });
    });
    const resp = await httpGet('https://example.com/data', { retries: 3, backoffMs: 10 });
    expect(resp.status).toBe(404);
    expect(attempts).toBe(1);
  });

  test('throws after exhausting retries', async () => {
    mockFetch(async () => {
      throw new Error('network error');
    });
    await expect(
      httpGet('https://example.com/data', { retries: 2, backoffMs: 10 })
    ).rejects.toThrow('network error');
  });
});

describe('httpGetJson', () => {
  test('parses JSON response', async () => {
    mockFetch(async () => new Response(JSON.stringify({ value: 42 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    const data = await httpGetJson<{ value: number }>('https://example.com/api');
    expect(data.value).toBe(42);
  });

  test('throws on non-ok response', async () => {
    mockFetch(async () => new Response('bad', { status: 403 }));
    await expect(
      httpGetJson('https://example.com/api', { retries: 1 })
    ).rejects.toThrow('HTTP 403');
  });
});

describe('httpPost', () => {
  test('sends JSON body', async () => {
    let capturedBody: string | undefined;
    let capturedContentType: string | undefined;
    mockFetch(async (_url: string, init?: RequestInit) => {
      capturedBody = init?.body as string;
      capturedContentType = (init?.headers as Record<string, string>)?.['Content-Type'];
      return new Response('ok', { status: 200 });
    });
    const resp = await httpPost('https://example.com/api', { key: 'value' }, { retries: 1 });
    expect(resp.ok).toBe(true);
    expect(capturedBody).toBe(JSON.stringify({ key: 'value' }));
    expect(capturedContentType).toBe('application/json');
  });

  test('does not retry on 4xx', async () => {
    let attempts = 0;
    mockFetch(async () => {
      attempts++;
      return new Response('bad request', { status: 400 });
    });
    const resp = await httpPost('https://example.com/api', {}, { retries: 3, backoffMs: 10 });
    expect(resp.status).toBe(400);
    expect(attempts).toBe(1);
  });
});

describe('safeUrl (tested indirectly via error messages)', () => {
  test('redacts query parameters in error', async () => {
    mockFetch(async () => new Response('forbidden', { status: 403 }));
    try {
      await httpGetJson('https://api.example.com/data?api_key=SECRET&format=json', { retries: 1 });
    } catch (e: any) {
      expect(e.message).toContain('[REDACTED]');
      expect(e.message).not.toContain('SECRET');
    }
  });
});
