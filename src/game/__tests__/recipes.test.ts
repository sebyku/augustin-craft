import { describe, expect, it } from 'vitest';
import { BD } from '../blocks';
import { IINFO } from '../items';
import { DROPS, RECIPES } from '../recipes';

describe('RECIPES', () => {
  it('every recipe has a defined emoji, cat, and cost', () => {
    for (const r of RECIPES) {
      expect(r.emoji).toBeTypeOf('string');
      expect(r.cat).toBeTypeOf('string');
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
        if (r.block && !isNaN(+k)) {
          expect(BD[parseInt(k)], `cost block ${k} missing`).toBeDefined();
        } else {
          expect(IINFO[k], `cost item ${k} missing`).toBeDefined();
        }
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