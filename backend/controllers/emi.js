import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { loan_id, borrower_id } = req.query;
      let query = supabase.from('ira_emi_schedules').select('*');
      if (loan_id) query = query.eq('loan_id', loan_id);
      if (borrower_id) query = query.eq('borrower_id', borrower_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { loan_id, borrower_id, frequency_days, upi_id, total_amount } = req.body;

      const { data: loan } = await supabase.from('ira_loans').select('*').eq('id', loan_id).single();
      if (!loan) return res.status(404).json({ error: 'Loan not found' });

      const totalEmis = Math.ceil(loan.tenure_days / frequency_days);
      const emiAmount = Math.ceil(loan.total_repayable / totalEmis);
      const mandateRef = `UPI-MANDATE-${Date.now()}-${loan_id}`;
      const nextDue = new Date(Date.now() + frequency_days * 86400000).toISOString();

      const { data, error } = await supabase.from('ira_emi_schedules').insert({
        loan_id,
        borrower_id,
        frequency_days,
        emi_amount: emiAmount,
        total_emis: totalEmis,
        paid_emis: 0,
        upi_id,
        upi_mandate_ref: mandateRef,
        next_due_date: nextDue,
        status: 'active',
      }).select().single();
      if (error) throw error;

      await supabase.from('ira_notifications').insert({
        user_id: borrower_id,
        type: 'emi_setup',
        title: 'UPI AutoPay activated! ✅',
        message: `₹${emiAmount} will be auto-debited every ${frequency_days} day${frequency_days > 1 ? 's' : ''} from ${upi_id}. Mandate ref: ${mandateRef}`,
        is_read: false,
      });

      return res.status(201).json({ schedule: data, mandateRef, emiAmount, totalEmis });
    }

    if (req.method === 'PUT') {
      // Pay one EMI
      const { id } = req.body;
      const { data: emi } = await supabase.from('ira_emi_schedules').select('*').eq('id', id).single();
      if (!emi) return res.status(404).json({ error: 'EMI schedule not found' });

      const newPaid = (emi.paid_emis || 0) + 1;
      const isDone = newPaid >= emi.total_emis;
      const nextDue = isDone ? null : new Date(Date.now() + emi.frequency_days * 86400000).toISOString();

      const { data } = await supabase.from('ira_emi_schedules').update({
        paid_emis: newPaid,
        next_due_date: nextDue,
        status: isDone ? 'completed' : 'active',
      }).eq('id', id).select().single();

      if (isDone) {
        await supabase.from('ira_loans').update({ status: 'repaid' }).eq('id', emi.loan_id);
      }

      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('EMI error:', err);
    res.status(500).json({ error: err.message });
  }
}
