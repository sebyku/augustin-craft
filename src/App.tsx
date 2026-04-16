import { useEffect, useRef, useState } from 'react';
import './App.css';
import { CraftingMenu } from './components/CraftingMenu';
import { DeathScreen } from './components/DeathScreen';
import { FurnaceMenu } from './components/FurnaceMenu';
import { HUD } from './components/HUD';
import { Inventory } from './components/Inventory';
import { StartScreen } from './components/StartScreen';
import { Game } from './engine/Game';
import type { Snapshot } from './engine/Game';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const g = new Game(canvasRef.current);
    const unsub = g.subscribe(setSnapshot);
    setGame(g);
    return () => {
      unsub();
      g.dispose();
      setGame(null);
    };
  }, []);

  return (
    <>
      <canvas id="c" ref={canvasRef}></canvas>
      {snapshot && game && (
        <>
          {snapshot.mode !== 'start' && snapshot.mode !== 'death' && (
            <HUD snapshot={snapshot} onHotbarSelect={i => game.setHotbarSel(i)} />
          )}
          {snapshot.mode === 'start' && (
            <StartScreen onPlay={() => game.start()} />
          )}
          {snapshot.mode === 'inventory' && (
            <Inventory
              snapshot={snapshot}
              onUseItem={(idx, fromHotbar) => game.useItem(idx, fromHotbar)}
              onUnequip={slot => game.unequipArmor(slot)}
              onClose={() => game.closeAll()}
            />
          )}
          {snapshot.mode === 'craft' && (
            <CraftingMenu game={game} onClose={() => game.closeAll()} tick={snapshot.health + snapshot.food} />
          )}
          {snapshot.mode === 'furnace' && (
            <FurnaceMenu game={game} snapshot={snapshot} onClose={() => game.closeAll()} />
          )}
          {snapshot.mode === 'death' && (
            <DeathScreen onRespawn={() => game.respawn()} />
          )}
        </>
      )}
    </>
  );
}

export default App;