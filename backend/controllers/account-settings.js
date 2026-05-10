import supabase from './_supabase.js';
import { createHash } from 'crypto';

const DEMO_ACCOUNTS = {
  'aarav.sharma@mit.pune.ac.in': 'ira@demo123',
  'vihaan.mehta@mit.pune.ac.in': 'ira@demo123',
  'diya.patil@mit.pune.ac.in': 'ira@demo123',
  'riya.menon@symbiosis.pune.ac.in': 'ira@demo123',
  'karthik.iyer@rural.ac.in': 'ira@demo123',
};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function passwordMatches(storedHash, rawPassword) {
  return storedHash === hashPassword(rawPassword);
}

function isValidUpiId(upiId = '') {
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/i.test(upiId.trim());
}

async function getUserAndProfile(userId) {
  const { data: user, error: userError } = await supabase
    .from('ira_users')
    .select('*')
    .eq('id', userId)
    .single();
  if (userError) throw userError;

  const { data: profile } = await supabase
    .from('ira_user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { user, profile };
}

async function storePasswordHash(userId, nextHash) {
  const attempts = [
    async () => supabase.from('ira_users').update({ password_hash: nextHash }).eq('id', userId),
    async () => supabase.from('ira_user_profiles').update({ password_hash: nextHash }).eq('user_id', userId),
  ];

  let lastError = null;
  for (const attempt of attempts) {
    const { error } = await attempt();
    if (!error) return;
    lastError = error;
  }

  throw lastError || new Error('Unable to persist password hash');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action } = req.query;

    if (action === 'request-upi-verification') {
      const { user_id, new_upi_id } = req.body;
      if (!user_id || !new_upi_id) {
        return res.status(400).json({ error: 'user_id and new_upi_id are required' });
      }
      if (!isValidUpiId(new_upi_id)) {
        return res.status(400).json({ error: 'Enter a valid UPI ID before starting verification.' });
      }

      const reference = `UPI-TEST-${Date.now()}`;
      return res.status(200).json({
        success: true,
        verification_reference: reference,
        test_amount: 1,
        message: `₹1 verification test initiated for ${new_upi_id.trim()}.`,
      });
    }

    if (action === 'confirm-upi-verification') {
      const { user_id, new_upi_id, verification_reference } = req.body;
      if (!user_id || !new_upi_id || !verification_reference) {
        return res.status(400).json({ error: 'user_id, new_upi_id, and verification_reference are required' });
      }
      if (!isValidUpiId(new_upi_id)) {
        return res.status(400).json({ error: 'Enter a valid UPI ID before confirming verification.' });
      }

      const { data: profile, error } = await supabase
        .from('ira_user_profiles')
        .update({ upi_id: new_upi_id.trim() })
        .eq('user_id', user_id)
        .select()
        .single();
      if (error) throw error;

      try {
        await supabase.from('ira_notifications').insert({
          user_id,
          type: 'upi_updated',
          title: 'UPI Updated',
          message: `Your UPI ID is now ${new_upi_id.trim()} after the ₹1 verification test.`,
          is_read: false,
        });
      } catch {}

      return res.status(200).json({
        success: true,
        profile,
        message: `UPI updated successfully. Verification reference: ${verification_reference}`,
      });
    }

    if (action === 'send-password-otp') {
      const { user_id, current_password } = req.body;
      if (!user_id || !current_password) {
        return res.status(400).json({ error: 'user_id and current_password are required' });
      }

      const { user, profile } = await getUserAndProfile(user_id);
      const storedPasswordHash = user?.password_hash || profile?.password_hash || null;
      const demoPassword = DEMO_ACCOUNTS[normalizeEmail(user?.email || '')];

      if (!storedPasswordHash && !demoPassword) {
        return res.status(400).json({ error: 'This account currently uses OTP sign-in. Password changes are available only for password-enabled accounts.' });
      }

      if (storedPasswordHash && !passwordMatches(storedPasswordHash, current_password)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }

      if (!storedPasswordHash && demoPassword && demoPassword !== current_password) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }

      const otp = generateOTP();
      const contact = `password:${user_id}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabase.from('ira_otp').update({ used: true }).eq('contact', contact).eq('used', false);
      await supabase.from('ira_otp').insert({ contact, otp, expires_at: expiresAt });

      const deliveryTargets = [user?.email, profile?.phone].filter(Boolean).join(' and ');

      return res.status(200).json({
        success: true,
        otp,
        sent_to: deliveryTargets || 'registered contact',
        message: 'Security OTP sent for password update.',
      });
    }

    if (action === 'confirm-password-change') {
      const { user_id, otp, new_password } = req.body;
      if (!user_id || !otp || !new_password) {
        return res.status(400).json({ error: 'user_id, otp, and new_password are required' });
      }
      if (String(new_password).length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      }

      const contact = `password:${user_id}`;
      const { data: otpRecord } = await supabase
        .from('ira_otp')
        .select('*')
        .eq('contact', contact)
        .eq('otp', otp)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!otpRecord) {
        return res.status(400).json({ error: 'Invalid or expired OTP.' });
      }

      await supabase.from('ira_otp').update({ used: true }).eq('id', otpRecord.id);
      await storePasswordHash(user_id, hashPassword(new_password));

      try {
        await supabase.from('ira_notifications').insert({
          user_id,
          type: 'password_updated',
          title: 'Password Updated',
          message: 'Your password was updated successfully after OTP verification.',
          is_read: false,
        });
      } catch {}

      return res.status(200).json({ success: true, message: 'Password updated successfully.' });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Account settings error:', err);
    return res.status(500).json({ error: err.message });
  }
}
