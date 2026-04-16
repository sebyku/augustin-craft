import type { Snapshot } from '../engine/Game';
import { BD } from '../game/blocks';
import { IINFO } from '../game/items';

interface Props {
  snapshot: Snapshot;
  onHotbarSelect: (i: number) => void;
}

export function HUD({ snapshot, onHotbarSelect }: Props) {
  const { health, food, hotbar, sel, coords, biomeLabel, tod, msg } = snapshot;

  const hearts = [];
  for (let i = 0; i < 10; i++) {
    hearts.push(
      <span key={i}>{i * 2 < health ? '❤️' : i * 2 + 1 <= health ? '🩶' : '🖤'}</span>,
    );
  }
  const foods = [];
  for (let i = 0; i < 10; i++) {
    foods.push(<span key={i}>{i * 2 < food ? '🍗' : '🍽️'}</span>);
  }

  return (
    <div className="hud">
      <div className="crosshair"></div>
      <div className="hud-coords">
        X:{coords.x} Y:{coords.y} Z:{coords.z}<br />
        Biome: {biomeLabel}
      </div>
      <div className="hud-tod">{tod}</div>
      <div className="hud-biome">{biomeLabel}</div>
      <div className="hud-stats">
        <div className="bar-row">{hearts}</div>
        <div className="bar-row">{foods}</div>
      </div>
      <div className="hud-hotbar">
        {hotbar.map((slot, i) => {
          const emoji = slot ? (slot.block ? BD[slot.id as number]?.emoji ?? '?' : IINFO[slot.id as string]?.emoji ?? '?') : '';
          return (
            <div
              key={i}
              className={'hslot' + (i === sel ? ' on' : '')}
              onClick={() => onHotbarSelect(i)}
            >
              {emoji}
              {slot && slot.qty > 1 && <div className="sc">{slot.qty}</div>}
            </div>
          );
        })}
      </div>
      {msg && (
        <div className="hud-msg" style={{ color: msg.color }}>
          {msg.text}
        </div>
      )}
      <div className="hud-ctrl">
        ZQSD · Déplacer<br />
        Espace · Sauter<br />
        Clic G · Casser/Attaquer<br />
        Clic D · Placer<br />
        E · Inventaire · C · Craft<br />
        F · Fourneau · 1-9 · Slot
      </div>
    </div>
  );
}