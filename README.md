# Augustin Craft

A Minecraft-inspired 3D voxel game built with React, TypeScript, Vite, and Three.js.

Originally a single 1472-line HTML file (`EduPhyton_Craft_3D_v3.html`), migrated to
a modular React + TypeScript codebase with unit tests.

## Features

- Procedurally generated infinite world with 3 biomes (plain/forest, desert, ice)
- Cave systems carved by 3D value noise
- Ore veins: coal, iron, diamond, adamantium
- Day/night cycle with sun, moon, and stars
- Hostile mobs (zombies, skeletons) and passive mobs (sheep, cows)
- Crafting, inventory, armor, furnace (smelting)
- Chunk-based mesh generation with face culling

## Controls

- **ZQSD / arrow keys** — move
- **Space** — jump
- **Left click** — break / attack
- **Right click** — place block / interact
- **E** — inventory
- **C** — crafting menu
- **F** — furnace menu
- **1-9** — hotbar slot

## Architecture

```
src/
├── game/            Pure logic (testable, no DOM)
│   ├── blocks.ts        Block definitions
│   ├── items.ts         Item definitions
│   ├── recipes.ts       Crafting recipes & drop tables
│   ├── noise.ts         Value-noise primitives (hash, lerp, fade, fbm)
│   ├── world-gen.ts     Biome, height, ore, cave generation; chunk storage
│   ├── inventory.ts     invAdd / invRemove / invCount (pure)
│   ├── player.ts        Player factory and type
│   └── constants.ts     CHUNK, WH, RDIST, GRAV, JUMP, SPD, DAY_DUR
├── engine/          Three.js rendering & runtime
│   ├── atlas.ts         Procedural pixel-art block atlas
│   ├── chunk-mesh.ts    Chunk geometry builder + ChunkManager
│   ├── scene.ts         Scene, camera, lights, sky, day/night tint
│   ├── physics.ts       Player movement & collision
│   ├── raycast.ts       DDA raycast for block targeting
│   ├── mobs.ts          MobManager (spawn/update/attack/kill)
│   └── Game.ts          Orchestrator class (game loop, input, subscribers)
├── components/      React UI overlays
│   ├── StartScreen.tsx
│   ├── HUD.tsx
│   ├── Inventory.tsx
│   ├── CraftingMenu.tsx
│   ├── FurnaceMenu.tsx
│   └── DeathScreen.tsx
└── App.tsx          Mounts the canvas, subscribes to Game, renders overlays
```

The `Game` class holds all mutable state and runs the render loop. It exposes a
`subscribe(fn)` method; React components receive an immutable `Snapshot` on
every game tick (throttled to every 10 frames) and re-render accordingly.

## Scripts

```bash
npm install       # install dependencies
npm run dev       # start dev server (http://localhost:5173)
npm run build     # type-check and build for production
npm run lint      # run ESLint
npm test          # run unit tests once (vitest)
npm run test:watch  # run tests in watch mode
npm run test:ui   # open the vitest UI
```

## Tests

41 unit tests cover the pure logic modules:

- `noise.test.ts` — hash determinism, fbm, vnoise3
- `inventory.test.ts` — add/remove/count, stacking, partial operations
- `blocks.test.ts` — block def completeness
- `recipes.test.ts` — recipe & drop table integrity
- `world-gen.test.ts` — height/biome/wGet/wSet