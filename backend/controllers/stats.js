import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const [usersRes, loansRes, repaymentsRes, investmentsRes] = await Promise.all([
      supabase.from('ira_users').select('id, role, total_lent, total_earned, trust_score'),
      supabase.from('ira_loans').select('id, amount, status, funded_amount'),
      supabase.from('ira_repayments').select('total_paid, lender_earnings, platform_fee'),
      supabase.from('ira_investments').select('amount, lender_interest, status')
    ]);

    const users = usersRes.data || [];
    const loans = loansRes.data || [];
    const repayments = repaymentsRes.data || [];
    const investments = investmentsRes.data || [];

    const totalLent = investments.reduce((s, i) => s + (i.amount || 0), 0);
    const totalEarned = investments.filter(i => i.status === 'completed').reduce((s, i) => s + (i.lender_interest || 0), 0);
    const totalLoans = loans.length;
    const activeLoans = loans.filter(l => l.status === 'funded' || l.status === 'open').length;
    const repaidLoans = loans.filter(l => l.status === 'repaid').length;
    const totalBorrowed = loans.reduce((s, l) => s + (l.amount || 0), 0);
    const platformRevenue = repayments.reduce((s, r) => s + (r.platform_fee || 0), 0);
    const borrowers = users.filter(u => u.role === 'borrower').length;
    const lenders = users.filter(u => u.role === 'lender').length;
    const avgTrustScore = users.length ? (users.reduce((s, u) => s + (u.trust_score || 1), 0) / users.length).toFixed(1) : 0;

    return res.status(200).json({
      totalLent,
      totalEarned,
      totalLoans,
      activeLoans,
      repaidLoans,
      totalBorrowed,
      platformRevenue,
      borrowers,
      lenders,
      totalUsers: users.length,
      avgTrustScore
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
}
