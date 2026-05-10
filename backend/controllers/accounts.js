import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, email, search } = req.query;
      if (id) {
        const { data, error } = await supabase.from('ira_accounts').select('id,name,email,college,trust_score,trust_points,total_lent,total_borrowed,total_earned,kyc_status,semester_status,account_status,avatar_color,guarantor1_id,guarantor2_id,created_at').eq('id', id).single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (email) {
        const { data, error } = await supabase.from('ira_accounts').select('*').eq('email', email).single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (search) {
        const { data, error } = await supabase.from('ira_accounts')
          .select('id,name,email,college,trust_score,avatar_color,account_status')
          .or(`name.ilike.%${search}%,email.ilike.%${search}%,college.ilike.%${search}%`)
          .eq('account_status', 'active')
          .limit(10);
        if (error) throw error;
        return res.status(200).json(data);
      }
      const { data, error } = await supabase.from('ira_accounts')
        .select('id,name,email,college,trust_score,trust_points,total_lent,total_borrowed,total_earned,kyc_status,semester_status,account_status,avatar_color,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      const { data, error } = await supabase.from('ira_accounts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Accounts error:', err);
    res.status(500).json({ error: err.message });
  }
}
