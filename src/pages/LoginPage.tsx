import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import FloatingCoins from '../components/FloatingCoins';
import { useAuth } from '../contexts/AuthContext';
import { useIraTrigger } from '../hooks/useIraTrigger';
import { apiClient } from '../services/api';

type ForgotStage = 'idle' | 'verify' | 'reset';

function routeAfterLogin(
  role: string,
  walletActivated: boolean,
  kycStatus: string,
  navigate: ReturnType<typeof useNavigate>,
) {
  if (role === 'admin') {
    navigate('/admin');
    return;
  }
  if (!walletActivated || kycStatus !== 'verified') {
    navigate('/onboarding');
    return;
  }
  navigate('/dashboard');
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [email, setEmail] = useState('aarav.mehta@symbiosis.edu');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [forgotStage, setForgotStage] = useState<ForgotStage>('idle');
  const [forgotSessionId, setForgotSessionId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [whatsappOtp, setWhatsappOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
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

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await loginUser(email, password);
      if (user) {
        routeAfterLogin(user.role, user.wallet_activated, user.kyc_status, navigate);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const startForgotPassword = async () => {
    try {
      const response = await apiClient.requestForgotPassword(forgotEmail);
      setForgotSessionId(response.sessionId);
      setForgotMessage('Demo OTP is 123456 for both email and WhatsApp.');
      setForgotStage('verify');
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to start reset flow');
    }
  };

  const verifyForgotPassword = async () => {
    try {
      const response = await apiClient.verifyForgotPassword({
        session_id: forgotSessionId,
        email_otp: emailOtp,
        whatsapp_otp: whatsappOtp,
      });
      setResetToken(response.resetToken);
      setForgotStage('reset');
      setForgotMessage('Reset token verified. Choose a new password.');
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'OTP verification failed');
    }
  };

  const resetForgotPassword = async () => {
    try {
      await apiClient.resetPassword({
        session_id: forgotSessionId,
        reset_token: resetToken,
        password: newPassword,
      });
      setForgotStage('idle');
      setForgotSessionId('');
      setResetToken('');
      setForgotMessage('Password reset complete. You can sign in now.');
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reset password');
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
          <p className="text-slate-400 text-sm mt-1">Student P2P Lending • Welcome Back</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-slide-up">
          <div className="h-1 gradient-animated" />
          <div className="p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-1">Login</h2>
            <p className="text-slate-400 text-sm mb-6">Use your college email and password.</p>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">College Email</label>
                <input
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error ? <p className="text-red-500 text-sm mb-1">❌ {error}</p> : null}
              {forgotMessage ? <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">{forgotMessage}</div> : null}
              <button className="w-full btn-primary py-3.5 text-base font-bold disabled:opacity-50" type="submit" disabled={loading}>
                {loading ? '⏳ Signing in...' : 'Sign In →'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 font-medium">forgot password</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {forgotStage === 'idle' ? (
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Registered college email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                />
                <button className="w-full btn-green py-3 text-sm font-bold" type="button" onClick={startForgotPassword}>
                  Send dual OTP
                </button>
              </div>
            ) : null}

            {forgotStage === 'verify' ? (
              <div className="space-y-3">
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Email OTP"
                  value={emailOtp}
                  onChange={(event) => setEmailOtp(event.target.value)}
                />
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="WhatsApp OTP"
                  value={whatsappOtp}
                  onChange={(event) => setWhatsappOtp(event.target.value)}
                />
                <button className="w-full btn-green py-3 text-sm font-bold" type="button" onClick={verifyForgotPassword}>
                  Verify OTPs
                </button>
              </div>
            ) : null}

            {forgotStage === 'reset' ? (
              <div className="space-y-3">
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <button className="w-full btn-green py-3 text-sm font-bold" type="button" onClick={resetForgotPassword}>
                  Reset password
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-4">
          <button className="text-sm text-slate-500 hover:text-blue-600 font-semibold" type="button" onClick={() => navigate('/')}>
            Home
          </button>
          <span className="text-slate-300">•</span>
          <button className="text-sm text-slate-500 hover:text-blue-600 font-semibold" type="button" onClick={navigateWithOrigin('/signup')}>
            Create account
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
