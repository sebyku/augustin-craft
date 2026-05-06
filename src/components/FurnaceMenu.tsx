import type { Game, Snapshot } from '../engine/Game';
import { IINFO } from '../game/items';

interface Props {
  game: Game;
  snapshot: Snapshot;
  onClose: () => void;
}

const FUEL_EMOJI: Record<string, string> = { coal: '⚫', plank: '🟫', wood: '🪵' };

export function FurnaceMenu({ game, snapshot, onClose }: Props) {
  const fs = snapshot.furnace;
  const ironCount = game.invCountFor('iron_raw');
  const coalCount = game.invCountFor('coal');
  const plankCount = game.invCountFor(16, true);
  const woodCount = game.invCountFor(6, true);

  return (
    <div className="modal">
      <div className="modal-panel" style={{ minWidth: 340, padding: 18 }}>
        <h3>🔥 Fourneau</h3>
        <div className="flow">
          <div className="fslots">
            <div className="fslabel">Minerai de Fer</div>
            <div className="fslot" onClick={() => game.fAddOre()}>
              {fs.ore ? IINFO[fs.ore]?.emoji ?? '?' : '—'}
            </div>
            <div className="fslabel">Combustible</div>
            <div className="fslot" onClick={() => game.fAddFuel()}>
              {fs.fuel ? FUEL_EMOJI[fs.fuel] ?? '?' : '—'}
            </div>
          </div>
          <div className="farrow">→</div>
          <div className="fslots">
            <div className="fslabel">Lingot</div>
            <div className="fslot" onClick={() => game.fCollect()}>
              {fs.result ? IINFO[fs.result]?.emoji ?? '?' : '—'}
            </div>
          </div>
        </div>
        <div className="fprog">
          <div className="fbar" style={{ width: `${fs.progress * 100}%` }}></div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#444', marginBottom: 9 }}>
          {fs.smelting
            ? '🔥 Fonte en cours…'
            : `Fer brut: ${ironCount} | ⚫${coalCount} 🟫${plankCount} 🪵${woodCount}`}
        </div>
        <button className="fsbtn" onClick={() => game.startSmelt()}>🔥 Fondre</button>
        <div style={{ marginTop: 9, textAlign: 'center' }}>
          <button className="mbtn" style={{ fontSize: 12, padding: '7px 18px' }} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
