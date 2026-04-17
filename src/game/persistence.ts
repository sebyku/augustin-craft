import type { InvSlot } from './inventory';
import type { ArmorSlot, Player } from './player';

export const SAVE_KEY = 'augustin-craft:save:v1';

export interface FurnaceSave {
  ore: number | null;
  fuel: string | null;
  result: string | null;
  progress: number;
  smelting: boolean;
  selectedOre: number;
}

export interface SaveData {
  version: 1;
  savedAt: number;
  player: {
    pos: [number, number, number];
    yaw: number;
    pitch: number;
    health: number;
    food: number;
    hotbar: (InvSlot | null)[];
    inv: (InvSlot | null)[];
    armor: Record<ArmorSlot, InvSlot | null>;
    sel: number;
  };
  mods: [string, number][];
  furnace: FurnaceSave;
  worldTime: number;
}

export function buildSave(
  player: Player,
  mods: Map<string, number>,
  furnace: FurnaceSave,
  worldTime: number,
): SaveData {
  return {
    version: 1,
    savedAt: Date.now(),
    player: {
      pos: [player.pos.x, player.pos.y, player.pos.z],
      yaw: player.yaw,
      pitch: player.pitch,
      health: player.health,
      food: player.food,
      hotbar: player.hotbar,
      inv: player.inv,
      armor: player.armor,
      sel: player.sel,
    },
    mods: [...mods.entries()],
    furnace: { ...furnace },
    worldTime,
  };
}

export function writeSave(data: SaveData, storage: Storage = localStorage): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // Quota errors or storage disabled — silent: saving is best-effort.
    void e;
  }
}

export function readSave(storage: Storage = localStorage): SaveData | null {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSave(storage: Storage = localStorage): boolean {
  return readSave(storage) !== null;
}

export function clearSave(storage: Storage = localStorage): void {
  storage.removeItem(SAVE_KEY);
}