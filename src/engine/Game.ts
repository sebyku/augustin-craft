import { Vector3 } from 'three';
import { MAX_MOBS, RDIST, WH } from '../game/constants';
import { invAdd, invCount, invRemove } from '../game/inventory';
import { IINFO } from '../game/items';
import type { Player } from '../game/player';
import { createPlayer } from '../game/player';
import { DROPS, RECIPES } from '../game/recipes';
import type { Recipe } from '../game/recipes';
import { mods, resetWorld, wGet, wSet } from '../game/world-gen';
import { buildSave, clearSave, hasSave, readSave, writeSave } from '../game/persistence';
import { buildAtlas } from './atlas';
import type { Atlas } from './atlas';
import { ChunkManager } from './chunk-mesh';
import type { Mob } from './mobs';
import { MobManager } from './mobs';
import { playerMove } from './physics';
import { raycast } from './raycast';
import type { SceneBundle } from './scene';
import { createScene, updateSky } from './scene';
import { BD } from '../game/blocks';


export type ScreenMode = 'start' | 'playing' | 'inventory' | 'craft' | 'furnace' | 'death';

export interface FurnaceState {
  ore: number | null;
  fuel: string | null;
  result: string | null;
  progress: number;
  smelting: boolean;
  selectedOre: number;
}

