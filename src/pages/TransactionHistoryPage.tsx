import { useEffect, useState } from 'react';

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
  const [error, setError] = useState('');

  const loadTransactions = async () => {
    try {
      const query = `?range=${range}&page=${page}`;
      const response = await withAuth((token) => apiClient.getTransactions(token, query));
      setTransactions(response.items);
      setTotalPages(response.pagination.totalPages);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load transactions');
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, page]);

  return (
    <Layout title="Transaction History" subtitle="Paginated ledger view with date filters" onCloseRoute="/dashboard">
      {error ? <div className="feedback feedback--error" style={{ marginBottom: 20 }}>{error}</div> : null}
      <section className="table-card stack">
        <div className="filters-row">
          <select className="select" value={range} onChange={(event) => setRange(event.target.value as RangeFilter)}>
            <option value="today">Today</option>
            <option value="week">1 week</option>
            <option value="month">1 month</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Balance after</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.created_at).toLocaleString()}</td>
                  <td>{transaction.type}</td>
                  <td>₹{transaction.amount.toFixed(2)}</td>
                  <td>₹{transaction.balance_after.toFixed(2)}</td>
                  <td>{transaction.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="inline-actions">
          <button className="button button--ghost" type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </button>
          <span className="muted">
            Page {page} of {totalPages}
          </span>
          <button className="button button--ghost" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </section>
    </Layout>
  );
}
