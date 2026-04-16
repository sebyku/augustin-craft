import { useMemo, useState } from 'react';
import type { Game } from '../engine/Game';
import { BD } from '../game/blocks';
import { IINFO } from '../game/items';
import type { Recipe } from '../game/recipes';

interface Props {
  game: Game;
  onClose: () => void;
  tick: number;
}

function recipeName(r: Recipe): string {
  if (typeof r.id === 'string' && IINFO[r.id]) return IINFO[r.id].name;
  if (r.block && typeof r.id === 'number' && BD[r.id]) return BD[r.id].name;
  return '?';
}

export function CraftingMenu({ game, onClose, tick }: Props) {
  void tick;
  const recipes = game.getRecipes();
  const cats = useMemo(() => [...new Set(recipes.map(r => r.cat))], [recipes]);
  const [curCat, setCurCat] = useState(cats[0]);
  const [selRec, setSelRec] = useState<Recipe | null>(null);

  const list = recipes.filter(r => r.cat === curCat);
  const can = selRec ? game.canCraft(selRec) : false;

  return (
    <div className="modal">
      <div className="modal-panel" style={{ minWidth: 580, padding: 18 }}>
        <h3>⚒ Artisanat</h3>
        <div className="ccats">
          {cats.map(c => (
            <button key={c} className={'ccat' + (c === curCat ? ' ac' : '')} onClick={() => setCurCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="rlist">
          {list.map((r, idx) => {
            const req = Object.entries(r.cost).map(([k, v]) => {
              const e = r.block && !isNaN(+k) ? BD[parseInt(k)]?.emoji : IINFO[k]?.emoji || '';
              return `${e}×${v}`;
            }).join(' ');
            return (
              <div key={idx} className="rcard" onClick={() => setSelRec(r)}>
                <div style={{ fontSize: 24 }}>{r.emoji}</div>
                <div className="rname">{recipeName(r)}</div>
                <div className="rreq">{req}</div>
              </div>
            );
          })}
        </div>
        {selRec && (
          <div className="cres">
            <div style={{ fontSize: 30 }}>{selRec.emoji}</div>
            <div style={{ flex: 1, fontSize: 12, color: '#222' }}>
              <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 3 }}>{recipeName(selRec)}</div>
              <div>
                {Object.entries(selRec.cost).map(([k, v]) => {
                  const isB = selRec.block && !isNaN(+k);
                  const e = isB ? BD[parseInt(k)]?.emoji : IINFO[k]?.emoji || '';
                  const n = isB ? BD[parseInt(k)]?.name : IINFO[k]?.name || k;
                  const have = isB ? game.invCountFor(parseInt(k), true) : game.invCountFor(k);
                  return (
                    <div key={k} style={{ color: have >= v ? '#2a7a2a' : '#c00' }}>
                      {e} {n}: {have}/{v}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 3, color: '#b22' }}>
                {can ? '✅ Faisable' : '❌ Ressources manquantes'}
              </div>
            </div>
            <button
              className="cbtn"
              disabled={!can}
              onClick={() => {
                if (selRec && game.doCraft(selRec)) {
                  setSelRec({ ...selRec });
                }
              }}
            >
              Fabriquer
            </button>
          </div>
        )}
        <div style={{ marginTop: 9, textAlign: 'center' }}>
          <button className="mbtn" style={{ fontSize: 12, padding: '7px 18px' }} onClick={onClose}>
            Fermer [C]
          </button>
        </div>
      </div>
    </div>
  );
}