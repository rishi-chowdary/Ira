import { PropsWithChildren } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  title: string;
  subtitle?: string;
  showModeToggle?: boolean;
  onCloseRoute?: string;
}

export default function Layout({
  title,
  subtitle,
  showModeToggle = false,
  onCloseRoute = '/',
  children,
}: PropsWithChildren<LayoutProps>) {
  const navigate = useNavigate();
  const { user, updateMode } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass sticky top-0 z-50 border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button className="brand-button" onClick={() => navigate('/')}>
            <span className="brand-button__mark">₹</span>
            <span className="gradient-text-blue-green">IRA</span>
            <span className="text-xs text-slate-400 hidden sm:block font-medium">Student Lending</span>
          </button>
          {showModeToggle && user ? (
            <div className="mode-toggle" aria-label="Account mode">
              <button
                className={user.mode !== 'lender' ? 'is-active' : ''}
                onClick={() => updateMode('borrower')}
              >
                Borrower
              </button>
              <button
                className={user.mode === 'lender' ? 'is-active' : ''}
                onClick={() => updateMode('lender')}
              >
                Lender
              </button>
            </div>
          ) : null}
          <button className="close-button" onClick={() => navigate(onCloseRoute)}>
            ×
          </button>
        </div>
      </header>

      <main className="shell-main">
        <div className="section-heading">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
