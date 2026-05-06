import { describe, expect, it } from 'vitest';
import { BD, MAT_TIER } from '../blocks';

describe('block definitions', () => {
  it('defines all block ids 0..18', () => {
    for (let i = 0; i <= 18; i++) {
      expect(BD[i], `block ${i} missing`).toBeDefined();
      expect(BD[i].name).toBeTypeOf('string');
    }
  });

  it('air is not solid', () => {
    expect(BD[0].solid).toBe(false);
  });

  it('every solid block has top/side/bot faces defined', () => {
    for (const [id, def] of Object.entries(BD)) {
      if (!def.solid) continue;
      expect(def.top, `block ${id} missing top`).toBeTypeOf('number');
      expect(def.side, `block ${id} missing side`).toBeTypeOf('number');
      expect(def.bot, `block ${id} missing bot`).toBeTypeOf('number');
    }
  });

  it('bedrock has effectively infinite hardness', () => {
    expect(BD[13].hard).toBeGreaterThan(1000);
  });

  it('leaves are transparent', () => {
    expect(BD[7].trans).toBe(true);
  });

  it('ore tiers gate the progression as expected', () => {
    // Stone needs a wood pick; coal/iron need stone; diamond needs iron;
    // adamantium needs diamond. This is the load-bearing chain — if any
    // of these break we ship a soft-locked save.
    expect(BD[3].tier).toBe(1);  // stone
    expect(BD[8].tier).toBe(2);  // coal
    expect(BD[9].tier).toBe(2);  // iron
    expect(BD[10].tier).toBe(3); // diamond
    expect(BD[11].tier).toBe(4); // adamantium
  });

  it('MAT_TIER orders tools wood<stone<iron<diamond<ada', () => {
    expect(MAT_TIER.wood).toBeLessThan(MAT_TIER.stone);
    expect(MAT_TIER.stone).toBeLessThan(MAT_TIER.iron);
    expect(MAT_TIER.iron).toBeLessThan(MAT_TIER.diamond);
    expect(MAT_TIER.diamond).toBeLessThan(MAT_TIER.ada);
  });
});
