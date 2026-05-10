import supabase, { isSupabaseConfigured } from './_supabase.js';

async function getWalletActivation(userId) {
  if (!isSupabaseConfigured || !supabase) return false;
  if (!userId) return false;
  const { data: wallet } = await supabase
    .from('ira_wallets')
    .select('is_activated')
    .eq('user_id', userId)
    .maybeSingle();

  return wallet?.is_activated === true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (!isSupabaseConfigured || !supabase) {
      if (req.method === 'GET') {
        return res.status(200).json([]);
      }

      return res.status(503).json({
        error: 'Investments need Supabase. Local demo mode currently keeps this view read-only.',
      });
    }

    if (req.method === 'GET') {
      const { lender_id, loan_id } = req.query;

      if (lender_id) {
        const isWalletActivated = await getWalletActivation(lender_id);
        if (!isWalletActivated) return res.status(200).json([]);
      }

      let query = supabase
        .from('ira_investments')
        .select('*, ira_loans(amount, purpose, tenure_days, interest_rate, status, due_date, borrower_id, loan_type, tier_name, ira_users!ira_loans_borrower_id_fkey(name, college, trust_score, avatar_seed))')
        .order('created_at', { ascending: false });

      if (lender_id) query = query.eq('lender_id', lender_id);
      if (loan_id) query = query.eq('loan_id', loan_id);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    // POST — invest in a loan (partial funding allowed, deduct from wallet)
    if (req.method === 'POST') {
      const { lender_id, loan_id, amount, source_wallet } = req.body;

      if (!lender_id || !loan_id || !amount || amount <= 0) {
        return res.status(400).json({ error: 'lender_id, loan_id, and positive amount required' });
      }

      const isWalletActivated = await getWalletActivation(lender_id);
      if (!isWalletActivated) {
        return res.status(403).json({ error: 'Activate Batua with the ₹3 seed before lending.' });
      }

      // Get loan details
      const { data: loan, error: loanErr } = await supabase
        .from('ira_loans')
        .select('*')
        .eq('id', loan_id)
        .single();
      if (loanErr) throw loanErr;

      if (loan.status !== 'open') {
        return res.status(400).json({ error: 'Loan is not open for funding' });
      }

      // Prevent self-lending
      if (loan.borrower_id === lender_id) {
        return res.status(400).json({ error: 'Cannot invest in your own loan' });
      }

      // Check friend vs public loan restrictions
      if (loan.loan_type === 'friend' && loan.friend_lender_id && loan.friend_lender_id !== lender_id) {
        return res.status(400).json({ error: 'This is a private friend loan. Only the nominated lender can fund it.' });
      }

      const newFunded = (loan.funded_amount || 0) + amount;
      if (newFunded > loan.amount) {
        return res.status(400).json({ error: `Amount exceeds remaining requirement. Available: ₹${loan.amount - (loan.funded_amount || 0)}` });
      }

      // Check lender's wallet balance
      const walletSource = source_wallet || 'batua_unlocked'; // default to unlocked
      const { data: wallet } = await supabase
        .from('ira_wallets')
        .select('*')
        .eq('user_id', lender_id)
        .maybeSingle();

      if (wallet) {
        // Validate wallet source rules:
        // batua_locked: can only lend to friends
        // batua_unlocked: can lend to friends + strangers
        if (walletSource === 'batua_locked') {
          // Check if borrower is a friend
          const { data: friendship } = await supabase
            .from('ira_friends')
            .select('id')
            .or(`user_id.eq.${lender_id},friend_id.eq.${lender_id}`)
            .or(`user_id.eq.${loan.borrower_id},friend_id.eq.${loan.borrower_id}`)
            .limit(1)
            .maybeSingle();

          if (!friendship && loan.loan_type !== 'friend') {
            return res.status(400).json({ error: 'Batua Locked can only be used to lend to friends. Use Batua Unlocked for public loans.' });
          }
        }

        const balance = wallet[walletSource] || 0;
        if (balance < amount) {
          return res.status(400).json({ error: `Insufficient balance in ${walletSource.replace('_', ' ')}. Available: ₹${balance}` });
        }

        // Deduct from wallet
        await supabase
          .from('ira_wallets')
          .update({ [walletSource]: balance - amount })
          .eq('user_id', lender_id);
      }

      // Calculate lender's share of interest
      const proportion = amount / loan.amount;
      const lender_interest = Math.round((loan.lender_earnings || 0) * proportion);
      const lender_total = amount + lender_interest;

      // Insert investment
      const { data: inv, error: invErr } = await supabase
        .from('ira_investments')
        .insert({
          lender_id,
          loan_id,
          amount,
          lender_interest,
          lender_total,
          status: 'active',
          source_wallet: walletSource,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      // Update loan funded amount and status
      // Loan only disbursed when total amount is raised (Point 10)
      const newStatus = newFunded >= loan.amount ? 'funded' : 'open';
      await supabase
        .from('ira_loans')
        .update({ funded_amount: newFunded, status: newStatus })
        .eq('id', loan_id);

      // Update lender total_lent
      const { data: lender } = await supabase.from('ira_users').select('total_lent').eq('id', lender_id).single();
      await supabase.from('ira_users').update({ total_lent: (lender?.total_lent || 0) + amount }).eq('id', lender_id);

      // Log transaction
      try {
        await supabase.from('ira_transactions').insert({
          user_id: lender_id,
          type: 'lending',
          amount,
          wallet: walletSource,
          description: `Lent ₹${amount} to Loan #${loan_id}`,
          reference: `LEND-${Date.now()}`,
        });
      } catch (e) {}

      // Notify borrower when fully funded
      if (newStatus === 'funded') {
        try {
          await supabase.from('ira_notifications').insert({
            user_id: loan.borrower_id,
            type: 'loan_funded',
            title: '🎉 Loan Fully Funded!',
            message: `Your ₹${loan.amount} loan is now fully funded and will be disbursed to your Batua Unlocked.`,
            is_read: false,
          });

          // Disburse to borrower's Batua Unlocked
          const { data: borrowerWallet } = await supabase
            .from('ira_wallets')
            .select('batua_unlocked')
            .eq('user_id', loan.borrower_id)
            .single();

          if (borrowerWallet) {
            await supabase.from('ira_wallets')
              .update({ batua_unlocked: (borrowerWallet.batua_unlocked || 0) + loan.amount })
              .eq('user_id', loan.borrower_id);
          }

          // Log disbursement transaction
          await supabase.from('ira_transactions').insert({
            user_id: loan.borrower_id,
            type: 'loan_disbursed',
            amount: loan.amount,
            wallet: 'batua_unlocked',
            description: `₹${loan.amount} disbursed from funded loan #${loan_id}`,
            reference: `DISB-${Date.now()}`,
          });

          // Notify guarantors when guaranteed user takes a loan
          const { data: guarantors } = await supabase
            .from('ira_guarantors')
            .select('guarantor_id')
            .eq('user_id', loan.borrower_id)
            .eq('status', 'approved');

          if (guarantors) {
            const { data: borrowerUser } = await supabase.from('ira_users').select('name').eq('id', loan.borrower_id).single();
            for (const g of guarantors) {
              await supabase.from('ira_notifications').insert({
                user_id: g.guarantor_id,
                type: 'guarantor_alert',
                title: '📋 Guaranteed User Borrowed',
                message: `${borrowerUser?.name} (whom you guarantee) has borrowed ₹${loan.amount} for ${loan.tenure_days} days.`,
                is_read: false,
              }).catch(() => {});
            }
          }
        } catch (e) {}
      }

      return res.status(201).json({ investment: inv, loanStatus: newStatus });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
