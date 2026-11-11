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
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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
    setActionLoading(id);
    try {
      await withAuth((token) => apiClient.approveCollege(token, id));
      setMessage('✅ College approved successfully and login credentials issued.');
      await loadAdminData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectCollege = async (id: number) => {
    setActionLoading(id);
    try {
      await withAuth((token) => apiClient.rejectCollege(token, id, 'Rejected by admin review'));
      setMessage('College registration rejected.');
      await loadAdminData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Layout
      title="Platform Superadmin Dashboard 🛡️"
      subtitle="IRA Network Overview • College Approvals • Platform Revenue"
    >
      {message && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between">
          <span>❌ {error}</span>
          <button type="button" onClick={() => setError('')} className="text-rose-700 hover:text-rose-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* TOP 4 METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Colleges</span>
            <span className="text-base">🏛️</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {stats?.totalRegisteredColleges ?? '—'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Institutions in system</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Active</span>
            <span className="text-base">✅</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {stats?.totalApprovedColleges ?? '—'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Live campus nodes</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <span className="text-base">⏳</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {stats?.totalPendingRegistrations ?? pending.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">Awaiting verification</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Weekly Revenue</span>
            <span className="text-base">💰</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">
            ₹{stats?.totalPlatformEarnings.week.toFixed(2) ?? '0.00'}
          </div>
          <p className="text-xs text-slate-400 mt-1">Platform 15% fee cut</p>
        </div>
      </div>

      {/* MAIN ADMIN CONTENT: PENDING COLLEGES & REVENUE CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending College Applications List */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pending College Applications</h2>
              <p className="text-xs text-slate-500">Review and grant campus portal codes</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {pending.length} Pending
            </span>
          </div>

          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-sm font-bold text-slate-800">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No pending college registration requests right now.</p>
              </div>
            ) : (
              pending.map((entry) => (
                <div
                  key={entry.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {entry.submitted_data.university.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {entry.submitted_data.college?.name || 'University Node'} •{' '}
                        {entry.submitted_data.location.district}, {entry.submitted_data.location.state}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                      ML Score {entry.ml_score}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700">Offered Programs: </span>
                    {entry.submitted_data.courses.map((c) => `${c.name} (${c.duration}y)`).join(', ')}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={actionLoading === entry.id}
                      onClick={() => approveCollege(entry.id)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm disabled:opacity-50"
                    >
                      {actionLoading === entry.id ? 'Approving…' : 'Approve & Issue Code ✓'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === entry.id}
                      onClick={() => rejectCollege(entry.id)}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Revenue & Growth Chart */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Platform Earnings Trend</h2>
            <p className="text-xs text-slate-500 mb-4">Daily 15% fee revenue from campus loans</p>
          </div>

          <div className="flex-1 min-h-[300px]">
            <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-slate-400">Loading chart…</div>}>
              <EarningsChart points={earnings} />
            </Suspense>
          </div>
        </div>
      </div>
    </Layout>
  );
}
