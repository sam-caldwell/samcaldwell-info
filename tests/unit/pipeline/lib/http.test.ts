/**
 * Tests for URL/log redaction used by the HTTP client and cache logger.
 *
 * Tests the exported redact() function directly — no global mocking needed.
 * HTTP retry/timeout behavior is covered by fetcher tests via mock.module().
 */
import { describe, test, expect } from 'bun:test';
import { redact } from '../../../../pipeline/lib/cache';

describe('redact', () => {
  test('redacts api_key query parameter', () => {
    const result = redact('https://api.example.com/data?api_key=SECRET123&format=json');
    expect(result).toContain('api_key=[REDACTED]');
    expect(result).not.toContain('SECRET123');
  });

  test('redacts UserID query parameter', () => {
    const result = redact('https://apps.bea.gov/api/data/?UserID=MYKEY123&method=GetData');
    expect(result).toContain('UserID=[REDACTED]');
    expect(result).not.toContain('MYKEY123');
  });

  test('redacts registrationkey parameter', () => {
    const result = redact('POST https://api.bls.gov/data/?registrationkey=BLSKEY456');
    expect(result).toContain('registrationkey=[REDACTED]');
    expect(result).not.toContain('BLSKEY456');
  });

  test('redacts Authorization Bearer header', () => {
    const result = redact('Request with Authorization: Bearer token123abc');
    expect(result).toContain('Authorization: [REDACTED]');
    expect(result).not.toContain('token123abc');
  });

  test('redacts Authorization Token header', () => {
    const result = redact('Header Authorization: Token mc_api_key_12345');
    expect(result).toContain('Authorization: [REDACTED]');
    expect(result).not.toContain('mc_api_key_12345');
  });

  test('passes through URLs without sensitive params', () => {
    const input = 'https://api.gdeltproject.org/api/v2/doc/doc?mode=timelinetone&format=json';
    expect(redact(input)).toBe(input);
  });

  test('redacts multiple params in one URL', () => {
    const result = redact('https://example.com?api_key=AAA&token=BBB&other=safe');
    expect(result).not.toContain('AAA');
    expect(result).not.toContain('BBB');
    expect(result).toContain('other=safe');
  });

  test('handles empty string', () => {
    expect(redact('')).toBe('');
  });
});
