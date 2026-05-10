import { useEffect, useState } from 'react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

export default function GuarantorsPage() {
  const { withAuth } = useAuth();
  const [payload, setPayload] = useState<{
    yourGuarantors: Array<Record<string, unknown>>;
    youAsGuarantor: Array<Record<string, unknown>>;
  }>({ yourGuarantors: [], youAsGuarantor: [] });
  const [error, setError] = useState('');

  const loadGuarantors = async () => {
    try {
      const response = await withAuth((token) => apiClient.getGuarantors(token));
      setPayload(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load guarantors');
    }
  };

  useEffect(() => {
    loadGuarantors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const respond = async (borrowerId: number, action: 'approve' | 'reject') => {
    await withAuth((token) => apiClient.respondToGuarantor(token, borrowerId, action));
    await loadGuarantors();
  };

  return (
    <Layout title="Guarantors" subtitle="View who backs you and where you're backing others" onCloseRoute="/dashboard">
      {error ? <div className="feedback feedback--error" style={{ marginBottom: 20 }}>{error}</div> : null}
      <div className="content-grid">
        <section className="card span-6">
          <div className="card__header">
            <h2>Your guarantors</h2>
          </div>
          <div className="list">
            {payload.yourGuarantors.map((entry) => (
              <article className="list-item" key={String(entry.guarantor_id)}>
                <h3 className="list-item__title">{String((entry.guarantor as { full_name?: string })?.full_name || 'Guarantor')}</h3>
                <div className="list-item__meta">{String(entry.status)}</div>
              </article>
            ))}
          </div>
        </section>
        <section className="card span-6">
          <div className="card__header">
            <h2>You as guarantor</h2>
          </div>
          <div className="list">
            {payload.youAsGuarantor.map((entry) => (
              <article className="list-item" key={String(entry.borrower_id)}>
                <h3 className="list-item__title">{String((entry.borrower as { full_name?: string })?.full_name || 'Borrower')}</h3>
                <div className="list-item__meta">{String(entry.status)}</div>
                {entry.status === 'pending' ? (
                  <div className="inline-actions">
                    <button className="button button--secondary" type="button" onClick={() => respond(Number(entry.borrower_id), 'approve')}>
                      Approve
                    </button>
                    <button className="button button--danger" type="button" onClick={() => respond(Number(entry.borrower_id), 'reject')}>
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
