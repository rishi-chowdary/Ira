import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { Investment, Loan } from '../types';

export default function AccountClosurePage() {
  const { user, withAuth, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await withAuth((token) => apiClient.getLoans(token));
      setLoans(data.loans || []);
      setInvestments(data.investments || []);
    } catch {
      // Continue with current user info
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const balances = useMemo(() => {
    const locked = user?.batua_locked || 0;
    const unlocked = user?.batua_unlocked || 0;
    const tijori = user?.tijori || 0;
    const total = locked + unlocked + tijori;
    return { locked, unlocked, tijori, total };
  }, [user]);

  const activeLoans = useMemo(
    () => loans.filter((l) => !['repaid', 'closed', 'rejected'].includes(l.status)),
    [loans],
  );

  const activeInvestments = useMemo(
    () => investments.filter((i) => i.status === 'active'),
    [investments],
  );

  const checks = useMemo(() => {
    const totalActiveObligations = activeLoans.length + activeInvestments.length;
    return [
      {
        id: 'locked',
        label: 'Batua Locked balance is zero',
        satisfied: balances.locked === 0,
        current: `Current: ₹${balances.locked.toFixed(2)}`,
        actionRoute: '/dashboard',
        actionLabel: 'Rebalance Batua',
      },
      {
        id: 'unlocked',
        label: 'Batua Unlocked balance is zero',
        satisfied: balances.unlocked === 0,
        current: `Current: ₹${balances.unlocked.toFixed(2)}`,
        actionRoute: '/dashboard',
        actionLabel: 'Withdraw Funds',
      },
      {
        id: 'tijori',
        label: 'Tijori emergency reserve is zero',
        satisfied: balances.tijori === 0,
        current: `Current: ₹${balances.tijori.toFixed(2)}`,
        actionRoute: '/dashboard',
        actionLabel: 'Transfer Tijori',
      },
      {
        id: 'obligations',
        label: 'No active borrowing or lending contracts',
        satisfied: totalActiveObligations === 0,
        current:
          totalActiveObligations === 0
            ? 'Status: Clear (0 active contracts)'
            : `Status: ${activeLoans.length} active loan(s), ${activeInvestments.length} active investment(s)`,
        actionRoute: '/dashboard',
        actionLabel: 'View Contracts',
      },
    ];
  }, [balances, activeLoans, activeInvestments]);

  const canClose = checks.every((c) => c.satisfied);

  const handleCloseAccount = async () => {
    if (!canClose) return;
    setClosing(true);
    setError('');
    setMessage('');
    try {
      const res = await withAuth((token) => apiClient.closeAccount(token));
      setMessage(res.message || 'Account successfully closed.');
      await refreshUser();
      setTimeout(async () => {
        await logout();
        navigate('/');
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Closure failed');
    } finally {
      setClosing(false);
    }
  };

  return (
    <Layout
      title="Account Closure"
      subtitle="Verify account obligations and prerequisites before initiating platform closure"
      onCloseRoute="/dashboard"
    >
      <div className="space-y-6 max-w-4xl">
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            {message} Redirecting to landing page...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            {error}
          </div>
        )}

        {/* Eligibility Status Banner */}
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
            canClose
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                canClose ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {canClose ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {canClose ? 'Account Eligible for Closure' : 'Prerequisites Incomplete'}
              </h3>
              <p className="text-xs opacity-80 mt-0.5 leading-relaxed">
                {canClose
                  ? 'All wallet balances are zero and no loan obligations remain in database.'
                  : 'You must withdraw or clear all wallet balances and settle active loans before account closure can proceed.'}
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold self-start sm:self-auto ${
              canClose ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
            }`}
          >
            {canClose ? 'Eligible' : 'Action Required'}
          </span>
        </div>

        {/* Prerequisites Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Closure Checklist</h3>
              <p className="text-xs text-slate-500 font-medium">
                Live verification query synced with database ledger
              </p>
            </div>
            <button
              type="button"
              onClick={loadContracts}
              disabled={loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-3">
            {checks.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      item.satisfied
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {item.satisfied ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{item.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.current}</div>
                  </div>
                </div>

                {!item.satisfied && item.actionRoute && (
                  <Link
                    to={item.actionRoute}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 self-start sm:self-auto"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseAccount}
              disabled={!canClose || closing}
              className="py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {closing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{closing ? 'Processing...' : 'Initiate Account Closure'}</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
