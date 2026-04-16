import { BD } from './blocks';
import { CHUNK, WH, SEA_LEVEL } from './constants';
import { _hash2, _lerp, fbm, vnoise3 } from './noise';

export type Biome = 'desert' | 'plain' | 'ice';

const _biomeValCache = new Map<string, number>();
const _heightCache = new Map<string, number>();

export function getBiomeVal(wx: number, wz: number): number {
  const k = wx + ',' + wz;
  const cached = _biomeValCache.get(k);
  if (cached !== undefined) return cached;
  const t = fbm(wx, wz, 3, 0.008, 99);
  if (_biomeValCache.size > 12000) _biomeValCache.clear();
  _biomeValCache.set(k, t);
  return t;
}

export function getBiome(wx: number, wz: number): Biome {
  const t = getBiomeVal(wx, wz);
  if (t < 0.38) return 'desert';
  if (t > 0.62) return 'ice';
  return 'plain';
}

export function getHeight(wx: number, wz: number): number {
  const k = wx + ',' + wz;
  const cached = _heightCache.get(k);
  if (cached !== undefined) return cached;

  const t = getBiomeVal(wx, wz);
  const baseH = fbm(wx, wz, 5, 0.04, 0);
  const detail = fbm(wx, wz, 3, 0.12, 55);

  const hDesert = SEA_LEVEL - 2 + Math.floor(baseH * 8 + detail * 3);
  const hPlain = SEA_LEVEL + 1 + Math.floor(baseH * 14 + detail * 4);
  const hIce = SEA_LEVEL + Math.floor(baseH * 6 + detail * 2);

  let r: number;
  if (t < 0.38) r = hDesert;
  else if (t < 0.45) r = Math.round(_lerp(hDesert, hPlain, (t - 0.38) / 0.07));
  else if (t < 0.55) r = hPlain;
  else if (t < 0.62) r = Math.round(_lerp(hPlain, hIce, (t - 0.55) / 0.07));
  else r = hIce;

  r = Math.max(2, Math.min(WH - 8, r));
  if (_heightCache.size > 12000) _heightCache.clear();
  _heightCache.set(k, r);
  return r;
}

// Ore veins using 3D noise (coherent groups).
export function getOre(wx: number, y: number, wz: number): number {
  const coal = fbm(wx + 1000, wz + 1000, 2, 0.18, 10) + vnoise3(wx * 0.18, y * 0.22, wz * 0.18) * 0.5;
  if (y > 3 && y < 25 && coal > 0.72) return 8;
  const iron = fbm(wx + 2000, wz + 2000, 2, 0.22, 20) + vnoise3(wx * 0.22, y * 0.28, wz * 0.22) * 0.5;
  if (y > 2 && y < 18 && iron > 0.78) return 9;
  const dia = fbm(wx + 3000, wz + 3000, 2, 0.3, 30) + vnoise3(wx * 0.3, y * 0.4, wz * 0.3) * 0.5;
  if (y > 1 && y < 10 && dia > 0.84) return 10;
  const ada = fbm(wx + 4000, wz + 4000, 2, 0.35, 40) + vnoise3(wx * 0.35, y * 0.5, wz * 0.35) * 0.5;
  if (y > 1 && y < 6 && ada > 0.88) return 11;
  return 3;
}

// 3D noise caves — natural tunnels.
export function isCave(wx: number, y: number, wz: number): boolean {
  if (y <= 1) return false;
  const c1 = vnoise3(wx * 0.07, y * 0.12, wz * 0.07);
  const c2 = vnoise3(wx * 0.07 + 50, y * 0.12 + 50, wz * 0.07 + 50);
  return Math.abs(c1 - 0.5) < 0.09 && Math.abs(c2 - 0.5) < 0.09;
}

export const chunks = new Map<string, Uint8Array>();
export const mods = new Map<string, number>();

export function ck(cx: number, cz: number): string {
  return cx + ',' + cz;
}

