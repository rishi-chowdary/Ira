import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import FloatingCoins from '../components/FloatingCoins';
import { useAuth } from '../contexts/AuthContext';
import { useIraTrigger } from '../hooks/useIraTrigger';
import { apiClient } from '../services/api';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { completeSignup } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    college_email: '',
    whatsapp_number: '',
    upi_id: '',
    password: '',
  });
  const [sessionId, setSessionId] = useState('');
  const [otp, setOtp] = useState({
    email_otp: '',
    whatsapp_otp: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const handleSecretTrigger = useIraTrigger(() => navigate('/college-portal'));

  useEffect(() => {
    if (!wrapperRef.current) return;

    const originX = (location.state as { originX?: number; originY?: number } | null)?.originX;
    const originY = (location.state as { originX?: number; originY?: number } | null)?.originY;

    if (typeof originX === 'number' && typeof originY === 'number') {
      const rect = wrapperRef.current.getBoundingClientRect();
      wrapperRef.current.style.transformOrigin = `${Math.max(0, Math.min(rect.width, originX - rect.left))}px ${Math.max(0, Math.min(rect.height, originY - rect.top))}px`;
    } else {
      wrapperRef.current.style.transformOrigin = 'center center';
    }

    requestAnimationFrame(() => setTransitionActive(true));
  }, [location.state]);

  const navigateWithOrigin = (path: string) => (event: MouseEvent<HTMLButtonElement>) => {
    navigate(path, { state: { originX: event.clientX, originY: event.clientY } });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.signup(form);
      setSessionId(response.sessionId);
      setMessage('Demo OTP is 123456 for both email and WhatsApp.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to start sign-up');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await completeSignup({
        session_id: sessionId,
        email_otp: otp.email_otp,
        whatsapp_otp: otp.whatsapp_otp,
      });
      navigate('/onboarding');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 auth-page no-copy"
      style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 50%, #FEF2F2 100%)' }}
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
    >
      <FloatingCoins count={10} />
      <div className="auth-logo">
        <Link to="/" className="brand-button">
          <span className="brand-button__mark">₹</span>
          <span className="gradient-text-blue-green">IRA</span>
        </Link>
      </div>
      <button className="close-button auth-close" type="button" onClick={() => navigate('/')}>×</button>
      <div
        ref={wrapperRef}
        className="page-transition-root"
        style={{ transform: transitionActive ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(18px)', opacity: transitionActive ? 1 : 0 }}
      >
        <div
          className="absolute right-[-100px] top-[-100px] w-80 h-80 rounded-full opacity-5 animate-spin-slow"
          style={{ background: 'radial-gradient(circle, #2563EB, #10B981)', animationDuration: '25s' }}
        />
      <div
        className="absolute left-[-80px] bottom-[-80px] w-64 h-64 rounded-full opacity-5 animate-spin-slow"
        style={{ background: 'radial-gradient(circle, #EF4444, #2563EB)', animationDuration: '18s', animationDirection: 'reverse' }}
      />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8 animate-slide-down">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-blue-green shadow-lg mb-4 animate-spin-slow" style={{ animationDuration: '10s' }}>
            <span className="text-white text-3xl font-black">₹</span>
          </div>
          <h1 className="text-4xl font-black gradient-text-blue-green cursor-pointer" onClick={handleSecretTrigger}>
            IRA
          </h1>
          <p className="text-slate-400 text-sm mt-1">Student P2P Lending • Create Account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-slide-up">
          <div className="h-1 gradient-animated" />
          <div className="p-8">
            {!sessionId ? (
              <>
                <h2 className="text-2xl font-black text-slate-800 mb-1">Sign Up</h2>
                <p className="text-slate-400 text-sm mb-6">One account to borrow and lend.</p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Full Name</label>
                    <input
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                      value={form.full_name}
                      onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">College Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                      value={form.college_email}
                      onChange={(event) => setForm((current) => ({ ...current, college_email: event.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">WhatsApp Number</label>
                      <input
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                        value={form.whatsapp_number}
                        onChange={(event) => setForm((current) => ({ ...current, whatsapp_number: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">UPI ID</label>
                      <input
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                        value={form.upi_id}
                        onChange={(event) => setForm((current) => ({ ...current, upi_id: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Password</label>
                    <input
                      type="password"
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    />
                  </div>
                  {error ? <p className="text-red-500 text-sm">❌ {error}</p> : null}
                  <button className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50" type="submit" disabled={loading}>
                    {loading ? '⏳ Sending OTPs...' : 'Create Account →'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-slate-800 mb-1">Verify OTP</h2>
                <p className="text-slate-400 text-sm mb-4">Complete email and WhatsApp verification to continue.</p>
                {message ? <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">{message}</div> : null}
                <form className="space-y-4" onSubmit={handleVerify}>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Email OTP</label>
                    <input
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                      value={otp.email_otp}
                      onChange={(event) => setOtp((current) => ({ ...current, email_otp: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">WhatsApp OTP</label>
                    <input
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                      value={otp.whatsapp_otp}
                      onChange={(event) => setOtp((current) => ({ ...current, whatsapp_otp: event.target.value }))}
                    />
                  </div>
                  {error ? <p className="text-red-500 text-sm">❌ {error}</p> : null}
                  <button className="w-full btn-green py-3.5 text-base font-bold disabled:opacity-50" type="submit" disabled={loading}>
                    {loading ? '⏳ Verifying...' : 'Verify & Continue ✓'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-4">
          <button className="text-sm text-slate-500 hover:text-blue-600 font-semibold" type="button" onClick={() => navigate('/')}>
            Home
          </button>
          <span className="text-slate-300">•</span>
          <button className="text-sm text-slate-500 hover:text-blue-600 font-semibold" type="button" onClick={navigateWithOrigin('/login')}>
            I already have an account
          </button>
        </div>
      </div>
    </div>  </div>  );
}
