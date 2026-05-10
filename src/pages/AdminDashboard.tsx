import React, { Suspense, useEffect, useState } from 'react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { AdminStats, EarningsPoint, PendingCollege } from '../types';

const EarningsChart = React.lazy(() => import('../components/EarningsChart'));

export default function AdminDashboard() {
  const { withAuth } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<PendingCollege[]>([]);
  const [earnings, setEarnings] = useState<EarningsPoint[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAdminData = async () => {
    try {
      const [statsPayload, pendingPayload, earningsPayload] = await Promise.all([
        withAuth((token) => apiClient.getAdminStats(token)),
        withAuth((token) => apiClient.getPendingColleges(token)),
        withAuth((token) => apiClient.getEarnings(token)),
      ]);
      setStats(statsPayload);
      setPending(pendingPayload);
      setEarnings(earningsPayload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load admin data');
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approveCollege = async (id: number) => {
    try {
      await withAuth((token) => apiClient.approveCollege(token, id));
      setMessage('College approved and temporary credentials generated.');
      await loadAdminData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Approval failed');
    }
  };

  const rejectCollege = async (id: number) => {
    try {
      await withAuth((token) => apiClient.rejectCollege(token, id, 'Rejected by admin review'));
      setMessage('College registration rejected.');
      await loadAdminData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Rejection failed');
    }
  };

  return (
    <Layout title="Admin Dashboard" subtitle="Pending colleges, earnings, and platform visibility" onCloseRoute="/">
      {message ? <div className="feedback" style={{ marginBottom: 20 }}>{message}</div> : null}
      {error ? <div className="feedback feedback--error" style={{ marginBottom: 20 }}>{error}</div> : null}

      <div className="admin-grid">
        <section className="card span-12">
          <div className="stats-grid">
            <article className="metric-card">
              <span>Registered colleges</span>
              <strong>{stats?.totalRegisteredColleges ?? '—'}</strong>
            </article>
            <article className="metric-card">
              <span>Approved colleges</span>
              <strong>{stats?.totalApprovedColleges ?? '—'}</strong>
            </article>
            <article className="metric-card">
              <span>Pending registrations</span>
              <strong>{stats?.totalPendingRegistrations ?? '—'}</strong>
            </article>
            <article className="metric-card">
              <span>Platform earnings this week</span>
              <strong>₹{stats?.totalPlatformEarnings.week.toFixed(2) ?? '0.00'}</strong>
            </article>
          </div>
        </section>

        <section className="span-7">
          <div className="list-card">
            <div className="card__header">
              <h2>Pending colleges</h2>
              <span className="pill">{pending.length}</span>
            </div>
            <div className="list">
              {pending.length === 0 ? (
                <div className="list-item">
                  <p className="list-item__meta">No pending college registrations.</p>
                </div>
              ) : (
                pending.map((entry) => (
                  <article className="list-item" key={entry.id}>
                    <div className="list-item__header">
                      <div>
                        <h3 className="list-item__title">{entry.submitted_data.university.name}</h3>
                        <div className="list-item__meta">
                          {entry.submitted_data.college?.name || 'University-only registration'} ·{' '}
                          {entry.submitted_data.location.state}, {entry.submitted_data.location.district}
                        </div>
                      </div>
                      <span className="pill">ML {entry.ml_score}</span>
                    </div>
                    <p className="muted">
                      Courses:{' '}
                      {entry.submitted_data.courses.map((course) => `${course.name} (${course.duration}y)`).join(', ')}
                    </p>
                    <div className="inline-actions">
                      <button className="button button--primary" type="button" onClick={() => approveCollege(entry.id)}>
                        Approve
                      </button>
                      <button className="button button--danger" type="button" onClick={() => rejectCollege(entry.id)}>
                        Reject
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="span-5">
          <Suspense fallback={<div className="card">Loading chart…</div>}>
            <EarningsChart points={earnings} />
          </Suspense>
        </section>
      </div>
    </Layout>
  );
}
