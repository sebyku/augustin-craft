import { afterEach, describe, expect, it } from 'vitest';
import { WH } from '../constants';
import { getBiome, getHeight, resetWorld, wGet, wSet } from '../world-gen';

describe('world generation', () => {
  afterEach(() => { resetWorld(); });

  it('returns bedrock below y=0', () => {
    expect(wGet(0, -1, 0)).toBe(13);
  });

  it('returns air above WH', () => {
    expect(wGet(0, WH + 5, 0)).toBe(0);
  });

  it('wSet / wGet roundtrip', () => {
    wSet(100, 10, 100, 6);
    expect(wGet(100, 10, 100)).toBe(6);
  });

  it('getHeight is deterministic and within valid range', () => {
    const a = getHeight(13, 17);
    const b = getHeight(13, 17);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(2);
    expect(a).toBeLessThanOrEqual(WH - 8);
  });

  it('getBiome returns one of desert/plain/ice', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(getBiome(i * 13, i * 7));
    for (const b of seen) expect(['desert', 'plain', 'ice']).toContain(b);
  });

  it('surface block is non-air for most columns', () => {
    let hits = 0;
    for (let i = 0; i < 20; i++) {
      const h = getHeight(i, i);
      if (wGet(i, h, i) !== 0) hits++;
    }
    expect(hits).toBeGreaterThan(10);
  });
});