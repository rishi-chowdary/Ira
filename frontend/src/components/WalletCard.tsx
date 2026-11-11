import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Database,
  Info,
  Lock,
  RefreshCw,
  Shield,
  Sliders,
  Unlock,
  Wallet,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

interface WalletCardProps {
  locked: number;
  unlocked: number;
  tijori: number;
  onSyncComplete?: () => void;
}

function roundValue(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function WalletCard({ locked, unlocked, tijori, onSyncComplete }: WalletCardProps) {
  const { withAuth, refreshUser } = useAuth();
  const total = useMemo(() => roundValue(locked + unlocked), [locked, unlocked]);
  const [lockedAmount, setLockedAmount] = useState(locked);
  const [unlockedAmount, setUnlockedAmount] = useState(unlocked);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState('');

  useEffect(() => {
    setLockedAmount(locked);
    setUnlockedAmount(unlocked);
  }, [locked, unlocked]);

  const updateLocked = (amount: number) => {
    const nextLocked = Math.max(1, Math.min(total, roundValue(amount)));
    setLockedAmount(nextLocked);
    setUnlockedAmount(roundValue(total - nextLocked));
    setSyncSuccess(false);
  };

  const updateUnlocked = (amount: number) => {
    const nextUnlocked = Math.max(0, Math.min(total - 1, roundValue(amount)));
    const nextLocked = Math.max(1, roundValue(total - nextUnlocked));
    setUnlockedAmount(nextUnlocked);
    setLockedAmount(nextLocked);
    setSyncSuccess(false);
  };

  const saveAllocationToDatabase = async () => {
    setIsSyncing(true);
    setSyncError('');
    try {
      await withAuth((token) => apiClient.rebalanceWallet(token, lockedAmount, unlockedAmount));
      await refreshUser();
      if (onSyncComplete) onSyncComplete();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
      setIsRebalancing(false);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync allocation to database');
    } finally {
      setIsSyncing(false);
    }
  };

  const lockedPercentage = total > 0 ? Math.min(100, Math.max(0, (lockedAmount / total) * 100)) : 50;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 leading-tight">Digital Batua & Tijori</h2>
              {syncSuccess && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 animate-fade-in">
                  <Check className="w-3 h-3 text-emerald-600" /> Synced to DB
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">Platform balance distribution synchronized to database</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isRebalancing && (lockedAmount !== locked || unlockedAmount !== unlocked)) {
              saveAllocationToDatabase();
            } else {
              setIsRebalancing(!isRebalancing);
            }
          }}
          disabled={isSyncing}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isRebalancing
              ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sliders className="w-3.5 h-3.5" />
          )}
          <span>{isSyncing ? 'Syncing...' : isRebalancing ? 'Save & Sync' : 'Rebalance'}</span>
        </button>
      </div>

      {syncError && (
        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {syncError}
        </div>
      )}

      {/* Primary Balance Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Batua Locked */}
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70 hover:border-blue-200 transition">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Batua Locked</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold">
              {lockedPercentage.toFixed(0)}%
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">₹{lockedAmount.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">Reserved for repayment safety</p>
        </div>

        {/* Batua Unlocked */}
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70 hover:border-emerald-200 transition">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Batua Unlocked</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold">
              {(100 - lockedPercentage).toFixed(0)}%
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">₹{unlockedAmount.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">Ready for peer lending matching</p>
        </div>

        {/* Tijori */}
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70 hover:border-amber-200 transition">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>Tijori Reserve</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
              Protected
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">₹{tijori.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">Emergency reserve</p>
        </div>
      </div>

      {/* Visual Balance Distribution Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
          <span>Batua Distribution (Total ₹{total.toFixed(2)})</span>
          <span className="text-slate-400">Locked ₹{lockedAmount.toFixed(0)} · Unlocked ₹{unlockedAmount.toFixed(0)}</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            className="h-full bg-blue-600 transition-all duration-300 rounded-l-full"
            style={{ width: `${lockedPercentage}%` }}
            title={`Locked: ₹${lockedAmount.toFixed(2)}`}
          />
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-r-full"
            style={{ width: `${100 - lockedPercentage}%` }}
            title={`Unlocked: ₹${unlockedAmount.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Expandable Rebalance Controls */}
      {isRebalancing && (
        <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/60 p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              <span>Slide to allocate Batua funds</span>
            </div>
            <span className="text-xs text-slate-500">Min. locked: ₹1.00</span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min={1}
              max={total}
              step={1}
              value={lockedAmount}
              onChange={(e) => updateLocked(Number(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>More Locked (Safety)</span>
              <span>More Unlocked (Lending)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Batua Locked (₹)
              </label>
              <input
                type="number"
                min={1}
                max={total}
                value={lockedAmount}
                onChange={(e) => updateLocked(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Batua Unlocked (₹)
              </label>
              <input
                type="number"
                min={0}
                max={Math.max(0, total - 1)}
                value={unlockedAmount}
                onChange={(e) => updateUnlocked(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Presets:</span>
              <button
                type="button"
                onClick={() => updateLocked(Math.round(total * 0.5))}
                className="px-2 py-1 text-xs rounded-md bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600"
              >
                50/50
              </button>
              <button
                type="button"
                onClick={() => updateLocked(Math.round(total * 0.7))}
                className="px-2 py-1 text-xs rounded-md bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600"
              >
                70/30
              </button>
              <button
                type="button"
                onClick={() => updateLocked(Math.round(total * 0.9))}
                className="px-2 py-1 text-xs rounded-md bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600"
              >
                90/10
              </button>
            </div>

            <button
              type="button"
              onClick={saveAllocationToDatabase}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Saving to DB...' : 'Save to DB'}</span>
            </button>
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Unlocked funds are matched automatically when eligible student peers submit loan requests. All reallocations are recorded directly to the database.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
