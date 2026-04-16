import { describe, expect, it } from 'vitest';
import { _fade, _hash2, _lerp, fbm, vnoise, vnoise3 } from '../noise';

describe('noise primitives', () => {
  it('_hash2 is deterministic and in [0, 1)', () => {
    const a = _hash2(12, 34);
    const b = _hash2(12, 34);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
  });

  it('_hash2 produces varied output over a coarse range', () => {
    const seen = new Set<number>();
    // Sample a wide grid with primes to avoid the hash's x/z symmetry collisions.
    for (let i = 0; i < 100; i++) seen.add(_hash2(i * 13, i * 29));
    expect(seen.size).toBeGreaterThan(80);
  });

  it('_lerp interpolates correctly', () => {
    expect(_lerp(0, 10, 0)).toBe(0);
    expect(_lerp(0, 10, 1)).toBe(10);
    expect(_lerp(0, 10, 0.5)).toBe(5);
  });

  it('_fade is smoothstep (0 at 0, 1 at 1)', () => {
    expect(_fade(0)).toBe(0);
    expect(_fade(1)).toBe(1);
    expect(_fade(0.5)).toBeCloseTo(0.5, 5);
  });
});

describe('vnoise', () => {
  it('is deterministic', () => {
    expect(vnoise(3.14, 2.71)).toBe(vnoise(3.14, 2.71));
  });

  it('returns values in [0, 1]', () => {
    for (let i = 0; i < 50; i++) {
      const v = vnoise(i * 0.37, i * 0.91);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is continuous (close inputs -> close outputs)', () => {
    const a = vnoise(5, 5);
    const b = vnoise(5.001, 5.001);
    expect(Math.abs(a - b)).toBeLessThan(0.05);
  });
});

describe('fbm', () => {
  it('is deterministic', () => {
    expect(fbm(1, 2, 4, 0.1, 7)).toBe(fbm(1, 2, 4, 0.1, 7));
  });

  it('different seeds produce different values', () => {
    const a = fbm(3, 4, 4, 0.1, 1);
    const b = fbm(3, 4, 4, 0.1, 2);
    expect(a).not.toBe(b);
  });
});

describe('vnoise3', () => {
  it('is deterministic', () => {
    expect(vnoise3(1, 2, 3)).toBe(vnoise3(1, 2, 3));
  });

  it('varies along Y axis', () => {
    const a = vnoise3(1, 0, 1);
    const b = vnoise3(1, 5, 1);
    expect(a).not.toBe(b);
  });
});