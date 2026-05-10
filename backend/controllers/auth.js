import supabase, { isSupabaseConfigured } from './_supabase.js';
import { createHash } from 'crypto';
import {
  DEMO_ACCOUNTS,
  getDemoProfileByEmail,
  getDemoProfileById,
  getDemoUserByEmail,
  getDemoUserById,
  isDemoUserId,
} from './_demo.js';

const ALLOW_NON_COLLEGE_SIGNUP = process.env.ALLOW_NON_COLLEGE_SIGNUP === 'true';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isCollegeEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.endsWith('.ac.in') || normalized.endsWith('.edu') || normalized.endsWith('.edu.in');
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

function hasSupabase() {
  return Boolean(isSupabaseConfigured && supabase);
}

// Generate lending account ID: IN/State/District/Sector/5-digit
function generateLendingId(state, district, sector, seq) {
  return `IN/${state}/${district.substring(0,3).toUpperCase()}/S${sector}/${String(seq).padStart(5, '0')}`;
}

// Generate borrowing account ID: IN/State/District/University/College/Course/5-digit
function generateBorrowingId(state, district, university, college, course, seq) {
  return `IN/${state}/${district.substring(0,3).toUpperCase()}/${university.substring(0,4).toUpperCase()}/${college.substring(0,3).toUpperCase()}/${course.substring(0,3).toUpperCase()}/${String(seq).padStart(5, '0')}`;
}

