import { BD } from './blocks';
import { IINFO } from './items';
import type { ItemId } from './recipes';

export interface InvSlot {
  id: ItemId;
  qty: number;
  block?: boolean;
}

export interface InventoryHolder {
  hotbar: (InvSlot | null)[];
  inv: (InvSlot | null)[];
}

function stackMax(id: ItemId, block: boolean): number {
  if (block) return 64;
  const info = IINFO[id as string];
  return info?.stack ?? 1;
}

export function invCount(holder: InventoryHolder, id: ItemId, block = false): number {
  return [...holder.hotbar, ...holder.inv].reduce(
    (s, sl) => s + (sl && sl.id === id && !!sl.block === block ? sl.qty : 0),
    0,
  );
}

export function invAdd(holder: InventoryHolder, id: ItemId, qty = 1, block = false): boolean {
  // Validate id exists (either a block id or item info).
  if (block && !BD[id as number]) return false;
  if (!block && !IINFO[id as string]) return false;

  const maxS = stackMax(id, block);
  const slots: { s: InvSlot | null; i: number; hb: boolean }[] = [
    ...holder.hotbar.map((s, i) => ({ s, i, hb: true })),
    ...holder.inv.map((s, i) => ({ s, i, hb: false })),
  ];
  let rem = qty;
  for (const { s, hb: _hb } of slots) {
    void _hb;
    if (s && s.id === id && !!s.block === block && s.qty < maxS) {
      const a = Math.min(rem, maxS - s.qty);
      s.qty += a;
      rem -= a;
      if (!rem) return true;
    }
  }
  for (const { s, i, hb } of slots) {
    if (!s) {
      const item: InvSlot = { id, qty: Math.min(rem, maxS), block };
      if (hb) holder.hotbar[i] = item;
      else holder.inv[i] = item;
      rem -= item.qty;
      if (!rem) return true;
    }
  }
  return rem < qty;
}

export function invRemove(holder: InventoryHolder, id: ItemId, qty = 1, block = false): boolean {
  let rem = qty;
  const sl: { s: InvSlot | null; i: number; hb: boolean }[] = [
    ...holder.hotbar.map((s, i) => ({ s, i, hb: true })),
    ...holder.inv.map((s, i) => ({ s, i, hb: false })),
  ];
  for (const { s, i, hb } of sl) {
    if (!s || s.id !== id || !!s.block !== block) continue;
    const t = Math.min(rem, s.qty);
    s.qty -= t;
    rem -= t;
    if (s.qty <= 0) {
      if (hb) holder.hotbar[i] = null;
      else holder.inv[i] = null;
    }
    if (!rem) return true;
  }
  return false;
}