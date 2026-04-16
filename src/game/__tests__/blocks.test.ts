import { describe, expect, it } from 'vitest';
import { BD } from '../blocks';

describe('block definitions', () => {
  it('defines all block ids 0..15', () => {
    for (let i = 0; i <= 15; i++) {
      expect(BD[i]).toBeDefined();
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
});