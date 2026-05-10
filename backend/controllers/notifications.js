import supabase, { isSupabaseConfigured } from './_supabase.js';
import {
  getDemoNotificationsByUserId,
  isDemoUserId,
  markDemoNotificationsRead,
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
    if (req.method === 'GET') {
      const { user_id } = req.query;
      if (!hasSupabase()) {
        return res.status(200).json(
          isDemoUserId(user_id) ? getDemoNotificationsByUserId(user_id) : []
        );
      }
      const { data, error } = await supabase
        .from('ira_notifications')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'PUT') {
      // Mark all read
      const { user_id } = req.body;
      if (!hasSupabase()) {
        if (isDemoUserId(user_id)) markDemoNotificationsRead(user_id);
        return res.status(200).json({ ok: true, demoMode: true });
      }
      await supabase.from('ira_notifications').update({ is_read: true }).eq('user_id', user_id);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
