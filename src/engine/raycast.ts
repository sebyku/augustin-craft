import type { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';
import { BD } from '../game/blocks';
import { wGet } from '../game/world-gen';

export interface RaycastHit {
  bx: number;
  by: number;
  bz: number;
  face: [number, number, number];
  bid: number;
}

export function raycast(camera: PerspectiveCamera): RaycastHit | null {
  const pos = camera.position.clone();
  const dir = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  const MAX = 5;
  let cx = Math.floor(pos.x), cy = Math.floor(pos.y), cz = Math.floor(pos.z);
  const sx = dir.x > 0 ? 1 : -1, sy = dir.y > 0 ? 1 : -1, sz = dir.z > 0 ? 1 : -1;
  const dtx = Math.abs(1 / dir.x), dty = Math.abs(1 / dir.y), dtz = Math.abs(1 / dir.z);
  let tx = (sx > 0 ? cx + 1 - pos.x : pos.x - cx) * dtx;
  let ty = (sy > 0 ? cy + 1 - pos.y : pos.y - cy) * dty;
  let tz = (sz > 0 ? cz + 1 - pos.z : pos.z - cz) * dtz;
  let dist = 0;
  let face: [number, number, number] = [0, 0, 0];
  while (dist < MAX) {
    const b = wGet(cx, cy, cz);
    if (b && BD[b]?.solid) return { bx: cx, by: cy, bz: cz, face, bid: b };
    if (tx < ty && tx < tz) { cx += sx; dist = tx; face = [-sx, 0, 0]; tx += dtx; }
    else if (ty < tz) { cy += sy; dist = ty; face = [0, -sy, 0]; ty += dty; }
    else { cz += sz; dist = tz; face = [0, 0, -sz]; tz += dtz; }
  }
  return null;
}