// Block definitions.
// Face atlas indices: 0=grass 1=dirt 2=stone 3=wood 4=sand 5=snow 6=leaves
// 7=iron_ore 8=coal_ore 9=ada_ore 10=diamond_ore 11=cactus 12=bedrock
// 13=furnace 14=crafting 15=plank 16=forge_table 17=blast_furnace
export type ToolType = 'pick' | 'axe' | 'shovel' | 'sword' | 'hoe';

export interface BlockDef {
  name: string;
  emoji?: string;
  top?: number;
  side?: number;
  bot?: number;
  solid: boolean;
  hard?: number;
  trans?: boolean;
  // Minimum tool tier to drop the block. 0 = always drops.
  // wood=1, stone=2, iron=3, diamond=4, ada=5.
  tier?: number;
  // Preferred tool type. Mining with this type is faster; mining with the
  // wrong type still breaks the block but slowly. Drop is gated by `tier`,
  // not by tool type.
  tool?: ToolType;
}

export const BD: Record<number, BlockDef> = {
  0: { name: 'Air', solid: false },
  1: { name: 'Herbe', emoji: '🟩', top: 0, side: 1, bot: 1, solid: true, hard: 1.5, tier: 0, tool: 'shovel' },
  2: { name: 'Terre', emoji: '🟫', top: 1, side: 1, bot: 1, solid: true, hard: 1, tier: 0, tool: 'shovel' },
  3: { name: 'Pierre', emoji: '⬜', top: 2, side: 2, bot: 2, solid: true, hard: 3, tier: 1, tool: 'pick' },
  4: { name: 'Sable', emoji: '🟨', top: 4, side: 4, bot: 4, solid: true, hard: 0.8, tier: 0, tool: 'shovel' },
  5: { name: 'Neige', emoji: '⬜', top: 5, side: 5, bot: 5, solid: true, hard: 0.5, tier: 0, tool: 'shovel' },
  6: { name: 'Bois', emoji: '🪵', top: 3, side: 3, bot: 3, solid: true, hard: 2, tier: 0, tool: 'axe' },
  7: { name: 'Feuilles', emoji: '🍃', top: 6, side: 6, bot: 6, solid: true, hard: 0.3, trans: true, tier: 0 },
  8: { name: 'Charbon', emoji: '⚫', top: 8, side: 8, bot: 2, solid: true, hard: 5, tier: 2, tool: 'pick' },
  9: { name: 'Fer', emoji: '🔧', top: 7, side: 7, bot: 2, solid: true, hard: 6, tier: 2, tool: 'pick' },
  10: { name: 'Diamant', emoji: '💎', top: 10, side: 10, bot: 2, solid: true, hard: 8, tier: 3, tool: 'pick' },
  11: { name: 'Adamantium', emoji: '🟣', top: 9, side: 9, bot: 2, solid: true, hard: 12, tier: 4, tool: 'pick' },
  12: { name: 'Cactus', emoji: '🌵', top: 11, side: 11, bot: 11, solid: true, hard: 0.4, tier: 0 },
  13: { name: 'Bedrock', emoji: '⬛', top: 12, side: 12, bot: 12, solid: true, hard: 9999, tier: 99 },
  14: { name: 'Établi', emoji: '⚒', top: 14, side: 14, bot: 1, solid: true, hard: 2.5, tier: 0, tool: 'axe' },
  15: { name: 'Fourneau', emoji: '🔥', top: 2, side: 13, bot: 2, solid: true, hard: 3.5, tier: 1, tool: 'pick' },
  16: { name: 'Planche', emoji: '🟫', top: 15, side: 15, bot: 15, solid: true, hard: 1.5, tier: 0, tool: 'axe' },
  17: { name: 'Table de Forge', emoji: '🛠', top: 16, side: 16, bot: 1, solid: true, hard: 3, tier: 1, tool: 'pick' },
  18: { name: 'Haut Fourneau', emoji: '🏭', top: 2, side: 17, bot: 2, solid: true, hard: 4.5, tier: 2, tool: 'pick' },
};

// Tool material → tier.
export const MAT_TIER: Record<string, number> = {
  wood: 1, stone: 2, iron: 3, diamond: 4, ada: 5,
};
