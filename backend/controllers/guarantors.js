import supabase from './_supabase.js';

// Validation rules (Point 4):
// - Every user must have 2 guarantors at college-verification stage
// - Max 5 guaranteed users per guarantor
// - Guarantors must have completed KYC to lender level
// - No mutual guarantors (A guarantees B, B cannot guarantee A)
// - Removal only if no active loans on the guaranteed user
// - Notifications when guaranteed user takes a loan

const MAX_GUARANTEED_USERS = 5;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // GET — get guarantor relationships
    if (req.method === 'GET') {
      const { user_id, guarantor_id, tab } = req.query;

      let query = supabase.from('ira_guarantors')
        .select('*, user:ira_users!ira_guarantors_user_id_fkey(id,name,email,college,trust_score,trust_points), guarantor:ira_users!ira_guarantors_guarantor_id_fkey(id,name,email,college,trust_score,trust_points)');

      if (user_id) query = query.eq('user_id', user_id);
      if (guarantor_id) query = query.eq('guarantor_id', guarantor_id);

      // tab: "my-guarantors" (who guarantees me) or "i-guarantee" (who I guarantee)
      // Already handled by user_id / guarantor_id filters

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    // POST — request guarantors
    if (req.method === 'POST') {
      const { user_id, guarantor_ids } = req.body;

      // Validation: need exactly 2 guarantors
      if (!guarantor_ids || guarantor_ids.length < 2)
        return res.status(400).json({ error: 'Two guarantors required' });

      if (guarantor_ids.length > 2)
        return res.status(400).json({ error: 'Maximum 2 guarantors allowed' });

      // Validation: can't guarantee yourself
      if (guarantor_ids.includes(user_id))
        return res.status(400).json({ error: 'Cannot be your own guarantor' });

      // Validation: no mutual guarantors
      for (const gid of guarantor_ids) {
        const { data: reverse } = await supabase.from('ira_guarantors')
          .select('id')
          .eq('user_id', gid)
          .eq('guarantor_id', user_id)
          .maybeSingle();

        if (reverse) {
          return res.status(400).json({ error: `Mutual guarantorship not allowed. You already guarantee user ${gid}.` });
        }
      }

      // Validation: check each guarantor's KYC status
      for (const gid of guarantor_ids) {
        const { data: profile } = await supabase.from('ira_user_profiles')
          .select('kyc_status')
          .eq('user_id', gid)
          .maybeSingle();

        if (!profile || profile.kyc_status !== 'verified') {
          return res.status(400).json({ error: `Guarantor (ID: ${gid}) has not completed KYC. Guarantors must be KYC-verified.` });
        }
      }

      // Validation: check max 5 guaranteed users per guarantor
      for (const gid of guarantor_ids) {
        const { data: existing } = await supabase.from('ira_guarantors')
          .select('id')
          .eq('guarantor_id', gid)
          .in('status', ['pending', 'approved']);

        if (existing && existing.length >= MAX_GUARANTEED_USERS) {
          return res.status(400).json({ error: `Guarantor (ID: ${gid}) already guarantees ${MAX_GUARANTEED_USERS} users (maximum).` });
        }
      }

      // Clear any existing pending guarantor requests for this user
      await supabase.from('ira_guarantors')
        .delete()
        .eq('user_id', user_id)
        .eq('status', 'pending');

      // Insert new guarantor requests
      const rows = guarantor_ids.map(gid => ({ user_id, guarantor_id: gid, status: 'pending' }));
      const { data, error } = await supabase.from('ira_guarantors').insert(rows).select();
      if (error) throw error;

      // Notify each guarantor
      const { data: newUser } = await supabase.from('ira_users').select('name').eq('id', user_id).single();
      for (const gid of guarantor_ids) {
        await supabase.from('ira_notifications').insert({
          user_id: gid,
          type: 'guarantor',
          title: `🛡️ ${newUser?.name} needs you as guarantor`,
          message: `${newUser?.name} has nominated you as a guarantor on IRA. Approve to help them get started!`,
          is_read: false,
        }).catch(() => {});
      }

      return res.status(201).json(data);
    }

    // PUT — approve/reject guarantor request
    if (req.method === 'PUT') {
      const { id, status, guarantor_id } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved or rejected' });
      }

      const { data, error } = await supabase.from('ira_guarantors')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Check if both guarantors approved
      const { data: guarantorRow } = await supabase.from('ira_guarantors')
        .select('user_id')
        .eq('id', id)
        .single();

      if (guarantorRow) {
        const { data: allGuarantors } = await supabase.from('ira_guarantors')
          .select('status')
          .eq('user_id', guarantorRow.user_id);

        const approvedCount = (allGuarantors || []).filter(g => g.status === 'approved').length;
        const allApproved = approvedCount >= 2;

        if (allApproved) {
          await supabase.from('ira_user_profiles')
            .update({ guarantors_approved: true, onboarding_step: 4 })
            .eq('user_id', guarantorRow.user_id);

          await supabase.from('ira_notifications').insert({
            user_id: guarantorRow.user_id,
            type: 'guarantor',
            title: 'Both guarantors approved! 🎉',
            message: 'Your two guarantors have vouched for you. You can now proceed with borrowing.',
            is_read: false,
          }).catch(() => {});
        }

        // Notify user of approval/rejection
        const { data: guarantorUser } = await supabase.from('ira_users')
          .select('name')
          .eq('id', guarantor_id || data.guarantor_id)
          .single();

        await supabase.from('ira_notifications').insert({
          user_id: guarantorRow.user_id,
          type: 'guarantor',
          title: status === 'approved'
            ? `✅ ${guarantorUser?.name} approved your request`
            : `❌ ${guarantorUser?.name} declined your request`,
          message: status === 'approved'
            ? `${guarantorUser?.name} has agreed to be your guarantor.`
            : `${guarantorUser?.name} has declined. Please find another guarantor.`,
          is_read: false,
        }).catch(() => {});
      }

      return res.status(200).json(data);
    }

    // DELETE — remove guarantor relationship
    if (req.method === 'DELETE') {
      const { id, user_id } = req.body || req.query;

      if (!id) return res.status(400).json({ error: 'Guarantor relationship ID required' });

      // Check if the guaranteed user has active loans
      const { data: relationship } = await supabase.from('ira_guarantors')
        .select('user_id')
        .eq('id', id)
        .single();

      if (relationship) {
        const { data: activeLoans } = await supabase.from('ira_loans')
          .select('id')
          .eq('borrower_id', relationship.user_id)
          .in('status', ['open', 'funded', 'active'])
          .limit(1);

        if (activeLoans && activeLoans.length > 0) {
          return res.status(400).json({ error: 'Cannot remove guarantor while the user has active loans.' });
        }
      }

      const { error } = await supabase.from('ira_guarantors').delete().eq('id', id);
      if (error) throw error;

      return res.status(200).json({ message: 'Guarantor removed successfully' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Guarantors error:', err);
    res.status(500).json({ error: err.message });
  }
}
