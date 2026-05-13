import { useEffect, useMemo, useState } from 'react';

interface WalletCardProps {
  locked: number;
  unlocked: number;
  tijori: number;
}

function roundValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function WalletCard({ locked, unlocked, tijori }: WalletCardProps) {
  const total = useMemo(() => roundValue(locked + unlocked), [locked, unlocked]);
  const [lockedAmount, setLockedAmount] = useState(locked);
  const [unlockedAmount, setUnlockedAmount] = useState(unlocked);
  const canAdjust = locked > 0 && unlocked > 0;

  useEffect(() => {
    setLockedAmount(locked);
    setUnlockedAmount(unlocked);
  }, [locked, unlocked]);

  const updateLocked = (amount: number) => {
    const nextLocked = Math.max(1, Math.min(total, roundValue(amount)));
    setLockedAmount(nextLocked);
    setUnlockedAmount(roundValue(total - nextLocked));
  };

  const updateUnlocked = (amount: number) => {
    const nextUnlocked = Math.max(0, Math.min(total - 1, roundValue(amount)));
    const nextLocked = Math.max(1, roundValue(total - nextUnlocked));
    setUnlockedAmount(nextUnlocked);
    setLockedAmount(nextLocked);
  };

  return (
    <section className="card card--accent">
      <div className="card__header">
        <h2>Wallet Snapshot</h2>
        <span className="pill">Batua + Tijori</span>
      </div>
      <div className="wallet-grid">
        <article className="wallet-tile">
          <span>Batua Locked</span>
          <strong>₹{lockedAmount.toFixed(2)}</strong>
        </article>
        <article className="wallet-tile">
          <span>Batua Unlocked</span>
          <strong>₹{unlockedAmount.toFixed(2)}</strong>
        </article>
        <article className="wallet-tile">
          <span>Tijori</span>
          <strong>₹{tijori.toFixed(2)}</strong>
        </article>
      </div>
      {canAdjust ? (
        <div className="wallet-slider">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Split Batua</p>
              <p className="text-xs text-slate-500">Locked must stay at least ₹1.</p>
            </div>
            <span className="pill">Total ₹{total.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={1}
            max={total}
            value={lockedAmount}
            onChange={(event) => updateLocked(Number(event.target.value))}
          />
          <div className="wallet-input-row">
            <div>
              <label className="text-xs font-semibold text-slate-600">Locked</label>
              <input
                className="wallet-input"
                type="number"
                min={1}
                max={total}
                value={lockedAmount}
                onChange={(event) => updateLocked(Number(event.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Unlocked</label>
              <input
                className="wallet-input"
                type="number"
                min={0}
                max={Math.max(0, total - 1)}
                value={unlockedAmount}
                onChange={(event) => updateUnlocked(Number(event.target.value))}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
