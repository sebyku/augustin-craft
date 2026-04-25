import { afterEach, describe, expect, it } from 'vitest';
import { CHUNK, WH } from '../constants';
import { chunks, ck, genChunk, getBiome, getHeight, mods, resetWorld, wGet, wSet } from '../world-gen';

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

  it('mods shadow the chunk array (the load-bearing persistence invariant)', () => {
    // Generate a chunk, read a known block, then wSet over it. wGet must
    // return the modded value even though the underlying Uint8Array still
    // holds the original generated id. This is what lets us persist player
    // edits without rewriting chunk arrays.
    const cx = 5, cz = 5;
    const k = ck(cx, cz);
    chunks.set(k, genChunk(cx, cz));

    const wx = cx * CHUNK + 3, wz = cz * CHUNK + 3;
    const h = getHeight(wx, wz);
    const original = wGet(wx, h, wz);
    expect(original).not.toBe(0); // surface block is solid

    wSet(wx, h, wz, 0); // dig out the surface
    expect(wGet(wx, h, wz)).toBe(0);

    // The chunk array itself is untouched.
    const arr = chunks.get(k)!;
    const lx = ((wx % CHUNK) + CHUNK) % CHUNK;
    const lz = ((wz % CHUNK) + CHUNK) % CHUNK;
    expect(arr[lx * WH * CHUNK + h * CHUNK + lz]).toBe(original);

    // Clearing mods restores the generated value.
    mods.clear();
    expect(wGet(wx, h, wz)).toBe(original);
  });
});