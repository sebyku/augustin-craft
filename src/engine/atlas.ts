import { CanvasTexture, NearestFilter } from 'three';

export interface Atlas {
  tex: CanvasTexture;
  FACES: number;
  SZ: number;
  canvas: HTMLCanvasElement;
}

// Pixel-art block atlas (8×8 per face, 15 faces).
// 0=grass_top 1=dirt 2=stone 3=wood 4=sand 5=snow 6=leaves
// 7=iron_ore 8=coal_ore 9=ada_ore 10=diamond_ore 11=cactus 12=bedrock
// 13=furnace 14=crafting_table
export function buildAtlas(): Atlas {
  const FACES = 15, SZ = 8;
  const ac = document.createElement('canvas');
  ac.width = FACES * SZ;
  ac.height = SZ;
  const ax = ac.getContext('2d')!;

  function fill(idx: number, rows: string[][]) {
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
      ax.fillStyle = rows[y][x];
      ax.fillRect(idx * SZ + x, y, 1, 1);
    }
  }

  // 0 grass-top
  fill(0, Array.from({ length: SZ }, (_, y) => Array.from({ length: SZ }, () => {
    const r = Math.random();
    return y === 0 ? '#3a8c3a' : r < 0.2 ? '#2d7a2d' : r < 0.4 ? '#4aaa4a' : '#3c9c3c';
  })));
  // 1 dirt
  fill(1, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.2 ? '#5a3a1a' : r < 0.35 ? '#8a6a4a' : '#7a5a3a';
  })));
  // 2 stone
  fill(2, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.15 ? '#666' : r < 0.3 ? '#999' : '#808080';
  })));
  // 3 wood (log side)
  fill(3, Array.from({ length: SZ }, (_, y) => Array.from({ length: SZ }, (_, x) => {
    if (x === 0 || x === 7) return '#5a3a0a';
    return y % 2 === 0 ? '#8b6914' : '#7a5a10';
  })));
  // 4 sand
  fill(4, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.2 ? '#c8b870' : r < 0.35 ? '#e8d890' : '#d8c880';
  })));
  // 5 snow
  fill(5, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.1 ? '#d0d8f0' : r < 0.2 ? '#ffffff' : '#e8eeff';
  })));
  // 6 leaves
  fill(6, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random();
    if (r < 0.05) return '#00000000';
    return r < 0.3 ? '#1a6a1a' : r < 0.6 ? '#2a8a2a' : '#1e7a1e';
  })));
  // 7 iron ore
  fill(7, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.25 ? '#c09060' : r < 0.4 ? '#b87040' : '#808080';
  })));
  // 8 coal ore
  fill(8, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.25 ? '#222' : r < 0.4 ? '#111' : '#808080';
  })));
  // 9 adamantium ore
  fill(9, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.25 ? '#aa00ff' : r < 0.4 ? '#8800cc' : '#808080';
  })));
  // 10 diamond ore
  fill(10, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.25 ? '#44ffee' : r < 0.4 ? '#00ccbb' : '#808080';
  })));
  // 11 cactus
  fill(11, Array.from({ length: SZ }, (_, _y) => {
    void _y;
    return Array.from({ length: SZ }, (_, x) => {
      if (x === 0 || x === 7) return '#1a6a1a';
      const r = Math.random(); return r < 0.2 ? '#1a7a1a' : '#2d8c2d';
    });
  }));
  // 12 bedrock
  fill(12, Array.from({ length: SZ }, () => Array.from({ length: SZ }, () => {
    const r = Math.random(); return r < 0.3 ? '#111' : r < 0.5 ? '#333' : '#222';
  })));
  // 13 furnace
  fill(13, Array.from({ length: SZ }, (_, y) => Array.from({ length: SZ }, (_, x) => {
    if (y > 3 && y < 7 && x > 2 && x < 5) return '#ff6600';
    const r = Math.random(); return r < 0.2 ? '#555' : '#666';
  })));
  // 14 crafting table
  fill(14, Array.from({ length: SZ }, (_, y) => Array.from({ length: SZ }, (_, x) => {
    if ((y === 2 || y === 5) && x > 0 && x < 7) return '#5a3a0a';
    if ((x === 2 || x === 5) && y > 0 && y < 7) return '#5a3a0a';
    const r = Math.random(); return r < 0.2 ? '#8b6914' : '#7a5a10';
  })));

  const tex = new CanvasTexture(ac);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  return { tex, FACES, SZ, canvas: ac };
}