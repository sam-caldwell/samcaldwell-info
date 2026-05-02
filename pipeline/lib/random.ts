/** Seeded PRNG — replaces R's set.seed + rnorm */

/** Mulberry32 — fast 32-bit seeded PRNG */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: returns a function that generates N(0,1) values */
export function normalRng(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const val = spare;
      spare = null;
      return val;
    }
    let u: number, v: number, s: number;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * mul;
    return u * mul;
  };
}

/** Convenience: rnorm(mean, sd) using a seeded PRNG */
export function createNormalGenerator(seed: number): (mean?: number, sd?: number) => number {
  const norm = normalRng(createRng(seed));
  return (mean = 0, sd = 1) => mean + norm() * sd;
}
