import { BoxGeometry, Mesh, MeshBasicMaterial, MeshLambertMaterial, Scene, Vector3 } from 'three';
import { GRAV, JUMP } from '../game/constants';
import { invAdd } from '../game/inventory';
import { IINFO } from '../game/items';
import type { Player } from '../game/player';
import type { DropEntry } from '../game/recipes';
import { getHeight, isSolid } from '../game/world-gen';

export type MobType = 'zombie' | 'skeleton' | 'sheep' | 'cow';

export interface MobTypeInfo {
  name: string;
  emoji: string;
  hp: number;
  dmg: number;
  spd: number;
  hostile: boolean;
  color: number;
  drops: DropEntry[];
}

// Auto-jump rule for 2-block-tall mobs walking into terrain. Pure so it
// can be unit-tested without Three.js or a Scene. The mob hops a single
// block up when its feet are blocked, its head is clear, the block
// above its head is also clear, and it is grounded. Crucially the rule
// is *not* "head blocked" — that's a 2-block wall, which mobs cannot
// climb. Getting this inverted (the original code did) made every mob
// snag on every dirt step.
export function shouldAutoJump(
  feetBlocked: boolean,
  headBlocked: boolean,
  aboveHeadBlocked: boolean,
  onGround: boolean,
): boolean {
  return onGround && feetBlocked && !headBlocked && !aboveHeadBlocked;
}

export const MTYPES: Record<MobType, MobTypeInfo> = {
  zombie: { name: 'Zombie', emoji: '🧟', hp: 20, dmg: 3, spd: 2.5, hostile: true, color: 0x2d7a2d, drops: [{ id: 'rotten', qty: 1 }] },
  skeleton: { name: 'Squelette', emoji: '💀', hp: 20, dmg: 4, spd: 3, hostile: true, color: 0xddddcc, drops: [{ id: 'bone', qty: 1 }, { id: 'arrow', qty: 2 }] },
  sheep: { name: 'Mouton', emoji: '🐑', hp: 8, dmg: 0, spd: 1.5, hostile: false, color: 0xeeeeff, drops: [{ id: 'mutton', qty: 1 }] },
  cow: { name: 'Vache', emoji: '🐄', hp: 10, dmg: 0, spd: 1.5, hostile: false, color: 0x8b5a2b, drops: [{ id: 'beef', qty: 1 }, { id: 'leather', qty: 1 }] },
};

export interface Mob {
  id: number;
  type: MobType;
  mesh: Mesh;
  info: MobTypeInfo;
  hp: number;
  pos: Vector3;
  vel: Vector3;
  onGround: boolean;
  active: boolean;
  lastAtk: number;
  lastBurn: number;
  wander: Vector3 | null;
  wTimer: number;
}

export class MobManager {
  mobs: Mob[] = [];
  private nextId = 0;
  private lastSpawn = 0;

  private scene: Scene;
  private player: Player;
  private onKill?: (mob: Mob) => void;

  constructor(scene: Scene, player: Player, onKill?: (mob: Mob) => void) {
    this.scene = scene;
    this.player = player;
    this.onKill = onKill;
  }

  spawn(type: MobType, x: number, y: number, z: number): void {
    const info = MTYPES[type];
    const bGeo = new BoxGeometry(0.8, 1.8, 0.8);
    const bMat = new MeshLambertMaterial({ color: info.color });
    const mesh = new Mesh(bGeo, bMat);
    const eGeo = new BoxGeometry(0.18, 0.18, 0.08);
    const eMat = new MeshBasicMaterial({ color: info.hostile ? 0xff0000 : 0x222222 });
    for (const ex of [-0.18, 0.18]) {
      const e = new Mesh(eGeo, eMat);
      e.position.set(ex, 0.35, 0.41);
      mesh.add(e);
    }
    mesh.position.set(x + 0.5, y + 0.9, z + 0.5);
    this.scene.add(mesh);
    this.mobs.push({
      id: this.nextId++,
      type,
      mesh,
      info: { ...info },
      hp: info.hp,
      pos: new Vector3(x, y, z),
      vel: new Vector3(),
      onGround: false,
      active: true,
      lastAtk: 0,
      lastBurn: 0,
      wander: null,
      wTimer: 0,
    });
  }

