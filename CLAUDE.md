# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Augustin Craft — a Minecraft-inspired 3D voxel game. Originally a single 1472-line
`EduPhyton_Craft_3D_v3.html` file; migrated to a modular React + TypeScript + Vite
project using Three.js for rendering.

## Commands

```bash
npm run dev           # dev server at http://localhost:5173
npm run build         # tsc -b && vite build (type-check is gating)
npm run lint          # ESLint
npm test              # vitest run (CI mode, one-shot)
npm run test:watch    # vitest watch mode
npm run test:ui       # vitest web UI
```

Run a single test file:
```bash
npx vitest run src/game/__tests__/inventory.test.ts
```

Run a single test by name pattern:
```bash
npx vitest run -t "stacks into an existing slot"
```

## Architecture

The codebase has three distinct layers. Keep them separated — crossing the boundary
in the wrong direction defeats testability.

```
src/game/      →  pure logic, no DOM, no Three.js (only three's Vector3 in player.ts)
src/engine/    →  Three.js + imperative game loop; depends on src/game/
src/components/ →  React UI; reads from Game via Snapshot subscription
src/App.tsx    →  mounts canvas, owns the Game instance, routes Snapshot.mode
```

**Why this shape:** the original HTML mixed all three layers in one file. The split
exists so the pure-logic layer (`src/game/`) stays unit-testable without a DOM or
WebGL context. Do not import `three` or `document` into `src/game/` (except `Vector3`
in `player.ts`, which is a value type).

### The Game class (`src/engine/Game.ts`)

Single orchestrator that owns:
- the Three.js `SceneBundle`, `ChunkManager`, `MobManager`
- the mutable `player` state
- input listeners, pointer-lock state, the RAF loop
- `mode: ScreenMode` state (`start` | `playing` | `inventory` | `craft` | `furnace` | `death`)

React talks to it exclusively through:
- `game.subscribe(fn)` — React gets a fresh immutable `Snapshot` every ~10 frames
  and on every state change (`emit()` is called after mutations)
- Imperative commands: `game.start()`, `game.openInventory()`, `game.doCraft(r)`, etc.

**Do not reach into `game.player` from React.** Read `Snapshot` instead. The
snapshot is a deep-ish clone specifically so React can diff/render without
racing against the game loop.

### World generation pipeline

`src/game/world-gen.ts` is the only source of truth for block data:

1. `getBiomeVal(wx, wz)` — fbm → cached float in ~[0, 1]
2. `getBiome(wx, wz)` — thresholds the biome value → `'desert' | 'plain' | 'ice'`
3. `getHeight(wx, wz)` — fbm + biome blending → surface Y, cached
4. `getOre(wx, y, wz)` — 3D fbm → ore block id or stone (id 3)
5. `isCave(wx, y, wz)` — two 3D value-noise fields near 0.5 → boolean
6. `genChunk(cx, cz)` — populates a `Uint8Array(CHUNK * WH * CHUNK)` using the above
7. `wGet(x, y, z)` / `wSet(x, y, z, id)` — the only API other modules should use

The `mods` map shadows generated chunks, so player edits survive regen and don't
require rebuilding the chunk `Uint8Array`. `ChunkManager.rebuildAround(wx, wz)`
rebuilds the mesh for the 3×3 chunk neighborhood after any edit.

The caches `_biomeValCache` and `_heightCache` self-evict at 12000 entries. If you
touch generation parameters, clear them via `resetWorld()` or tests will leak
state across runs (see `src/game/__tests__/world-gen.test.ts` `afterEach`).

### Block vs item duality

Slots, recipes, and drops all carry a `block: boolean` flag that disambiguates
two parallel namespaces:
- **blocks** — numeric ids, keyed in `BD` (`src/game/blocks.ts`), id `0` is air
- **items** — string ids, keyed in `IINFO` (`src/game/items.ts`)

Mined ores like iron (id 9) and adamantium (id 11) are stored as *non-block items*
(`block: false`) because they must be smelted before becoming ingots. The furnace
`selectedOre` uses block ids 9 and 11, not 7/9 as in the original HTML file —
there was a bug in the source where the `<select>` values didn't match `BD`; the
fix is preserved in `FurnaceMenu.tsx` and `Game.ts`.

### TypeScript constraints

`tsconfig.app.json` enables `erasableSyntaxOnly` and `verbatimModuleSyntax`. This
means:
- **No constructor parameter properties** (`constructor(private x: T)`). Declare
  fields explicitly and assign in the constructor body.
- **All type-only imports must use `import type`**.

Both tripped up the initial migration — if `tsc -b` complains about TS1294,
this is why.

## Testing

Vitest runs with `happy-dom` (`vite.config.ts`). Tests live in
`src/**/__tests__/*.test.ts`. Only the pure-logic layer is tested; the engine
and React components are exercised manually via `npm run dev`.

When adding tests:
- If your test touches `wGet` / `genChunk` / caches, call `resetWorld()` in
  `afterEach` (see `world-gen.test.ts`).
- `_hash2(x, z)` is XOR-symmetric: `_hash2(a, b)` can equal `_hash2(b, a)` for
  certain inputs. Don't assert strict inequality on small nearby inputs (see
  the `noise.test.ts` comments).

## Key constants

In `src/game/constants.ts`:
- `CHUNK = 16`, `WH = 64` — horizontal chunk width, world height
- `RDIST = 2` — render distance in chunks; raising this hurts FPS quickly
- `GRAV = -22`, `JUMP = 8.5`, `SPD = 5.2` — player physics
- `MAX_MOBS = 14` — concurrent-mob cap; mobs > 55 units from player auto-despawn