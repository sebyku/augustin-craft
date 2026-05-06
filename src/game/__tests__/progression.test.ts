// End-to-end-ish test of the tier progression: bare hands → wood → stone
// → iron → diamond → adamantite. Exercises the recipe and inventory
// layers directly (no DOM, no Game class) — enough to catch a broken
// chain in CI before someone notices in-game.
import { describe, expect, it } from 'vitest';
import { BD, MAT_TIER } from '../blocks';
import { invAdd, invCount, invRemove } from '../inventory';
import { IINFO } from '../items';
import type { Player } from '../player';
import { createPlayer } from '../player';
import type { Recipe } from '../recipes';
import { RECIPES, isBlockCostKey } from '../recipes';

function craft(p: Player, id: string | number): boolean {
  const r = RECIPES.find(rr => rr.id === id);
  if (!r) throw new Error(`unknown recipe ${id}`);
  if (!canCraft(p, r)) return false;
  for (const [k, v] of Object.entries(r.cost)) {
    if (isBlockCostKey(k)) invRemove(p, parseInt(k), v, true);
    else invRemove(p, k, v, false);
  }
  invAdd(p, r.id, r.qty || 1, !!r.block);
  return true;
}

function canCraft(p: Player, r: Recipe): boolean {
  return Object.entries(r.cost).every(([k, v]) =>
    isBlockCostKey(k)
      ? invCount(p, parseInt(k), true) >= v
      : invCount(p, k, false) >= v,
  );
}

// Mirrors Game.getToolTier: tool material → tier, or 0 for non-tools.
function toolTier(toolId: string | null): number {
  if (!toolId) return 0;
  const info = IINFO[toolId];
  if (!info?.mat) return 0;
  return MAT_TIER[info.mat] ?? 0;
}

function canMine(toolId: string | null, blockId: number): boolean {
  return toolTier(toolId) >= (BD[blockId]?.tier ?? 0);
}

describe('tier-mining gating', () => {
  it('bare hands cannot mine stone, but a wood pick can', () => {
    expect(canMine(null, 3)).toBe(false);
    expect(canMine('wood_pick', 3)).toBe(true);
  });

  it('wood pick cannot mine iron or coal — needs stone', () => {
    expect(canMine('wood_pick', 8)).toBe(false);
    expect(canMine('wood_pick', 9)).toBe(false);
    expect(canMine('stone_pick', 8)).toBe(true);
    expect(canMine('stone_pick', 9)).toBe(true);
  });

  it('stone pick cannot mine diamond — needs iron', () => {
    expect(canMine('stone_pick', 10)).toBe(false);
    expect(canMine('iron_pick', 10)).toBe(true);
  });

  it('iron pick cannot mine adamantium — needs diamond', () => {
    expect(canMine('iron_pick', 11)).toBe(false);
    expect(canMine('diamond_pick', 11)).toBe(true);
  });

  it('non-pickaxe tools of the right tier still drop the block', () => {
    // We don't gate by tool *type*, only tier. A diamond shovel can
    // legitimately mine adamantium. (Speed will be slow per
    // getBreakSpd's tool-mismatch penalty, but the drop is intact.)
    expect(canMine('diamond_shovel', 11)).toBe(true);
  });
});

describe('full progression chain (recipes only)', () => {
  it('walks from a single log all the way to a diamond pick', () => {
    const p = createPlayer();

    // Start: 1 log (the player's first hit on a tree).
    invAdd(p, 6, 1, true);

    // 1 log → 4 planks
    expect(craft(p, 16)).toBe(true);
    expect(invCount(p, 16, true)).toBe(4);

    // 4 planks → crafting table (consumes them all)
    expect(craft(p, 14)).toBe(true);
    expect(invCount(p, 14, true)).toBe(1);
    expect(invCount(p, 16, true)).toBe(0);

    // To make tools we need more planks AND sticks. Stock up.
    invAdd(p, 6, 6, true);
    for (let i = 0; i < 6; i++) expect(craft(p, 16)).toBe(true); // 24 planks total
    expect(invCount(p, 16, true)).toBe(24);
    // 2 planks → 4 sticks. Make 8 sticks (enough for several tools).
    expect(craft(p, 'stick')).toBe(true);
    expect(craft(p, 'stick')).toBe(true);
    expect(invCount(p, 'stick')).toBe(8);

    // Wood pick (3 planks + 2 sticks)
    expect(craft(p, 'wood_pick')).toBe(true);
    expect(invCount(p, 'wood_pick')).toBe(1);

    // Mine some stone (simulated via inventory addition).
    invAdd(p, 3, 8, true);
    // Stone pick (3 stone + 2 sticks)
    expect(craft(p, 'stone_pick')).toBe(true);
    // Furnace (8 stone) — we still have 5 stone left after the pick.
    invAdd(p, 3, 8, true);
    expect(craft(p, 15)).toBe(true);
    expect(invCount(p, 15, true)).toBe(1);

    // Mine iron and coal (simulated). Smelt off-test (the furnace is
    // exercised in furnace tests). Just hand the player ingots.
    invAdd(p, 'iron_ingot', 5);
    expect(craft(p, 'iron_pick')).toBe(true);

    // Mine diamond (simulated).
    invAdd(p, 'diamond', 5);
    expect(craft(p, 'diamond_pick')).toBe(true);
    expect(invCount(p, 'diamond_pick')).toBe(1);
  });

  it('forge table requires 4 planks + 2 iron ingots — partial fails, full succeeds', () => {
    const p = createPlayer();
    invAdd(p, 16, 4, true);
    expect(craft(p, 17)).toBe(false); // missing iron
    invAdd(p, 'iron_ingot', 2);
    expect(craft(p, 17)).toBe(true);
    expect(invCount(p, 17, true)).toBe(1);
  });

  it('blast furnace recipe consumes iron + stone + a placed furnace', () => {
    const p = createPlayer();
    invAdd(p, 'iron_ingot', 5);
    invAdd(p, 3, 3, true);
    invAdd(p, 15, 1, true);
    expect(craft(p, 18)).toBe(true);
    expect(invCount(p, 18, true)).toBe(1);
    expect(invCount(p, 15, true)).toBe(0);
  });

  it('forge fuses 1 diamond + 1 raw adamantium into 1 alloy', () => {
    const p = createPlayer();
    invAdd(p, 'diamond', 1);
    invAdd(p, 'ada_raw', 1);
    expect(craft(p, 'ada_alloy')).toBe(true);
    expect(invCount(p, 'ada_alloy')).toBe(1);
    expect(invCount(p, 'diamond')).toBe(0);
    expect(invCount(p, 'ada_raw')).toBe(0);
  });
});
