import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Info,
  PlusCircle,
  Receipt,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unlock,
  Users,
} from 'lucide-react';

import Layout from '../components/Layout';
import ShriScoreBadge from '../components/ShriScoreBadge';
import WalletCard from '../components/WalletCard';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { Investment, Loan, ShriTier } from '../types';

interface LoanResponse {
  loans: Loan[];
  investments: Investment[];
}

const COMMON_PURPOSES = [
  'Books & Study Materials',
  'Exam & Lab Fees',
  'Hostel & Rent',
  'Mess & Food Expenses',
  'Project & Hardware Kit',
  'Medical / Emergency',
];

export default function StudentDashboard() {
  const { refreshUser, user, updateMode, withAuth } = useAuth();
  const [loanPurposes, setLoanPurposes] = useState<string[]>([]);
  const [shriTiers, setShriTiers] = useState<ShriTier[]>([]);
  const [loanForm, setLoanForm] = useState({
    amount: 1000,
    tenure: 15,
    purpose: 'Books & Study Materials',
    frequency: 'daily',
  });
  const [borrowerTab, setBorrowerTab] = useState<'request' | 'loans' | 'guarantor'>('request');
  const [loanState, setLoanState] = useState<LoanResponse>({ loans: [], investments: [] });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [nominationMessage, setNominationMessage] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const loadDashboard = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      const [payload, purposes, tiers] = await Promise.all([
        withAuth((token) => apiClient.getLoans(token)),
        apiClient.getLoanPurposes().catch(() => []),
        apiClient.getShriTiers().catch(() => []),
      ]);
      setLoanState(payload);
      if (purposes?.length) setLoanPurposes(purposes);
      if (tiers?.length) setShriTiers(tiers);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Multiplier for interest calculation fetched from database
  const shriMultiplier = useMemo(() => {
    const score = user?.shri_score || 600;
    if (shriTiers.length > 0) {
      const match = shriTiers.find((t) => score >= t.min_score && score <= t.max_score);
      if (match) return match.rate_multiplier;
    }
    if (score >= 900) return 0.8;
    if (score >= 750) return 0.85;
    if (score >= 600) return 0.92;
    if (score >= 400) return 1.0;
    return 1.15;
  }, [user?.shri_score, shriTiers]);

  // Live Loan Calculation Preview
  const loanCalculations = useMemo(() => {
    const principal = Number(loanForm.amount) || 0;
    const days = Number(loanForm.tenure) || 1;
    // Base annualized peer rate ~18%, adjusted by Shri multiplier
    const dailyRate = (0.18 / 365) * shriMultiplier;
    const totalInterest = Math.round(principal * dailyRate * days * 100) / 100;
    const totalRepayable = Math.round((principal + totalInterest) * 100) / 100;

    let installmentsCount = days;
    if (loanForm.frequency === 'every2') {
      installmentsCount = Math.ceil(days / 2);
    }
    const perInstallment =
      installmentsCount > 0
        ? Math.round((totalRepayable / installmentsCount) * 100) / 100
        : totalRepayable;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    return {
      principal,
      days,
      totalInterest,
      totalRepayable,
      installmentsCount,
      perInstallment,
      dueDateFormatted: dueDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };
  }, [loanForm.amount, loanForm.tenure, loanForm.frequency, shriMultiplier]);

  // Lender stats
  const lenderStats = useMemo(() => {
    const totalInvested = loanState.investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = loanState.investments.reduce((sum, inv) => sum + inv.expected_return, 0);
    const netProfit = Math.max(0, totalReturns - totalInvested);
    return { totalInvested, totalReturns, netProfit };
  }, [loanState.investments]);

  const submitLoan = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await withAuth((token) =>
        apiClient.requestLoan(token, {
          amount: Number(loanForm.amount),
          tenure: Number(loanForm.tenure),
          purpose: loanForm.purpose,
          scheduleFrequency: loanForm.frequency,
        }),
      );
      setMessage(
        `Loan request created successfully! Matched ${response.matches.length} peer lender${
          response.matches.length === 1 ? '' : 's'
        } on campus.`,
      );
      setBorrowerTab('loans');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request loan');
    } finally {
      setLoading(false);
    }
  };

  const requestGuarantor = async () => {
    if (!nomineeEmail) {
      setError('Enter a valid college email address to nominate a guarantor.');
      return;
    }
    setLoading(true);
    setError('');
    setNominationMessage('');
    try {
      await withAuth((token) => apiClient.requestGuarantor(token, nomineeEmail));
      setNominationMessage(
        `Guarantor request sent to ${nomineeEmail}. They have 7 days to accept.`,
      );
      setNomineeEmail('');
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to send guarantor request',
      );
    } finally {
      setLoading(false);
    }
  };

  const repayLoan = async (loanId: number) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await withAuth((token) => apiClient.repayLoan(token, loanId));
      setMessage(`Loan #${loanId} repaid successfully! Shri score updated.`);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Repayment failed');
    } finally {
      setLoading(false);
    }
  };

  const copyAccountId = () => {
    const id = user?.borrowing_account_id || user?.lending_account_id || '';
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Layout
      title="Student Hub"
      subtitle="Peer-to-peer micro-lending designed exclusively for university students"
      showModeToggle
      actions={
        <button
          type="button"
          onClick={loadDashboard}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Verification & Onboarding Alerts */}
        {!user?.wallet_activated || user?.kyc_status !== 'verified' ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950">Finish Identity & Wallet Setup</h3>
                <p className="text-xs text-blue-800/80 mt-0.5">
                  Complete your student KYC to unlock borrowing limits and peer lending matching.
                </p>
              </div>
            </div>
            <Link
              to="/onboarding"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shrink-0 shadow-sm"
            >
              <span>Complete Setup</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : null}

        {!user?.college_verified ? (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold">College Verification Pending:</strong> Your university
              administration has not confirmed your enrollment yet. Once approved, peer borrowing
              matching unlocks instantly.
            </div>
          </div>
        ) : null}

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

        {/* Welcome & Student Status Capsule */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              {(user?.full_name || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!
                </h2>
                {user?.college_verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Campus Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <Clock className="w-3 h-3" /> Verification Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {user?.course_name ? `${user.course_name} · Year ${user.year || 1}` : user?.college_email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Account ID Pill */}
            {(user?.borrowing_account_id || user?.lending_account_id) && (
              <button
                type="button"
                onClick={copyAccountId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-mono font-bold text-slate-700 transition"
                title="Click to copy your unique ID"
              >
                <span className="text-slate-400 font-sans text-[11px]">ID:</span>
                <span>{user.borrowing_account_id || user.lending_account_id}</span>
                {copiedId ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            )}

            {/* Quick Mode Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                type="button"
                onClick={() => updateMode('borrower')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  user?.mode !== 'lender'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Borrowing</span>
              </button>
              <button
                type="button"
                onClick={() => updateMode('lender')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  user?.mode === 'lender'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Lending</span>
              </button>
            </div>
          </div>
        </div>

        {/* Financial Health Row (Spacious & Balanced) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Digital Batua & Tijori (Takes 2 Columns on large screens) */}
          <div className="lg:col-span-2">
            <WalletCard
              locked={user?.batua_locked || 0}
              unlocked={user?.batua_unlocked || 0}
              tijori={user?.tijori || 0}
            />
          </div>

          {/* Shri Credit Score Standing */}
          <div className="lg:col-span-1">
            <ShriScoreBadge score={user?.shri_score || 0} />
          </div>
        </div>

        {/* Dynamic Workspace: Borrower Hub vs Lender Hub */}
        {user?.mode !== 'lender' ? (
          /* =========================================================================
             BORROWER HUB
             ========================================================================= */
          <div className="space-y-4">
            {/* Borrower Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBorrowerTab('request')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    borrowerTab === 'request'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Request Loan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBorrowerTab('loans')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    borrowerTab === 'loans'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>My Loans</span>
                  {loanState.loans.length > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        borrowerTab === 'loans'
                          ? 'bg-white text-blue-600'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {loanState.loans.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBorrowerTab('guarantor')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    borrowerTab === 'guarantor'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Nominate Guarantor</span>
                </button>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Peer Lending Protocol
              </span>
            </div>

            {/* Tab 1: Request Loan (Smart Loan Builder) */}
            {borrowerTab === 'request' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Form Controls (7 cols) */}
                <form
                  onSubmit={submitLoan}
                  className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-5"
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Configure Peer Loan
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Set your requested emergency amount and repayment schedule
                    </p>
                  </div>

                  {/* Amount Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="loan-amount-input" className="text-xs font-bold text-slate-700">
                        Loan Amount (₹500 - ₹5,000)
                      </label>
                      <span className="text-base font-black text-blue-600">
                        ₹{Number(loanForm.amount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <input
                      id="loan-amount-input"
                      type="range"
                      min={500}
                      max={5000}
                      step={100}
                      value={loanForm.amount}
                      onChange={(e) =>
                        setLoanForm((curr) => ({ ...curr, amount: Number(e.target.value) }))
                      }
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />

                    {/* Quick amount chips */}
                    <div className="flex items-center gap-2 pt-1">
                      {[500, 1000, 2000, 3500, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setLoanForm((curr) => ({ ...curr, amount: val }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            loanForm.amount === val
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          ₹{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tenure Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="loan-tenure-input" className="text-xs font-bold text-slate-700">
                        Tenure (1 - 90 Days)
                      </label>
                      <span className="text-base font-black text-slate-800">
                        {loanForm.tenure} Days
                      </span>
                    </div>

                    <input
                      id="loan-tenure-input"
                      type="range"
                      min={1}
                      max={90}
                      step={1}
                      value={loanForm.tenure}
                      onChange={(e) =>
                        setLoanForm((curr) => ({ ...curr, tenure: Number(e.target.value) }))
                      }
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />

                    {/* Quick tenure chips */}
                    <div className="flex items-center gap-2 pt-1">
                      {[7, 15, 30, 45, 60, 90].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setLoanForm((curr) => ({ ...curr, tenure: days }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            loanForm.tenure === days
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frequency Selector */}
                  <div className="space-y-1.5">
                    <label htmlFor="loan-frequency-select" className="text-xs font-bold text-slate-700">
                      Repayment Frequency
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'daily', label: 'Daily' },
                        { id: 'every1', label: 'Every 1 Day' },
                        { id: 'every2', label: 'Every 2 Days' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setLoanForm((curr) => ({ ...curr, frequency: item.id }))}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                            loanForm.frequency === item.id
                              ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Purpose Selector */}
                  <div className="space-y-2">
                    <label htmlFor="loan-purpose-input" className="text-xs font-bold text-slate-700">
                      Loan Purpose
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(loanPurposes.length > 0 ? loanPurposes : COMMON_PURPOSES).map((purpose) => (
                        <button
                          key={purpose}
                          type="button"
                          onClick={() => setLoanForm((curr) => ({ ...curr, purpose }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            loanForm.purpose === purpose
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {purpose}
                        </button>
                      ))}
                    </div>
                    <textarea
                      id="loan-purpose-input"
                      rows={2}
                      value={loanForm.purpose}
                      onChange={(e) => setLoanForm((curr) => ({ ...curr, purpose: e.target.value }))}
                      placeholder="Specify why you need this loan..."
                      className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Action CTA */}
                  <button
                    type="submit"
                    disabled={loading || !user?.can_borrow}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Matching campus lenders…</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Request ₹{loanCalculations.principal.toLocaleString('en-IN')} Loan</span>
                      </>
                    )}
                  </button>

                  {!user?.can_borrow && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      Borrowing is currently locked. Ensure your college has approved your
                      registration and you have completed KYC onboarding.
                    </p>
                  )}
                </form>

                {/* Live Loan Calculation Summary Card (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Repayment Breakdown
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        Live Preview
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Requested Principal</span>
                        <strong className="text-white font-bold">
                          ₹{loanCalculations.principal.toFixed(2)}
                        </strong>
                      </div>

                      <div className="flex justify-between text-slate-300">
                        <span className="flex items-center gap-1">
                          <span>Peer Interest Rate</span>
                          <span className="text-[10px] text-emerald-400">
                            ({shriMultiplier}x multiplier)
                          </span>
                        </span>
                        <strong className="text-emerald-400 font-bold">
                          +₹{loanCalculations.totalInterest.toFixed(2)}
                        </strong>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                        <span className="text-sm font-bold text-slate-200">Total Repayable</span>
                        <span className="text-2xl font-black text-emerald-400">
                          ₹{loanCalculations.totalRepayable.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Due Date</span>
                        <strong className="text-white font-bold">
                          {loanCalculations.dueDateFormatted}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Est. Installment</span>
                        <strong className="text-white font-bold">
                          ₹{loanCalculations.perInstallment.toFixed(2)} / {loanForm.frequency}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Installments Count</span>
                        <strong className="text-white font-bold">
                          {loanCalculations.installmentsCount} installments
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        Loans are peer-funded by fellow students on IRA. Repaying on or before the
                        due date increases your Shri score and unlocks lower interest rates on future
                        loans.
                      </span>
                    </div>
                  </div>

                  {/* Quick Tips Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs text-xs space-y-2">
                    <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Borrowing Protection</span>
                    </h5>
                    <p className="text-slate-600 leading-relaxed">
                      IRA protects students against aggressive recovery. UPI Autopay activates only
                      on mutually agreed dates, and peer guarantors back you during temporary
                      shortfalls.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: My Active & Past Loans */}
            {borrowerTab === 'loans' && (
              <div className="space-y-4">
                {loanState.loans.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No active loans found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      You do not have any open or pending loans. If you need emergency cash for study
                      materials or fees, apply above.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBorrowerTab('request')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Request a Loan</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loanState.loans.map((loan) => {
                      const isRepaid = loan.status === 'repaid';
                      const isActive = loan.status === 'active';
                      const isPending = loan.status === 'pending';
                      const dueDateObj = new Date(loan.due_date);

                      return (
                        <div
                          key={loan.id}
                          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-blue-200 transition"
                        >
                          <div>
                            {/* Loan Header */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-slate-400">
                                  #{loan.id}
                                </span>
                                <h4 className="text-sm font-black text-slate-900">
                                  ₹{loan.amount.toLocaleString('en-IN')} Loan
                                </h4>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                  isRepaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isActive
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {loan.status}
                              </span>
                            </div>

                            {/* Loan Details Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] text-slate-400 block font-semibold">
                                  Total Repayable
                                </span>
                                <span className="text-sm font-black text-slate-800">
                                  ₹{loan.total_repayable.toFixed(2)}
                                </span>
                              </div>

                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="text-[10px] text-slate-400 block font-semibold">
                                  Due Date
                                </span>
                                <span className="text-sm font-bold text-slate-800">
                                  {dueDateObj.toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="text-[11px] text-slate-500 space-y-1">
                              <div>
                                <span className="font-semibold text-slate-600">Tenure:</span>{' '}
                                {loan.tenure_days} days · {loan.schedule_frequency || 'daily'}
                              </div>
                              {loan.purpose && (
                                <div className="truncate">
                                  <span className="font-semibold text-slate-600">Purpose:</span>{' '}
                                  {loan.purpose}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400">
                              Created {new Date(loan.created_at).toLocaleDateString()}
                            </span>

                            {isActive ? (
                              <button
                                type="button"
                                onClick={() => repayLoan(loan.id)}
                                disabled={loading}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Repay Now</span>
                              </button>
                            ) : isRepaid ? (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                              </span>
                            ) : isPending ? (
                              <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Awaiting Lenders
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Nominate Guarantor */}
            {borrowerTab === 'guarantor' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Nominate a Peer Guarantor
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Guarantors verify your integrity and back your loan requests on campus
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="guarantor-email-input" className="text-xs font-bold text-slate-700">
                      Peer College Email
                    </label>
                    <input
                      id="guarantor-email-input"
                      type="email"
                      value={nomineeEmail}
                      onChange={(e) => setNomineeEmail(e.target.value)}
                      placeholder="e.g. friend@college.edu"
                      className="w-full px-3.5 py-2.5 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={requestGuarantor}
                    disabled={loading || !nomineeEmail}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Guarantor Backing Request</span>
                  </button>

                  {nominationMessage && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      {nominationMessage}
                    </p>
                  )}
                </div>

                <div className="md:col-span-5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-blue-200/80 p-5 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Guarantor Policy</span>
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        Nominated peers must share the same college domain or recognized institution.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        They have <strong>7 days</strong> to accept or decline the backing request.
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        Having 1 or more active guarantors provides an instant boost to your Shri
                        Score!
                      </span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Link
                      to="/guarantors"
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                    >
                      <span>Manage all guarantors</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
             LENDER HUB
             ========================================================================= */
          <div className="space-y-5">
            {/* Lender Performance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Available to Lend</span>
                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  ₹{Number(user?.batua_unlocked || 0).toFixed(2)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Unlocked Batua capital</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Active Investments</span>
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  ₹{lenderStats.totalInvested.toFixed(2)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Across {loanState.investments.length} peer loans
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Expected Returns</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600">
                  ₹{lenderStats.totalReturns.toFixed(2)}
                </div>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  +₹{lenderStats.netProfit.toFixed(2)} projected profit
                </p>
              </div>
            </div>

            {/* Investments List Section */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Active Peer Investments
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Funds matched from your unlocked Batua to verified student borrowers
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
                  {loanState.investments.length} Active
                </span>
              </div>

              {loanState.investments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                  <Coins className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No active investments yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-3">
                    When you keep funds in your <strong>Batua Unlocked</strong> balance, the IRA
                    matching engine automatically pairs you with safe, college-verified borrower
                    requests.
                  </p>
                  <p className="text-xs text-blue-600 font-semibold">
                    Ensure your Unlocked Batua has balance above ₹100 to start earning.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {loanState.investments.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            Inv #{inv.id}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800">
                            Loan #{inv.loan_id}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 capitalize">
                          {inv.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            Invested
                          </span>
                          <span className="font-bold text-slate-800">
                            ₹{inv.amount.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            Expected Return
                          </span>
                          <span className="font-bold text-emerald-600">
                            ₹{inv.expected_return.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