export function genChunk(cx: number, cz: number): Uint8Array {
  const arr = new Uint8Array(CHUNK * WH * CHUNK);
  function set(x: number, y: number, z: number, id: number) {
    const lx = ((x % CHUNK) + CHUNK) % CHUNK;
    const lz = ((z % CHUNK) + CHUNK) % CHUNK;
    if (y >= 0 && y < WH) arr[lx * WH * CHUNK + y * CHUNK + lz] = id;
  }

  for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
    const wx = cx * CHUNK + lx, wz = cz * CHUNK + lz;
    const bio = getBiome(wx, wz);
    const h = getHeight(wx, wz);
    const bioVal = getBiomeVal(wx, wz);

    arr[lx * WH * CHUNK + 0 * CHUNK + lz] = 13;

    for (let y = 1; y < h - 3; y++) {
      if (isCave(wx, y, wz)) continue;
      arr[lx * WH * CHUNK + y * CHUNK + lz] = getOre(wx, y, wz);
    }

    const dirtTop = Math.max(1, h - 3);
    for (let y = dirtTop; y < h; y++) arr[lx * WH * CHUNK + y * CHUNK + lz] = 2;

    if (bio === 'desert') {
      for (let y = Math.max(1, h - 5); y <= h; y++) arr[lx * WH * CHUNK + y * CHUNK + lz] = 4;
      if (lx > 1 && lx < 14 && lz > 1 && lz < 14) {
        const cr = _hash2(wx * 7 + 11, wz * 13 + 17);
        if (cr < 0.012) {
          const ch = 1 + Math.floor(_hash2(wx + 500, wz + 500) * 2);
          for (let ty = 1; ty <= ch; ty++) set(wx, h + ty, wz, 12);
        }
      }
    } else if (bio === 'ice') {
      arr[lx * WH * CHUNK + h * CHUNK + lz] = 5;
    } else {
      arr[lx * WH * CHUNK + h * CHUNK + lz] = 1;

      if (lx > 2 && lx < 13 && lz > 2 && lz < 13) {
        const forestNoise = fbm(wx, wz, 2, 0.05, 77);
        const treeThreshold = 0.38;
        if (forestNoise > treeThreshold) {
          const tr = _hash2(wx * 31 + 13, wz * 19 + 7);
          const forestDensity = (forestNoise - treeThreshold) * 3;
          if (tr < 0.09 * forestDensity) {
            const th = 4 + Math.floor(_hash2(wx, wz) * 3);
            for (let ty = 1; ty <= th; ty++) set(wx, h + ty, wz, 6);
            const fr = 2;
            for (let dx = -fr; dx <= fr; dx++) for (let dz = -fr; dz <= fr; dz++) for (let dy = th - 1; dy <= th + 2; dy++) {
              const d = Math.abs(dx) + Math.abs(dz) + (dy === th + 2 ? 1 : 0);
              if (d <= fr + 1) set(wx + dx, h + dy, wz + dz, 7);
            }
          }
        }
      }
    }

    if (bio === 'plain' && bioVal < 0.44) {
      const sandBlend = (0.44 - bioVal) / 0.06;
      if (_hash2(wx + 200, wz + 200) / 1 < sandBlend * 0.7) {
        arr[lx * WH * CHUNK + h * CHUNK + lz] = 4;
      }
    }
  }
  return arr;
}

export function wGet(x: number, y: number, z: number): number {
  const mk = x + ',' + y + ',' + z;
  const m = mods.get(mk);
  if (m !== undefined) return m;
  if (y < 0) return 13;
  if (y >= WH) return 0;
  const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
  const k = ck(cx, cz);
  let arr = chunks.get(k);
  if (!arr) {
    arr = genChunk(cx, cz);
    chunks.set(k, arr);
  }
  const lx = ((x % CHUNK) + CHUNK) % CHUNK;
  const lz = ((z % CHUNK) + CHUNK) % CHUNK;
  return arr[lx * WH * CHUNK + y * CHUNK + lz];
}

export function wSet(x: number, y: number, z: number, id: number): void {
  mods.set(x + ',' + y + ',' + z, id);
}

export function isSolid(x: number, y: number, z: number): boolean {
  const b = wGet(x, y, z);
  const def = BD[b];
  return b !== 0 && !!def?.solid && !def?.trans;
}

export function resetWorld(): void {
  chunks.clear();
  mods.clear();
  _biomeValCache.clear();
  _heightCache.clear();
}