export interface Snapshot {
  mode: ScreenMode;
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
    ore: null, fuel: null, result: null, progress: 0, smelting: false, selectedOre: 9,
  };
  private mode: ScreenMode = 'start';
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
      msg: this.msg ? { text: this.msg.text, color: this.msg.color } : null,
      hasSave: this.hasSavedData,
    };
  }

  getMode(): ScreenMode { return this.mode; }

  setSelectedOre(id: number): void {
    this.furnace.selectedOre = id;
    this.emit();
  }

  start(): void {
    // New game: wipe any existing save and start fresh.
    clearSave();
    mods.clear();
    this.hasSavedData = false;
    this.mode = 'playing';
    invAdd(this.player, 'coal', 5);
    invAdd(this.player, 2, 20, true);
    invAdd(this.player, 6, 10, true);

    this.chunkMgr.forceBuildInitial(RDIST);
    for (let y = WH - 2; y > 1; y--) {
      if (wGet(8, y, 8) === 0 && wGet(8, y - 1, 8) !== 0) {
        this.player.pos.set(8, y + 0.1, 8);
        break;
      }
    }
    this.showMsg('Bienvenue! E=Inv C=Craft F=Fourneau', '#7ec8e3');
    this.beginLoop();
  }

  continueSaved(): boolean {
    const save = readSave();
    if (!save) return false;

    // Restore mods first so the chunk builder sees the edited world.
    mods.clear();
    for (const [k, v] of save.mods) mods.set(k, v);

    // Restore player.
    this.player.pos.set(save.player.pos[0], save.player.pos[1], save.player.pos[2]);
    this.player.vel.set(0, 0, 0);
    this.player.yaw = save.player.yaw;
    this.player.pitch = save.player.pitch;
    this.player.health = save.player.health;
    this.player.food = save.player.food;
    this.player.hotbar = save.player.hotbar;
    this.player.inv = save.player.inv;
    this.player.armor = save.player.armor;
    this.player.sel = save.player.sel;
    this.player.dead = false;

    // Restore furnace and day/night.
    this.furnace.ore = save.furnace.ore;
    this.furnace.fuel = save.furnace.fuel;
    this.furnace.result = save.furnace.result;
    this.furnace.progress = save.furnace.progress;
    this.furnace.smelting = save.furnace.smelting;
    this.furnace.selectedOre = save.furnace.selectedOre;
    this.dayNight.worldTime = save.worldTime;

    this.mode = 'playing';
    this.chunkMgr.forceBuildInitial(RDIST);
    this.showMsg('Partie restaurée!', '#7ec8e3');
    this.beginLoop();
    return true;
  }

  private beginLoop(): void {
    this.canvas.requestPointerLock();
    this.loop = this.loop.bind(this);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    // Auto-save every 5 seconds during play.
    if (this.saveTimer === null) {
      this.saveTimer = window.setInterval(() => this.save(), 5000);
    }
    this.emit();
  }

  save(): void {
    if (this.mode === 'start' || this.player.dead) return;
    const data = buildSave(this.player, mods, this.furnace, this.dayNight.worldTime);
    writeSave(data);
    this.hasSavedData = true;
  }

  dispose(): void {
    // Persist one last time before tearing down.
    this.save();
    cancelAnimationFrame(this.raf);
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
    this.bundle.renderer.dispose();
    resetWorld();
  }

  private onBeforeUnload = () => { this.save(); };

  respawn(): void {
    this.player.dead = false;
    this.player.health = 20;
    this.player.food = 20;
    this.player.pos.set(8, 50, 8);
    this.player.vel.set(0, 0, 0);
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

  openCraft(): void {
    this.mode = 'craft';
    document.exitPointerLock();
    this.emit();
  }

  openFurnace(): void {
    this.mode = 'furnace';
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
    invAdd(this.player, piece.id, 1);
    this.player.armor[slot] = null;
    this.emit();
  }

  canCraft(r: Recipe): boolean {
    return Object.entries(r.cost).every(([k, v]) => {
      if (r.block && !isNaN(+k)) return invCount(this.player, parseInt(k), true) >= v;
      return invCount(this.player, k) >= v;
    });
  }

  doCraft(r: Recipe): boolean {
    if (!this.canCraft(r)) return false;
    for (const [k, v] of Object.entries(r.cost)) {
      if (r.block && !isNaN(+k)) invRemove(this.player, parseInt(k), v, true);
      else invRemove(this.player, k, v);
    }
    invAdd(this.player, r.id, r.qty || 1, !!r.block);
    this.showMsg('⚒ Fabriqué!', '#aff');
    this.emit();
    return true;
  }

  getRecipes(): Recipe[] { return RECIPES; }

  invCountFor(id: string | number, block = false): number {
    return invCount(this.player, id, block);
  }

  fAddOre(): boolean {
    const sel = this.furnace.selectedOre;
    if (invRemove(this.player, sel, 1, false)) {
      this.furnace.ore = sel;
      this.emit();
      return true;
    }
    this.showMsg('Pas de minerai!', '#f44');
    return false;
  }
  fAddFuel(): boolean {
    if (invRemove(this.player, 'coal', 1, false)) {
      this.furnace.fuel = 'coal';
      this.emit();
      return true;
    }
    this.showMsg('Pas de charbon!', '#f44');
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
    const sel = this.furnace.selectedOre;
    if (!invCount(this.player, sel, false) && this.furnace.ore === null) {
      this.showMsg('Pas de minerai!', '#f44');
      return;
    }
    if (!invCount(this.player, 'coal') && !this.furnace.fuel) {
      this.showMsg('Pas de charbon!', '#f44');
      return;
    }
    if (this.furnace.ore === null) {
      invRemove(this.player, sel, 1, false);
      this.furnace.ore = sel;
    }
    if (!this.furnace.fuel) {
      invRemove(this.player, 'coal', 1, false);
      this.furnace.fuel = 'coal';
    }
    this.furnace.smelting = true;
    this.furnace.progress = 0;
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

  private getBreakSpd(): number {
    const sl = this.player.hotbar[this.player.sel];
    if (!sl || !sl.id) return 1;
    const info = IINFO[sl.id as string];
    if (!info?.mat) return 1;
    return ({ iron: 2, diamond: 4, ada: 8 } as Record<string, number>)[info.mat] ?? 1;
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
      this.breakProgress += dt * this.getBreakSpd() / hard;
      if (this.breakProgress >= 1) {
        this.breakProgress = 0;
        this.breakTarget = null;
        const drops = DROPS[hit.bid] ?? [];
        for (const d of drops) invAdd(this.player, d.id, d.qty + (Math.random() < 0.2 ? 1 : 0), d.block || false);
        if (drops.length) {
          this.showMsg(drops.map(d => d.block ? BD[d.id as number]?.emoji : IINFO[d.id as string]?.emoji || '').join('') + ' +1', '#aff');
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
        if (hit.bid === 14) { this.openCraft(); return; }
        if (hit.bid === 15) { this.openFurnace(); return; }
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
      this.furnace.result = this.furnace.ore === 9 ? 'iron_ingot' : 'ada_ingot';
      this.furnace.ore = null;
      this.furnace.fuel = null;
      this.showMsg('✅ Fonte terminée!', '#aff');
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
      else if (this.mode === 'playing') this.openCraft();
      return;
    }
    if (e.code === 'KeyF') {
      if (this.mode === 'furnace') this.closeAll();
      else if (this.mode === 'playing') this.openFurnace();
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