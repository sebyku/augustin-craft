import { BD } from './blocks';
import type { InvSlot } from './inventory';
import { IINFO } from './items';
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

// Structural validation. We only check shape, not content — content
// (unknown ids, etc.) is handled by sanitizeSavedPlayer below.
export function validateSave(s: unknown): s is SaveData {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (typeof o.savedAt !== 'number') return false;
  if (typeof o.worldTime !== 'number') return false;
  if (!Array.isArray(o.mods)) return false;
  if (!o.player || typeof o.player !== 'object') return false;
  const p = o.player as Record<string, unknown>;
  if (!Array.isArray(p.pos) || p.pos.length !== 3) return false;
  if (!Array.isArray(p.hotbar) || p.hotbar.length !== 9) return false;
  if (!Array.isArray(p.inv) || p.inv.length !== 36) return false;
  if (!p.armor || typeof p.armor !== 'object') return false;
  const armor = p.armor as Record<string, unknown>;
  for (const k of ['helmet', 'chest', 'legs', 'boots']) {
    if (!(k in armor)) return false;
  }
  if (typeof p.health !== 'number') return false;
  if (typeof p.food !== 'number') return false;
  if (typeof p.sel !== 'number') return false;
  if (typeof p.yaw !== 'number') return false;
  if (typeof p.pitch !== 'number') return false;
  if (!o.furnace || typeof o.furnace !== 'object') return false;
  return true;
}

function isKnownSlot(slot: InvSlot | null): boolean {
  if (!slot) return true;
  if (slot.block) return BD[slot.id as number] !== undefined;
  return IINFO[slot.id as string] !== undefined;
}

// Drop slots whose item id no longer resolves (recipe rename, item id
// removed). Returns a fresh player projection ready to assign onto the
// live player without leaking unknown ids into invAdd downstream.
export function sanitizeSavedPlayer(p: SaveData['player']): {
  hotbar: (InvSlot | null)[];
  inv: (InvSlot | null)[];
  armor: Record<ArmorSlot, InvSlot | null>;
} {
  const sanitizeArr = (arr: (InvSlot | null)[]): (InvSlot | null)[] =>
    arr.map((s) => (isKnownSlot(s) ? s : null));
  return {
    hotbar: sanitizeArr(p.hotbar),
    inv: sanitizeArr(p.inv),
    armor: {
      helmet: isKnownSlot(p.armor.helmet) ? p.armor.helmet : null,
      chest: isKnownSlot(p.armor.chest) ? p.armor.chest : null,
      legs: isKnownSlot(p.armor.legs) ? p.armor.legs : null,
      boots: isKnownSlot(p.armor.boots) ? p.armor.boots : null,
    },
  };
}