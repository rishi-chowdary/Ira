import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import FloatingCoins from '../components/FloatingCoins';
import { useAuth } from '../contexts/AuthContext';
import { useIraTrigger } from '../hooks/useIraTrigger';
import { apiClient } from '../services/api';

type ForgotStage = 'idle' | 'verify' | 'reset';

interface DemoAccount {
  id: string;
  roleTitle: string;
  name: string;
  email: string;
  password: string;
  badge: string;
  badgeColor: string;
  details: string;
  icon: string;
  collegeName?: string;
}

const FALLBACK_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'aarav',
    roleTitle: 'Student (Borrower & Lender)',
    name: 'Aarav Mehta',
    email: 'aarav.mehta@symbiosis.edu',
    password: 'demo123',
    badge: 'Dual Mode',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    details: 'Shri Score: 690 • ₹739 Batua balance',
    collegeName: 'Symbiosis SIT, Pune',
    icon: '🎓',
  },
  {
    id: 'vihaan',
    roleTitle: 'Student (Active Lender)',
    name: 'Vihaan Singh',
    email: 'vihaan.singh@symbiosis.edu',
    password: 'demo123',
    badge: 'Lender',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    details: 'Shri Score: 740 • ₹1,500 Batua balance',
    collegeName: 'Symbiosis SIT, Pune',
    icon: '💰',
  },
  {
    id: 'diya',
    roleTitle: 'Student (Borrower Focus)',
    name: 'Diya Iyer',
    email: 'diya.iyer@symbiosis.edu',
    password: 'demo123',
    badge: 'Borrower',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    details: 'Shri Score: 610 • Verified KYC & College',
    collegeName: 'Symbiosis SIT, Pune',
    icon: '📚',
  },
  {
    id: 'admin',
    roleTitle: 'Platform Superadmin',
    name: 'IRA Administrator',
    email: 'admin@ira.co.in',
    password: 'admin123',
    badge: 'Superadmin',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    details: 'Approvals, system metrics, platform revenue',
    collegeName: 'IRA Headquarters',
    icon: '🛡️',
  },
];

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
  const { loginUser, isAuthenticated, user, logout } = useAuth();

  // Tab State: 'demo' or 'manual'
  const [activeTab, setActiveTab] = useState<'demo' | 'manual'>('demo');
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>(FALLBACK_DEMO_ACCOUNTS);
  const [selectedDemo, setSelectedDemo] = useState<DemoAccount>(FALLBACK_DEMO_ACCOUNTS[0]);

  // Form State
  const [email, setEmail] = useState(FALLBACK_DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(FALLBACK_DEMO_ACCOUNTS[0].password);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getDemoAccounts()
      .then((accounts) => {
        if (isMounted && accounts?.length) {
          setDemoAccounts(accounts);
          setSelectedDemo((prev) => {
            const match = accounts.find((a) => a.id === prev.id) || accounts[0];
            setEmail(match.email);
            setPassword(match.password);
            return match;
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Forgot Password State
  const [forgotStage, setForgotStage] = useState<ForgotStage>('idle');
  const [forgotSessionId, setForgotSessionId] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [whatsappOtp, setWhatsappOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const [transitionActive, setTransitionActive] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const handleSecretTrigger = useIraTrigger(() => navigate('/college-portal'));

  useEffect(() => {
    if (!wrapperRef.current) return;
    setTransitionActive(true);
  }, [location.state]);

  const navigateWithOrigin = (path: string) => (event: MouseEvent<HTMLButtonElement>) => {
    navigate(path, { state: { originX: event.clientX, originY: event.clientY } });
  };

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setError('');
    try {
      const loggedUser = await loginUser(loginEmail, loginPass);
      if (loggedUser) {
        routeAfterLogin(loggedUser.role, loggedUser.wallet_activated, loggedUser.kyc_status, navigate);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (event: FormEvent) => {
    event.preventDefault();
    executeLogin(email, password);
  };

  const handleSelectDemo = (account: DemoAccount) => {
    setSelectedDemo(account);
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const handleQuickSignIn = (account: DemoAccount) => {
    handleSelectDemo(account);
    executeLogin(account.email, account.password);
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
      className="min-h-screen relative flex items-center justify-center p-4 auth-page no-copy py-10"
      style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 50%, #FEF2F2 100%)' }}
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
    >
      <FloatingCoins count={8} />

      {/* Top Left Logo */}
      <div className="auth-logo">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-blue-green flex items-center justify-center text-white font-bold text-sm shadow-sm">
            ₹
          </div>
          <span className="text-xl font-black gradient-text-blue-green tracking-tight">IRA</span>
        </Link>
      </div>

      {/* Close button */}
      <button
        className="close-button auth-close"
        type="button"
        onClick={() => navigate('/')}
        title="Go to home"
      >
        ×
      </button>

      <div
        ref={wrapperRef}
        className="page-transition-root w-full max-w-lg z-10"
        style={{
          transform: transitionActive ? 'scale(1)' : 'scale(0.98)',
          opacity: 1,
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-blue-green shadow-md mb-2"
          >
            <span className="text-white text-2xl font-black">₹</span>
          </div>
          <h1
            className="text-3xl font-black gradient-text-blue-green cursor-pointer"
            onClick={handleSecretTrigger}
            title="IRA Campus Peer Lending"
          >
            IRA Sign In
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            India's First Campus-to-Campus Peer Lending Network
          </p>
        </div>

        {/* Currently Logged In Session Alert */}
        {isAuthenticated && user ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-emerald-200 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">✅</span>
              <div>
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  Signed in as {user.full_name || user.email}
                </p>
                <p className="text-[11px] text-slate-500 capitalize">{user.role} Account</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => routeAfterLogin(user.role, user.wallet_activated, user.kyc_status, navigate)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Dashboard →
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                }}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : null}

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Top Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('demo')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'demo'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>⚡</span>
              <span>1-Click Demo Profiles</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>✍️</span>
              <span>Email & Password</span>
            </button>
          </div>

          {/* TAB 1: QUICK DEMO PROFILES */}
          {activeTab === 'demo' ? (
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Choose a pre-configured profile to explore borrowing, lending, or administration:
              </p>

              {/* Demo Account Cards */}
              <div className="space-y-2.5">
                {demoAccounts.map((account) => {
                  const isSelected = selectedDemo.id === account.id;
                  return (
                    <div
                      key={account.id}
                      onClick={() => handleSelectDemo(account)}
                      className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-100'
                          : 'border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{account.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{account.name}</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${account.badgeColor}`}
                            >
                              {account.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{account.details}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickSignIn(account);
                        }}
                        disabled={loading}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        {loading && selectedDemo.id === account.id ? 'Signing In…' : 'Sign In →'}
                      </button>
                    </div>
                  );
                })}

                {/* College Portal Option */}
                <div
                  onClick={() => navigate('/college-portal')}
                  className="p-3 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/30 hover:bg-purple-50 hover:border-purple-300 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏛️</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-purple-900">College Administration Portal</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                          College Authority
                        </span>
                      </div>
                      <p className="text-xs text-purple-600">
                        Symbiosis SIT • Verify enrollment & courses
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition">
                    Open Portal →
                  </span>
                </div>
              </div>

              {error ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  ❌ {error}
                </div>
              ) : null}

              {/* Big Sign In Button */}
              <button
                type="button"
                onClick={() => executeLogin(selectedDemo.email, selectedDemo.password)}
                disabled={loading}
                className="w-full btn-primary py-3.5 text-sm font-bold shadow-md disabled:opacity-50 mt-2"
              >
                {loading ? '⏳ Signing in…' : `Continue as ${selectedDemo.name} →`}
              </button>
            </div>
          ) : (
            /* TAB 2: MANUAL FORM */
            <div className="p-5 sm:p-6 space-y-4">
              <form className="space-y-4" onSubmit={handleManualSubmit}>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                    College Email
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition"
                    value={email}
                    placeholder="e.g. yourname@symbiosis.edu"
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                      Password
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Demo password: <code>demo123</code>
                    </span>
                  </div>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition"
                    value={password}
                    placeholder="Enter password"
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                {error ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                    ❌ {error}
                  </div>
                ) : null}

                {forgotMessage ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-medium">
                    {forgotMessage}
                  </div>
                ) : null}

                <button
                  className="w-full btn-primary py-3.5 text-sm font-bold shadow-md disabled:opacity-50"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? '⏳ Signing in…' : 'Sign In →'}
                </button>
              </form>

              {/* Forgot Password Accordion */}
              <div className="pt-2">
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400 font-medium">Forgot Password?</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {forgotStage === 'idle' ? (
                  <div className="space-y-2">
                    <input
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                      placeholder="Enter registered college email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                    />
                    <button
                      className="w-full btn-green py-2.5 text-xs font-bold"
                      type="button"
                      onClick={startForgotPassword}
                    >
                      Send Dual OTP (Email + WhatsApp)
                    </button>
                  </div>
                ) : null}

                {forgotStage === 'verify' ? (
                  <div className="space-y-2">
                    <input
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                      placeholder="Email OTP (Demo: 123456)"
                      value={emailOtp}
                      onChange={(event) => setEmailOtp(event.target.value)}
                    />
                    <input
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                      placeholder="WhatsApp OTP (Demo: 123456)"
                      value={whatsappOtp}
                      onChange={(event) => setWhatsappOtp(event.target.value)}
                    />
                    <button
                      className="w-full btn-green py-2.5 text-xs font-bold"
                      type="button"
                      onClick={verifyForgotPassword}
                    >
                      Verify OTPs
                    </button>
                  </div>
                ) : null}

                {forgotStage === 'reset' ? (
                  <div className="space-y-2">
                    <input
                      type="password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    <button
                      className="w-full btn-green py-2.5 text-xs font-bold"
                      type="button"
                      onClick={resetForgotPassword}
                    >
                      Save New Password
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-center gap-3 mt-4 text-xs font-semibold text-slate-500">
          <button
            className="hover:text-blue-600 transition"
            type="button"
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </button>
          <span className="text-slate-300">•</span>
          <button
            className="hover:text-blue-600 transition"
            type="button"
            onClick={navigateWithOrigin('/signup')}
          >
            Create Student Account
          </button>
          <span className="text-slate-300">•</span>
          <button
            className="text-purple-600 hover:text-purple-700 transition"
            type="button"
            onClick={() => navigate('/college-portal')}
          >
            College Portal
          </button>
        </div>
      </div>
    </div>
  );
}
