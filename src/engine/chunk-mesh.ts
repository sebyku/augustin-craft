import type { Scene } from 'three';
import { BufferGeometry, Float32BufferAttribute, Mesh, MeshLambertMaterial, NearestFilter } from 'three';
import type { Atlas } from './atlas';
import { BD } from '../game/blocks';
import { CHUNK, WH } from '../game/constants';
import { chunks, ck, genChunk, getHeight, wGet } from '../game/world-gen';

type FaceKey = '1,0,0' | '-1,0,0' | '0,1,0' | '0,-1,0' | '0,0,1' | '0,0,-1';

const DIRS: { d: [number, number, number]; face: 'top' | 'bot' | 'side'; norm: [number, number, number] }[] = [
  { d: [1, 0, 0], face: 'side', norm: [1, 0, 0] },
  { d: [-1, 0, 0], face: 'side', norm: [-1, 0, 0] },
  { d: [0, 1, 0], face: 'top', norm: [0, 1, 0] },
  { d: [0, -1, 0], face: 'bot', norm: [0, -1, 0] },
  { d: [0, 0, 1], face: 'side', norm: [0, 0, 1] },
  { d: [0, 0, -1], face: 'side', norm: [0, 0, -1] },
];

const FACE_VERTS: Record<FaceKey, [number, number, number][]> = {
  '1,0,0': [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
  '-1,0,0': [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
  '0,1,0': [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
  '0,-1,0': [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
  '0,0,1': [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
  '0,0,-1': [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
};

export function buildChunkGeo(cx: number, cz: number, atlas: Atlas): BufferGeometry | null {
  const verts: number[] = [], norms: number[] = [], uvs: number[] = [], idxs: number[] = [];
  let vi = 0;

  for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
    const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
    const maxY = Math.min(WH - 1, getHeight(wx, wz) + 10);
    for (let y = 0; y < maxY; y++) {
      const bid = wGet(wx, y, wz);
      const def = BD[bid];
      if (!bid || !def?.solid) continue;
      for (const dir of DIRS) {
        const nx = wx + dir.d[0], ny = y + dir.d[1], nz = wz + dir.d[2];
        const nb = wGet(nx, ny, nz);
        const nbdef = BD[nb];
        if (nb && nbdef?.solid && !nbdef?.trans && !def.trans) continue;
        if (bid === nb) continue;

        const fk = dir.d.join(',') as FaceKey;
        const fv = FACE_VERTS[fk];
        const fi = dir.face === 'top' ? def.top! : dir.face === 'bot' ? def.bot! : def.side!;
        const u0 = fi / atlas.FACES, u1 = (fi + 1) / atlas.FACES;
        const fuvs: [number, number][] = [[u0, 0], [u1, 0], [u1, 1], [u0, 1]];

        for (let k = 0; k < 4; k++) {
          verts.push(wx + fv[k][0], y + fv[k][1], wz + fv[k][2]);
          norms.push(...dir.norm);
          uvs.push(fuvs[k][0], fuvs[k][1]);
        }
        idxs.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        vi += 4;
      }
    }
  }

  if (vi === 0) return null;
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(norms, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(idxs);
  return geo;
}

export class ChunkManager {
  readonly meshes: Record<string, Mesh> = {};
  readonly mat: MeshLambertMaterial;
  private readonly emptyChunks = new Set<string>();
  private readonly queue: { cx: number; cz: number }[] = [];
  private lastPCX: number | null = null;
  private lastPCZ: number | null = null;

  private scene: Scene;
  private atlas: Atlas;

  constructor(scene: Scene, atlas: Atlas) {
    this.scene = scene;
    this.atlas = atlas;
    this.mat = new MeshLambertMaterial({ map: atlas.tex });
    this.mat.map!.magFilter = NearestFilter;
    this.mat.map!.minFilter = NearestFilter;
  }

  buildOne(cx: number, cz: number): void {
    const k = ck(cx, cz);
    if (this.meshes[k] || this.emptyChunks.has(k)) return;
    if (!chunks.has(k)) chunks.set(k, genChunk(cx, cz));
    const geo = buildChunkGeo(cx, cz, this.atlas);
    if (geo) {
      const mesh = new Mesh(geo, this.mat);
      mesh.userData = { cx, cz };
      this.scene.add(mesh);
      this.meshes[k] = mesh;
    } else {
      this.emptyChunks.add(k);
    }
  }

  rebuildOne(cx: number, cz: number): void {
    const k = ck(cx, cz);
    const old = this.meshes[k];
    if (old) {
      this.scene.remove(old);
      old.geometry.dispose();
      delete this.meshes[k];
    }
    this.emptyChunks.delete(k);
    const geo = buildChunkGeo(cx, cz, this.atlas);
    if (geo) {
      const mesh = new Mesh(geo, this.mat);
      mesh.userData = { cx, cz };
      this.scene.add(mesh);
      this.meshes[k] = mesh;
    } else {
      this.emptyChunks.add(k);
    }
  }

  rebuildAround(wx: number, wz: number): void {
    const cx = Math.floor(wx / CHUNK), cz = Math.floor(wz / CHUNK);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      this.rebuildOne(cx + dx, cz + dz);
    }
  }

  private flush(budgetMs: number) {
    const t0 = performance.now();
    while (this.queue.length > 0 && performance.now() - t0 < budgetMs) {
      const { cx, cz } = this.queue.shift()!;
      this.buildOne(cx, cz);
    }
  }

  update(playerX: number, playerZ: number, rdist: number): void {
    const pcx = Math.floor(playerX / CHUNK), pcz = Math.floor(playerZ / CHUNK);
    const moved = pcx !== this.lastPCX || pcz !== this.lastPCZ;
    if (moved) {
      this.lastPCX = pcx;
      this.lastPCZ = pcz;
      for (const k of Object.keys(this.meshes)) {
        const m = this.meshes[k];
        const { cx, cz } = m.userData as { cx: number; cz: number };
        if (Math.abs(cx - pcx) > rdist + 1 || Math.abs(cz - pcz) > rdist + 1) {
          this.scene.remove(m);
          m.geometry.dispose();
          delete this.meshes[k];
          // Evict the underlying chunk Uint8Array too — without this, every
          // chunk ever visited (raycast, mob despawn checks, walks) stays
          // in memory forever. emptyChunks holds the "no mesh" marker only
          // for the current window; we drop those in tandem.
          this.emptyChunks.delete(k);
          chunks.delete(k);
        }
      }
      this.queue.length = 0;
      const toQueue: { cx: number; cz: number; d: number }[] = [];
      for (let dx = -rdist; dx <= rdist; dx++) for (let dz = -rdist; dz <= rdist; dz++) {
        const cx = pcx + dx, cz = pcz + dz, k = ck(cx, cz);
        if (this.meshes[k] === undefined && !this.emptyChunks.has(k)) {
          toQueue.push({ cx, cz, d: dx * dx + dz * dz });
        }
      }
      toQueue.sort((a, b) => a.d - b.d);
      this.queue.push(...toQueue);
    }
    if (this.queue.length > 0) this.flush(14);
  }

  forceBuildInitial(rdist: number, originX = 0, originZ = 0): void {
    const pcx = Math.floor(originX / CHUNK), pcz = Math.floor(originZ / CHUNK);
    for (let dx = -rdist; dx <= rdist; dx++) for (let dz = -rdist; dz <= rdist; dz++) {
      const cx = pcx + dx, cz = pcz + dz;
      const k = ck(cx, cz);
      if (!chunks.has(k)) chunks.set(k, genChunk(cx, cz));
      this.buildOne(cx, cz);
    }
    this.lastPCX = pcx;
    this.lastPCZ = pcz;
  }

  dispose(): void {
    for (const k of Object.keys(this.meshes)) {
      const m = this.meshes[k];
      this.scene.remove(m);
      m.geometry.dispose();
      delete this.meshes[k];
    }
    this.emptyChunks.clear();
    this.mat.dispose();
    this.atlas.tex.dispose();
  }
}