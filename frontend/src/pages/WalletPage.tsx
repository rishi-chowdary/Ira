// ============================================================
// WalletPage.tsx — IRA Wallet Dashboard
// ============================================================

import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

// ─── Types ───────────────────────────────────────────────────

interface WalletBalance {
  batua_locked: number;
  batua_unlocked: number;
  tijori: number;
  total: number;
  mock_upi_balance: number;
  is_activated: boolean;
}

interface WalletTransaction {
  id: number;
  user_id: number;
  type: string;
  wallet?: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  status?: string;
}

type ModalType = 'add' | 'transfer' | 'withdraw' | 'autopay' | null;
type WalletKey = 'batua_locked' | 'batua_unlocked' | 'tijori';
type TxFilter = 'all' | WalletKey;
type DateRange = 'today' | 'week' | 'month' | 'all';

// ─── Constants ────────────────────────────────────────────────

const WALLET_META: Record<WalletKey, { label: string; hindi: string; color: string; badge: string; desc: string; gradient: string }> = {
  batua_locked: {
    label: 'Batua Locked',
    hindi: 'बटुआ (लॉक्ड)',
    color: '#2563eb',
    badge: 'Reserve',
    desc: 'Funds reserved from your UPI bank account',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
  },
  batua_unlocked: {
    label: 'Batua Unlocked',
    hindi: 'बटुआ (अनलॉक्ड)',
    color: '#10b981',
    badge: 'Active',
    desc: 'Active wallet for lending & daily use',
    gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
  },
  tijori: {
    label: 'Tijori',
    hindi: 'तिजोरी',
    color: '#7c3aed',
    badge: 'Collections',
    desc: 'Repayment collections & interest earnings',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)',
  },
};

