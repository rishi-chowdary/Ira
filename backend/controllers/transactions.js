import supabase, { isSupabaseConfigured } from './_supabase.js';
import {
  createDemoTransaction,
  getDemoTransactionsByUserId,
  isDemoUserId,
} from './_demo.js';

function hasSupabase() {
  return Boolean(isSupabaseConfigured && supabase);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // GET — transaction history with filters (Point 20)
    // Filters: period (today, 1week, 1month, custom), type, wallet
    // Cannot be deleted/cleared
    if (req.method === 'GET') {
      const { user_id, period, from_date, to_date, type, wallet, limit: queryLimit } = req.query;
      if (!user_id) return res.status(400).json({ error: 'user_id required' });

      if (!hasSupabase()) {
        if (!isDemoUserId(user_id)) {
          return res.status(200).json({ transactions: [], summary: { totalTransactions: 0, totalCredits: 0, totalDebits: 0 } });
        }

        let transactions = getDemoTransactionsByUserId(user_id);

        if (period === 'today') {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          transactions = transactions.filter((tx) => new Date(tx.created_at) >= startOfDay);
        } else if (period === '1week') {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          transactions = transactions.filter((tx) => new Date(tx.created_at) >= weekAgo);
        } else if (period === '1month') {
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          transactions = transactions.filter((tx) => new Date(tx.created_at) >= monthAgo);
        } else if (period === 'custom' && from_date && to_date) {
          transactions = transactions.filter((tx) => (
            new Date(tx.created_at) >= new Date(from_date) &&
            new Date(tx.created_at) <= new Date(to_date)
          ));
        }

        if (type) transactions = transactions.filter((tx) => tx.type === type);
        if (wallet) transactions = transactions.filter((tx) => tx.wallet === wallet);

        const maxResults = parseInt(queryLimit) || 50;
        transactions = transactions.slice(0, maxResults);

        const summary = {
          totalTransactions: transactions.length,
          totalCredits: 0,
          totalDebits: 0,
        };

        transactions.forEach((tx) => {
          const creditTypes = ['upi_credit', 'seed_credit', 'repayment_received', 'transfer_in'];
          const debitTypes = ['seed', 'platform_fee', 'repayment', 'lending', 'transfer_out'];
          if (creditTypes.includes(tx.type)) summary.totalCredits += tx.amount || 0;
          if (debitTypes.includes(tx.type)) summary.totalDebits += tx.amount || 0;
        });

        return res.status(200).json({ transactions, summary, demoMode: true });
      }

      let query = supabase
        .from('ira_transactions')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      // Period filters
      if (period === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        query = query.gte('created_at', startOfDay.toISOString());
      } else if (period === '1week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (period === '1month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', monthAgo.toISOString());
      } else if (period === 'custom' && from_date && to_date) {
        query = query.gte('created_at', from_date).lte('created_at', to_date);
      }

      // Type filter
      if (type) query = query.eq('type', type);

      // Wallet filter
      if (wallet) query = query.eq('wallet', wallet);

      // Limit
      const maxResults = parseInt(queryLimit) || 50;
      query = query.limit(maxResults);

      const { data, error } = await query;
      if (error) throw error;

      // Compute summary stats
      const summary = {
        totalTransactions: (data || []).length,
        totalCredits: 0,
        totalDebits: 0,
      };

      (data || []).forEach(tx => {
        const creditTypes = ['upi_credit', 'seed_credit', 'repayment_received', 'transfer_in'];
        const debitTypes = ['seed', 'platform_fee', 'repayment', 'lending', 'transfer_out'];
        if (creditTypes.includes(tx.type)) summary.totalCredits += tx.amount || 0;
        if (debitTypes.includes(tx.type)) summary.totalDebits += tx.amount || 0;
      });

      return res.status(200).json({ transactions: data || [], summary });
    }

    // POST — log a transaction (internal use)
    if (req.method === 'POST') {
      const { user_id, type, amount, wallet, description, reference } = req.body;
      if (!user_id || !type || amount === undefined) {
        return res.status(400).json({ error: 'user_id, type, and amount required' });
      }

      if (!hasSupabase()) {
        if (!isDemoUserId(user_id)) {
          return res.status(503).json({ error: 'Transaction logging needs Supabase for non-demo accounts.' });
        }

        const data = createDemoTransaction(user_id, {
          type,
          amount,
          wallet: wallet || 'system',
          description: description || '',
          reference: reference || `DEMO-TX-${Date.now()}`,
        });

        return res.status(201).json(data);
      }

      const { data, error } = await supabase
        .from('ira_transactions')
        .insert({
          user_id,
          type,
          amount,
          wallet: wallet || 'system',
          description: description || '',
          reference: reference || `TX-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    // Note: DELETE is intentionally not allowed (Point 20 — transactions cannot be deleted)

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: err.message });
  }
}
