export type ItemType = 'sword' | 'pick' | 'axe' | 'helmet' | 'chest' | 'legs' | 'boots';
export type ItemMaterial = 'iron' | 'diamond' | 'ada';

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
  coal: { name: 'Charbon', emoji: '⚫', stack: 64 },
  iron_ingot: { name: 'Lingot de Fer', emoji: '🔧', stack: 64 },
  diamond: { name: 'Diamant', emoji: '💎', stack: 64 },
  ada_ingot: { name: "Lingot d'Adamantium", emoji: '🟣', stack: 64 },
  iron_sword: { name: 'Épée Fer', emoji: '⚔️', stack: 1, dmg: 5, type: 'sword', mat: 'iron' },
  diamond_sword: { name: 'Épée Diamant', emoji: '⚔️', stack: 1, dmg: 8, type: 'sword', mat: 'diamond' },
  ada_sword: { name: 'Épée Adamantium', emoji: '⚔️', stack: 1, dmg: 12, type: 'sword', mat: 'ada' },
  iron_pick: { name: 'Pioche Fer', emoji: '⛏', stack: 1, dmg: 3, type: 'pick', mat: 'iron' },
  diamond_pick: { name: 'Pioche Diamant', emoji: '⛏', stack: 1, dmg: 5, type: 'pick', mat: 'diamond' },
  ada_pick: { name: 'Pioche Adamantium', emoji: '⛏', stack: 1, dmg: 7, type: 'pick', mat: 'ada' },
  iron_axe: { name: 'Hache Fer', emoji: '🪓', stack: 1, dmg: 4, type: 'axe', mat: 'iron' },
  diamond_axe: { name: 'Hache Diamant', emoji: '🪓', stack: 1, dmg: 7, type: 'axe', mat: 'diamond' },
  ada_axe: { name: 'Hache Adamantium', emoji: '🪓', stack: 1, dmg: 10, type: 'axe', mat: 'ada' },
  iron_helm: { name: 'Casque Fer', emoji: '⛑', stack: 1, armor: 2, type: 'helmet', mat: 'iron' },
  iron_chest: { name: 'Plastron Fer', emoji: '🥋', stack: 1, armor: 5, type: 'chest', mat: 'iron' },
  iron_legs: { name: 'Jambières Fer', emoji: '👖', stack: 1, armor: 4, type: 'legs', mat: 'iron' },
  iron_boots: { name: 'Bottes Fer', emoji: '👢', stack: 1, armor: 1, type: 'boots', mat: 'iron' },
  diamond_helm: { name: 'Casque Diamant', emoji: '⛑', stack: 1, armor: 4, type: 'helmet', mat: 'diamond' },
  diamond_chest: { name: 'Plastron Diamant', emoji: '🥋', stack: 1, armor: 8, type: 'chest', mat: 'diamond' },
  diamond_legs: { name: 'Jambières Diamant', emoji: '👖', stack: 1, armor: 6, type: 'legs', mat: 'diamond' },
  diamond_boots: { name: 'Bottes Diamant', emoji: '👢', stack: 1, armor: 3, type: 'boots', mat: 'diamond' },
  ada_helm: { name: 'Casque Adamantium', emoji: '⛑', stack: 1, armor: 6, type: 'helmet', mat: 'ada' },
  ada_chest: { name: 'Plastron Adamantium', emoji: '🥋', stack: 1, armor: 12, type: 'chest', mat: 'ada' },
  ada_legs: { name: 'Jambières Adamantium', emoji: '👖', stack: 1, armor: 9, type: 'legs', mat: 'ada' },
  ada_boots: { name: 'Bottes Adamantium', emoji: '👢', stack: 1, armor: 4, type: 'boots', mat: 'ada' },
  mutton: { name: 'Mouton cru', emoji: '🥩', stack: 64, food: 2 },
  beef: { name: 'Bœuf cru', emoji: '🥩', stack: 64, food: 2 },
  bone: { name: 'Os', emoji: '🦴', stack: 64 },
  rotten: { name: 'Chair Pourrie', emoji: '🫀', stack: 64, food: 1 },
  arrow: { name: 'Flèche', emoji: '🏹', stack: 64 },
  leather: { name: 'Cuir', emoji: '🟤', stack: 64 },
};