import { Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { invAdd } from '../inventory';
import { createPlayer } from '../player';
import {
  SAVE_KEY,
  buildSave,
  clearSave,
  hasSave,
  readSave,
  sanitizeSavedPlayer,
  validateSave,
  writeSave,
} from '../persistence';
import type { BlastSave, FurnaceSave, SaveData } from '../persistence';

function freshStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, v); },
  };
}

const emptyFurnace = (): FurnaceSave => ({
  ore: null, fuel: null, result: null, progress: 0, smelting: false,
});
const emptyBlast = (): BlastSave => ({
  alloy: null, iron: null, fuel: null, result: null, progress: 0, smelting: false,
});

describe('persistence', () => {
  afterEach(() => { localStorage.clear(); });

  it('buildSave captures player, mods, furnace, blast, and worldTime', () => {
    const player = createPlayer();
    player.pos = new Vector3(3, 50, -5);
    player.yaw = 1.2;
    player.health = 15;
    invAdd(player, 'coal', 7);
    const mods = new Map([['1,2,3', 4], ['5,6,7', 11]]);
    const furnace: FurnaceSave = { ore: 'iron_raw', fuel: 'coal', result: null, progress: 0.3, smelting: true };
    const blast: BlastSave = { alloy: 'ada_alloy', iron: 'iron_ingot', fuel: 'coal', result: null, progress: 0.1, smelting: true };

    const data = buildSave(player, mods, furnace, blast, 0.42);

    expect(data.version).toBe(2);
    expect(data.player.pos).toEqual([3, 50, -5]);
    expect(data.player.yaw).toBe(1.2);
    expect(data.player.health).toBe(15);
    expect(data.player.hotbar[0]).toEqual({ id: 'coal', qty: 7, block: false });
    expect(data.mods).toEqual([['1,2,3', 4], ['5,6,7', 11]]);
    expect(data.furnace).toEqual(furnace);
    expect(data.blast).toEqual(blast);
    expect(data.worldTime).toBe(0.42);
  });

  it('write + read roundtrip preserves data', () => {
    const storage = freshStorage();
    const player = createPlayer();
    invAdd(player, 2, 5, true);
    const data = buildSave(player, new Map([['a', 1]]), emptyFurnace(), emptyBlast(), 0.25);

    writeSave(data, storage);
    const read = readSave(storage);

    expect(read).not.toBeNull();
    expect(read!.player.inv).toEqual(data.player.inv);
    expect(read!.player.hotbar).toEqual(data.player.hotbar);
    expect(read!.mods).toEqual([['a', 1]]);
    expect(read!.blast).toEqual(emptyBlast());
  });

  it('hasSave reflects presence of valid data', () => {
    const storage = freshStorage();
    expect(hasSave(storage)).toBe(false);
    writeSave(buildSave(createPlayer(), new Map(), emptyFurnace(), emptyBlast(), 0), storage);
    expect(hasSave(storage)).toBe(true);
  });

  it('readSave returns null for missing or corrupt data', () => {
    const storage = freshStorage();
    expect(readSave(storage)).toBeNull();
    storage.setItem(SAVE_KEY, '{not valid json');
    expect(readSave(storage)).toBeNull();
  });

  it('readSave rejects mismatched version', () => {
    const storage = freshStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1 }));
    expect(readSave(storage)).toBeNull();
  });

  it('clearSave removes the saved entry', () => {
    const storage = freshStorage();
    writeSave(buildSave(createPlayer(), new Map(), emptyFurnace(), emptyBlast(), 0), storage);
    expect(hasSave(storage)).toBe(true);
    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
  });
});

describe('validateSave', () => {
  function goodSave(): SaveData {
    return buildSave(createPlayer(), new Map(), emptyFurnace(), emptyBlast(), 0.25);
  }

  it('accepts a freshly built save', () => {
    expect(validateSave(goodSave())).toBe(true);
  });

  it('rejects null and primitives', () => {
    expect(validateSave(null)).toBe(false);
    expect(validateSave(42)).toBe(false);
    expect(validateSave('save')).toBe(false);
  });

  it('rejects wrong version', () => {
    const s = goodSave() as unknown as { version: number };
    s.version = 1;
    expect(validateSave(s)).toBe(false);
  });

  it('rejects truncated hotbar/inv', () => {
    const s = goodSave();
    s.player.hotbar = s.player.hotbar.slice(0, 3);
    expect(validateSave(s)).toBe(false);
    const s2 = goodSave();
    s2.player.inv = [];
    expect(validateSave(s2)).toBe(false);
  });

  it('rejects missing armor slots', () => {
    const s = goodSave();
    delete (s.player.armor as Partial<typeof s.player.armor>).boots;
    expect(validateSave(s)).toBe(false);
  });

  it('rejects missing furnace block', () => {
    const s = goodSave() as unknown as Record<string, unknown>;
    delete s.furnace;
    expect(validateSave(s)).toBe(false);
  });

  it('rejects missing blast block', () => {
    const s = goodSave() as unknown as Record<string, unknown>;
    delete s.blast;
    expect(validateSave(s)).toBe(false);
  });
});

describe('sanitizeSavedPlayer', () => {
  it('keeps known item ids unchanged', () => {
    const player = createPlayer();
    invAdd(player, 'coal', 5);
    invAdd(player, 2, 10, true);
    const data = buildSave(player, new Map(), emptyFurnace(), emptyBlast(), 0);
    const cleaned = sanitizeSavedPlayer(data.player);
    expect(cleaned.hotbar[0]).toEqual({ id: 'coal', qty: 5, block: false });
    expect(cleaned.hotbar[1]).toEqual({ id: 2, qty: 10, block: true });
  });

  it('drops slots whose item id no longer resolves', () => {
    // Simulate a save written under a previous schema where we had a
    // 'mythril_ingot' item that has since been renamed/removed.
    const data = buildSave(createPlayer(), new Map(), emptyFurnace(), emptyBlast(), 0);
    data.player.hotbar[0] = { id: 'mythril_ingot', qty: 3, block: false };
    data.player.hotbar[1] = { id: 'coal', qty: 1, block: false };
    data.player.armor.helmet = { id: 'mythril_helm', qty: 1, block: false };

    const cleaned = sanitizeSavedPlayer(data.player);
    expect(cleaned.hotbar[0]).toBeNull();
    expect(cleaned.hotbar[1]).toEqual({ id: 'coal', qty: 1, block: false });
    expect(cleaned.armor.helmet).toBeNull();
  });

  it('drops blocks whose id is not in BD', () => {
    const data = buildSave(createPlayer(), new Map(), emptyFurnace(), emptyBlast(), 0);
    data.player.inv[0] = { id: 99, qty: 1, block: true };
    const cleaned = sanitizeSavedPlayer(data.player);
    expect(cleaned.inv[0]).toBeNull();
  });
});
