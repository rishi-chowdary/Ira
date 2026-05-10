import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      const { data, error } = await supabase.from('ira_private_loan_requests')
        .select('*, from:from_id(id,name,college,trust_score,avatar_color), to:to_id(id,name,college,trust_score,avatar_color)')
        .or(`from_id.eq.${user_id},to_id.eq.${user_id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const { from_id, to_id, amount, tenure_days, interest_rate, purpose, message } = req.body;
      const { data, error } = await supabase.from('ira_private_loan_requests')
        .insert({ from_id, to_id, amount, tenure_days, interest_rate: interest_rate || 0, purpose, message, status: 'pending' })
        .select().single();
      if (error) throw error;
      // Notify recipient
      const { data: sender } = await supabase.from('ira_accounts').select('name').eq('id', from_id).single();
      await supabase.from('ira_notifications').insert({
        user_id: to_id, type: 'private_loan',
        title: 'Private Loan Request',
        message: `${sender?.name} wants to borrow ₹${amount} from you — "${purpose}"`
      });
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, status, counter_amount, counter_tenure, counter_rate, counter_message, user_id } = req.body;
      const updates = { status };
      if (status === 'negotiating') {
        Object.assign(updates, { counter_amount, counter_tenure, counter_rate, counter_message });
      }
      const { data, error } = await supabase.from('ira_private_loan_requests').update(updates).eq('id', id).select('*, from:from_id(id,name), to:to_id(id,name)').single();
      if (error) throw error;
      // Notify the other party
      const notifyId = data.from.id === user_id ? data.to.id : data.from.id;
      const msgs = {
        accepted: `Your loan request was accepted!`,
        rejected: `Your loan request was declined.`,
        negotiating: `A counter-offer was made on your loan request.`
      };
      if (msgs[status]) {
        await supabase.from('ira_notifications').insert({ user_id: notifyId, type: 'private_loan', title: status === 'negotiating' ? 'Counter Offer' : `Request ${status}`, message: msgs[status] });
      }
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
