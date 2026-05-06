import { useMemo, useState } from 'react';
import type { Game } from '../engine/Game';
import { BD } from '../game/blocks';
import { IINFO } from '../game/items';
import type { Recipe, Station } from '../game/recipes';
import { isBlockCostKey } from '../game/recipes';

interface Props {
  game: Game;
  station: Station;
  onClose: () => void;
  tick: number;
}

function recipeName(r: Recipe): string {
  if (typeof r.id === 'string' && IINFO[r.id]) return IINFO[r.id].name;
  if (r.block && typeof r.id === 'number' && BD[r.id]) return BD[r.id].name;
  return '?';
}

const STATION_TITLES: Record<Station, string> = {
  inv: '📦 Artisanat',
  craft: '⚒ Établi',
  forge: '🛠 Table de Forge',
};

export function CraftingMenu({ game, station, onClose, tick }: Props) {
  void tick;
  // station is read indirectly: game.getRecipes() inspects game.craftStation,
  // which mirrors the prop. The lint rule can't see that side channel, so
  // disable the unused-dep check rather than drop the dep and ship a stale
  // recipe list when switching between workbench and forge.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recipes = useMemo(() => game.getRecipes(), [game, station]);
  const cats = useMemo(() => [...new Set(recipes.map(r => r.cat))], [recipes]);
  const [curCat, setCurCat] = useState<string | undefined>(cats[0]);
  const [selRec, setSelRec] = useState<Recipe | null>(null);

  // Fall back to a still-valid category/recipe if the station change made
  // the user's previous selection disappear. Computing this at render
  // (vs. an effect) avoids a cascading re-render and the lint complaint.
  const activeCat = curCat && cats.includes(curCat) ? curCat : cats[0];
  const activeRec = selRec && recipes.includes(selRec) ? selRec : null;

  const list = recipes.filter(r => r.cat === activeCat);
  const can = activeRec ? game.canCraft(activeRec) : false;

  return (
    <div className="modal">
      <div className="modal-panel" style={{ minWidth: 580, padding: 18 }}>
        <h3>{STATION_TITLES[station]}</h3>
        <div className="ccats">
          {cats.map(c => (
            <button key={c} className={'ccat' + (c === activeCat ? ' ac' : '')} onClick={() => setCurCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="rlist">
          {list.map((r, idx) => {
            const req = Object.entries(r.cost).map(([k, v]) => {
              const e = isBlockCostKey(k) ? BD[parseInt(k)]?.emoji : IINFO[k]?.emoji || '';
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
        {activeRec && (
          <div className="cres">
            <div style={{ fontSize: 30 }}>{activeRec.emoji}</div>
            <div style={{ flex: 1, fontSize: 12, color: '#222' }}>
              <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 3 }}>{recipeName(activeRec)}</div>
              <div>
                {Object.entries(activeRec.cost).map(([k, v]) => {
                  const isB = isBlockCostKey(k);
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
                if (activeRec && game.doCraft(activeRec)) {
                  setSelRec({ ...activeRec });
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