  kill(mob: Mob): void {
    this.scene.remove(mob.mesh);
    mob.mesh.geometry.dispose();
    mob.active = false;
    for (const d of mob.info.drops) invAdd(this.player, d.id, d.qty);
    this.onKill?.(mob);
  }

  spawnAround(isDay: boolean, maxMobs: number): Mob | null {
    const now = Date.now();
    if (now - this.lastSpawn < 10000) return null;
    this.lastSpawn = now;
    if (this.mobs.filter(m => m.active).length >= maxMobs) return null;

    const ang = Math.random() * Math.PI * 2, dist = 16 + Math.random() * 18;
    const sx = Math.floor(this.player.pos.x + Math.cos(ang) * dist);
    const sz = Math.floor(this.player.pos.z + Math.sin(ang) * dist);

    // getHeight returns the terrain surface y, but a column can carry a tree
    // trunk, cactus, or a player-placed block on top of that. A mob is ~1.8
    // tall (feet + head), so scan up until we find a block with 2 empty
    // blocks above it. Reject the spawn if no such spot is within reach.
    const base = getHeight(sx, sz);
    let sy = -1;
    for (let dy = 1; dy <= 6; dy++) {
      const y = base + dy;
      if (!isSolid(sx, y - 1, sz)) continue;
      if (isSolid(sx, y, sz) || isSolid(sx, y + 1, sz)) continue;
      sy = y;
      break;
    }
    if (sy < 0) return null;

    const type: MobType = isDay
      ? (Math.random() < 0.5 ? 'sheep' : 'cow')
      : (Math.random() < 0.5 ? 'zombie' : 'skeleton');
    this.spawn(type, sx, sy, sz);
    return this.mobs[this.mobs.length - 1];
  }

