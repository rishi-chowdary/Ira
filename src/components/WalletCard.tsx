interface WalletCardProps {
  locked: number;
  unlocked: number;
  tijori: number;
}

export default function WalletCard({ locked, unlocked, tijori }: WalletCardProps) {
  return (
    <section className="card card--accent">
      <div className="card__header">
        <h2>Wallet Snapshot</h2>
        <span className="pill">Batua + Tijori</span>
      </div>
      <div className="wallet-grid">
        <article className="wallet-tile">
          <span>Batua Locked</span>
          <strong>₹{locked.toFixed(2)}</strong>
        </article>
        <article className="wallet-tile">
          <span>Batua Unlocked</span>
          <strong>₹{unlocked.toFixed(2)}</strong>
        </article>
        <article className="wallet-tile">
          <span>Tijori</span>
          <strong>₹{tijori.toFixed(2)}</strong>
        </article>
      </div>
    </section>
  );
}
