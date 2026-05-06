import { Vector3 } from 'three';
import { MAX_MOBS, RDIST, WH } from '../game/constants';
import { invAdd, invCount, invRemove } from '../game/inventory';
import { IINFO } from '../game/items';
import type { Player } from '../game/player';
import { createPlayer } from '../game/player';
import { DROPS, RECIPES, isBlockCostKey } from '../game/recipes';
import type { Recipe, Station } from '../game/recipes';
import { mods, resetWorld, wGet, wSet } from '../game/world-gen';
import { buildSave, clearSave, hasSave, readSave, sanitizeSavedPlayer, validateSave, writeSave } from '../game/persistence';
import { buildAtlas } from './atlas';
import type { Atlas } from './atlas';
import { ChunkManager } from './chunk-mesh';
import type { Mob } from './mobs';
import { MobManager } from './mobs';
import { playerMove } from './physics';
import { raycast } from './raycast';
import type { SceneBundle } from './scene';
import { createScene, disposeScene, updateSky } from './scene';
import { BD, MAT_TIER } from '../game/blocks';


export type ScreenMode = 'start' | 'playing' | 'inventory' | 'craft' | 'furnace' | 'blast' | 'death';

export interface FurnaceState {
  ore: string | null;
  fuel: string | null;
  result: string | null;
  progress: number;
  smelting: boolean;
}

export interface BlastFurnaceState {
  alloy: string | null;
  iron: string | null;
  fuel: string | null;
  result: string | null;
  progress: number;
  smelting: boolean;
}

// Accepted fuels for the regular furnace, in priority order. Coal first
// because it's the natural late-game fuel and the player rarely wants
// the furnace to consume tools or future-build planks if anything else
// is available.
const FURNACE_FUELS: { id: string; block?: boolean; key: string | number }[] = [
  { id: 'coal', key: 'coal' },
  { id: 'plank', block: true, key: 16 },
  { id: 'wood', block: true, key: 6 },
];

export interface Snapshot {
  mode: ScreenMode;
  craftStation: Station;
  health: number;
  food: number;
  sel: number;
  hotbar: Player['hotbar'];
  inv: Player['inv'];
  armor: Player['armor'];
  coords: { x: number; y: number; z: number };
  biomeLabel: string;
  tod: string;
  isDay: boolean;
  furnace: FurnaceState;
  blast: BlastFurnaceState;
  msg: { text: string; color: string } | null;
  hasSave: boolean;
}

type Listener = (s: Snapshot) => void;

