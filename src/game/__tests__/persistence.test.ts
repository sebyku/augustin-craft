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
  writeSave,
} from '../persistence';

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

describe('persistence', () => {
  afterEach(() => { localStorage.clear(); });

  it('buildSave captures player, mods, furnace, and worldTime', () => {
    const player = createPlayer();
    player.pos = new Vector3(3, 50, -5);
    player.yaw = 1.2;
    player.health = 15;
    invAdd(player, 'coal', 7);
    const mods = new Map([['1,2,3', 4], ['5,6,7', 11]]);
    const furnace = { ore: 9, fuel: 'coal', result: null, progress: 0.3, smelting: true, selectedOre: 9 };

    const data = buildSave(player, mods, furnace, 0.42);

    expect(data.version).toBe(1);
    expect(data.player.pos).toEqual([3, 50, -5]);
    expect(data.player.yaw).toBe(1.2);
    expect(data.player.health).toBe(15);
    expect(data.player.hotbar[0]).toEqual({ id: 'coal', qty: 7, block: false });
    expect(data.mods).toEqual([['1,2,3', 4], ['5,6,7', 11]]);
    expect(data.furnace).toEqual(furnace);
    expect(data.worldTime).toBe(0.42);
  });

  it('write + read roundtrip preserves data', () => {
    const storage = freshStorage();
    const player = createPlayer();
    invAdd(player, 2, 5, true);
    const data = buildSave(player, new Map([['a', 1]]), {
      ore: null, fuel: null, result: null, progress: 0, smelting: false, selectedOre: 9,
    }, 0.25);

    writeSave(data, storage);
    const read = readSave(storage);

    expect(read).not.toBeNull();
    expect(read!.player.inv).toEqual(data.player.inv);
    expect(read!.player.hotbar).toEqual(data.player.hotbar);
    expect(read!.mods).toEqual([['a', 1]]);
  });

  it('hasSave reflects presence of valid data', () => {
    const storage = freshStorage();
    expect(hasSave(storage)).toBe(false);
    writeSave(buildSave(createPlayer(), new Map(), {
      ore: null, fuel: null, result: null, progress: 0, smelting: false, selectedOre: 9,
    }, 0), storage);
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
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 999 }));
    expect(readSave(storage)).toBeNull();
  });

  it('clearSave removes the saved entry', () => {
    const storage = freshStorage();
    writeSave(buildSave(createPlayer(), new Map(), {
      ore: null, fuel: null, result: null, progress: 0, smelting: false, selectedOre: 9,
    }, 0), storage);
    expect(hasSave(storage)).toBe(true);
    clearSave(storage);
    expect(hasSave(storage)).toBe(false);
  });
});