async function ensureDemoAccount(email) {
  const demo = DEMO_ACCOUNTS[email];
  if (!demo) return null;
  if (!hasSupabase()) return getDemoUserByEmail(email);

  // Check if already exists
  let { data: user } = await supabase
    .from('ira_users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    // Create demo account with full KYC, college verified, wallets funded
    const seq = Object.keys(DEMO_ACCOUNTS).indexOf(email) + 10001;
    const lendingId = generateLendingId(demo.state, demo.district, demo.sector, seq);
    const borrowingId = generateBorrowingId(demo.state, demo.district, demo.university, demo.college, demo.course, seq);

    const baseInsert = {
      name: demo.name,
      email: email,
      college: demo.college,
      role: 'both',
      trust_score: 3 + Math.floor(Math.random() * 3),
      trust_points: 50 + Math.floor(Math.random() * 100),
      total_lent: Math.floor(Math.random() * 10000),
      total_borrowed: Math.floor(Math.random() * 5000),
      total_earned: Math.floor(Math.random() * 500),
    };

    let { data: newUser, error } = await supabase
      .from('ira_users')
      .insert({
        ...baseInsert,
        lending_account_id: lendingId,
        borrowing_account_id: borrowingId,
      })
      .select()
      .single();

    // Some environments may not yet have the account ID columns.
    if (error) {
      const fallback = await supabase
        .from('ira_users')
        .insert(baseInsert)
        .select()
        .single();
      newUser = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;
    user = newUser;
  }

  // Create profile (active, KYC done) if missing
  const { data: existingProfile } = await supabase
    .from('ira_user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from('ira_user_profiles').insert({
      user_id: user.id,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      upi_id: `${demo.name.split(' ')[0].toLowerCase()}@okaxis`,
      kyc_status: 'verified',
      account_status: 'active',
      semester_status: 'verified',
      guarantors_approved: true,
      onboarding_step: 5,
    });
  }

  // Riya's demo account starts with an active Batua and visible transaction history.
  if (email === 'riya.menon@symbiosis.pune.ac.in') {
    const { data: wallet } = await supabase
      .from('ira_wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const targetWallet = {
      batua_locked: 901,
      batua_unlocked: 651,
      tijori: 420,
      is_activated: true,
      activated_at: wallet?.activated_at || new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (!wallet) {
      await supabase.from('ira_wallets').insert({
        user_id: user.id,
        ...targetWallet,
      }).catch(() => {});
    } else if (!wallet.is_activated) {
      await supabase
        .from('ira_wallets')
        .update(targetWallet)
        .eq('user_id', user.id)
        .catch(() => {});
    }

    const demoReferences = [
      'DEMO-RIYA-SEED',
      'DEMO-RIYA-FEE',
      'DEMO-RIYA-LOCKED',
      'DEMO-RIYA-UNLOCKED',
      'DEMO-RIYA-UPI',
      'DEMO-RIYA-TRANSFER',
      'DEMO-RIYA-REPAY',
    ];

    const { data: existingTransactions } = await supabase
      .from('ira_transactions')
      .select('reference')
      .eq('user_id', user.id)
      .in('reference', demoReferences)
      .catch(() => ({ data: [] }));

    if (!existingTransactions || existingTransactions.length === 0) {
      const now = Date.now();
      await supabase.from('ira_transactions').insert([
        {
          user_id: user.id,
          type: 'seed',
          amount: 3,
          wallet: 'upi_debit',
          description: 'Batua activation - demo ₹3 seed payment',
          reference: 'DEMO-RIYA-SEED',
          created_at: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          user_id: user.id,
          type: 'platform_fee',
          amount: 1,
          wallet: 'platform',
          description: 'Demo ₹1 platform activation fee',
          reference: 'DEMO-RIYA-FEE',
          created_at: new Date(now - 21 * 24 * 60 * 60 * 1000 + 60_000).toISOString(),
        },
        {
          user_id: user.id,
          type: 'seed_credit',
          amount: 1,
          wallet: 'batua_locked',
          description: 'Demo seed credit to Batua Locked',
          reference: 'DEMO-RIYA-LOCKED',
          created_at: new Date(now - 21 * 24 * 60 * 60 * 1000 + 120_000).toISOString(),
        },
        {
          user_id: user.id,
          type: 'seed_credit',
          amount: 1,
          wallet: 'batua_unlocked',
          description: 'Demo seed credit to Batua Unlocked',
          reference: 'DEMO-RIYA-UNLOCKED',
          created_at: new Date(now - 21 * 24 * 60 * 60 * 1000 + 180_000).toISOString(),
        },
        {
          user_id: user.id,
          type: 'upi_credit',
          amount: 1800,
          wallet: 'batua_locked',
          description: 'Demo UPI top-up to Batua Locked',
          reference: 'DEMO-RIYA-UPI',
          created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          user_id: user.id,
          type: 'transfer',
          amount: 900,
          wallet: 'batua_locked->batua_unlocked',
          description: 'Demo transfer from Batua Locked to Batua Unlocked',
          reference: 'DEMO-RIYA-TRANSFER',
          created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          user_id: user.id,
          type: 'repayment_received',
          amount: 420,
          wallet: 'tijori',
          description: 'Demo repayment credited to Tijori',
          reference: 'DEMO-RIYA-REPAY',
          created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]).catch(() => {});
    }
  }

  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { action } = req.query;

    // PASSWORD LOGIN (for demo accounts)
    if (action === 'password-login' && req.method === 'POST') {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const normalizedEmail = normalizeEmail(email);
      const demo = DEMO_ACCOUNTS[normalizedEmail];

      if (!hasSupabase()) {
        if (!demo || demo.password !== password) {
          return res.status(400).json({
            error: demo
              ? 'Invalid password'
              : 'Local demo mode is available only for the built-in demo accounts until Supabase is configured.',
          });
        }

        return res.status(200).json({
          user: getDemoUserByEmail(normalizedEmail),
          profile: getDemoProfileByEmail(normalizedEmail),
          isNew: false,
          demoMode: true,
        });
      }

      let user = null;
      let profile = null;

      const { data: existingUser } = await supabase
        .from('ira_users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        user = existingUser;
        const { data: existingProfile } = await supabase
          .from('ira_user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        profile = existingProfile;
      }

      const storedPasswordHash = user?.password_hash || profile?.password_hash || null;
      const demoPasswordMatched = Boolean(demo && demo.password === password);
      if (!demoPasswordMatched) {
        if (storedPasswordHash) {
          if (!passwordMatches(storedPasswordHash, password)) {
            return res.status(400).json({ error: 'Invalid password' });
          }
        } else {
          if (!demo) {
            return res.status(400).json({ error: 'Password login is only available for password-enabled or demo accounts. Use OTP login for your account.' });
          }
          return res.status(400).json({ error: 'Invalid password' });
        }
      }

      if (demo) {
        user = await ensureDemoAccount(normalizedEmail);
        const { data: ensuredProfile } = await supabase
          .from('ira_user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        profile = ensuredProfile;
      }

      if (!user) {
        return res.status(404).json({ error: 'No account found for this email.' });
      }

      return res.status(200).json({ user, profile, isNew: false });
    }

    // SEND OTP
    if (action === 'send-otp' && req.method === 'POST') {
      const { contact, intent } = req.body; // email or phone
      if (!contact) return res.status(400).json({ error: 'Contact required' });

      const normalizedContact = contact.includes('@') ? normalizeEmail(contact) : contact.trim();
      if (
        intent === 'signup' &&
        normalizedContact.includes('@') &&
        !ALLOW_NON_COLLEGE_SIGNUP &&
        !isCollegeEmail(normalizedContact)
      ) {
        return res.status(400).json({ error: 'Use your college email (.ac.in, .edu, or .edu.in) to sign up.' });
      }

      if (!hasSupabase()) {
        return res.status(503).json({
          error: 'OTP login needs Supabase right now. For local testing, use a demo password account like Riya Menon.',
        });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Invalidate old OTPs
      await supabase.from('ira_otp').update({ used: true }).eq('contact', normalizedContact).eq('used', false);

      await supabase.from('ira_otp').insert({ contact: normalizedContact, otp, expires_at: expiresAt });

      // In production: send SMS/email. For demo, return OTP
      return res.status(200).json({ success: true, otp, message: `OTP sent to ${normalizedContact}` });
    }

    // VERIFY OTP + LOGIN/REGISTER
    if (action === 'verify-otp' && req.method === 'POST') {
      const { contact, otp, name, college, whatsapp, upi_id, isSignup } = req.body;
      const normalizedContact = contact.includes('@') ? normalizeEmail(contact) : contact.trim();
      const isEmail = normalizedContact.includes('@');

      if (isSignup && isEmail && !ALLOW_NON_COLLEGE_SIGNUP && !isCollegeEmail(normalizedContact)) {
        return res.status(400).json({ error: 'Use your college email (.ac.in, .edu, or .edu.in) to create an account.' });
      }

      if (!hasSupabase()) {
        return res.status(503).json({
          error: 'OTP verification needs Supabase right now. For local testing, use a demo password account.',
        });
      }

      const { data: otpRecord } = await supabase
        .from('ira_otp')
        .select('*')
        .eq('contact', normalizedContact)
        .eq('otp', otp)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });

      // Mark OTP used
      await supabase.from('ira_otp').update({ used: true }).eq('id', otpRecord.id);

      // Find or create user
      let user;
      const { data: existing } = await supabase
        .from('ira_users')
        .select('*')
        .eq('email', normalizedContact)
        .maybeSingle();

      if (existing) {
        user = existing;
      } else if (isSignup || name) {
        // New user registration
        const displayName = name || normalizedContact.split('@')[0].replace(/[._]/g, ' ');
        const { data: newUser, error } = await supabase
          .from('ira_users')
          .insert({
            name: displayName,
            email: isEmail ? normalizedContact : `${normalizedContact}@ira.app`,
            college: college || 'Unknown College',
            role: 'both',
            trust_score: 1,
            trust_points: 0,
            total_lent: 0,
            total_borrowed: 0,
            total_earned: 0,
          })
          .select().single();
        if (error) throw error;
        user = newUser;

        // Create profile
        await supabase.from('ira_user_profiles').insert({
          user_id: user.id,
          phone: whatsapp || (isEmail ? null : normalizedContact),
          upi_id: upi_id || null,
          kyc_status: 'pending',
          account_status: 'onboarding',
          semester_status: 'pending',
          guarantors_approved: false,
          onboarding_step: 1,
        });
      } else {
        return res.status(200).json({ isNew: true, error: 'No account found. Please sign up first.' });
      }

      // Get profile
      const { data: profile } = await supabase
        .from('ira_user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return res.status(200).json({ user, profile, isNew: !existing });
    }

    // GET user by ID with profile
    if (req.method === 'GET' && req.query.user_id) {
      if (!hasSupabase()) {
        if (!isDemoUserId(req.query.user_id)) {
          return res.status(404).json({ error: 'No local demo account found for this user.' });
        }

        return res.status(200).json({
          user: getDemoUserById(req.query.user_id),
          profile: getDemoProfileById(req.query.user_id),
          kyc: {
            user_id: Number(req.query.user_id),
            aadhaar_status: 'verified',
            pan_status: 'verified',
            verified_at: new Date().toISOString(),
          },
          semester: {
            user_id: Number(req.query.user_id),
            status: 'verified',
            created_at: new Date().toISOString(),
          },
          demoMode: true,
        });
      }

      const { data: user } = await supabase.from('ira_users').select('*').eq('id', req.query.user_id).single();
      const { data: profile } = await supabase.from('ira_user_profiles').select('*').eq('user_id', req.query.user_id).maybeSingle();
      const { data: kyc } = await supabase.from('ira_kyc').select('*').eq('user_id', req.query.user_id).maybeSingle();
      const { data: semester } = await supabase.from('ira_semester_checks').select('*').eq('user_id', req.query.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return res.status(200).json({ user, profile, kyc, semester });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: err.message });
  }
}
