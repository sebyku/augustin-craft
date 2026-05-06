import { describe, expect, it } from 'vitest';
import { BD } from '../blocks';
import { IINFO } from '../items';
import { DROPS, RECIPES, isBlockCostKey } from '../recipes';

describe('RECIPES', () => {
  it('every recipe has emoji, cat, cost, and a station', () => {
    for (const r of RECIPES) {
      expect(r.emoji).toBeTypeOf('string');
      expect(r.cat).toBeTypeOf('string');
      expect(['inv', 'craft', 'forge']).toContain(r.station);
      expect(Object.keys(r.cost).length).toBeGreaterThan(0);
    }
  });

  it('every non-block recipe output is a known item', () => {
    for (const r of RECIPES) {
      if (r.block) continue;
      expect(IINFO[r.id as string], `missing item ${r.id}`).toBeDefined();
    }
  });

  it('every block recipe output is a known block', () => {
    for (const r of RECIPES) {
      if (!r.block) continue;
      expect(BD[r.id as number], `missing block ${r.id}`).toBeDefined();
    }
  });

  it('every cost ingredient resolves to a known item or block', () => {
    for (const r of RECIPES) {
      for (const k of Object.keys(r.cost)) {
        if (isBlockCostKey(k)) {
          expect(BD[parseInt(k)], `cost block ${k} missing`).toBeDefined();
        } else {
          expect(IINFO[k], `cost item ${k} missing`).toBeDefined();
        }
      }
    }
  });

  it('exposes the chain milestones expected by the spec', () => {
    // 1 wood log -> 4 planks (inv-craftable, no station required)
    const planks = RECIPES.find(r => r.id === 16);
    expect(planks).toBeDefined();
    expect(planks!.station).toBe('inv');
    expect(planks!.qty).toBe(4);
    expect(planks!.cost).toEqual({ 6: 1 });

    // Crafting table: 4 planks, inv-craftable
    const table = RECIPES.find(r => r.id === 14);
    expect(table?.station).toBe('inv');
    expect(table?.cost).toEqual({ 16: 4 });

    // Forge table: 4 planks + 2 iron ingots, at the workbench
    const forge = RECIPES.find(r => r.id === 17);
    expect(forge?.station).toBe('craft');
    expect(forge?.cost).toEqual({ 16: 4, iron_ingot: 2 });

    // Ada alloy: only at the forge
    const alloy = RECIPES.find(r => r.id === 'ada_alloy');
    expect(alloy?.station).toBe('forge');
    expect(alloy?.cost).toEqual({ diamond: 1, ada_raw: 1 });
  });

  it('every tool tier (wood/stone/iron/diamond/ada) defines the 5 tool types', () => {
    const tools = ['pick', 'sword', 'axe', 'shovel', 'hoe'];
    for (const mat of ['wood', 'stone', 'iron', 'diamond', 'ada']) {
      for (const t of tools) {
        const id = `${mat}_${t}`;
        expect(IINFO[id], `missing item ${id}`).toBeDefined();
        const matKey = mat === 'wood' ? '16' : mat === 'stone' ? '3' : `${mat}_ingot`;
        const recipeMatKey = mat === 'iron' || mat === 'diamond' || mat === 'ada'
          ? (mat === 'diamond' ? 'diamond' : `${mat}_ingot`)
          : matKey;
        const r = RECIPES.find(rr => rr.id === id);
        expect(r, `missing recipe for ${id}`).toBeDefined();
        // Crafting tools always sit on the workbench station.
        expect(r!.station).toBe('craft');
        // And they always require sticks.
        expect(r!.cost.stick).toBeGreaterThan(0);
        // Material is keyed by mat type. We don't enforce the exact qty
        // here (tested via canCraft elsewhere) — just that the right key
        // appears, so a future cost-rebalance doesn't fail the test.
        const matKeyToCheck = isBlockCostKey(recipeMatKey) ? recipeMatKey : recipeMatKey;
        expect(r!.cost[matKeyToCheck]).toBeGreaterThan(0);
      }
    }
  });
});

describe('DROPS', () => {
  it('defines drops for every block id except air', () => {
    for (const id of Object.keys(BD)) {
      const n = parseInt(id);
      if (n === 0) continue;
      expect(DROPS[n], `block ${id} missing from DROPS`).toBeDefined();
    }
  });

  it('leaves and bedrock drop nothing', () => {
    expect(DROPS[7]).toEqual([]);
    expect(DROPS[13]).toEqual([]);
  });

  it('coal_ore drops coal item (not a block)', () => {
    expect(DROPS[8]).toEqual([{ id: 'coal', qty: 1 }]);
  });

  it('iron and adamantium ore drop their raw item, not a block', () => {
    // Critical for the smelting flow: raw -> ingot via furnace/blast.
    expect(DROPS[9]).toEqual([{ id: 'iron_raw', qty: 1 }]);
    expect(DROPS[11]).toEqual([{ id: 'ada_raw', qty: 1 }]);
  });

  it('every drop id resolves to a known item or block', () => {
    for (const drops of Object.values(DROPS)) {
      for (const d of drops) {
        if (d.block) expect(BD[d.id as number]).toBeDefined();
        else if (typeof d.id === 'string') expect(IINFO[d.id]).toBeDefined();
        else expect(BD[d.id]).toBeDefined();
      }
    }
  });
});