const ALLOWED_TRANSFERS: Array<{ from: WalletKey; to: WalletKey }> = [
  { from: 'batua_locked', to: 'batua_unlocked' },
  { from: 'batua_unlocked', to: 'batua_locked' },
  { from: 'tijori', to: 'batua_locked' },
  { from: 'tijori', to: 'batua_unlocked' },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

// ─── Helpers ─────────────────────────────────────────────────

function fmt(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function humanizeType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isCredit(type: string): boolean {
  return ['upi_deposit', 'internal_transfer_in', 'autopay_debit', 'repayment_received'].includes(type);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function filterByDate(tx: WalletTransaction, range: DateRange): boolean {
  if (range === 'all') return true;
  const now = new Date();
  const created = new Date(tx.created_at);
  if (range === 'today') {
    return created.toDateString() === now.toDateString();
  }
  if (range === 'week') {
    const week = new Date(now);
    week.setDate(now.getDate() - 7);
    return created >= week;
  }
  if (range === 'month') {
    const month = new Date(now);
    month.setDate(now.getDate() - 30);
    return created >= month;
  }
  return true;
}

// ─── Modal Component ─────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.97)', borderRadius: 20, padding: 32,
          width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          animation: 'modalIn 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
            aria-label="Close"
          >×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function WalletPage() {
  const { user, withAuth, refreshUser } = useAuth();

  // ── State
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // ── Transaction filters
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  // ── Add Money form
  const [addAmount, setAddAmount] = useState<number | ''>('');

  // ── Transfer form
  const [transferFrom, setTransferFrom] = useState<WalletKey>('batua_locked');
  const [transferTo, setTransferTo] = useState<WalletKey>('batua_unlocked');
  const [transferAmount, setTransferAmount] = useState<number | ''>('');

  // ── Withdraw form
  const [withdrawWallet, setWithdrawWallet] = useState<WalletKey>('batua_locked');
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');

  // ── AutoPay form
  const [autopayAmount, setAutopayAmount] = useState<number | ''>('');

  // ── Refs for section scroll
  const sectionRefs = {
    batua_locked: useRef<HTMLDivElement>(null),
    batua_unlocked: useRef<HTMLDivElement>(null),
    tijori: useRef<HTMLDivElement>(null),
  };

  // ─── Data loading ────────────────────────────────────────

  const loadBalance = useCallback(async () => {
    try {
      const data = await withAuth((token) => apiClient.getWalletBalance(token));
      setBalance(data);
    } catch (err) {
      // balance fallback from user context
    }
  }, [withAuth]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params: { wallet?: string; range?: string } = {};
      if (txFilter !== 'all') params.wallet = txFilter;
      if (dateRange !== 'all') params.range = dateRange;
      const data = await withAuth((token) => apiClient.getWalletTransactions(token, params));
      setTransactions(Array.isArray(data) ? data : []);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, [withAuth, txFilter, dateRange]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshUser();
      await loadBalance();
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // ─── Derived values ──────────────────────────────────────

  const walletValues = {
    batua_locked: balance?.batua_locked ?? user?.batua_locked ?? 0,
    batua_unlocked: balance?.batua_unlocked ?? user?.batua_unlocked ?? 0,
    tijori: balance?.tijori ?? user?.tijori ?? 0,
  };
  const totalBalance = walletValues.batua_locked + walletValues.batua_unlocked + walletValues.tijori;
  const upiBalance = balance?.mock_upi_balance ?? user?.mock_upi_balance ?? 0;
  const upiId = user?.upi_id ?? '';

  // ─── Transfer options ────────────────────────────────────

  const toOptions = ALLOWED_TRANSFERS
    .filter((p) => p.from === transferFrom)
    .map((p) => p.to);

  useEffect(() => {
    if (!toOptions.includes(transferTo)) {
      setTransferTo(toOptions[0] ?? 'batua_unlocked');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferFrom]);

  const maxTransfer = walletValues[transferFrom] || 0;

  // ─── Action helpers ───────────────────────────────────────

  const resetAction = () => {
    setActionError('');
    setActionSuccess('');
  };

  const closeModal = () => {
    setModal(null);
    resetAction();
  };

  const afterSuccess = async (msg: string) => {
    setActionSuccess(msg);
    setActionLoading(false);
    await loadBalance();
    await refreshUser();
    await loadTransactions();
  };

  // ── Add Money
  const handleAddMoney = async () => {
    if (!addAmount || Number(addAmount) <= 0) {
      setActionError('Please enter a valid amount.');
      return;
    }
    if (Number(addAmount) > upiBalance) {
      setActionError('Amount exceeds your UPI balance.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await withAuth((token) =>
        apiClient.addMoney(token, { amount: Number(addAmount), upi_id: upiId }),
      );
      setAddAmount('');
      await afterSuccess(`₹${addAmount} added to Batua Locked successfully!`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add money.');
      setActionLoading(false);
    }
  };

  // ── Transfer
  const handleTransfer = async () => {
    if (!transferAmount || Number(transferAmount) <= 0) {
      setActionError('Please enter a valid amount.');
      return;
    }
    if (Number(transferAmount) > maxTransfer) {
      setActionError('Amount exceeds wallet balance.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await withAuth((token) =>
        apiClient.transferWallet(token, {
          from_wallet: transferFrom,
          to_wallet: transferTo,
          amount: Number(transferAmount),
        }),
      );
      setTransferAmount('');
      await afterSuccess(`Transfer of ₹${transferAmount} completed!`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Transfer failed.');
      setActionLoading(false);
    }
  };

  // ── Withdraw
  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      setActionError('Please enter a valid amount.');
      return;
    }
    if (Number(withdrawAmount) > walletValues[withdrawWallet]) {
      setActionError('Amount exceeds wallet balance.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await withAuth((token) =>
        apiClient.withdrawWallet(token, {
          amount: Number(withdrawAmount),
          from_wallet: withdrawWallet,
          upi_id: upiId,
        }),
      );
      setWithdrawAmount('');
      await afterSuccess(`₹${withdrawAmount} withdrawn to UPI ${upiId}!`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Withdrawal failed.');
      setActionLoading(false);
    }
  };

  // ── AutoPay
  const handleAutopay = async () => {
    if (!autopayAmount || Number(autopayAmount) <= 0) {
      setActionError('Please enter a valid amount.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      await withAuth((token) =>
        apiClient.upiAutopay(token, { amount: Number(autopayAmount) }),
      );
      setAutopayAmount('');
      await afterSuccess('UPI AutoPay mandate set successfully!');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'AutoPay setup failed.');
      setActionLoading(false);
    }
  };

  // ─── Filtered transactions ────────────────────────────────

  const displayedTx = transactions.filter((tx) => {
    const walletOk = txFilter === 'all' || tx.wallet === txFilter;
    const dateOk = filterByDate(tx, dateRange);
    return walletOk && dateOk;
  });

  const repaymentTx = transactions.filter((tx) => tx.type === 'repayment_received');

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <Layout title="My Wallet" subtitle="Loading your wallet…" onCloseRoute="/dashboard">
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
          <p>Loading wallet data…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Wallet" subtitle="Manage your IRA wallets and transactions" onCloseRoute="/dashboard">
      {/* ── Global style injection ── */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .wallet-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important; }
        .wallet-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .action-btn:hover { opacity: 0.88; transform: translateY(-2px); }
        .action-btn { transition: all 0.2s ease; }
        .tx-tab.active { font-weight: 700; border-bottom: 2px solid #2563eb; color: #2563eb; }
        .tx-tab { border-bottom: 2px solid transparent; color: #64748b; }
        .chip.active { background: #2563eb; color: #fff; }
        .chip { cursor: pointer; transition: all 0.15s; }
        .chip:hover { opacity: 0.8; }
        .range-btn.active { background: #2563eb; color: #fff; }
        .range-btn { transition: all 0.15s; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════
          A. WALLET OVERVIEW
      ═══════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 32 }}>
        {/* Total Balance Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed, #059669)',
            backgroundSize: '300% 300%',
            animation: 'gradientShift 6s ease infinite',
            borderRadius: 20,
            padding: '32px 36px',
            marginBottom: 24,
            color: '#fff',
            boxShadow: '0 12px 40px rgba(37,99,235,0.35)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 120, opacity: 0.08 }}>₹</div>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, letterSpacing: 1, opacity: 0.85, textTransform: 'uppercase' }}>
            Total Balance
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>
            {fmt(totalBalance)}
          </p>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
            UPI Available: {fmt(upiBalance)} · {upiId}
          </p>
        </div>

        {/* 3 Wallet Cards */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {(Object.keys(WALLET_META) as WalletKey[]).map((key) => {
            const meta = WALLET_META[key];
            const val = walletValues[key];
            return (
              <div
                key={key}
                className="wallet-card"
                ref={sectionRefs[key]}
                style={{
                  flex: '1 1 240px',
                  background: 'rgba(255,255,255,0.78)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 16,
                  padding: 24,
                  border: `2px solid ${meta.color}30`,
                  boxShadow: `0 4px 24px ${meta.color}20`,
                  borderTop: `4px solid ${meta.color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{meta.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{meta.hindi}</p>
                  </div>
                  <span
                    style={{
                      background: `${meta.color}18`,
                      color: meta.color,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 20,
                      letterSpacing: 0.5,
                    }}
                  >
                    {meta.badge}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 800, color: meta.color, letterSpacing: -0.5 }}>
                  {fmt(val)}
                </p>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>{meta.desc}</p>
                <button
                  className="button button--ghost"
                  style={{ width: '100%', fontSize: 13, color: meta.color, borderColor: `${meta.color}50` }}
                  onClick={() => sectionRefs[key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  View Details ↓
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          B. QUICK ACTIONS BAR
      ═══════════════════════════════════════════════════════ */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: '➕ Add Money', desc: 'UPI → Locked', action: 'add' as ModalType, color: '#2563eb' },
            { label: '🔁 Transfer', desc: 'Between wallets', action: 'transfer' as ModalType, color: '#10b981' },
            { label: '💸 Withdraw', desc: 'Wallet → UPI', action: 'withdraw' as ModalType, color: '#ef4444' },
            { label: '🔄 UPI AutoPay', desc: 'Loan repayment', action: 'autopay' as ModalType, color: '#7c3aed' },
          ].map((item) => (
            <button
              key={item.action}
              className="action-btn"
              style={{
                flex: '1 1 140px',
                background: `${item.color}12`,
                border: `1.5px solid ${item.color}30`,
                borderRadius: 14,
                padding: '16px 20px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => { resetAction(); setModal(item.action); }}
            >
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: item.color }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{item.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          D. TRANSACTION HISTORY
      ═══════════════════════════════════════════════════════ */}
      <section className="card" style={{ marginBottom: 32 }}>
        <div className="card__header">
          <h2>Transaction History</h2>
          <span className="pill">{displayedTx.length}</span>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: 16, overflowX: 'auto' }}>
          {(['all', 'batua_locked', 'batua_unlocked', 'tijori'] as TxFilter[]).map((f) => (
            <button
              key={f}
              className={`tx-tab ${txFilter === f ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', padding: '10px 18px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
              onClick={() => setTxFilter(f)}
            >
              {f === 'all' ? 'All' : WALLET_META[f].label}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['today', 'week', 'month', 'all'] as DateRange[]).map((r) => (
            <button
              key={r}
              className={`range-btn ${dateRange === r ? 'active' : ''}`}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 20, padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              onClick={() => setDateRange(r)}
            >
              {r === 'today' ? 'Today' : r === 'week' ? '1 Week' : r === 'month' ? '1 Month' : 'All'}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        {txLoading ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>Loading transactions…</p>
        ) : displayedTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ margin: 0, fontWeight: 600 }}>No transactions found</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>Try a different filter or add money to get started.</p>
          </div>
        ) : (
          <div className="list">
            {displayedTx.map((tx) => {
              const credit = isCredit(tx.type);
              return (
                <article className="list-item" key={tx.id}>
                  <div className="list-item__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: credit ? '#d1fae5' : '#fee2e2',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, flexShrink: 0,
                        }}
                      >
                        {credit ? '↑' : '↓'}
                      </div>
                      <div>
                        <div className="list-item__title" style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                          {humanizeType(tx.type)}
                        </div>
                        <div className="list-item__meta" style={{ fontSize: 12 }}>
                          {tx.description}
                          {tx.wallet ? ` · ${WALLET_META[tx.wallet as WalletKey]?.label ?? tx.wallet}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: credit ? '#059669' : '#dc2626' }}>
                        {credit ? '+' : '-'}{fmt(Math.abs(tx.amount))}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(tx.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
                      {tx.status ?? 'completed'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          E. REPAYMENT FLOW SECTION
      ═══════════════════════════════════════════════════════ */}
      <section className="card" style={{ marginBottom: 32 }}>
        <div className="card__header">
          <h2>Repayment Collection</h2>
          <span className="pill" style={{ background: '#7c3aed20', color: '#7c3aed' }}>Tijori</span>
        </div>

        {/* Tijori breakdown */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { label: 'Total in Tijori', value: walletValues.tijori, color: '#7c3aed' },
            { label: 'Principal Returned', value: walletValues.tijori * 0.85, color: '#2563eb' },
            { label: 'Interest Earned', value: walletValues.tijori * 0.15, color: '#10b981' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: '1 1 140px',
                background: `${item.color}0d`,
                border: `1px solid ${item.color}25`,
                borderRadius: 12,
                padding: '16px 20px',
              }}
            >
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>{item.label}</p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 22, color: item.color }}>{fmt(item.value)}</p>
            </div>
          ))}
        </div>

        {/* Recent repayments */}
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#475569' }}>Recent Repayments</h3>
        {repaymentTx.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No repayment transactions yet.</p>
        ) : (
          <div className="list">
            {repaymentTx.slice(0, 5).map((tx) => (
              <article className="list-item" key={tx.id}>
                <div className="list-item__header">
                  <div>
                    <div className="list-item__title">Repayment Received</div>
                    <div className="list-item__meta">{tx.description}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#059669', fontWeight: 700 }}>+{fmt(tx.amount)}</span>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(tx.created_at)}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          C. MODALS
      ═══════════════════════════════════════════════════════ */}

      {/* ── Add Money Modal ── */}
      <Modal open={modal === 'add'} onClose={closeModal} title="Add Money to Batua Locked">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#eff6ff', borderRadius: 12, padding: '14px 18px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>UPI Balance Available</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1d4ed8' }}>{fmt(upiBalance)}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>UPI ID: {upiId}</p>
          </div>

          <div>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13 }}>Quick Select</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  className={`chip ${addAmount === amt ? 'active' : ''}`}
                  style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}
                  onClick={() => setAddAmount(amt)}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label style={{ fontWeight: 600, fontSize: 13 }}>Amount (₹)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={upiBalance}
              placeholder="Enter amount"
              value={addAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          {addAmount ? (
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#166534' }}>
              ✅ <strong>{fmt(Number(addAmount))}</strong> will be added to <strong>Batua Locked</strong>
            </div>
          ) : null}

          {actionError ? <div className="feedback feedback--error">{actionError}</div> : null}
          {actionSuccess ? <div className="feedback" style={{ background: '#d1fae5', color: '#065f46' }}>{actionSuccess}</div> : null}

          <button
            className="button button--primary"
            style={{ width: '100%' }}
            onClick={handleAddMoney}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing…' : 'Confirm Add Money'}
          </button>
        </div>
      </Modal>

      {/* ── Transfer Modal ── */}
      <Modal open={modal === 'transfer'} onClose={closeModal} title="Transfer Between Wallets">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>From</label>
              <select
                className="input"
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value as WalletKey)}
              >
                {(Object.keys(WALLET_META) as WalletKey[])
                  .filter((k) => ALLOWED_TRANSFERS.some((p) => p.from === k))
                  .map((k) => (
                    <option key={k} value={k}>
                      {WALLET_META[k].label} ({fmt(walletValues[k])})
                    </option>
                  ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label style={{ fontWeight: 600, fontSize: 13 }}>To</label>
              <select
                className="input"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value as WalletKey)}
              >
                {toOptions.map((k) => (
                  <option key={k} value={k}>
                    {WALLET_META[k].label} ({fmt(walletValues[k])})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label style={{ fontWeight: 600, fontSize: 13 }}>Amount (₹)</label>
            <input
              className="input"
              type="range"
              min={0}
              max={maxTransfer}
              step={100}
              value={transferAmount === '' ? 0 : transferAmount}
              onChange={(e) => setTransferAmount(Number(e.target.value))}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <input
              className="input"
              type="number"
              min={1}
              max={maxTransfer}
              placeholder="Enter amount"
              value={transferAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <small style={{ color: '#94a3b8', fontSize: 12 }}>Available: {fmt(maxTransfer)}</small>
          </div>

          {/* Live preview */}
          {transferAmount && Number(transferAmount) > 0 ? (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px', fontSize: 13 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#475569' }}>After Transfer:</p>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#ef4444' }}>{WALLET_META[transferFrom].label}: {fmt(walletValues[transferFrom] - Number(transferAmount))}</span>
                <span style={{ color: '#10b981' }}>{WALLET_META[transferTo].label}: {fmt(walletValues[transferTo] + Number(transferAmount))}</span>
              </div>
            </div>
          ) : null}

          {actionError ? <div className="feedback feedback--error">{actionError}</div> : null}
          {actionSuccess ? <div className="feedback" style={{ background: '#d1fae5', color: '#065f46' }}>{actionSuccess}</div> : null}

          <button
            className="button button--primary"
            style={{ width: '100%', background: '#10b981', borderColor: '#10b981' }}
            onClick={handleTransfer}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing…' : 'Confirm Transfer'}
          </button>
        </div>
      </Modal>

      {/* ── Withdraw Modal ── */}
      <Modal open={modal === 'withdraw'} onClose={closeModal} title="Withdraw to UPI">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label style={{ fontWeight: 600, fontSize: 13 }}>Source Wallet</label>
            <select
              className="input"
              value={withdrawWallet}
              onChange={(e) => setWithdrawWallet(e.target.value as WalletKey)}
            >
              {(Object.keys(WALLET_META) as WalletKey[]).map((k) => (
                <option key={k} value={k}>
                  {WALLET_META[k].label} ({fmt(walletValues[k])})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label style={{ fontWeight: 600, fontSize: 13 }}>Amount (₹)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={walletValues[withdrawWallet]}
              placeholder="Enter amount"
              value={withdrawAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <small style={{ color: '#94a3b8', fontSize: 12 }}>Available: {fmt(walletValues[withdrawWallet])}</small>
          </div>

          <div style={{ background: '#fef2f2', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Destination UPI</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{upiId || 'UPI ID not set'}</p>
          </div>

          {withdrawAmount && Number(withdrawAmount) > 0 ? (
            <div style={{ background: '#fef9c3', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#78350f' }}>
              💸 <strong>{fmt(Number(withdrawAmount))}</strong> will be sent to your UPI <strong>@{upiId}</strong>
            </div>
          ) : null}

          {actionError ? <div className="feedback feedback--error">{actionError}</div> : null}
          {actionSuccess ? <div className="feedback" style={{ background: '#d1fae5', color: '#065f46' }}>{actionSuccess}</div> : null}

          <button
            className="button button--primary"
            style={{ width: '100%', background: '#ef4444', borderColor: '#ef4444' }}
            onClick={handleWithdraw}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing…' : 'Confirm Withdrawal'}
          </button>
        </div>
      </Modal>

      {/* ── UPI AutoPay Modal ── */}
      <Modal open={modal === 'autopay'} onClose={closeModal} title="UPI AutoPay">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#faf5ff', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#6d28d9' }}>ℹ️ How AutoPay Works</p>
            <p style={{ margin: 0, fontSize: 13, color: '#7c3aed', lineHeight: 1.6 }}>
              AutoPay will deduct from your bank account for loan repayments. The deducted amount will be credited to your Batua Unlocked for lender settlement.
            </p>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>Active Loan Liability</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
              No active loan — AutoPay is optional
            </p>
          </div>

          <div className="field">
            <label style={{ fontWeight: 600, fontSize: 13 }}>Repayment Amount (₹)</label>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="Enter repayment amount"
              value={autopayAmount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAutopayAmount(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          {actionError ? <div className="feedback feedback--error">{actionError}</div> : null}
          {actionSuccess ? <div className="feedback" style={{ background: '#d1fae5', color: '#065f46' }}>{actionSuccess}</div> : null}

          <button
            className="button button--primary"
            style={{ width: '100%', background: '#7c3aed', borderColor: '#7c3aed' }}
            onClick={handleAutopay}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing…' : 'Set AutoPay Mandate'}
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
