export type ItemId = string | number;

export interface Recipe {
  id: ItemId;
  cat: string;
  emoji: string;
  cost: Record<string, number>;
  block?: boolean;
  qty?: number;
}

export const RECIPES: Recipe[] = [
  { id: 'iron_pick', cat: 'Outils', emoji: '⛏', cost: { iron_ingot: 3 } },
  { id: 'iron_sword', cat: 'Outils', emoji: '⚔️', cost: { iron_ingot: 2 } },
  { id: 'iron_axe', cat: 'Outils', emoji: '🪓', cost: { iron_ingot: 3 } },
  { id: 'diamond_pick', cat: 'Outils', emoji: '⛏', cost: { diamond: 3 } },
  { id: 'diamond_sword', cat: 'Outils', emoji: '⚔️', cost: { diamond: 2 } },
  { id: 'diamond_axe', cat: 'Outils', emoji: '🪓', cost: { diamond: 3 } },
  { id: 'ada_pick', cat: 'Outils', emoji: '⛏', cost: { ada_ingot: 3 } },
  { id: 'ada_sword', cat: 'Outils', emoji: '⚔️', cost: { ada_ingot: 2 } },
  { id: 'ada_axe', cat: 'Outils', emoji: '🪓', cost: { ada_ingot: 3 } },
  { id: 'iron_helm', cat: 'Armure', emoji: '⛑', cost: { iron_ingot: 5 } },
  { id: 'iron_chest', cat: 'Armure', emoji: '🥋', cost: { iron_ingot: 8 } },
  { id: 'iron_legs', cat: 'Armure', emoji: '👖', cost: { iron_ingot: 7 } },
  { id: 'iron_boots', cat: 'Armure', emoji: '👢', cost: { iron_ingot: 4 } },
  { id: 'diamond_helm', cat: 'Armure', emoji: '⛑', cost: { diamond: 5 } },
  { id: 'diamond_chest', cat: 'Armure', emoji: '🥋', cost: { diamond: 8 } },
  { id: 'diamond_legs', cat: 'Armure', emoji: '👖', cost: { diamond: 7 } },
  { id: 'diamond_boots', cat: 'Armure', emoji: '👢', cost: { diamond: 4 } },
  { id: 'ada_helm', cat: 'Armure', emoji: '⛑', cost: { ada_ingot: 5 } },
  { id: 'ada_chest', cat: 'Armure', emoji: '🥋', cost: { ada_ingot: 8 } },
  { id: 'ada_legs', cat: 'Armure', emoji: '👖', cost: { ada_ingot: 7 } },
  { id: 'ada_boots', cat: 'Armure', emoji: '👢', cost: { ada_ingot: 4 } },
  { id: 14, cat: 'Blocs', emoji: '⚒', cost: { 6: 4 }, block: true, qty: 1 },
  { id: 15, cat: 'Blocs', emoji: '🔥', cost: { 3: 8 }, block: true, qty: 1 },
];

export interface DropEntry {
  id: ItemId;
  qty: number;
  block?: boolean;
}

export const DROPS: Record<number, DropEntry[]> = {
  1: [{ id: 2, qty: 1, block: true }],
  2: [{ id: 2, qty: 1, block: true }],
  3: [{ id: 3, qty: 1, block: true }],
  4: [{ id: 4, qty: 1, block: true }],
  5: [{ id: 5, qty: 1, block: true }],
  6: [{ id: 6, qty: 1, block: true }],
  7: [],
  8: [{ id: 'coal', qty: 1 }],
  9: [{ id: 9, qty: 1, block: false }],
  10: [{ id: 'diamond', qty: 1 }],
  11: [{ id: 11, qty: 1, block: false }],
  12: [{ id: 12, qty: 1, block: true }],
  13: [],
  14: [{ id: 14, qty: 1, block: true }],
  15: [{ id: 15, qty: 1, block: true }],
};