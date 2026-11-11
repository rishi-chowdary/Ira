import { PropsWithChildren, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock,
  LogOut,
  Menu,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import StudentNavigation from './StudentNavigation';

interface LayoutProps {
  title: string;
  subtitle?: string;
  showModeToggle?: boolean;
  onCloseRoute?: string;
  showCloseButton?: boolean;
  actions?: React.ReactNode;
}

export default function Layout({
  title,
  subtitle,
  showModeToggle = false,
  onCloseRoute = '/',
  showCloseButton = false,
  actions,
  children,
}: PropsWithChildren<LayoutProps>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, sessionType, updateMode, logout, withAuth } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch unread notifications for students
  useEffect(() => {
    if (sessionType !== 'user' || !user || user.role === 'admin') return;
    let isMounted = true;
    withAuth((token) => apiClient.getNotifications(token))
      .then((notifications) => {
        if (!isMounted) return;
        const unread = (notifications || []).filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [sessionType, user, withAuth, location.pathname]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const isStudentUser =
    sessionType === 'user' && user && user.role !== 'admin' && location.pathname !== '/admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Main App Bar */}
      <header className="glass sticky top-0 z-50 border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4rem] py-2 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2.5 text-left group"
              onClick={() => navigate(isStudentUser ? '/dashboard' : '/')}
            >
              <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                ₹
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                    IRA
                  </span>
                  {isStudentUser && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 tracking-wide">
                      STUDENT
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:block leading-tight">
                  Student Peer Lending
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Mode Toggle (Borrower / Lender) */}
            {showModeToggle && user && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    user.mode !== 'lender'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => updateMode('borrower')}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Borrower</span>
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    user.mode === 'lender'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => updateMode('lender')}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Lender</span>
                </button>
              </div>
            )}

            {/* Notifications Bell */}
            {isStudentUser && (
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* User Profile Pill */}
            {user && (
              <div
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-colors cursor-pointer"
                title="View Profile"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                      {user.full_name || user.email.split('@')[0]}
                    </span>
                    {user.college_verified ? (
                      <span title="College Verified">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </span>
                    ) : (
                      <span title="Approval Pending">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize font-medium">
                    {user.role === 'both' ? 'Borrower & Lender' : user.role}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Demo Switcher */}
            {user && (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs"
                title="Switch Demo Account"
              >
                Switch Account
              </button>
            )}

            {/* Sign Out */}
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition border border-rose-200 flex items-center gap-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            )}

            {/* Explicit Close Button for special flows */}
            {showCloseButton && (
              <button
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shadow-2xs"
                onClick={() => navigate(onCloseRoute)}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            {isStudentUser && (
              <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-4 shadow-lg animate-slide-down">
            {user && (
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{user.full_name || user.email}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="capitalize">{user.role}</span>
                    {user.college_verified ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> Approval Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showModeToggle && user && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Mode</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      user.mode !== 'lender'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                    onClick={() => {
                      updateMode('borrower');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Users className="w-4 h-4" /> Borrower
                  </button>
                  <button
                    type="button"
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      user.mode === 'lender'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                    onClick={() => {
                      updateMode('lender');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <TrendingUp className="w-4 h-4" /> Lender
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold text-center"
              >
                Switch Account
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="py-2.5 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Persistent Student Navigation Bar for all student user pages */}
      {isStudentUser && <StudentNavigation />}

      {/* Page Content Shell */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Section Heading */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {/* Page Children */}
        {children}
      </main>
    </div>
  );
}
