interface Props {
  onRespawn: () => void;
}

export function DeathScreen({ onRespawn }: Props) {
  return (
    <div className="death">
      <h2>💀 Vous êtes mort !</h2>
      <p>Vos ennemis ont eu raison de vous…</p>
      <button className="mbtn" onClick={onRespawn}>↩ Réapparaître</button>
    </div>
  );
}