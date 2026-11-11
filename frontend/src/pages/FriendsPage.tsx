import { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Copy,
  HeartHandshake,
  PlusCircle,
  RefreshCw,
  Send,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { FriendRecord, PrivateLoanRecord } from '../types';

export default function FriendsPage() {
  const { user, withAuth } = useAuth();
  const [copied, setCopied] = useState(false);
  const [friendsList, setFriendsList] = useState<FriendRecord[]>([]);
  const [privateLoans, setPrivateLoans] = useState<PrivateLoanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add friend state
  const [targetAccountId, setTargetAccountId] = useState('');

  // Propose private loan state
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [selectedFriendAccount, setSelectedFriendAccount] = useState('');
  const [loanProposal, setLoanProposal] = useState({
    amount: 1000,
    interest: 0,
    tenure: 14,
    message: 'Peer micro-loan for books',
  });

  const borrowingId = user?.borrowing_account_id || 'IRA-CAMPUS-PENDING';

  const loadFriendsAndLoans = async () => {
    setLoading(true);
    try {
      const [friendsData, loansData] = await Promise.all([
        withAuth((token) => apiClient.getFriends(token)),
        withAuth((token) => apiClient.getPrivateLoans(token)),
      ]);
      setFriendsList(friendsData || []);
      setPrivateLoans(loansData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load network data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsAndLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(borrowingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAccountId.trim()) return;
    setActionLoading('add-friend');
    setError('');
    setMessage('');
    try {
      await withAuth((token) => apiClient.sendFriendRequest(token, targetAccountId.trim()));
      setMessage('Friend request sent and saved to database!');
      setTargetAccountId('');
      await loadFriendsAndLoans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send friend request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    setActionLoading(requestId);
    setError('');
    setMessage('');
    try {
      await withAuth((token) => apiClient.acceptFriendRequest(token, requestId));
      setMessage('Friend connection accepted!');
      await loadFriendsAndLoans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept friend request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (requestId: number) => {
    setActionLoading(requestId);
    setError('');
    setMessage('');
    try {
      await withAuth((token) => apiClient.removeFriend(token, requestId));
      setMessage('Friend request declined/removed.');
      await loadFriendsAndLoans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove connection');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProposeLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriendAccount) {
      setError('Please select a verified friend or provide a Borrowing Account ID.');
      return;
    }
    setActionLoading('propose-loan');
    setError('');
    setMessage('');
    try {
      await withAuth((token) =>
        apiClient.requestPrivateLoan(token, {
          to_borrowing_account_id: selectedFriendAccount,
          amount: Number(loanProposal.amount),
          interest_proposed: Number(loanProposal.interest),
          tenure_days: Number(loanProposal.tenure),
          message: loanProposal.message,
        }),
      );
      setMessage('Private loan proposal sent and recorded in database!');
      setShowProposeModal(false);
      await loadFriendsAndLoans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRespondLoan = async (requestId: number, action: 'accept' | 'reject') => {
    setActionLoading(`loan-${requestId}`);
    setError('');
    setMessage('');
    try {
      await withAuth((token) =>
        apiClient.respondPrivateLoan(token, {
          requestId,
          action,
        }),
      );
      setMessage(`Private loan ${action === 'accept' ? 'accepted' : 'rejected'}.`);
      await loadFriendsAndLoans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond to private loan');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingIncoming = friendsList.filter((f) => !f.isRequester && f.status === 'pending');
  const pendingOutgoing = friendsList.filter((f) => f.isRequester && f.status === 'pending');
  const acceptedFriends = friendsList.filter((f) => f.status === 'accepted');

  return (
    <Layout
      title="Friends Network"
      subtitle="Connect with college peers for zero-commission micro-lending and private loan terms"
      onCloseRoute="/dashboard"
      actions={
        <button
          type="button"
          onClick={loadFriendsAndLoans}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync DB</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Alerts */}
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>✅ {message}</span>
            <button type="button" onClick={() => setMessage('')} className="text-emerald-700 hover:text-emerald-950 font-bold">
              ✕
            </button>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
            <span>❌ {error}</span>
            <button type="button" onClick={() => setError('')} className="text-rose-700 hover:text-rose-950 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Friends Hero Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Database-Backed Peer Circle
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              Lend & Borrow Privately with Verified College Friends
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Every connection and private contract is stored in the database. Negotiate custom repayment dates,
              0% friendly rates, and auto-disburse through your campus wallet.
            </p>
          </div>
        </div>

        {/* Account ID Card & Add Friend Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* ID Sharing Card */}
          <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Your Campus Identifier</h3>
              <p className="text-xs text-slate-500 font-medium">
                Share this unique ID with peers at your college to initiate private friend loans
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Borrowing Account ID
                </span>
                <span className="text-sm sm:text-base font-mono font-black text-slate-900 tracking-tight">
                  {borrowingId}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy ID'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold block">Campus Affiliation</span>
                <span className="font-bold text-slate-800">{user?.course_name || 'Enrolled Student'}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold block">Circle Size</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> {acceptedFriends.length} Active Friends
                </span>
              </div>
            </div>
          </div>

          {/* Connect Peer Form */}
          <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Connect With A Friend</span>
              </h4>
              <p className="text-xs text-slate-500">
                Enter your classmate's Borrowing Account ID to link as friends for direct 0% lending.
              </p>

              <form onSubmit={handleSendFriendRequest} className="space-y-3 pt-2">
                <div>
                  <input
                    type="text"
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    placeholder="e.g. 91 58 101 001 001 01 00004"
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-friend' || !targetAccountId.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {actionLoading === 'add-friend' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send Friend Request</span>
                </button>
              </form>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Demo ID: 91 58 101 001 001 01 00004</span>
              <button
                type="button"
                onClick={() => setTargetAccountId('91 58 101 001 001 01 00004')}
                className="text-blue-600 font-bold hover:underline"
              >
                Auto-fill
              </button>
            </div>
          </div>
        </div>

        {/* Incoming Friend Requests (If Any) */}
        {pendingIncoming.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3 shadow-2xs">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Incoming Friend Requests ({pendingIncoming.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingIncoming.map((req) => (
                <div
                  key={req.id}
                  className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{req.peer?.full_name || 'Classmate'}</h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {req.peer?.borrowing_account_id}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{req.peer?.college_email}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAcceptRequest(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Friend Requests (If Any) */}
        {pendingOutgoing.length > 0 && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 space-y-3 shadow-2xs">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Pending Outgoing Requests ({pendingOutgoing.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingOutgoing.map((req) => (
                <div
                  key={req.id}
                  className="bg-white p-4 rounded-xl border border-blue-200/80 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{req.peer?.full_name || 'Classmate'}</h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {req.peer?.borrowing_account_id}
                    </p>
                    <span className="text-[10px] text-amber-600 font-bold">Awaiting Peer Response</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(req.id)}
                    disabled={actionLoading === req.id}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verified Friends Circle */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Verified Friends Circle</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Connected peers with mutual borrowing and lending permissions
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (acceptedFriends.length > 0) {
                  setSelectedFriendAccount(acceptedFriends[0].peer?.borrowing_account_id || '');
                }
                setShowProposeModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Propose Private Loan</span>
            </button>
          </div>

          {acceptedFriends.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
              <HeartHandshake className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Friends Connected Yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Share your Borrowing Account ID above or add a friend using their ID to start private lending.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {acceptedFriends.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{f.peer?.full_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Verified
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-slate-500 break-all">{f.peer?.borrowing_account_id}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>Shri Score: <strong className="text-blue-600">{f.peer?.shri_score || '—'}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFriendAccount(f.peer?.borrowing_account_id || '');
                        setShowProposeModal(true);
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
                    >
                      Propose Loan →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Private Loans Hub */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
                <Coins className="w-5 h-5 text-indigo-600" />
                <span>Private Loans & Peer Proposals</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Agreed private lending contracts synced directly to IRA database ledger
              </p>
            </div>
          </div>

          {privateLoans.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
              <Coins className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No Active Private Loan Proposals</p>
              <p className="text-[11px] text-slate-400">
                Propose a custom micro-loan to any verified friend to agree on custom repayment terms.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {privateLoans.map((pl) => {
                const isIncoming = !pl.isFromMe && pl.status === 'pending';
                return (
                  <div
                    key={pl.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">₹{pl.amount.toLocaleString()}</span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          {pl.interest_proposed}% Interest
                        </span>
                        <span className="text-xs text-slate-500 font-medium">({pl.tenure_days} days)</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            pl.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pl.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pl.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        {pl.isFromMe
                          ? `You proposed to: ${pl.to_user?.full_name || pl.to_user?.email}`
                          : `Proposed by: ${pl.from_user?.full_name || pl.from_user?.email}`}
                      </p>
                    </div>

                    {isIncoming && (
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRespondLoan(pl.id, 'accept')}
                          disabled={actionLoading === `loan-${pl.id}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondLoan(pl.id, 'reject')}
                          disabled={actionLoading === `loan-${pl.id}`}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Propose Private Loan */}
        {showProposeModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-600" />
                  <span>Propose Private Friend Loan</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleProposeLoan} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Friend Account ID</label>
                  {acceptedFriends.length > 0 ? (
                    <select
                      value={selectedFriendAccount}
                      onChange={(e) => setSelectedFriendAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select a friend</option>
                      {acceptedFriends.map((f) => (
                        <option key={f.id} value={f.peer?.borrowing_account_id}>
                          {f.peer?.full_name} ({f.peer?.borrowing_account_id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedFriendAccount}
                      onChange={(e) => setSelectedFriendAccount(e.target.value)}
                      placeholder="Enter borrowing account ID"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      min={100}
                      max={10000}
                      value={loanProposal.amount}
                      onChange={(e) => setLoanProposal((p) => ({ ...p, amount: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Interest (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={loanProposal.interest}
                      onChange={(e) => setLoanProposal((p) => ({ ...p, interest: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tenure (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={loanProposal.tenure}
                    onChange={(e) => setLoanProposal((p) => ({ ...p, tenure: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Note / Reason</label>
                  <input
                    type="text"
                    value={loanProposal.message}
                    onChange={(e) => setLoanProposal((p) => ({ ...p, message: e.target.value }))}
                    placeholder="e.g. Lab project kit purchase"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProposeModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === 'propose-loan'}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition"
                  >
                    {actionLoading === 'propose-loan' ? 'Submitting...' : 'Send Proposal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
