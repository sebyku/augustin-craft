interface Props {
  onPlay: () => void;
  onContinue: () => void;
  hasSave: boolean;
}

export function StartScreen({ onPlay, onContinue, hasSave }: Props) {
  return (
    <div className="overlay">
      <div className="start-screen">
        <h1>⛏ AUGUSTIN CRAFT</h1>
        <p>Un monde de blocs vous attend…</p>
        {hasSave && (
          <button className="mbtn" onClick={onContinue}>▶ CONTINUER</button>
        )}
        <button className="mbtn" onClick={onPlay}>
          {hasSave ? '🆕 NOUVELLE PARTIE' : '▶ JOUER'}
        </button>
        <div className="info">
          🌿 Plaine &nbsp;🌲 Forêt &nbsp;🏜 Désert &nbsp;❄️ Glace<br />
          🕳 Grottes &nbsp;⚫ Charbon &nbsp;🔧 Fer &nbsp;💎 Diamant &nbsp;🟣 Adamantium<br />
          🧟 Zombies &nbsp;💀 Squelettes &nbsp;🐑 Moutons &nbsp;🐄 Vaches
        </div>
      </div>
    </div>
  );
}