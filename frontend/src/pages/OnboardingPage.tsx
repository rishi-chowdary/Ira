import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUser, withAuth } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    aadhaar_number: '',
    pan_number: '',
    upi_id: user?.upi_id || '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.wallet_activated) {
      navigate('/dashboard');
    }
  }, [navigate, user]);

  const handleVerifyDocs = async () => {
    setLoading(true);
    setError('');
    try {
      await withAuth((token) => apiClient.submitKyc(token, form));
      await refreshUser();
      setStep(4);
      setMessage('Aadhaar, PAN, and UPI saved. Activate Batua with the ₹3 test payment.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify documents');
    } finally {
      setLoading(false);
    }
  };

  const activateWallet = async () => {
    setLoading(true);
    setError('');
    try {
      await withAuth((token) => apiClient.activateWallet(token));
      await refreshUser();
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Wallet activation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Onboarding"
      subtitle="Mock DigiLocker + wallet activation flow"
      onCloseRoute="/dashboard"
    >
      <div className="progress-steps">
        {['Aadhaar', 'PAN', 'UPI', 'Activate'].map((label, index) => (
          <article key={label} className={`step-card ${step === index + 1 ? 'is-active' : ''}`}>
            <strong>{index + 1}</strong>
            <div>{label}</div>
          </article>
        ))}
      </div>

      <div className="content-grid">
        <section className="card span-8 stack">
          {step <= 3 ? (
            <>
              <div className="field">
                <label htmlFor="aadhaar">Aadhaar number</label>
                <input
                  id="aadhaar"
                  className="input"
                  placeholder="1234 5678 9012"
                  value={form.aadhaar_number}
                  onChange={(event) => setForm((current) => ({ ...current, aadhaar_number: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="pan">PAN number</label>
                <input
                  id="pan"
                  className="input"
                  placeholder="ABCDE1234F"
                  value={form.pan_number}
                  onChange={(event) => setForm((current) => ({ ...current, pan_number: event.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="upi">UPI ID</label>
                <input
                  id="upi"
                  className="input"
                  placeholder="name@bank"
                  value={form.upi_id}
                  onChange={(event) => setForm((current) => ({ ...current, upi_id: event.target.value }))}
                />
              </div>
              {message ? <div className="feedback">{message}</div> : null}
              {error ? <div className="feedback feedback--error">{error}</div> : null}
              <button className="button button--primary" type="button" disabled={loading} onClick={handleVerifyDocs}>
                {loading ? 'Verifying…' : 'Verify Aadhaar, PAN and UPI'}
              </button>
            </>
          ) : (
            <>
              <div className="feedback">
                Pay ₹3 to activate your wallet. The demo flow creates ₹1 in Batua Locked, ₹1 in
                Batua Unlocked, and books ₹1 as the platform fee.
              </div>
              {error ? <div className="feedback feedback--error">{error}</div> : null}
              <button className="button button--primary" type="button" disabled={loading} onClick={activateWallet}>
                {loading ? 'Activating…' : 'Pay ₹3 and activate Batua'}
              </button>
            </>
          )}
        </section>

        <aside className="card span-4 stack">
          <div>
            <h2>Account status</h2>
            <p className="muted">Current state for {user?.full_name}</p>
          </div>
          <div className="list">
            <article className="list-item">
              <strong>KYC</strong>
              <div className="list-item__meta">{user?.kyc_status}</div>
            </article>
            <article className="list-item">
              <strong>College verification</strong>
              <div className="list-item__meta">{user?.college_verified ? 'Approved' : 'Pending'}</div>
            </article>
            <article className="list-item">
              <strong>Wallet</strong>
              <div className="list-item__meta">{user?.wallet_activated ? 'Active' : 'Not activated'}</div>
            </article>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
