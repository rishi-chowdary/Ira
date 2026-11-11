import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Sparkles } from 'lucide-react';

import ComparisonChart from '../components/ComparisonChart';
import CountUp from '../components/CountUp';
import FloatingCoins from '../components/FloatingCoins';
import InterestTable from '../components/InterestTable';
import LiveCalculator from '../components/LiveCalculator';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { DatabaseStatus, HowItWorksStep, ShriTier, Testimonial } from '../types';

interface Stats {
  totalLent: number;
  totalLoans: number;
  totalUsers: number;
  totalEarned: number;
}

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [steps, setSteps] = useState<HowItWorksStep[]>([]);
  const [shriTiers, setShriTiers] = useState<ShriTier[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiClient.getStats().then((data) => isMounted && setStats(data)).catch(() => {});
    apiClient.getTestimonials().then((data) => isMounted && setTestimonials(data)).catch(() => {});
    apiClient.getHowItWorks().then((data) => isMounted && setSteps(data)).catch(() => {});
    apiClient.getShriTiers().then((data) => isMounted && setShriTiers(data)).catch(() => {});
    apiClient.getDatabaseStatus().then((data) => isMounted && setDbStatus(data)).catch(() => {});

    const timeout = window.setTimeout(() => setLoaded(true), 100);
    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const authLink = isAuthenticated ? (user?.role === 'admin' ? '/admin' : '/dashboard') : '/login';
  const signupLink = isAuthenticated ? '/dashboard' : '/signup';
  const marketplaceLink = isAuthenticated ? '/dashboard' : '/login';

  return (
    <div
      className="min-h-screen gradient-hero no-copy"
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
    >
      <nav className="glass sticky top-0 z-50 border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full gradient-blue-green flex items-center justify-center text-white font-black text-lg shadow-md animate-spin-slow" style={{ animationDuration: '10s' }}>
              ₹
            </div>
            <span className="text-2xl font-black gradient-text-blue-green">IRA</span>
            <span className="text-xs text-slate-400 hidden sm:block font-medium">Student Lending</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to={marketplaceLink} className="text-slate-600 hover:text-blue-600 font-medium transition-colors text-sm hidden sm:block">
              Marketplace
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={authLink}
                  className="btn-primary text-sm py-2 px-4 flex items-center gap-2 shadow-md"
                >
                  <span>Dashboard</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    {user?.full_name?.split(' ')[0] || user?.role || 'User'}
                  </span>
                </Link>
                <Link
                  to="/login"
                  className="text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-200 bg-white/80 hover:bg-white text-slate-700 transition"
                  title="Switch or manage account"
                >
                  Switch / Login
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-primary text-sm py-2 px-5 shadow-md">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-sm py-2 px-4 text-slate-700 hover:text-blue-600 font-semibold transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <FloatingCoins count={16} />

        <div
          className="absolute right-[-80px] top-[-80px] w-64 h-64 rounded-full opacity-5 animate-spin-slow"
          style={{ background: 'radial-gradient(circle, #2563EB, #10B981)', animationDuration: '20s' }}
        />
        <div
          className="absolute left-[-60px] bottom-[-60px] w-48 h-48 rounded-full opacity-5 animate-spin-slow"
          style={{ background: 'radial-gradient(circle, #EF4444, #2563EB)', animationDuration: '15s', animationDirection: 'reverse' }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 z-10">
          <div className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 border ${loaded ? 'animate-slide-down' : 'opacity-0'}`}
              style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB', borderColor: 'rgba(37,99,235,0.2)' }}
            >
              <span className="animate-heartbeat">🏦</span>
              India's First Student P2P Lending Platform
            </div>

            <h1
              className={`text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6 ${loaded ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '0.1s' }}
            >
              <span className="gradient-text-blue-green">Borrow Smart.</span>
              <br />
              <span className="gradient-text-red-blue">Lend Smarter.</span>
              <br />
              <span className="text-slate-700">Student to Student.</span>
            </h1>

            <p
              className={`text-lg sm:text-xl text-slate-500 mb-8 max-w-2xl leading-relaxed ${loaded ? 'animate-slide-up' : 'opacity-0'}`}
              style={{ animationDelay: '0.25s' }}
            >
              Get <strong className="text-red-500">₹500–₹5,000</strong> instantly for movies, emergencies, or anything else.
              Or lend small amounts and earn <strong className="text-emerald-600">12–18% p.a.</strong> — way more than any bank.
            </p>

            <div className={`flex flex-wrap gap-4 mb-12 ${loaded ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
              <Link to={signupLink} className="btn-red text-base py-3.5 px-8 animate-pulse-cta">
                🚀 Start Borrowing
              </Link>
              <Link to={signupLink} className="btn-green text-base py-3.5 px-8">
                💰 Start Lending
              </Link>
              <Link to="/login" className="btn-primary text-base py-3.5 px-8 shadow-md">
                ⚡ Instant Demo Login
              </Link>
            </div>

            {stats ? (
              <div className={`flex flex-wrap gap-6 ${loaded ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: '0.55s' }}>
                <div>
                  <p className="text-2xl font-black">
                    ₹<CountUp end={stats.totalLent} suffix="+" />
                  </p>
                  <p className="text-xs text-slate-400 font-medium">Total Lent</p>
                </div>
                <div className="w-px bg-slate-200" />
                <div>
                  <p className="text-2xl font-black">
                    <CountUp end={stats.totalLoans} suffix="+" />
                  </p>
                  <p className="text-xs text-slate-400 font-medium">Loans Funded</p>
                </div>
                <div className="w-px bg-slate-200" />
                <div>
                  <p className="text-2xl font-black">
                    <CountUp end={stats.totalUsers} suffix="+" />
                  </p>
                  <p className="text-xs text-slate-400 font-medium">Students</p>
                </div>
                <div className="w-px bg-slate-200" />
                <div>
                  <p className="text-2xl font-black">
                    ₹<CountUp end={stats.totalEarned} suffix="+" />
                  </p>
                  <p className="text-xs text-slate-400 font-medium">Earned by Lenders</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Database Synchronization Status Bar */}
          {dbStatus && (
            <div className="mt-8 p-3 rounded-2xl bg-white/70 border border-slate-200/80 backdrop-blur-md max-w-xl mx-auto flex items-center justify-between text-xs text-slate-700 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  Database Synchronized
                </span>
                <span className="text-slate-400">({dbStatus.totalTables} relational tables • {dbStatus.totalRecords} records)</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">Live DB</span>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
              <Sparkles className="w-3 h-3 text-blue-600" /> Database-Driven Process
            </div>
            <h2 className="text-4xl font-black text-slate-800 mb-3">How IRA Works</h2>
            <p className="text-slate-500">Simple, verified campus peer-to-peer lifecycle</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="text-center p-8 rounded-2xl card-hover border border-slate-100 animate-slide-up opacity-0-start"
                style={{ animationDelay: `${index * 0.15}s`, animationFillMode: 'forwards', background: step.bg }}
              >
                <div className="text-5xl mb-4">{step.icon}</div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm mx-auto mb-4" style={{ background: step.color }}>
                  {step.step_number || index + 1}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-800 mb-3">Transparent Interest Rates</h2>
            <p className="text-slate-500">No hidden fees. Repay faster = pay less. Simple.</p>
          </div>
          <InterestTable principal={2000} />
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-800 mb-3">Try It Yourself</h2>
            <p className="text-slate-500">Drag the sliders — watch your repayment update instantly</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <LiveCalculator />
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-800 mb-3">Build Your Trust Score</h2>
            <p className="text-slate-500">Repay on time → earn stars → unlock better rates & higher limits</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {(shriTiers.length > 0
              ? shriTiers
              : [
                  { id: 1, tier_name: 'Platinum', min_score: 900, max_score: 1000, rate_multiplier: 0.8, borrowing_limit: 25000 },
                  { id: 2, tier_name: 'Gold', min_score: 750, max_score: 899, rate_multiplier: 0.85, borrowing_limit: 15000 },
                  { id: 3, tier_name: 'Silver', min_score: 600, max_score: 749, rate_multiplier: 0.92, borrowing_limit: 10000 },
                  { id: 4, tier_name: 'Bronze', min_score: 400, max_score: 599, rate_multiplier: 1.0, borrowing_limit: 5000 },
                  { id: 5, tier_name: 'Entry', min_score: 0, max_score: 399, rate_multiplier: 1.15, borrowing_limit: 2000 },
                ]
            ).map((tier, idx) => {
              const stars = '⭐'.repeat(5 - idx);
              const colors = ['#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#64748B'];
              const color = colors[idx % colors.length];
              return (
                <div
                  key={tier.tier_name}
                  className="p-5 rounded-2xl text-center border card-hover"
                  style={{ background: '#fafafa', borderColor: `${color}40` }}
                >
                  <div className="text-2xl mb-2">{stars}</div>
                  <p className="font-bold text-sm mb-3" style={{ color }}>{tier.tier_name}</p>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Max Limit</p>
                    <p className="font-black text-slate-800 text-sm">₹{tier.borrowing_limit.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Multiplier</p>
                    <p className="font-bold text-sm" style={{ color }}>{tier.rate_multiplier}x</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-800 mb-3">IRA vs Everyone Else</h2>
            <p className="text-slate-500">See how we stack up against banks, NBFCs, and lending apps</p>
          </div>
          <ComparisonChart />
        </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-800 mb-3">What Students Say</h2>
            <p className="text-slate-500 text-sm">Real reviews fetched directly from student community database</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-white p-6 rounded-2xl border border-slate-100 card-hover shadow-sm"
                style={{ borderTop: `3px solid ${testimonial.color}` }}
              >
                <div className="text-2xl mb-1" style={{ color: testimonial.color }}>"</div>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">{testimonial.text}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: testimonial.color }}>
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{testimonial.name}</p>
                      <p className="text-xs text-slate-400">{testimonial.college} • {testimonial.role}</p>
                    </div>
                  </div>
                  <span className="text-sm">{'⭐'.repeat(testimonial.stars)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-animated opacity-90" />
        <FloatingCoins count={8} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">Ready to Join IRA?</h2>
          <p className="text-white/80 text-lg mb-8">Join thousands of students who are borrowing smart and lending smarter.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={signupLink} className="bg-white text-red-600 font-bold py-3.5 px-8 rounded-xl hover:scale-105 transition-transform shadow-lg">
              🚀 I Want to Borrow
            </Link>
            <Link to={signupLink} className="bg-white/10 border-2 border-white text-white font-bold py-3.5 px-8 rounded-xl hover:bg-white/20 transition-all">
              💰 I Want to Lend
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>© 2024 IRA — Student P2P Lending Platform. RBI NBFC-P2P Compliant.</p>
        <p className="mt-1 text-xs">This is a demo application. Not financial advice.</p>
      </footer>
    </div>
  );
}
