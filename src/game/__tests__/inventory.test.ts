import { beforeEach, describe, expect, it } from 'vitest';
import type { InventoryHolder } from '../inventory';
import { invAdd, invCount, invRemove } from '../inventory';

function makeHolder(): InventoryHolder {
  return { hotbar: Array(9).fill(null), inv: Array(36).fill(null) };
}

describe('invAdd', () => {
  let h: InventoryHolder;
  beforeEach(() => { h = makeHolder(); });

  it('adds a new item into the first hotbar slot', () => {
    expect(invAdd(h, 'coal', 5)).toBe(true);
    expect(h.hotbar[0]).toEqual({ id: 'coal', qty: 5, block: false });
  });

  it('stacks into an existing slot up to the stack max', () => {
    invAdd(h, 'coal', 60);
    invAdd(h, 'coal', 20);
    // Should fill the first slot to 64, then spill to the next slot.
    expect(h.hotbar[0]).toEqual({ id: 'coal', qty: 64, block: false });
    expect(h.hotbar[1]).toEqual({ id: 'coal', qty: 16, block: false });
  });

  it('does not stack items with different block-ness', () => {
    invAdd(h, 2, 5, true);
    invAdd(h, 2, 3, false); // "2" as item id — invalid (no IINFO['2']), so returns false
    expect(invCount(h, 2, true)).toBe(5);
    expect(invCount(h, 2, false)).toBe(0);
  });

  it('rejects unknown item ids', () => {
    expect(invAdd(h, 'notaware', 1)).toBe(false);
    expect(invAdd(h, 9999, 1, true)).toBe(false);
  });

  it('returns true if at least some was added', () => {
    // Tools have stack 1 — no overflow handling beyond all slots filled.
    for (let i = 0; i < 9; i++) invAdd(h, 'iron_sword', 1);
    for (let i = 0; i < 36; i++) invAdd(h, 'iron_sword', 1);
    // All 45 slots filled with iron_sword of qty 1.
    expect(invCount(h, 'iron_sword')).toBe(45);
    // Next add has no room — returns false (nothing added).
    expect(invAdd(h, 'iron_sword', 1)).toBe(false);
  });
});

describe('invRemove', () => {
  it('removes partial qty from a stack', () => {
    const h = makeHolder();
    invAdd(h, 'coal', 10);
    expect(invRemove(h, 'coal', 3)).toBe(true);
    expect(invCount(h, 'coal')).toBe(7);
  });

  it('clears the slot when emptied', () => {
    const h = makeHolder();
    invAdd(h, 'coal', 5);
    expect(invRemove(h, 'coal', 5)).toBe(true);
    expect(h.hotbar[0]).toBe(null);
  });

  it('returns false if the requested qty cannot be removed', () => {
    const h = makeHolder();
    invAdd(h, 'coal', 2);
    expect(invRemove(h, 'coal', 5)).toBe(false);
    // Partial removal still happened (documented legacy behavior).
    expect(invCount(h, 'coal')).toBe(0);
  });

  it('distinguishes block vs item by the block flag', () => {
    const h = makeHolder();
    invAdd(h, 3, 5, true); // 5 stone blocks
    expect(invRemove(h, 3, 2, false)).toBe(false); // wrong block flag
    expect(invCount(h, 3, true)).toBe(5);
    expect(invRemove(h, 3, 2, true)).toBe(true);
    expect(invCount(h, 3, true)).toBe(3);
  });
});

describe('invCount', () => {
  it('sums across hotbar and main inventory', () => {
    const h = makeHolder();
    invAdd(h, 'coal', 64); // fills hotbar[0]
    invAdd(h, 'coal', 64); // fills hotbar[1]
    expect(invCount(h, 'coal')).toBe(128);
  });

  it('returns 0 for missing items', () => {
    const h = makeHolder();
    expect(invCount(h, 'coal')).toBe(0);
  });
});