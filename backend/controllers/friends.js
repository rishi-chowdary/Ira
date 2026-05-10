import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      // Get all accepted friendships involving this user
      const { data: sent } = await supabase.from('ira_friend_requests')
        .select('to_id, status, id, created_at')
        .eq('from_id', user_id).eq('status', 'accepted');
      const { data: received } = await supabase.from('ira_friend_requests')
        .select('from_id, status, id, created_at')
        .eq('to_id', user_id).eq('status', 'accepted');
      const friendIds = [
        ...(sent || []).map(r => r.to_id),
        ...(received || []).map(r => r.from_id)
      ];
      if (friendIds.length === 0) return res.status(200).json([]);
      const { data: friends } = await supabase.from('ira_accounts')
        .select('id,name,email,college,trust_score,avatar_color')
        .in('id', friendIds);
      return res.status(200).json(friends || []);
    }
    if (req.method === 'POST') {
      const { from_id, to_id } = req.body;
      const { data, error } = await supabase.from('ira_friend_requests')
        .insert({ from_id, to_id, status: 'pending' }).select().single();
      if (error) throw error;
      await supabase.from('ira_notifications').insert({
        user_id: to_id, type: 'friend_request',
        title: 'New Friend Request',
        message: 'Someone wants to connect with you on IRA'
      });
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, status } = req.body;
      const { data, error } = await supabase.from('ira_friend_requests').update({ status }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