export class Game {
  private bundle: SceneBundle;
  private atlas: Atlas;
  private chunkMgr: ChunkManager;
  private mobMgr: MobManager;
  readonly player: Player = createPlayer();
  private keys: Record<string, boolean> = {};
  private mbtn: Record<number, boolean> = {};
  private pLocked = false;
  private raf = 0;
  private last = 0;
  private frame = 0;
  private dayNight = { worldTime: 0.25, isDay: true };
  private breakProgress = 0;
  private breakTarget: { bx: number; by: number; bz: number } | null = null;
  private lastPlace = 0;
  readonly furnace: FurnaceState = {
    ore: null, fuel: null, result: null, progress: 0, smelting: false,
  };
  readonly blast: BlastFurnaceState = {
    alloy: null, iron: null, fuel: null, result: null, progress: 0, smelting: false,
  };
  private mode: ScreenMode = 'start';
  private craftStation: Station = 'inv';
  private msg: { text: string; color: string; expires: number } | null = null;
  private listeners = new Set<Listener>();
  private biomeLabel = '🌿 Plaine';
  private todLabel = '☀️ Jour';
  private coords = { x: 0, y: 0, z: 0 };
  private hasSavedData = false;
  private saveTimer: number | null = null;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bundle = createScene(canvas);
    this.atlas = buildAtlas();
    this.chunkMgr = new ChunkManager(this.bundle.scene, this.atlas);
    this.mobMgr = new MobManager(this.bundle.scene, this.player, mob => this.onMobKilled(mob));
    this.hasSavedData = hasSave();
    this.bindInputs();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => { this.listeners.delete(fn); };
  }

  private emit(): void {
    const s = this.snapshot();
    for (const l of this.listeners) l(s);
  }

  private snapshot(): Snapshot {
    return {
      mode: this.mode,
      craftStation: this.craftStation,
      health: this.player.health,
      food: this.player.food,
      sel: this.player.sel,
      hotbar: this.player.hotbar.map(s => (s ? { ...s } : null)),
      inv: this.player.inv.map(s => (s ? { ...s } : null)),
      armor: {
        helmet: this.player.armor.helmet ? { ...this.player.armor.helmet } : null,
        chest: this.player.armor.chest ? { ...this.player.armor.chest } : null,
        legs: this.player.armor.legs ? { ...this.player.armor.legs } : null,
        boots: this.player.armor.boots ? { ...this.player.armor.boots } : null,
      },
      coords: { ...this.coords },
      biomeLabel: this.biomeLabel,
      tod: this.todLabel,
      isDay: this.dayNight.isDay,
      furnace: { ...this.furnace },
      blast: { ...this.blast },
      msg: this.msg ? { text: this.msg.text, color: this.msg.color } : null,
      hasSave: this.hasSavedData,
    };
  }

  getMode(): ScreenMode { return this.mode; }
  getCraftStation(): Station { return this.craftStation; }

  // Find a Y where the column has air over a solid block — i.e. a safe
  // standing spot. Returns null only if the column is fully solid (very
  // rare; getHeight clamps to WH-8 so there's normally headroom).
  private findOpenSpawnY(x: number, z: number): number | null {
    for (let y = WH - 2; y > 1; y--) {
      if (wGet(x, y, z) === 0 && wGet(x, y - 1, z) !== 0) return y + 0.1;
    }
    return null;
  }

  // Reset the transient game state shared between New Game and (partly)
  // Continue. Mirrors the asymmetry the review flagged.
  private resetTransientState(): void {
    this.furnace.ore = null;
    this.furnace.fuel = null;
    this.furnace.result = null;
    this.furnace.progress = 0;
    this.furnace.smelting = false;
    this.blast.alloy = null;
    this.blast.iron = null;
    this.blast.fuel = null;
    this.blast.result = null;
    this.blast.progress = 0;
    this.blast.smelting = false;
    this.dayNight.worldTime = 0.25;
    this.dayNight.isDay = true;
    this.msg = null;
    this.breakProgress = 0;
    this.breakTarget = null;
    this.lastPlace = 0;
    this.player.foodTimer = 0;
    this.player.lastDmg = 0;
    this.mobMgr.clear();
  }

  start(): void {
    // New game: wipe any existing save and start fresh.
    clearSave();
    mods.clear();
    this.hasSavedData = false;
    this.player.health = this.player.maxHealth;
    this.player.food = this.player.maxFood;
    this.player.dead = false;
    this.player.hotbar = Array(9).fill(null);
    this.player.inv = Array(36).fill(null);
    this.player.armor = { helmet: null, chest: null, legs: null, boots: null };
    this.player.sel = 0;
    this.player.yaw = 0;
    this.player.pitch = 0;
    this.player.vel.set(0, 0, 0);
    this.resetTransientState();
    this.mode = 'playing';
    this.craftStation = 'inv';

    // Build chunks around the spawn column before searching for an open Y,
    // so wGet sees real terrain instead of a fresh-generated chunk on each
    // probe.
    this.chunkMgr.forceBuildInitial(RDIST, 8, 8);
    const spawnY = this.findOpenSpawnY(8, 8) ?? 50;
    this.player.pos.set(8, spawnY, 8);
    this.showMsg('Casse un arbre pour commencer! E=Inv C=Craft', '#7ec8e3');
    this.beginLoop();
  }

  continueSaved(): boolean {
    const save = readSave();
    if (!save) return false;

    // Validate before mutating any state. If the save is structurally
    // wrong (wrong slot count, wrong armor shape) we'd rather drop it
    // than corrupt the live player.
    if (!validateSave(save)) {
      clearSave();
      this.hasSavedData = false;
      return false;
    }

    // Restore mods first so the chunk builder sees the edited world.
    mods.clear();
    for (const [k, v] of save.mods) mods.set(k, v);

    // Drop slots whose item id no longer resolves (recipe/item rename
    // since the save was written). Better to lose a slot than to keep an
    // unknown id that would silently destroy other items downstream.
    const sanitized = sanitizeSavedPlayer(save.player);

    this.player.pos.set(save.player.pos[0], save.player.pos[1], save.player.pos[2]);
    this.player.vel.set(0, 0, 0);
    this.player.yaw = save.player.yaw;
    this.player.pitch = save.player.pitch;
    this.player.health = save.player.health;
    this.player.food = save.player.food;
    this.player.hotbar = sanitized.hotbar;
    this.player.inv = sanitized.inv;
    this.player.armor = sanitized.armor;
    this.player.sel = save.player.sel;
    this.player.dead = false;
    this.player.foodTimer = 0;
    this.player.lastDmg = 0;

    this.furnace.ore = save.furnace.ore;
    this.furnace.fuel = save.furnace.fuel;
    this.furnace.result = save.furnace.result;
    // Smelting progress was an exploit (save-just-before-done = instant
    // free smelt). Roll it back so a smelt always takes a full cycle.
    this.furnace.progress = save.furnace.smelting ? 0 : save.furnace.progress;
    this.furnace.smelting = save.furnace.smelting;
    this.blast.alloy = save.blast.alloy;
    this.blast.iron = save.blast.iron;
    this.blast.fuel = save.blast.fuel;
    this.blast.result = save.blast.result;
    this.blast.progress = save.blast.smelting ? 0 : save.blast.progress;
    this.blast.smelting = save.blast.smelting;
    this.dayNight.worldTime = save.worldTime;
    this.dayNight.isDay = save.worldTime < 0.5;
    this.msg = null;
    this.breakProgress = 0;
    this.breakTarget = null;
    this.lastPlace = 0;
    this.mobMgr.clear();

    this.mode = 'playing';
    // Build chunks around the *saved* player position, not the world
    // origin — otherwise a player saved far from spawn falls through air
    // until streaming catches up.
    this.chunkMgr.forceBuildInitial(RDIST, this.player.pos.x, this.player.pos.z);
    this.showMsg('Partie restaurée!', '#7ec8e3');
    this.beginLoop();
    return true;
  }

  private beginLoop(): void {
    // Idempotent: only a single RAF chain and save timer per Game lifetime.
    if (this.raf !== 0) {
      this.emit();
      return;
    }
    this.canvas.requestPointerLock();
    this.loop = this.loop.bind(this);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    if (this.saveTimer === null) {
      this.saveTimer = window.setInterval(() => this.save(), 5000);
    }
    this.emit();
  }

  save(): void {
    if (this.mode === 'start' || this.player.dead) return;
    const data = buildSave(this.player, mods, this.furnace, this.blast, this.dayNight.worldTime);
    writeSave(data);
    this.hasSavedData = true;
  }

  dispose(): void {
    // Persist one last time before tearing down.
    this.save();
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.saveTimer !== null) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.mobMgr.clear();
    this.chunkMgr.dispose();
    disposeScene(this.bundle);
    resetWorld();
  }

  private onBeforeUnload = () => { this.save(); };

  respawn(): void {
    this.player.dead = false;
    this.player.health = 20;
    this.player.food = 20;
    this.player.foodTimer = 0;
    this.player.lastDmg = 0;
    this.player.vel.set(0, 0, 0);
    // Build chunks at the spawn column then scan for an open Y. Hardcoded
    // pos.y = 50 could embed the player inside terrain (max h is WH-8=56).
    this.chunkMgr.forceBuildInitial(RDIST, 8, 8);
    const spawnY = this.findOpenSpawnY(8, 8) ?? 50;
    this.player.pos.set(8, spawnY, 8);
    this.mode = 'playing';
    this.canvas.requestPointerLock();
    this.showMsg('Réapparition!', '#aff');
    this.emit();
  }

  openInventory(): void {
    this.mode = 'inventory';
    document.exitPointerLock();
    this.emit();
  }

  openCraft(station: Station = 'inv'): void {
    this.mode = 'craft';
    this.craftStation = station;
    document.exitPointerLock();
    this.emit();
  }

  openFurnace(): void {
    this.mode = 'furnace';
    document.exitPointerLock();
    this.emit();
  }

  openBlast(): void {
    this.mode = 'blast';
    document.exitPointerLock();
    this.emit();
  }

  closeAll(): void {
    if (this.mode === 'playing' || this.mode === 'death' || this.mode === 'start') return;
    this.mode = 'playing';
    this.canvas.requestPointerLock();
    this.emit();
  }

  useItem(invIdx: number, fromHotbar: boolean): void {
    const arr = fromHotbar ? this.player.hotbar : this.player.inv;
    const item = arr[invIdx];
    if (!item) return;
    const info = IINFO[item.id as string];
    const armorTypes: (keyof Player['armor'])[] = ['helmet', 'chest', 'legs', 'boots'];
    if (info?.type && armorTypes.includes(info.type as keyof Player['armor'])) {
      const slot = info.type as keyof Player['armor'];
      const prev = this.player.armor[slot];
      if (prev) invAdd(this.player, prev.id, 1);
      this.player.armor[slot] = { id: item.id, qty: 1 };
      arr[invIdx] = null;
      this.emit();
      return;
    }
    if (info?.food) {
      this.player.food = Math.min(this.player.maxFood, this.player.food + info.food);
      item.qty--;
      if (item.qty <= 0) arr[invIdx] = null;
      this.showMsg('🍗 +' + info.food, '#afa');
      this.emit();
    }
  }

  unequipArmor(slot: keyof Player['armor']): void {
    const piece = this.player.armor[slot];
    if (!piece) return;
    // Only clear the slot if the piece actually fit somewhere in the
    // inventory. invAdd returns false for unknown ids or a fully full
    // inventory — silently destroying the piece is the kind of data loss
    // the player can't undo.
    if (!invAdd(this.player, piece.id, 1)) {
      this.showMsg('Inventaire plein!', '#f44');
      return;
    }
    this.player.armor[slot] = null;
    this.emit();
  }

  canCraft(r: Recipe): boolean {
    return Object.entries(r.cost).every(([k, v]) => {
      if (isBlockCostKey(k)) return invCount(this.player, parseInt(k), true) >= v;
      return invCount(this.player, k, false) >= v;
    });
  }

  doCraft(r: Recipe): boolean {
    if (!this.canCraft(r)) return false;
    for (const [k, v] of Object.entries(r.cost)) {
      if (isBlockCostKey(k)) invRemove(this.player, parseInt(k), v, true);
      else invRemove(this.player, k, v, false);
    }
    invAdd(this.player, r.id, r.qty || 1, !!r.block);
    this.showMsg('⚒ Fabriqué!', '#aff');
    this.emit();
    return true;
  }

  // Recipes available for the currently open crafting menu. The workbench
  // (station='craft') also exposes the inventory recipes — at a workbench
  // you naturally have the 2x2 grid available too. The forge is a focused
  // station and only shows its own recipes.
  getRecipes(): Recipe[] {
    const s = this.craftStation;
    if (s === 'forge') return RECIPES.filter(r => r.station === 'forge');
    if (s === 'craft') return RECIPES.filter(r => r.station === 'craft' || r.station === 'inv');
    return RECIPES.filter(r => r.station === 'inv');
  }

  invCountFor(id: string | number, block = false): number {
    return invCount(this.player, id, block);
  }

  fAddOre(): boolean {
    if (this.furnace.ore) return false;
    if (invRemove(this.player, 'iron_raw', 1, false)) {
      this.furnace.ore = 'iron_raw';
      this.emit();
      return true;
    }
    this.showMsg('Pas de minerai de fer!', '#f44');
    return false;
  }
  // Try each fuel in priority order and consume the first one available.
  // Returns true on success.
  fAddFuel(): boolean {
    if (this.furnace.fuel) return false;
    for (const f of FURNACE_FUELS) {
      if (f.block) {
        if (invCount(this.player, f.key as number, true) > 0) {
          invRemove(this.player, f.key as number, 1, true);
          this.furnace.fuel = f.id;
          this.emit();
          return true;
        }
      } else {
        if (invCount(this.player, f.key as string, false) > 0) {
          invRemove(this.player, f.key as string, 1, false);
          this.furnace.fuel = f.id;
          this.emit();
          return true;
        }
      }
    }
    this.showMsg('Pas de combustible! (charbon, planche, bois)', '#f44');
    return false;
  }
  fCollect(): void {
    if (this.furnace.result) {
      invAdd(this.player, this.furnace.result, 1);
      this.furnace.result = null;
      this.showMsg('✅ Lingot collecté!', '#aff');
      this.emit();
    }
  }
  startSmelt(): void {
    if (this.furnace.ore === null && !this.fAddOre()) return;
    if (this.furnace.fuel === null && !this.fAddFuel()) return;
    this.furnace.smelting = true;
    this.furnace.progress = 0;
    this.emit();
  }

  // Blast furnace: smelt 1 ada_alloy + 1 iron_ingot (catalyst) with coal
  // fuel into 1 ada_ingot (adamantite). Mirrors the regular furnace flow
  // but with two consumed inputs.
  blAddAlloy(): boolean {
    if (this.blast.alloy) return false;
    if (invRemove(this.player, 'ada_alloy', 1, false)) {
      this.blast.alloy = 'ada_alloy';
      this.emit();
      return true;
    }
    this.showMsg("Pas d'alliage d'adamantium!", '#f44');
    return false;
  }
  blAddIron(): boolean {
    if (this.blast.iron) return false;
    if (invRemove(this.player, 'iron_ingot', 1, false)) {
      this.blast.iron = 'iron_ingot';
      this.emit();
      return true;
    }
    this.showMsg('Pas de lingot de fer!', '#f44');
    return false;
  }
  blAddFuel(): boolean {
    if (this.blast.fuel) return false;
    if (invRemove(this.player, 'coal', 1, false)) {
      this.blast.fuel = 'coal';
      this.emit();
      return true;
    }
    this.showMsg('Pas de charbon!', '#f44');
    return false;
  }
  blCollect(): void {
    if (this.blast.result) {
      invAdd(this.player, this.blast.result, 1);
      this.blast.result = null;
      this.showMsg('✅ Adamantite collectée!', '#aff');
      this.emit();
    }
  }
  startBlast(): void {
    if (this.blast.alloy === null && !this.blAddAlloy()) return;
    if (this.blast.iron === null && !this.blAddIron()) return;
    if (this.blast.fuel === null && !this.blAddFuel()) return;
    this.blast.smelting = true;
    this.blast.progress = 0;
    this.emit();
  }

  setHotbarSel(i: number): void {
    this.player.sel = Math.max(0, Math.min(8, i));
    this.emit();
  }

  private onMobKilled(mob: Mob): void {
    this.showMsg(mob.info.drops.map(d => IINFO[d.id as string]?.emoji || '').join('') + ' récupéré!', '#aff');
  }

  private showMsg(text: string, color = '#fff'): void {
    this.msg = { text, color, expires: Date.now() + 2200 };
    this.emit();
  }

  private takeDmg(dmg: number): void {
    const armor = Object.values(this.player.armor).reduce(
      (s, p) => s + (p ? IINFO[p.id as string]?.armor ?? 0 : 0),
      0,
    ) >> 2;
    dmg = Math.max(1, dmg - armor);
    this.player.health = Math.max(0, this.player.health - dmg);
    this.showMsg(`💥 -${dmg}❤️`, '#f44');
    if (this.player.health <= 0) this.die();
    this.emit();
  }

  private die(): void {
    this.player.dead = true;
    this.mode = 'death';
    // Death wipes the save — you can't continue a dead run.
    clearSave();
    this.hasSavedData = false;
    document.exitPointerLock();
    this.emit();
  }

  // Speed of the held tool when applied to the given block. The base table
  // is per material; we add a 50% bonus when the tool type matches the
  // block's preferred tool (e.g., pick on stone), and a 50% penalty when
  // it doesn't. Bare hands always return 1.
  private getBreakSpd(blockId: number): number {
    const sl = this.player.hotbar[this.player.sel];
    if (!sl || !sl.id) return 1;
    const info = IINFO[sl.id as string];
    if (!info?.mat) return 1;
    const base = ({ wood: 1.5, stone: 2, iron: 3, diamond: 5, ada: 8 } as Record<string, number>)[info.mat] ?? 1;
    const blockTool = BD[blockId]?.tool;
    if (!blockTool) return base;
    if (info.type === blockTool) return base * 1.5;
    return base * 0.5;
  }

  // Tier of the tool the player is holding (0 if bare hands or non-mining
  // tool). Used to gate drops behind a minimum tool tier.
  private getToolTier(): number {
    const sl = this.player.hotbar[this.player.sel];
    if (!sl || !sl.id) return 0;
    const info = IINFO[sl.id as string];
    if (!info?.mat) return 0;
    return MAT_TIER[info.mat] ?? 0;
  }

  private handleBreakAndPlace(dt: number): void {
    if (this.player.dead) return;
    const hit = raycast(this.bundle.camera);
    if (this.mbtn[0] && hit) {
      if (!this.breakTarget || this.breakTarget.bx !== hit.bx || this.breakTarget.by !== hit.by || this.breakTarget.bz !== hit.bz) {
        this.breakTarget = { bx: hit.bx, by: hit.by, bz: hit.bz };
        this.breakProgress = 0;
      }
      const hard = BD[hit.bid]?.hard ?? 2;
      this.breakProgress += dt * this.getBreakSpd(hit.bid) / hard;
      if (this.breakProgress >= 1) {
        this.breakProgress = 0;
        this.breakTarget = null;
        const def = BD[hit.bid];
        const required = def?.tier ?? 0;
        const playerTier = this.getToolTier();
        if (required > playerTier) {
          // Block breaks but no drop — like Minecraft: punching stone with
          // bare hands gets you nothing.
          this.showMsg('❌ Outil trop faible — rien lâché', '#f88');
        } else {
          const drops = DROPS[hit.bid] ?? [];
          for (const d of drops) invAdd(this.player, d.id, d.qty + (Math.random() < 0.2 ? 1 : 0), d.block || false);
          if (drops.length) {
            this.showMsg(drops.map(d => d.block ? BD[d.id as number]?.emoji : IINFO[d.id as string]?.emoji || '').join('') + ' +1', '#aff');
          }
        }
        wSet(hit.bx, hit.by, hit.bz, 0);
        this.chunkMgr.rebuildAround(hit.bx, hit.bz);
        this.emit();
      }
    } else { this.breakProgress = 0; this.breakTarget = null; }

    if (this.mbtn[2] && hit) {
      const now = Date.now();
      if (now - this.lastPlace > 280) {
        this.lastPlace = now;
        if (hit.bid === 14) { this.openCraft('craft'); return; }
        if (hit.bid === 15) { this.openFurnace(); return; }
        if (hit.bid === 17) { this.openCraft('forge'); return; }
        if (hit.bid === 18) { this.openBlast(); return; }
        const sl = this.player.hotbar[this.player.sel];
        if (sl && sl.block) {
          const px = hit.bx + hit.face[0], py = hit.by + hit.face[1], pz = hit.bz + hit.face[2];
          const pp = this.player.pos;
          if (Math.floor(pp.x) === px && (Math.floor(pp.y) === py || Math.floor(pp.y + 1) === py) && Math.floor(pp.z) === pz) return;
          wSet(px, py, pz, sl.id as number);
          sl.qty--;
          if (sl.qty <= 0) this.player.hotbar[this.player.sel] = null;
          this.chunkMgr.rebuildAround(px, pz);
          this.emit();
        }
      }
    }
  }

  private updateFurnaceTick(dt: number): void {
    if (!this.furnace.smelting) return;
    this.furnace.progress = Math.min(1, this.furnace.progress + dt / 5);
    if (this.furnace.progress >= 1) {
      this.furnace.smelting = false;
      // Only iron is smelted in the regular furnace — adamantium goes
      // through the forge → blast furnace pipeline.
      this.furnace.result = 'iron_ingot';
      this.furnace.ore = null;
      this.furnace.fuel = null;
      this.showMsg('✅ Fonte terminée!', '#aff');
    }
    this.emit();
  }

  private updateBlastTick(dt: number): void {
    if (!this.blast.smelting) return;
    // Slower than the regular furnace — adamantite is end-game.
    this.blast.progress = Math.min(1, this.blast.progress + dt / 8);
    if (this.blast.progress >= 1) {
      this.blast.smelting = false;
      this.blast.result = 'ada_ingot';
      this.blast.alloy = null;
      this.blast.iron = null;
      this.blast.fuel = null;
      this.showMsg('✅ Adamantite forgée!', '#aff');
    }
    this.emit();
  }

  private updatePlayer(dt: number): void {
    const prevPos = this.player.pos.clone();
    playerMove(this.player, this.keys, dt);

    this.player.foodTimer += dt;
    if (this.player.foodTimer > 5) {
      this.player.foodTimer = 0;
      if (this.player.food > 0) this.player.food--;
      else this.player.health = Math.max(1, this.player.health - 1);
      if (this.player.food >= 18 && this.player.health < this.player.maxHealth) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
      }
    }

    const bx = Math.floor(this.player.pos.x), by = Math.floor(this.player.pos.y), bz = Math.floor(this.player.pos.z);
    if (wGet(bx, by, bz) === 12) {
      const n = Date.now();
      if (n - this.player.lastDmg > 800) { this.player.lastDmg = n; this.takeDmg(2); }
    }
    if (this.player.pos.y < -10) {
      this.player.health = 0;
      this.die();
    }
    void prevPos;

    this.bundle.camera.position.set(
      this.player.pos.x + 0.5,
      this.player.pos.y + 1.62,
      this.player.pos.z + 0.5,
    );
    this.bundle.camera.rotation.order = 'YXZ';
    this.bundle.camera.rotation.y = this.player.yaw;
    this.bundle.camera.rotation.x = this.player.pitch;

    this.coords = {
      x: Math.floor(this.player.pos.x),
      y: Math.floor(this.player.pos.y),
      z: Math.floor(this.player.pos.z),
    };
  }

  private loop(t: number): void {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min((t - this.last) / 1000, 0.05);
    this.last = t;
    this.frame++;

    if (this.mode === 'playing') {
      updateSky(this.bundle, this.dayNight, dt);
      this.todLabel = (this.dayNight.isDay ? '☀️ Jour' : '🌙 Nuit') + ' ' + Math.floor(this.dayNight.worldTime * 100) + '%';
      this.updatePlayer(dt);
      this.handleBreakAndPlace(dt);
      this.mobMgr.update(dt, this.dayNight.isDay, d => this.takeDmg(d));
      this.updateFurnaceTick(dt);
      this.updateBlastTick(dt);
      if (this.frame % 60 === 0) this.mobMgr.spawnAround(this.dayNight.isDay, MAX_MOBS);
      this.chunkMgr.update(this.player.pos.x, this.player.pos.z, RDIST);
    }

    if (this.msg && Date.now() > this.msg.expires) {
      this.msg = null;
    }

    if (this.frame % 10 === 0) this.emit();

    this.bundle.renderer.render(this.bundle.scene, this.bundle.camera);
  }

  private bindInputs(): void {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === 'Escape') { this.closeAll(); return; }
    if (['1','2','3','4','5','6','7','8','9'].includes(e.key)) {
      this.setHotbarSel(+e.key - 1); return;
    }
    if (e.code === 'KeyE') {
      if (this.mode === 'inventory') this.closeAll();
      else if (this.mode === 'playing') this.openInventory();
      return;
    }
    if (e.code === 'KeyC') {
      if (this.mode === 'craft') this.closeAll();
      else if (this.mode === 'playing') this.openCraft('inv');
      return;
    }
  };
  private onKeyUp = (e: KeyboardEvent) => { delete this.keys[e.code]; };
  private onMouseDown = (e: MouseEvent) => {
    if (this.mode !== 'playing') return;
    if (!this.pLocked) { this.canvas.requestPointerLock(); return; }
    this.mbtn[e.button] = true;
    if (e.button === 0) {
      this.mobMgr.attackNearest(this.player, (mob, dmg) => {
        this.showMsg(`⚔️ -${dmg} ${mob.info.emoji}`, '#fa0');
      });
    }
  };
  private onMouseUp = (e: MouseEvent) => { delete this.mbtn[e.button]; };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.pLocked) return;
    this.player.yaw -= e.movementX * 0.002;
    this.player.pitch = Math.max(-1.55, Math.min(1.55, this.player.pitch - e.movementY * 0.002));
  };
  private onContextMenu = (e: Event) => { e.preventDefault(); };
  private onPointerLockChange = () => {
    this.pLocked = document.pointerLockElement === this.canvas;
  };
  private onResize = () => {
    this.bundle.renderer.setSize(window.innerWidth, window.innerHeight);
    this.bundle.camera.aspect = window.innerWidth / window.innerHeight;
    this.bundle.camera.updateProjectionMatrix();
  };

  // Expose Vector3 type bridge for React components.
  static posVec(): Vector3 { return new Vector3(); }
}