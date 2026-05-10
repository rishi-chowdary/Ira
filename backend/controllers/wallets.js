import supabase, { isSupabaseConfigured } from './_supabase.js';
import {
  activateDemoWallet,
  addMoneyToDemoWallet,
  getDemoWalletByUserId,
  isDemoUserId,
  transferDemoWallet,
} from './_demo.js';

function hasSupabase() {
  return Boolean(isSupabaseConfigured && supabase);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // GET wallet balances
    if (req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'user_id required' });

      if (!hasSupabase()) {
        const wallet = isDemoUserId(user_id)
          ? getDemoWalletByUserId(user_id)
          : null;

        return res.status(200).json(
          wallet || {
            user_id: Number(user_id),
            batua_locked: 0,
            batua_unlocked: 0,
            tijori: 0,
            is_activated: false,
          }
        );
      }

      let { data: wallet } = await supabase
        .from('ira_wallets')
        .select('*')
        .eq('user_id', user_id)
        .maybeSingle();

      // Auto-create wallet if not exists
      if (!wallet) {
        const { data: newWallet, error } = await supabase
          .from('ira_wallets')
          .insert({
            user_id: parseInt(user_id),
            batua_locked: 0,
            batua_unlocked: 0,
            tijori: 0,
            is_activated: false,
          })
          .select()
          .single();
        if (error) {
          // Table might not exist yet, return default
          return res.status(200).json({
            user_id: parseInt(user_id),
            batua_locked: 0,
            batua_unlocked: 0,
            tijori: 0,
            is_activated: false,
          });
        }
        wallet = newWallet;
      }

      return res.status(200).json(wallet);
    }

    // POST — activate wallet with ₹3 seed OR add money
    if (req.method === 'POST') {
      const { user_id, action, amount } = req.body;
      if (!user_id) return res.status(400).json({ error: 'user_id required' });

      if (!hasSupabase()) {
        if (!isDemoUserId(user_id)) {
          return res.status(503).json({ error: 'Wallet actions need Supabase for non-demo accounts.' });
        }

        try {
          if (action === 'activate') {
            const wallet = activateDemoWallet(user_id);
            return res.status(200).json({ wallet, message: 'Wallet activated in local demo mode' });
          }

          if (action === 'add-money') {
            if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
            const wallet = addMoneyToDemoWallet(user_id, amount);
            return res.status(200).json(wallet);
          }
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }

        return res.status(400).json({ error: 'Unknown action' });
      }

      // ACTIVATE BATUA — ₹3 seed: ₹1 platform fee, ₹1 Locked, ₹1 Unlocked
      if (action === 'activate') {
        let { data: wallet } = await supabase
          .from('ira_wallets')
          .select('*')
          .eq('user_id', user_id)
          .maybeSingle();

        if (wallet && wallet.is_activated) {
          return res.status(400).json({ error: 'Wallet already activated' });
        }

        if (wallet) {
          const { data, error } = await supabase
            .from('ira_wallets')
            .update({
              batua_locked: 1,
              batua_unlocked: 1,
              is_activated: true,
              activated_at: new Date().toISOString(),
            })
            .eq('user_id', user_id)
            .select()
            .single();
          if (error) throw error;
          wallet = data;
        } else {
          const { data, error } = await supabase
            .from('ira_wallets')
            .insert({
              user_id,
              batua_locked: 1,
              batua_unlocked: 1,
              tijori: 0,
              is_activated: true,
              activated_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (error) throw error;
          wallet = data;
        }

        // Log transaction: ₹3 seed
        try {
          await supabase.from('ira_transactions').insert([
            { user_id, type: 'seed', amount: 3, wallet: 'upi_debit', description: 'Batua activation — ₹3 seed payment', reference: `SEED-${Date.now()}` },
            { user_id, type: 'platform_fee', amount: 1, wallet: 'platform', description: '₹1 platform activation fee', reference: `FEE-${Date.now()}` },
            { user_id, type: 'seed_credit', amount: 1, wallet: 'batua_locked', description: '₹1 credited to Batua Locked', reference: `SEED-L-${Date.now()}` },
            { user_id, type: 'seed_credit', amount: 1, wallet: 'batua_unlocked', description: '₹1 credited to Batua Unlocked', reference: `SEED-U-${Date.now()}` },
          ]);
        } catch (e) {
          // Transactions table may not exist yet
          console.log('Transaction logging skipped:', e.message);
        }

        // Notify
        try {
          await supabase.from('ira_notifications').insert({
            user_id,
            type: 'wallet',
            title: 'Batua Activated! 🎉',
            message: 'Your wallet is active with ₹1 in Locked and ₹1 in Unlocked. You can now start lending!',
            is_read: false,
          });
        } catch (e) {}

        return res.status(200).json({ wallet, message: 'Wallet activated with ₹3 seed' });
      }

      // ADD MONEY — from UPI, goes to Batua Locked
      if (action === 'add-money') {
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

        const { data: wallet, error } = await supabase
          .from('ira_wallets')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (error || !wallet) return res.status(400).json({ error: 'Wallet not found' });
        if (!wallet.is_activated) return res.status(400).json({ error: 'Activate wallet first' });

        const { data: updated } = await supabase
          .from('ira_wallets')
          .update({ batua_locked: wallet.batua_locked + amount })
          .eq('user_id', user_id)
          .select()
          .single();

        try {
          await supabase.from('ira_transactions').insert({
            user_id,
            type: 'upi_credit',
            amount,
            wallet: 'batua_locked',
            description: `₹${amount} added from UPI to Batua Locked`,
            reference: `UPI-${Date.now()}`,
          });
        } catch (e) {}

        return res.status(200).json(updated);
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    // PUT — transfer between wallets
    if (req.method === 'PUT') {
      const { user_id, from_wallet, to_wallet, amount } = req.body;
      if (!user_id || !from_wallet || !to_wallet || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const validWallets = ['batua_locked', 'batua_unlocked', 'tijori'];
      if (!validWallets.includes(from_wallet) || !validWallets.includes(to_wallet)) {
        return res.status(400).json({ error: 'Invalid wallet names' });
      }
      if (from_wallet === to_wallet) {
        return res.status(400).json({ error: 'Cannot transfer to same wallet' });
      }

      if (!hasSupabase()) {
        if (!isDemoUserId(user_id)) {
          return res.status(503).json({ error: 'Transfers need Supabase for non-demo accounts.' });
        }
        try {
          const updated = transferDemoWallet(user_id, from_wallet, to_wallet, amount);
          return res.status(200).json(updated);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
      }

      // Validate transfer rules:
      // Batua Locked → Batua Unlocked: ✅ allowed freely
      // Tijori → Batua Locked: ✅ allowed
      // Tijori → Batua Unlocked: ✅ allowed
      // Batua Unlocked → Batua Locked: ❌ not allowed (only UPI adds to locked)
      // Batua Locked/Unlocked → Tijori: ❌ not allowed (only repayments go to tijori)
      const allowedTransfers = [
        'batua_locked->batua_unlocked',
        'tijori->batua_locked',
        'tijori->batua_unlocked',
      ];
      if (!allowedTransfers.includes(`${from_wallet}->${to_wallet}`)) {
        return res.status(400).json({ error: `Transfer from ${from_wallet} to ${to_wallet} is not allowed` });
      }

      const { data: wallet, error } = await supabase
        .from('ira_wallets')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (error || !wallet) return res.status(400).json({ error: 'Wallet not found' });

      if (wallet[from_wallet] < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      const updates = {
        [from_wallet]: wallet[from_wallet] - amount,
        [to_wallet]: wallet[to_wallet] + amount,
      };

      const { data: updated } = await supabase
        .from('ira_wallets')
        .update(updates)
        .eq('user_id', user_id)
        .select()
        .single();

      try {
        await supabase.from('ira_transactions').insert({
          user_id,
          type: 'transfer',
          amount,
          wallet: `${from_wallet}->${to_wallet}`,
          description: `₹${amount} transferred from ${from_wallet.replace('_',' ')} to ${to_wallet.replace('_',' ')}`,
          reference: `TXF-${Date.now()}`,
        });
      } catch (e) {}

      return res.status(200).json(updated);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Wallets error:', err);
    res.status(500).json({ error: err.message });
  }
}
