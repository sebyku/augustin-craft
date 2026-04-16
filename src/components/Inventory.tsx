import type { Snapshot } from '../engine/Game';
import { BD } from '../game/blocks';
import type { InvSlot } from '../game/inventory';
import { IINFO } from '../game/items';
import type { ArmorSlot } from '../game/player';

interface Props {
  snapshot: Snapshot;
  onUseItem: (idx: number, fromHotbar: boolean) => void;
  onUnequip: (slot: ArmorSlot) => void;
  onClose: () => void;
}

function Slot({ item, onClick }: { item: InvSlot | null; onClick: () => void }) {
  const emoji = item
    ? item.block
      ? BD[item.id as number]?.emoji ?? '?'
      : IINFO[item.id as string]?.emoji ?? '?'
    : '';
  const title = item
    ? item.block
      ? BD[item.id as number]?.name ?? ''
      : IINFO[item.id as string]?.name ?? ''
    : '';
  return (
    <div className="islot" onClick={onClick} title={title}>
      {emoji}
      {item && item.qty > 1 && <span className="ic">{item.qty}</span>}
    </div>
  );
}

export function Inventory({ snapshot, onUseItem, onUnequip, onClose }: Props) {
  const armorSlots: ArmorSlot[] = ['helmet', 'chest', 'legs', 'boots'];
  const armorEmoji = ['⛑', '🥋', '👖', '👢'];

  return (
    <div className="modal">
      <div className="modal-panel">
        <h3>📦 Inventaire</h3>
        <div className="ilabel">Inventaire</div>
        <div className="igrid">
          {snapshot.inv.map((sl, i) => <Slot key={i} item={sl} onClick={() => onUseItem(i, false)} />)}
        </div>
        <div className="ilabel" style={{ marginTop: 7 }}>Barre rapide</div>
        <div className="igrid">
          {snapshot.hotbar.map((sl, i) => <Slot key={i} item={sl} onClick={() => onUseItem(i, true)} />)}
        </div>
        <div className="ilabel" style={{ marginTop: 7 }}>Armure</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {armorSlots.map((s, i) => {
            const piece = snapshot.armor[s];
            return (
              <div
                key={s}
                className="islot"
                style={{ background: '#777', opacity: piece ? 1 : 0.4 }}
                onClick={() => piece && onUnequip(s)}
              >
                {piece ? IINFO[piece.id as string]?.emoji ?? '?' : armorEmoji[i]}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 9, textAlign: 'center' }}>
          <button className="mbtn" style={{ fontSize: 12, padding: '7px 18px' }} onClick={onClose}>
            Fermer [E]
          </button>
        </div>
      </div>
    </div>
  );
}