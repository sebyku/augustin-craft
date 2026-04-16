import { Vector3 } from 'three';
import { BD } from '../game/blocks';
import { GRAV, JUMP, SPD } from '../game/constants';
import type { Player } from '../game/player';
import { wGet } from '../game/world-gen';

export function collidesAt(x: number, y: number, z: number): boolean {
  const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
  for (let dy = 0; dy < 2; dy++) {
    const b = wGet(bx, by + dy, bz);
    if (b && BD[b]?.solid && !BD[b]?.trans) return true;
  }
  return false;
}

export interface Keys {
  [code: string]: boolean;
}

export function playerMove(player: Player, keys: Keys, dt: number): void {
  if (player.dead) return;
  const fw = new Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const ri = new Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) { mx += fw.x; mz += fw.z; }
  if (keys.KeyS || keys.ArrowDown) { mx -= fw.x; mz -= fw.z; }
  if (keys.KeyA || keys.ArrowLeft) { mx -= ri.x; mz -= ri.z; }
  if (keys.KeyD || keys.ArrowRight) { mx += ri.x; mz += ri.z; }
  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 0) { mx /= len; mz /= len; }
  player.vel.x = mx * SPD;
  player.vel.z = mz * SPD;
  player.vel.y = Math.max(player.vel.y + GRAV * dt, -30);
  if (player.onGround && player.vel.y < 0) player.vel.y = 0;
  if (keys.Space && player.onGround) { player.vel.y = JUMP; player.onGround = false; }

  const nx = player.pos.x + player.vel.x * dt;
  if (!collidesAt(nx, player.pos.y, player.pos.z)) player.pos.x = nx;
  else player.vel.x = 0;
  const nz = player.pos.z + player.vel.z * dt;
  if (!collidesAt(player.pos.x, player.pos.y, nz)) player.pos.z = nz;
  else player.vel.z = 0;
  const ny = player.pos.y + player.vel.y * dt;
  if (!collidesAt(player.pos.x, ny, player.pos.z)) {
    player.pos.y = ny;
    player.onGround = false;
  } else {
    player.onGround = player.vel.y < 0;
    player.vel.y = 0;
  }
}