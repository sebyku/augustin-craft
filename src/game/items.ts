export type ItemType = 'sword' | 'pick' | 'axe' | 'shovel' | 'hoe' | 'helmet' | 'chest' | 'legs' | 'boots';
export type ItemMaterial = 'wood' | 'stone' | 'iron' | 'diamond' | 'ada';

export interface ItemInfo {
  name: string;
  emoji: string;
  stack: number;
  dmg?: number;
  armor?: number;
  food?: number;
  type?: ItemType;
  mat?: ItemMaterial;
}

export const IINFO: Record<string, ItemInfo> = {
  // Materials and intermediates
  stick: { name: 'Bâton', emoji: '🥢', stack: 64 },
  coal: { name: 'Charbon', emoji: '⚫', stack: 64 },
  iron_raw: { name: 'Minerai de Fer', emoji: '🪨', stack: 64 },
  iron_ingot: { name: 'Lingot de Fer', emoji: '🔧', stack: 64 },
  diamond: { name: 'Diamant', emoji: '💎', stack: 64 },
  ada_raw: { name: 'Adamantium Brut', emoji: '🟪', stack: 64 },
  ada_alloy: { name: 'Alliage d\'Adamantium', emoji: '🔮', stack: 64 },
  ada_ingot: { name: 'Adamantite', emoji: '🟣', stack: 64 },

  // Wood tools (tier 1)
  wood_pick: { name: 'Pioche en Bois', emoji: '⛏', stack: 1, dmg: 1, type: 'pick', mat: 'wood' },
  wood_sword: { name: 'Épée en Bois', emoji: '⚔️', stack: 1, dmg: 2, type: 'sword', mat: 'wood' },
  wood_axe: { name: 'Hache en Bois', emoji: '🪓', stack: 1, dmg: 2, type: 'axe', mat: 'wood' },
  wood_shovel: { name: 'Pelle en Bois', emoji: '🥄', stack: 1, dmg: 1, type: 'shovel', mat: 'wood' },
  wood_hoe: { name: 'Houe en Bois', emoji: '⚒️', stack: 1, dmg: 1, type: 'hoe', mat: 'wood' },

  // Stone tools (tier 2)
  stone_pick: { name: 'Pioche en Pierre', emoji: '⛏', stack: 1, dmg: 2, type: 'pick', mat: 'stone' },
  stone_sword: { name: 'Épée en Pierre', emoji: '⚔️', stack: 1, dmg: 3, type: 'sword', mat: 'stone' },
  stone_axe: { name: 'Hache en Pierre', emoji: '🪓', stack: 1, dmg: 3, type: 'axe', mat: 'stone' },
  stone_shovel: { name: 'Pelle en Pierre', emoji: '🥄', stack: 1, dmg: 2, type: 'shovel', mat: 'stone' },
  stone_hoe: { name: 'Houe en Pierre', emoji: '⚒️', stack: 1, dmg: 2, type: 'hoe', mat: 'stone' },

  // Iron tools (tier 3)
  iron_pick: { name: 'Pioche Fer', emoji: '⛏', stack: 1, dmg: 3, type: 'pick', mat: 'iron' },
  iron_sword: { name: 'Épée Fer', emoji: '⚔️', stack: 1, dmg: 5, type: 'sword', mat: 'iron' },
  iron_axe: { name: 'Hache Fer', emoji: '🪓', stack: 1, dmg: 4, type: 'axe', mat: 'iron' },
  iron_shovel: { name: 'Pelle Fer', emoji: '🥄', stack: 1, dmg: 3, type: 'shovel', mat: 'iron' },
  iron_hoe: { name: 'Houe Fer', emoji: '⚒️', stack: 1, dmg: 3, type: 'hoe', mat: 'iron' },

  // Diamond tools (tier 4)
  diamond_pick: { name: 'Pioche Diamant', emoji: '⛏', stack: 1, dmg: 5, type: 'pick', mat: 'diamond' },
  diamond_sword: { name: 'Épée Diamant', emoji: '⚔️', stack: 1, dmg: 8, type: 'sword', mat: 'diamond' },
  diamond_axe: { name: 'Hache Diamant', emoji: '🪓', stack: 1, dmg: 7, type: 'axe', mat: 'diamond' },
  diamond_shovel: { name: 'Pelle Diamant', emoji: '🥄', stack: 1, dmg: 5, type: 'shovel', mat: 'diamond' },
  diamond_hoe: { name: 'Houe Diamant', emoji: '⚒️', stack: 1, dmg: 5, type: 'hoe', mat: 'diamond' },

  // Adamantite tools (tier 5)
  ada_pick: { name: 'Pioche Adamantite', emoji: '⛏', stack: 1, dmg: 7, type: 'pick', mat: 'ada' },
  ada_sword: { name: 'Épée Adamantite', emoji: '⚔️', stack: 1, dmg: 12, type: 'sword', mat: 'ada' },
  ada_axe: { name: 'Hache Adamantite', emoji: '🪓', stack: 1, dmg: 10, type: 'axe', mat: 'ada' },
  ada_shovel: { name: 'Pelle Adamantite', emoji: '🥄', stack: 1, dmg: 7, type: 'shovel', mat: 'ada' },
  ada_hoe: { name: 'Houe Adamantite', emoji: '⚒️', stack: 1, dmg: 7, type: 'hoe', mat: 'ada' },

  // Iron armor (tier 1 armor)
  iron_helm: { name: 'Casque Fer', emoji: '⛑', stack: 1, armor: 2, type: 'helmet', mat: 'iron' },
  iron_chest: { name: 'Plastron Fer', emoji: '🥋', stack: 1, armor: 5, type: 'chest', mat: 'iron' },
  iron_legs: { name: 'Jambières Fer', emoji: '👖', stack: 1, armor: 4, type: 'legs', mat: 'iron' },
  iron_boots: { name: 'Bottes Fer', emoji: '👢', stack: 1, armor: 1, type: 'boots', mat: 'iron' },

  // Diamond armor (tier 2 armor)
  diamond_helm: { name: 'Casque Diamant', emoji: '⛑', stack: 1, armor: 4, type: 'helmet', mat: 'diamond' },
  diamond_chest: { name: 'Plastron Diamant', emoji: '🥋', stack: 1, armor: 8, type: 'chest', mat: 'diamond' },
  diamond_legs: { name: 'Jambières Diamant', emoji: '👖', stack: 1, armor: 6, type: 'legs', mat: 'diamond' },
  diamond_boots: { name: 'Bottes Diamant', emoji: '👢', stack: 1, armor: 3, type: 'boots', mat: 'diamond' },

  // Adamantite armor (tier 3 armor)
  ada_helm: { name: 'Casque Adamantite', emoji: '⛑', stack: 1, armor: 6, type: 'helmet', mat: 'ada' },
  ada_chest: { name: 'Plastron Adamantite', emoji: '🥋', stack: 1, armor: 12, type: 'chest', mat: 'ada' },
  ada_legs: { name: 'Jambières Adamantite', emoji: '👖', stack: 1, armor: 9, type: 'legs', mat: 'ada' },
  ada_boots: { name: 'Bottes Adamantite', emoji: '👢', stack: 1, armor: 4, type: 'boots', mat: 'ada' },

  // Food and drops
  mutton: { name: 'Mouton cru', emoji: '🥩', stack: 64, food: 2 },
  beef: { name: 'Bœuf cru', emoji: '🥩', stack: 64, food: 2 },
  bone: { name: 'Os', emoji: '🦴', stack: 64 },
  rotten: { name: 'Chair Pourrie', emoji: '🫀', stack: 64, food: 1 },
  arrow: { name: 'Flèche', emoji: '🏹', stack: 64 },
  leather: { name: 'Cuir', emoji: '🟤', stack: 64 },
};