  update(dt: number, isDay: boolean, onPlayerDamage: (dmg: number) => void): void {
    const now = Date.now();
    this.mobs = this.mobs.filter(m => m.active);
    for (const mob of this.mobs) {
      if (!mob.active) continue;
      // Squared distance avoids a sqrt per mob per frame; thresholds
      // compare against the squared values inline.
      const distSq = mob.pos.distanceToSquared(this.player.pos);
      if (distSq > 55 * 55) { this.kill(mob); continue; }

      // Safety net: if a mob is ever embedded in ground (either from drift,
      // a bad spawn, or a block placed on top of it), lift it until both
      // its feet and head blocks are clear. Capped to avoid an infinite
      // loop if the column is fully solid.
      let lifted = 0;
      while (lifted < 16) {
        const bx = Math.floor(mob.pos.x);
        const bz = Math.floor(mob.pos.z);
        const by = Math.floor(mob.pos.y);
        if (!isSolid(bx, by, bz) && !isSolid(bx, by + 1, bz)) break;
        mob.pos.y = by + 1;
        lifted++;
      }

      let mx = 0, mz = 0;
      const info = mob.info;
      if (info.hostile && (!isDay || distSq < 22 * 22)) {
        if (distSq > 1.5 * 1.5) {
          const dx = this.player.pos.x - mob.pos.x, dz = this.player.pos.z - mob.pos.z;
          const l = Math.sqrt(dx * dx + dz * dz);
          mx = dx / l * info.spd * dt;
          mz = dz / l * info.spd * dt;
          mob.mesh.rotation.y = Math.atan2(dx, dz);
        }
        if (distSq < 2 * 2 && now - mob.lastAtk > 1500 && !this.player.dead) {
          mob.lastAtk = now;
          onPlayerDamage(info.dmg);
        }
      } else if (!info.hostile) {
        mob.wTimer -= dt;
        if (mob.wTimer <= 0 || !mob.wander) {
          mob.wTimer = 3 + Math.random() * 5;
          mob.wander = Math.random() > 0.35
            ? new Vector3(mob.pos.x + (Math.random() - 0.5) * 10, 0, mob.pos.z + (Math.random() - 0.5) * 10)
            : null;
        }
        if (mob.wander) {
          const dx = mob.wander.x - mob.pos.x, dz = mob.wander.z - mob.pos.z;
          const l = Math.sqrt(dx * dx + dz * dz);
          if (l > 1) {
            mx = dx / l * info.spd * 0.5 * dt;
            mz = dz / l * info.spd * 0.5 * dt;
            mob.mesh.rotation.y = Math.atan2(dx, dz);
          } else mob.wander = null;
        }
      }

      if (info.hostile && isDay && mob.type !== 'skeleton' && now - mob.lastBurn > 2000) {
        mob.lastBurn = now;
        mob.hp = Math.max(0, mob.hp - 2);
        if (mob.hp <= 0) { this.kill(mob); continue; }
      }

      mob.vel.y += GRAV * dt;
      if (mob.onGround && mob.vel.y < 0) mob.vel.y = 0;

      const np = mob.pos.clone();
      np.x += mx;
      np.z += mz;
      np.y += mob.vel.y * dt;

      const bx = Math.floor(np.x), by = Math.floor(mob.pos.y), bz = Math.floor(np.z);
      const feetBlocked = isSolid(bx, by, bz);
      const headBlocked = isSolid(bx, by + 1, bz);
      const aboveHeadBlocked = isSolid(bx, by + 2, bz);
      if (feetBlocked || headBlocked) {
        if (shouldAutoJump(feetBlocked, headBlocked, aboveHeadBlocked, mob.onGround)) {
          mob.vel.y = JUMP * 0.65;
        }
      } else {
        mob.pos.x = np.x;
        mob.pos.z = np.z;
      }

      // 2-block Y sweep: check both the feet block and the head block
      // at the candidate position, matching how the player collides.
      const ny = mob.pos.y + mob.vel.y * dt;
      const mbx = Math.floor(mob.pos.x), mbz = Math.floor(mob.pos.z);
      const feetY = Math.floor(ny);
      const headY = Math.floor(ny + 1);
      if (isSolid(mbx, feetY, mbz) || isSolid(mbx, headY, mbz)) {
        // When landing (falling with feet block solid), snap pos.y to the
        // top of that block. Otherwise pos.y is left mid-air wherever the
        // last tick happened, which causes cumulative drift downward and
        // eventually embeds the mob.
        if (mob.vel.y < 0 && isSolid(mbx, feetY, mbz)) {
          mob.pos.y = feetY + 1;
        }
        mob.onGround = mob.vel.y < 0;
        mob.vel.y = 0;
      } else {
        mob.pos.y = ny;
        mob.onGround = false;
      }

      mob.mesh.position.set(mob.pos.x + 0.5, mob.pos.y + 0.9, mob.pos.z + 0.5);
    }
  }

  attackNearest(player: Player, onHit: (mob: Mob, dmg: number) => void): boolean {
    const dir = new Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    for (const mob of this.mobs) {
      if (!mob.active) continue;
      if (mob.pos.distanceToSquared(player.pos) > 3.5 * 3.5) continue;
      const to = mob.pos.clone().sub(player.pos).normalize();
      if (dir.dot(to) > 0.5) {
        const sl = player.hotbar[player.sel];
        const dmg = sl ? IINFO[sl.id as string]?.dmg ?? 1 : 1;
        mob.hp -= dmg;
        mob.vel.add(to.multiplyScalar(6));
        onHit(mob, dmg);
        if (mob.hp <= 0) this.kill(mob);
        return true;
      }
    }
    return false;
  }

  clear(): void {
    for (const mob of this.mobs) {
      if (mob.active) {
        this.scene.remove(mob.mesh);
        mob.mesh.geometry.dispose();
      }
    }
    this.mobs = [];
  }
}