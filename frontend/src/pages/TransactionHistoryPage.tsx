import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Receipt,
  RefreshCw,
} from 'lucide-react';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { Transaction } from '../types';

type RangeFilter = 'today' | 'week' | 'month' | 'all';

export default function TransactionHistoryPage() {
  const { withAuth } = useAuth();
  const [range, setRange] = useState<RangeFilter>('month');
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const query = `?range=${range}&page=${page}`;
      const response = await withAuth((token) => apiClient.getTransactions(token, query));
      setTransactions(response.items);
      setTotalPages(response.pagination.totalPages || 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, page]);

  return (
    <Layout
      title="Transaction Ledger"
      subtitle="Complete chronological history of disbursements, repayments, and wallet allocations"
      onCloseRoute="/dashboard"
      actions={
        <button
          type="button"
          onClick={loadTransactions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-5">
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

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Time Range:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: '1 Week' },
                { id: 'month', label: '1 Month' },
                { id: 'all', label: 'All Time' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setRange(item.id as RangeFilter);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    range === item.id
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Page {page} of {Math.max(1, totalPages)}
          </span>
        </div>

        {/* Transactions Table & Mobile Card View */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading transaction records…</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center bg-slate-50/50">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No transactions recorded</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No financial activity found for this time period. Activity will populate once you
                draw or repay loans.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Date & Time</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Description</th>
                      <th className="px-5 py-3.5 text-right">Amount</th>
                      <th className="px-5 py-3.5 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => {
                      const isCredit =
                        tx.type.toLowerCase().includes('credit') ||
                        tx.type.toLowerCase().includes('disbursement') ||
                        tx.type.toLowerCase().includes('deposit');

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-600 whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize ${
                                isCredit
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-slate-600" />
                              )}
                              <span>{tx.type}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-800 max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td
                            className={`px-5 py-3.5 text-right font-black whitespace-nowrap ${
                              isCredit ? 'text-emerald-600' : 'text-slate-800'
                            }`}
                          >
                            {isCredit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-500 whitespace-nowrap">
                            ₹{tx.balance_after.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const isCredit =
                    tx.type.toLowerCase().includes('credit') ||
                    tx.type.toLowerCase().includes('disbursement') ||
                    tx.type.toLowerCase().includes('deposit');

                  return (
                    <div key={tx.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize ${
                            isCredit
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-slate-600" />
                          )}
                          <span>{tx.type}</span>
                        </span>
                        <span
                          className={`font-black text-sm ${
                            isCredit ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-800">{tx.description}</div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                        <span>Bal after: ₹{tx.balance_after.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((curr) => curr - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40 transition shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="text-xs font-bold text-slate-600">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((curr) => curr + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40 transition shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
