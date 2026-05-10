import { useEffect, useRef, useState } from 'react';

const BORROWER_DATA = [
  { label: 'IRA (24h)', rate: 0, color: '#10B981', highlight: true, icon: '🏆', note: 'Zero interest!' },
  { label: 'IRA (7d)', rate: 5, color: '#2563EB', highlight: true, icon: '⭐', note: 'Student P2P' },
  { label: 'IRA (30d)', rate: 12, color: '#6366f1', highlight: true, icon: '⭐', note: 'Student P2P' },
  { label: 'SBI Personal', rate: 11.45, color: '#94a3b8', highlight: false, icon: '🏦', note: 'Needs income proof' },
  { label: 'HDFC Personal', rate: 10.85, color: '#94a3b8', highlight: false, icon: '🏦', note: 'Min ₹75k salary' },
  { label: 'Bajaj Finserv', rate: 14, color: '#f59e0b', highlight: false, icon: '🏢', note: 'Processing fees extra' },
  { label: 'PaySense', rate: 16, color: '#f97316', highlight: false, icon: '📱', note: 'App-based NBFC' },
  { label: 'KreditBee', rate: 18, color: '#ef4444', highlight: false, icon: '📱', note: 'Instant but costly' },
  { label: 'MoneyTap', rate: 24, color: '#dc2626', highlight: false, icon: '💳', note: 'Credit line app' },
  { label: 'Credit Card', rate: 36, color: '#991b1b', highlight: false, icon: '💳', note: 'Revolving credit' },
];

const LENDER_DATA = [
  { label: 'Savings A/c', rate: 3.5, color: '#94a3b8', highlight: false, icon: '🏦', note: 'SBI / HDFC avg' },
  { label: 'Fixed Deposit', rate: 7.1, color: '#64748b', highlight: false, icon: '🏦', note: '1-yr FD rate' },
  { label: 'PPF', rate: 7.1, color: '#64748b', highlight: false, icon: '🏛️', note: '15-yr lock-in' },
  { label: 'Mutual Fund', rate: 11, color: '#f59e0b', highlight: false, icon: '📊', note: 'Market risk' },
  { label: 'Nifty 50', rate: 12, color: '#f97316', highlight: false, icon: '📈', note: 'Avg 10-yr return' },
  { label: 'IRA (Quick)', rate: 14.45, color: '#10B981', highlight: true, icon: '🏆', note: 'Lender net avg' },
  { label: 'IRA (Premium)', rate: 18, color: '#2563EB', highlight: true, icon: '🚀', note: 'Platinum borrowers' },
];

const MAX_BORROWER = 40;
const MAX_LENDER = 20;

export default function ComparisonChart() {
  const [tab, setTab] = useState<'borrower' | 'lender'>('borrower');
  const [animated, setAnimated] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setAnimated(true), 100);
        }
      },
      { threshold: 0.15 },
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  const switchTab = (nextTab: 'borrower' | 'lender') => {
    setAnimated(false);
    setTab(nextTab);
    setTimeout(() => setAnimated(true), 80);
  };

  const data = tab === 'borrower' ? BORROWER_DATA : LENDER_DATA;
  const maxValue = tab === 'borrower' ? MAX_BORROWER : MAX_LENDER;

  return (
    <div ref={elementRef} className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-50" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl gradient-blue-green flex items-center justify-center text-xl shadow-sm">📊</div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Why IRA Wins</h3>
              <p className="text-slate-400 text-xs">Compared to banks, NBFCs &amp; other platforms</p>
            </div>
          </div>
          <div className="flex gap-1.5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
            <button
              onClick={() => switchTab('borrower')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'borrower' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              style={tab === 'borrower' ? { background: 'linear-gradient(135deg, #EF4444, #2563EB)' } : {}}
            >
              🚀 For Borrowers
            </button>
            <button
              onClick={() => switchTab('lender')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'lender' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              style={tab === 'lender' ? { background: 'linear-gradient(135deg, #10B981, #2563EB)' } : {}}
            >
              💰 For Lenders
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tab === 'borrower' ? (
            <>
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">✅ 0% interest in 24h</span>
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">✅ No income proof needed</span>
              <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">✅ Up to 3× cheaper than credit cards</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">✅ Up to 5× better than FD</span>
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">✅ No market risk</span>
              <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">✅ Start with just ₹50</span>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {tab === 'borrower' ? 'Interest Rate (% p.a.) — Lower is Better 👇' : 'Return Rate (% p.a.) — Higher is Better 👆'}
          </span>
          <span className="text-xs text-slate-300 font-medium">Annualised</span>
        </div>

        <div className="space-y-2.5">
          {data.map((item, index) => {
            const barPercent = (item.rate / maxValue) * 100;
            const delay = animated ? index * 60 : 0;
            const isHovered = hovered === index;
            return (
              <div
                key={item.label}
                className="group"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-32 sm:w-40 flex-shrink-0 flex items-center gap-1.5">
                    <span className="text-sm">{item.icon}</span>
                    <span className={`text-xs font-bold truncate transition-all ${item.highlight ? 'text-slate-800' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                    {item.highlight ? <span className="text-xs">⭐</span> : null}
                  </div>

                  <div className="flex-1 relative h-8 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-xl flex items-center px-3 transition-all duration-700"
                      style={{
                        width: animated ? `${barPercent}%` : '0%',
                        background: isHovered
                          ? `${item.color}dd`
                          : item.highlight
                            ? `linear-gradient(90deg, ${item.color}, ${item.color}bb)`
                            : `${item.color}55`,
                        transitionDelay: `${delay}ms`,
                        minWidth: animated ? '2rem' : '0',
                        boxShadow: item.highlight && animated ? `0 0 12px ${item.color}44` : 'none',
                      }}
                    >
                      <span className="text-xs font-black whitespace-nowrap" style={{ color: item.highlight ? '#fff' : '#475569' }}>
                        {item.rate === 0 ? 'FREE!' : `${item.rate}%`}
                      </span>
                    </div>
                  </div>

                  <div className="w-36 hidden sm:block text-xs transition-all" style={{ color: isHovered ? item.color : '#94a3b8', fontWeight: isHovered ? 700 : 500 }}>
                    {item.note}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-4 mt-6 pt-5 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500 font-medium">IRA Platform ⭐</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-medium">Banks / NBFCs / Others</span>
          </div>
          {tab === 'borrower' ? <div className="ml-auto text-xs text-slate-400 italic">*Annualised equivalent rates</div> : null}
        </div>

        <div
          className="mt-4 rounded-2xl p-4 text-center"
          style={{
            background: tab === 'borrower'
              ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(37,99,235,0.06))'
              : 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(37,99,235,0.06))',
            border: `1.5px solid ${tab === 'borrower' ? '#fca5a5' : '#6ee7b7'}`,
          }}
        >
          {tab === 'borrower' ? (
            <p className="text-sm font-bold text-slate-700">
              🏆 IRA is up to <span className="text-red-600 text-lg">3× cheaper</span> than credit cards and <span className="text-blue-600">FREE</span> if you repay in 24 hours!
            </p>
          ) : (
            <p className="text-sm font-bold text-slate-700">
              🏆 IRA lenders earn up to <span className="text-emerald-600 text-lg">5× more</span> than a savings account — with no stock market risk!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
