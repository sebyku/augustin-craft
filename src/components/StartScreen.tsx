interface Props {
  onPlay: () => void;
}

export function StartScreen({ onPlay }: Props) {
  return (
    <div className="overlay">
      <div className="start-screen">
        <h1>⛏ EDUPHYTON CRAFT</h1>
        <p>Un monde de blocs vous attend…</p>
        <button className="mbtn" onClick={onPlay}>▶ JOUER</button>
        <div className="info">
          🌿 Plaine &nbsp;🌲 Forêt &nbsp;🏜 Désert &nbsp;❄️ Glace<br />
          🕳 Grottes &nbsp;⚫ Charbon &nbsp;🔧 Fer &nbsp;💎 Diamant &nbsp;🟣 Adamantium<br />
          🧟 Zombies &nbsp;💀 Squelettes &nbsp;🐑 Moutons &nbsp;🐄 Vaches
        </div>
      </div>
    </div>
  );
}