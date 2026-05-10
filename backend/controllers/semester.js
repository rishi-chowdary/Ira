import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      const { data } = await supabase.from('ira_semester_checks').select('*').eq('user_id', user_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, college_email, semester, academic_year, enrollment_proof } = req.body;

      const isCollegeEmail = college_email && (college_email.endsWith('.ac.in') || college_email.endsWith('.edu') || college_email.endsWith('.edu.in'));
      const status = isCollegeEmail ? 'verified' : 'pending';
      const nextCheck = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(); // 6 months

      const { data, error } = await supabase.from('ira_semester_checks').insert({
        user_id,
        college_email,
        semester: semester || 1,
        academic_year: academic_year || '2024-25',
        enrollment_proof: enrollment_proof || 'verified_via_email',
        status,
        next_check_due: nextCheck,
        verified_at: status === 'verified' ? new Date().toISOString() : null,
      }).select().single();
      if (error) throw error;

      if (status === 'verified') {
        await supabase.from('ira_user_profiles').update({
          semester_status: 'verified',
          last_semester_check: new Date().toISOString(),
          next_semester_check: nextCheck,
        }).eq('user_id', user_id);

        await supabase.from('ira_notifications').insert({
          user_id,
          type: 'semester',
          title: 'Student status verified 🎓',
          message: `Semester ${semester} enrollment confirmed. Next check due in 6 months.`,
          is_read: false,
        });
      }

      return res.status(200).json({ data, status, isCollegeEmail });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Semester error:', err);
    res.status(500).json({ error: err.message });
  }
}
