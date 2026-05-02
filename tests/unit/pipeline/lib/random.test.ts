import { describe, test, expect } from 'bun:test';
import { createRng, normalRng, createNormalGenerator } from '../../../../pipeline/lib/random';

describe('createRng', () => {
  test('same seed produces same sequence', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  test('different seeds produce different sequences', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(99);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  test('produces values in [0, 1)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('normalRng', () => {
  test('produces mean close to 0 over 10000 samples', () => {
    const rng = createRng(42);
    const norm = normalRng(rng);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) sum += norm();
    const mean = sum / n;
    expect(Math.abs(mean)).toBeLessThan(0.1);
  });

  test('produces stddev close to 1 over 10000 samples', () => {
    const rng = createRng(42);
    const norm = normalRng(rng);
    const n = 10000;
    const vals: number[] = [];
    for (let i = 0; i < n; i++) vals.push(norm());
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stddev = Math.sqrt(variance);
    expect(Math.abs(stddev - 1)).toBeLessThan(0.2);
  });
});

describe('createNormalGenerator', () => {
  test('is deterministic with same seed', () => {
    const gen1 = createNormalGenerator(42);
    const gen2 = createNormalGenerator(42);
    const seq1 = Array.from({ length: 20 }, () => gen1());
    const seq2 = Array.from({ length: 20 }, () => gen2());
    expect(seq1).toEqual(seq2);
  });

  test('respects mean and sd parameters', () => {
    const gen = createNormalGenerator(42);
    const n = 10000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += gen(100, 5);
    const mean = sum / n;
    expect(Math.abs(mean - 100)).toBeLessThan(1);
  });
});
