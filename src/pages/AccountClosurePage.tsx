import { useMemo } from 'react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export default function AccountClosurePage() {
  const { user } = useAuth();

  const canClose = useMemo(() => {
    if (!user) return false;
    const hasWalletBalance = user.batua_locked + user.batua_unlocked + user.tijori > 0;
    return !hasWalletBalance;
  }, [user]);

  return (
    <Layout title="Account Closure" subtitle="Eligibility check for a future closure workflow" onCloseRoute="/dashboard">
      <div className="content-grid">
        <section className="card span-8 stack">
          <div className="card__header">
            <h2>Eligibility</h2>
            <span className="pill">{canClose ? 'Eligible' : 'Not eligible'}</span>
          </div>
          <p className="muted">
            Closure will be allowed when wallet balances are zero and no active lending or borrowing
            obligations remain. The wallet transfer action still needs a dedicated implementation
            pass.
          </p>
          <div className="feedback">
            Current balances: locked ₹{user?.batua_locked.toFixed(2) || '0.00'}, unlocked ₹
            {user?.batua_unlocked.toFixed(2) || '0.00'}, tijori ₹{user?.tijori.toFixed(2) || '0.00'}
          </div>
        </section>
      </div>
    </Layout>
  );
}
