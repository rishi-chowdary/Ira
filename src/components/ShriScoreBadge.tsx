function getTier(score: number) {
  if (score >= 900) return { name: 'Prime', multiplier: '0.80x' };
  if (score >= 750) return { name: 'Trusted', multiplier: '0.85x' };
  if (score >= 600) return { name: 'Steady', multiplier: '0.92x' };
  if (score >= 400) return { name: 'Rising', multiplier: '1.00x' };
  return { name: 'Starter', multiplier: '1.15x' };
}

export default function ShriScoreBadge({ score }: { score: number }) {
  const tier = getTier(score);
  return (
    <section className="card">
      <div className="card__header">
        <h2>Shri Score</h2>
        <span className="pill">{tier.name}</span>
      </div>
      <div className="score-badge">
        <strong>{score}</strong>
        <span>Multiplier {tier.multiplier}</span>
      </div>
    </section>
  );
}
