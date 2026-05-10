import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      const { data, error } = await supabase.from('ira_kyc').select('*').eq('user_id', user_id).maybeSingle();
      if (error) throw error;
      return res.status(200).json(data);
    }

    // Initiate DigiLocker consent (simulated)
    if (req.method === 'POST') {
      const { user_id, aadhaar_last4, pan_number } = req.body;

      // Simulate DigiLocker verification
      const ref = `DL-${Date.now()}-${user_id}`;
      const panMasked = pan_number ? pan_number.substring(0, 3) + 'XX' + pan_number.substring(5, 9) + 'X' : 'ABCXX1234X';

      const { data: existing } = await supabase.from('ira_kyc').select('id').eq('user_id', user_id).maybeSingle();

      let kycData;
      if (existing) {
        const { data } = await supabase.from('ira_kyc').update({
          aadhaar_verified: true,
          pan_verified: !!pan_number,
          aadhaar_last4: aadhaar_last4 || '0000',
          pan_masked: panMasked,
          digilocker_ref: ref,
          status: 'verified',
          verified_at: new Date().toISOString(),
        }).eq('user_id', user_id).select().single();
        kycData = data;
      } else {
        const { data } = await supabase.from('ira_kyc').insert({
          user_id,
          aadhaar_verified: true,
          pan_verified: !!pan_number,
          aadhaar_last4: aadhaar_last4 || '0000',
          pan_masked: panMasked,
          digilocker_ref: ref,
          status: 'verified',
          verified_at: new Date().toISOString(),
        }).select().single();
        kycData = data;
      }

      // Update profile
      await supabase.from('ira_user_profiles').update({
        kyc_status: 'verified',
        onboarding_step: 5,
        account_status: 'active',
      }).eq('user_id', user_id);

      await supabase.from('ira_notifications').insert({
        user_id,
        type: 'kyc',
        title: 'KYC Verified! ✅',
        message: 'Your Aadhaar and PAN have been verified via DigiLocker. Your account is now active!',
        is_read: false,
      });

      return res.status(200).json(kycData);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('KYC error:', err);
    res.status(500).json({ error: err.message });
  }
}
