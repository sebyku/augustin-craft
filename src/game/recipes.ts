export type ItemId = string | number;

// Where the recipe is craftable.
//   'inv'   — anywhere (the player's basic crafting: planks, sticks, table)
//   'craft' — at a placed crafting table (id 14)
//   'forge' — at a placed forge table (id 17)
// Smelting (furnace, blast furnace) is not modelled as a Recipe; it has its
// own state machine in Game.ts.
export type Station = 'inv' | 'craft' | 'forge';

export interface Recipe {
  id: ItemId;
  cat: string;
  emoji: string;
  // Cost keys are interpreted per-key: numeric strings are block ids,
  // non-numeric strings are item ids. The output `block` flag is independent.
  cost: Record<string, number>;
  block?: boolean;
  qty?: number;
  station: Station;
}

// Helper builders so the bulk of similar recipes stay readable.
const tool = (id: string, mat: string | number, stickQty: number, matQty: number, emoji: string): Recipe => ({
  id, cat: 'Outils', emoji, station: 'craft',
  cost: { [String(mat)]: matQty, stick: stickQty },
});

const armor = (id: string, mat: string | number, qty: number, emoji: string): Recipe => ({
  id, cat: 'Armure', emoji, station: 'craft',
  cost: { [String(mat)]: qty },
});

export const RECIPES: Recipe[] = [
  // ---- Inventory recipes (no station) ----
  { id: 16, cat: 'Base', emoji: '🟫', cost: { 6: 1 }, block: true, qty: 4, station: 'inv' },
  { id: 'stick', cat: 'Base', emoji: '🥢', cost: { 16: 2 }, qty: 4, station: 'inv' },
  { id: 14, cat: 'Base', emoji: '⚒', cost: { 16: 4 }, block: true, qty: 1, station: 'inv' },

  // ---- Workbench: tools, MC-style (planks/stone block id as raw mat,
  // ingot string id for metal tiers). Pick/axe = 3 mat + 2 stick; sword =
  // 2 mat + 1 stick; shovel = 1 mat + 2 stick; hoe = 2 mat + 2 stick.
  // Wood tier (mat = plank block 16)
  tool('wood_pick', 16, 2, 3, '⛏'),
  tool('wood_axe', 16, 2, 3, '🪓'),
  tool('wood_sword', 16, 1, 2, '⚔️'),
  tool('wood_shovel', 16, 2, 1, '🥄'),
  tool('wood_hoe', 16, 2, 2, '⚒️'),
  // Stone tier (mat = stone block 3)
  tool('stone_pick', 3, 2, 3, '⛏'),
  tool('stone_axe', 3, 2, 3, '🪓'),
  tool('stone_sword', 3, 1, 2, '⚔️'),
  tool('stone_shovel', 3, 2, 1, '🥄'),
  tool('stone_hoe', 3, 2, 2, '⚒️'),
  // Iron tier (mat = iron_ingot)
  tool('iron_pick', 'iron_ingot', 2, 3, '⛏'),
  tool('iron_axe', 'iron_ingot', 2, 3, '🪓'),
  tool('iron_sword', 'iron_ingot', 1, 2, '⚔️'),
  tool('iron_shovel', 'iron_ingot', 2, 1, '🥄'),
  tool('iron_hoe', 'iron_ingot', 2, 2, '⚒️'),
  // Diamond tier (mat = diamond)
  tool('diamond_pick', 'diamond', 2, 3, '⛏'),
  tool('diamond_axe', 'diamond', 2, 3, '🪓'),
  tool('diamond_sword', 'diamond', 1, 2, '⚔️'),
  tool('diamond_shovel', 'diamond', 2, 1, '🥄'),
  tool('diamond_hoe', 'diamond', 2, 2, '⚒️'),
  // Adamantite tier (mat = ada_ingot — the smelted alloy from the blast furnace)
  tool('ada_pick', 'ada_ingot', 2, 3, '⛏'),
  tool('ada_axe', 'ada_ingot', 2, 3, '🪓'),
  tool('ada_sword', 'ada_ingot', 1, 2, '⚔️'),
  tool('ada_shovel', 'ada_ingot', 2, 1, '🥄'),
  tool('ada_hoe', 'ada_ingot', 2, 2, '⚒️'),

  // ---- Workbench: armor ----
  armor('iron_helm', 'iron_ingot', 5, '⛑'),
  armor('iron_chest', 'iron_ingot', 8, '🥋'),
  armor('iron_legs', 'iron_ingot', 7, '👖'),
  armor('iron_boots', 'iron_ingot', 4, '👢'),
  armor('diamond_helm', 'diamond', 5, '⛑'),
  armor('diamond_chest', 'diamond', 8, '🥋'),
  armor('diamond_legs', 'diamond', 7, '👖'),
  armor('diamond_boots', 'diamond', 4, '👢'),
  armor('ada_helm', 'ada_ingot', 5, '⛑'),
  armor('ada_chest', 'ada_ingot', 8, '🥋'),
  armor('ada_legs', 'ada_ingot', 7, '👖'),
  armor('ada_boots', 'ada_ingot', 4, '👢'),

  // ---- Workbench: stations ----
  { id: 15, cat: 'Blocs', emoji: '🔥', cost: { 3: 8 }, block: true, qty: 1, station: 'craft' },
  { id: 17, cat: 'Blocs', emoji: '🛠', cost: { 16: 4, iron_ingot: 2 }, block: true, qty: 1, station: 'craft' },
  { id: 18, cat: 'Blocs', emoji: '🏭', cost: { iron_ingot: 5, 3: 3, 15: 1 }, block: true, qty: 1, station: 'craft' },

  // ---- Forge: fuse diamond + raw adamantium into the alloy that the
  // blast furnace then refines into adamantite ingots.
  { id: 'ada_alloy', cat: 'Forge', emoji: '🔮', cost: { diamond: 1, ada_raw: 1 }, station: 'forge' },
];

export interface DropEntry {
  id: ItemId;
  qty: number;
  block?: boolean;
}

// Mining drops. Iron and adamantium ore drop their *raw* items (not the
// block) because they need to be smelted before becoming usable.
export const DROPS: Record<number, DropEntry[]> = {
  1: [{ id: 2, qty: 1, block: true }],
  2: [{ id: 2, qty: 1, block: true }],
  3: [{ id: 3, qty: 1, block: true }],
  4: [{ id: 4, qty: 1, block: true }],
  5: [{ id: 5, qty: 1, block: true }],
  6: [{ id: 6, qty: 1, block: true }],
  7: [],
  8: [{ id: 'coal', qty: 1 }],
  9: [{ id: 'iron_raw', qty: 1 }],
  10: [{ id: 'diamond', qty: 1 }],
  11: [{ id: 'ada_raw', qty: 1 }],
  12: [{ id: 12, qty: 1, block: true }],
  13: [],
  14: [{ id: 14, qty: 1, block: true }],
  15: [{ id: 15, qty: 1, block: true }],
  16: [{ id: 16, qty: 1, block: true }],
  17: [{ id: 17, qty: 1, block: true }],
  18: [{ id: 18, qty: 1, block: true }],
};

// True when the cost key refers to a block id (numeric string) rather than
// a string item id. Centralised so call sites don't drift.
export function isBlockCostKey(k: string): boolean {
  return /^\d+$/.test(k);
}
