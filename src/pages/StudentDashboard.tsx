import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Layout from '../components/Layout';
import ShriScoreBadge from '../components/ShriScoreBadge';
import WalletCard from '../components/WalletCard';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { Investment, Loan } from '../types';

interface LoanResponse {
  loans: Loan[];
  investments: Investment[];
}

export default function StudentDashboard() {
  const { logout, refreshUser, user, withAuth } = useAuth();
  const [loanForm, setLoanForm] = useState({
    amount: 1000,
    tenure: 10,
    purpose: 'Books and project expenses',
    frequency: 'daily',
  });
  const [loanState, setLoanState] = useState<LoanResponse>({ loans: [], investments: [] });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [nominationMessage, setNominationMessage] = useState('');

  const loadDashboard = async () => {
    try {
      await refreshUser();
      const payload = await withAuth((token) => apiClient.getLoans(token));
      setLoanState(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard');
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitLoan = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await withAuth((token) =>
        apiClient.requestLoan(token, {
          amount: Number(loanForm.amount),
          tenure: Number(loanForm.tenure),
          purpose: loanForm.purpose,
          scheduleFrequency: loanForm.frequency,
        }),
      );
      setMessage(
        `Loan request created. Matched ${response.matches.length} lender${response.matches.length === 1 ? '' : 's'}.`,
      );
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request loan');
    } finally {
      setLoading(false);
    }
  };

  const requestGuarantor = async () => {
    if (!nomineeEmail) {
      setError('Enter an email address to nominate a guarantor.');
      return;
    }
    setLoading(true);
    setError('');
    setNominationMessage('');
    try {
      await withAuth((token) => apiClient.requestGuarantor(token, nomineeEmail));
      setNominationMessage('Guarantor request sent. They have 7 days to accept or reject.');
      setNomineeEmail('');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send guarantor request');
    } finally {
      setLoading(false);
    }
  };

  const repayLoan = async (loanId: number) => {
    setLoading(true);
    setError('');
    try {
      await withAuth((token) => apiClient.repayLoan(token, loanId));
      setMessage('Repayment processed and balances updated.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Repayment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Student Dashboard"
      subtitle="Borrower and lender actions are now fully React-driven."
      showModeToggle
      onCloseRoute="/"
    >
      <div className="nav-links" style={{ marginBottom: 20 }}>
        <Link to="/profile">Profile</Link>
        <Link to="/notifications">Notifications</Link>
        <Link to="/guarantors">Guarantors</Link>
        <Link to="/transaction-history">Transaction history</Link>
        <Link to="/account-closure">Account closure</Link>
        <button className="button button--ghost" type="button" onClick={() => logout()}>
          Sign out
        </button>
      </div>

      {!user?.wallet_activated || user.kyc_status !== 'verified' ? (
        <div className="feedback" style={{ marginBottom: 20 }}>
          Finish onboarding before using the live wallet and loan tools.
        </div>
      ) : null}

      {!user?.college_verified ? (
        <div className="feedback" style={{ marginBottom: 20 }}>
          Your college still needs to approve your student profile before borrowing unlocks.
        </div>
      ) : null}

      {message ? <div className="feedback" style={{ marginBottom: 20 }}>{message}</div> : null}
      {error ? <div className="feedback feedback--error" style={{ marginBottom: 20 }}>{error}</div> : null}

      <div className="dashboard-grid">
        <div className="span-4 stack">
          <WalletCard
            locked={user?.batua_locked || 0}
            unlocked={user?.batua_unlocked || 0}
            tijori={user?.tijori || 0}
          />
          <ShriScoreBadge score={user?.shri_score || 0} />
        </div>

        <div className="span-8 stack">
          <section className="card">
            <div className="card__header">
              <h2>{user?.mode === 'lender' ? 'Lender view' : 'Borrower view'}</h2>
              <span className="pill">{user?.mode || 'borrower'}</span>
            </div>
            {user?.mode !== 'lender' ? (
              <>
                <form className="stack" onSubmit={submitLoan}>
                  <div className="grid-two">
                    <div className="field">
                      <label htmlFor="loan-amount">Amount</label>
                      <input
                        id="loan-amount"
                        className="input"
                        type="number"
                        min={500}
                        max={5000}
                        value={loanForm.amount}
                        onChange={(event) =>
                          setLoanForm((current) => ({ ...current, amount: Number(event.target.value) }))
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="loan-tenure">Tenure (days)</label>
                      <input
                        id="loan-tenure"
                        className="input"
                        type="number"
                        min={1}
                        max={90}
                        value={loanForm.tenure}
                        onChange={(event) =>
                          setLoanForm((current) => ({ ...current, tenure: Number(event.target.value) }))
                        }
                      />
                    </div>
                  </div>
                <div className="field">
                  <label htmlFor="loan-frequency">Installment frequency</label>
                  <select
                    id="loan-frequency"
                    className="select"
                    value={loanForm.frequency}
                    onChange={(event) =>
                      setLoanForm((current) => ({ ...current, frequency: event.target.value }))
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="every1">Every 1 day</option>
                    <option value="every2">Every 2 days</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="loan-purpose">Purpose</label>
                  <textarea
                    id="loan-purpose"
                    className="textarea"
                    value={loanForm.purpose}
                    onChange={(event) => setLoanForm((current) => ({ ...current, purpose: event.target.value }))}
                  />
                </div>
                <button className="button button--primary" type="submit" disabled={loading || !user?.can_borrow}>
                  {loading ? 'Processing…' : 'Request loan'}
                </button>
              </form>

              <section className="card">
                <div className="card__header">
                  <h3>Nominate a guarantor</h3>
                  <span className="pill">7-day expiry</span>
                </div>
                <div className="field">
                  <label htmlFor="nominee-email">Guarantor email</label>
                  <input
                    id="nominee-email"
                    className="input"
                    type="email"
                    placeholder="friend@example.com"
                    value={nomineeEmail}
                    onChange={(event) => setNomineeEmail(event.target.value)}
                  />
                </div>
                <button className="button button--secondary" type="button" onClick={requestGuarantor} disabled={loading || !nomineeEmail}>
                  {loading ? 'Sending…' : 'Send guarantor request'}
                </button>
                {nominationMessage ? <p className="muted" style={{ marginTop: 12 }}>{nominationMessage}</p> : null}
              </section>
            </>
          ) : (
              <p className="muted">
                Your unlocked Batua is used for public lender matching. Active investments appear
                below.
              </p>
            )}
          </section>

          <section className="card">
            <div className="card__header">
              <h2>Active loans</h2>
              <span className="pill">{loanState.loans.length}</span>
            </div>
            <div className="list">
              {loanState.loans.length === 0 ? (
                <div className="list-item">
                  <p className="list-item__meta">No loans yet.</p>
                </div>
              ) : (
                loanState.loans.map((loan) => (
                  <article className="list-item" key={loan.id}>
                    <div className="list-item__header">
                      <div>
                        <h3 className="list-item__title">Loan #{loan.id}</h3>
                        <div className="list-item__meta">
                          ₹{loan.amount} over {loan.tenure_days} days · due {new Date(loan.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="pill">{loan.status}</span>
                    </div>
                    <div className="list-item__footer" style={{ marginTop: 16 }}>
                      <span className="list-item__meta">
                        Total repayable ₹{loan.total_repayable.toFixed(2)}
                      </span>
                      {loan.status === 'active' ? (
                        <button className="button button--secondary" type="button" onClick={() => repayLoan(loan.id)}>
                          Repay now
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__header">
              <h2>Investments</h2>
              <span className="pill">{loanState.investments.length}</span>
            </div>
            <div className="list">
              {loanState.investments.length === 0 ? (
                <div className="list-item">
                  <p className="list-item__meta">No investments yet.</p>
                </div>
              ) : (
                loanState.investments.map((investment) => (
                  <article className="list-item" key={investment.id}>
                    <div className="list-item__header">
                      <div>
                        <h3 className="list-item__title">Investment #{investment.id}</h3>
                        <div className="list-item__meta">Loan #{investment.loan_id}</div>
                      </div>
                      <span className="pill">{investment.status}</span>
                    </div>
                    <div className="list-item__footer" style={{ marginTop: 16 }}>
                      <span>₹{investment.amount.toFixed(2)}</span>
                      <span className="list-item__meta">
                        Expected return ₹{investment.expected_return.toFixed(2)}
                      </span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
