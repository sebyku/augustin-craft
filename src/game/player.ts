import { Vector3 } from 'three';
import type { InvSlot } from './inventory';

export type ArmorSlot = 'helmet' | 'chest' | 'legs' | 'boots';

export interface Player {
  pos: Vector3;
  vel: Vector3;
  yaw: number;
  pitch: number;
  onGround: boolean;
  health: number;
  maxHealth: number;
  food: number;
  maxFood: number;
  foodTimer: number;
  dead: boolean;
  lastDmg: number;
  hotbar: (InvSlot | null)[];
  inv: (InvSlot | null)[];
  armor: Record<ArmorSlot, InvSlot | null>;
  sel: number;
}

export function createPlayer(): Player {
  return {
    pos: new Vector3(8, 50, 8),
    vel: new Vector3(),
    yaw: 0,
    pitch: 0,
    onGround: false,
    health: 20,
    maxHealth: 20,
    food: 20,
    maxFood: 20,
    foodTimer: 0,
    dead: false,
    lastDmg: 0,
    hotbar: Array(9).fill(null),
    inv: Array(36).fill(null),
    armor: { helmet: null, chest: null, legs: null, boots: null },
    sel: 0,
  };
}