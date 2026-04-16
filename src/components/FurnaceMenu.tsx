import type { Game, Snapshot } from '../engine/Game';
import { BD } from '../game/blocks';
import { IINFO } from '../game/items';

interface Props {
  game: Game;
  snapshot: Snapshot;
  onClose: () => void;
}

export function FurnaceMenu({ game, snapshot, onClose }: Props) {
  const fs = snapshot.furnace;
  const sel = fs.selectedOre;
  const oreCount = game.invCountFor(sel, false);
  const coalCount = game.invCountFor('coal');

  return (
    <div className="modal">
      <div className="modal-panel" style={{ minWidth: 340, padding: 18 }}>
        <h3>🔥 Fourneau</h3>
        <div className="flow">
          <div className="fslots">
            <div className="fslabel">Minerai</div>
            <div className="fslot" onClick={() => game.fAddOre()}>
              {fs.ore !== null ? BD[fs.ore]?.emoji ?? '?' : '—'}
            </div>
            <div className="fslabel">Charbon</div>
            <div className="fslot" onClick={() => game.fAddFuel()}>
              {fs.fuel ? '⚫' : '—'}
            </div>
          </div>
          <div className="farrow">→</div>
          <div className="fslots">
            <div className="fslabel">Résultat</div>
            <div className="fslot" onClick={() => game.fCollect()}>
              {fs.result ? IINFO[fs.result]?.emoji ?? '?' : '—'}
            </div>
          </div>
        </div>
        <div className="fprog">
          <div className="fbar" style={{ width: `${fs.progress * 100}%` }}></div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#444', marginBottom: 9 }}>
          {fs.smelting ? '🔥 Fonte en cours…' : `Minerai dispo: ${oreCount} | Charbon: ${coalCount}`}
        </div>
        <select
          value={sel}
          onChange={e => game.setSelectedOre(parseInt(e.target.value))}
          style={{ width: '100%', fontFamily: 'monospace', padding: 4, marginBottom: 8 }}
        >
          <option value={9}>🔧 Minerai de Fer</option>
          <option value={11}>🟣 Minerai d'Adamantium</option>
        </select>
        <button className="fsbtn" onClick={() => game.startSmelt()}>🔥 Fondre</button>
        <div style={{ marginTop: 9, textAlign: 'center' }}>
          <button className="mbtn" style={{ fontSize: 12, padding: '7px 18px' }} onClick={onClose}>
            Fermer [F]
          </button>
        </div>
      </div>
    </div>
  );
}