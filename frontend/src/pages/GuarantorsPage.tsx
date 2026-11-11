import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

export default function GuarantorsPage() {
  const { withAuth } = useAuth();
  const [payload, setPayload] = useState<{
    yourGuarantors: Array<Record<string, unknown>>;
    youAsGuarantor: Array<Record<string, unknown>>;
  }>({ yourGuarantors: [], youAsGuarantor: [] });
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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

  const requestGuarantor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomineeEmail) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await withAuth((token) => apiClient.requestGuarantor(token, nomineeEmail));
      setMessage(`Guarantor request sent to ${nomineeEmail}. They have 7 days to respond.`);
      setNomineeEmail('');
      await loadGuarantors();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to send guarantor request',
      );
    } finally {
      setLoading(false);
    }
  };

  const respond = async (borrowerId: number, action: 'approve' | 'reject') => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await withAuth((token) => apiClient.respondToGuarantor(token, borrowerId, action));
      setMessage(`Guarantor request ${action === 'approve' ? 'approved' : 'rejected'}.`);
      await loadGuarantors();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Guarantors Network"
      subtitle="Mutual student backing builds campus trust and unlocks higher loan approval limits"
      onCloseRoute="/dashboard"
    >
      <div className="space-y-6">
        {/* Informative Header Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-950">How Campus Guarantors Work</h3>
              <p className="text-xs text-blue-800/80 mt-0.5 leading-relaxed max-w-2xl">
                Guarantors are fellow students who vouch for your creditworthiness. Having active
                guarantors elevates your Shri Score and guarantees emergency micro-loans during exam
                or hostel cycles.
              </p>
            </div>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900 shadow-xs animate-slide-down">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage('')}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs font-semibold text-rose-900 shadow-xs animate-slide-down">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-rose-700 hover:text-rose-900 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Quick Nominate Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Nominate a New Guarantor</h3>
          <p className="text-xs text-slate-500 mb-4">
            Invite a classmate or college friend to back your borrowing profile.
          </p>
          <form onSubmit={requestGuarantor} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={nomineeEmail}
              onChange={(e) => setNomineeEmail(e.target.value)}
              placeholder="friend@college.edu"
              className="flex-1 px-4 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !nomineeEmail}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Invite</span>
            </button>
          </form>
        </div>

        {/* Two-Column Grid: Backing You vs You Backing Others */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Column 1: Your Guarantors */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Peers Backing You</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {payload.yourGuarantors.length}
                </span>
              </div>

              {payload.yourGuarantors.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No guarantors nominated yet</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Nominate trusted campus peers to back you. Each accepted guarantor strengthens
                    your borrowing trust tier.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payload.yourGuarantors.map((entry) => {
                    const guarantorObj = entry.guarantor as { full_name?: string; email?: string };
                    const name = guarantorObj?.full_name || guarantorObj?.email || 'Guarantor';
                    const status = String(entry.status || 'pending');
                    const isApproved = status === 'approved';

                    return (
                      <div
                        key={String(entry.guarantor_id)}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{name}</div>
                            <div className="text-[10px] text-slate-400">
                              {guarantorObj?.email || 'Campus peer'}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize flex items-center gap-1 ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{status}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: You as Guarantor */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Requests For You to Back</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  {payload.youAsGuarantor.length}
                </span>
              </div>

              {payload.youAsGuarantor.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No backing requests right now</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    When classmates nominate you to vouch for their loans, their requests will appear
                    here for your approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payload.youAsGuarantor.map((entry) => {
                    const borrowerObj = entry.borrower as { full_name?: string; email?: string };
                    const name = borrowerObj?.full_name || borrowerObj?.email || 'Borrower';
                    const status = String(entry.status || 'pending');
                    const isPending = status === 'pending';

                    return (
                      <div
                        key={String(entry.borrower_id)}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center justify-center">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{name}</div>
                            <div className="text-[10px] text-slate-400">
                              Status: <span className="capitalize font-semibold">{status}</span>
                            </div>
                          </div>
                        </div>

                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => respond(Number(entry.borrower_id), 'approve')}
                              disabled={loading}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => respond(Number(entry.borrower_id), 'reject')}
                              disabled={loading}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize self-start sm:self-auto ${
                              status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
