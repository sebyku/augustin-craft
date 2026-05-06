import type { Game, Snapshot } from '../engine/Game';
import { IINFO } from '../game/items';

interface Props {
  game: Game;
  snapshot: Snapshot;
  onClose: () => void;
}

export function BlastFurnaceMenu({ game, snapshot, onClose }: Props) {
  const bs = snapshot.blast;
  const alloyCount = game.invCountFor('ada_alloy');
  const ironCount = game.invCountFor('iron_ingot');
  const coalCount = game.invCountFor('coal');

  return (
    <div className="modal">
      <div className="modal-panel" style={{ minWidth: 380, padding: 18 }}>
        <h3>🏭 Haut Fourneau</h3>
        <div className="flow">
          <div className="fslots">
            <div className="fslabel">Alliage</div>
            <div className="fslot" onClick={() => game.blAddAlloy()}>
              {bs.alloy ? IINFO[bs.alloy]?.emoji ?? '?' : '—'}
            </div>
            <div className="fslabel">Lingot Fer</div>
            <div className="fslot" onClick={() => game.blAddIron()}>
              {bs.iron ? IINFO[bs.iron]?.emoji ?? '?' : '—'}
            </div>
            <div className="fslabel">Charbon</div>
            <div className="fslot" onClick={() => game.blAddFuel()}>
              {bs.fuel ? '⚫' : '—'}
            </div>
          </div>
          <div className="farrow">→</div>
          <div className="fslots">
            <div className="fslabel">Adamantite</div>
            <div className="fslot" onClick={() => game.blCollect()}>
              {bs.result ? IINFO[bs.result]?.emoji ?? '?' : '—'}
            </div>
          </div>
        </div>
        <div className="fprog">
          <div className="fbar" style={{ width: `${bs.progress * 100}%` }}></div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#444', marginBottom: 9 }}>
          {bs.smelting
            ? '🏭 Forge en cours…'
            : `🔮${alloyCount} 🔧${ironCount} ⚫${coalCount}`}
        </div>
        <button className="fsbtn" onClick={() => game.startBlast()}>🏭 Forger</button>
        <div style={{ marginTop: 9, textAlign: 'center' }}>
          <button className="mbtn" style={{ fontSize: 12, padding: '7px 18px' }} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
