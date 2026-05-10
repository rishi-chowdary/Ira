import { useEffect, useRef, useState } from 'react';

const INTEREST_SLABS = [
  { max: 1, rate: 0 },
  { max: 3, rate: 3 },
  { max: 7, rate: 5 },
  { max: 14, rate: 7 },
  { max: 21, rate: 9 },
  { max: 30, rate: 12 },
];

function getRate(days: number) {
  for (const slab of INTEREST_SLABS) {
    if (days <= slab.max) return slab.rate;
  }
  return 12;
}

export default function LiveCalculator() {
  const [amount, setAmount] = useState(2000);
  const [days, setDays] = useState(7);
  const [animated, setAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setAnimated(true);
      },
      { threshold: 0.2 },
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  const rate = getRate(days);
  const interest = Math.round((amount * rate) / 100);
  const total = amount + interest;
  const lenderEarns = Math.round(interest * 0.85);
  const platformFee = interest - lenderEarns;
  const isFree = rate === 0;

  const amountPct = ((amount - 500) / (5000 - 500)) * 100;
  const daysPct = ((days - 1) / 29) * 100;

  return (
    <div
      ref={elementRef}
      className={`transition-all duration-700 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)' }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl gradient-blue-green flex items-center justify-center text-white text-xl font-black shadow-sm">🧮</div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Live Interest Calculator</h3>
              <p className="text-slate-400 text-xs">See exactly what you'll pay — no surprises</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-7">
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">Loan Amount</label>
              <span className="text-3xl font-black" style={{ color: '#2563EB' }}>₹{amount.toLocaleString()}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={500}
                max={5000}
                step={100}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full h-2.5 rounded-full appearance-none"
                style={{ background: `linear-gradient(90deg, #2563EB ${amountPct}%, #e2e8f0 0%)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1.5 font-medium">
              <span>₹500</span>
              <span>₹5,000</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">Repay In</label>
              <span className="text-3xl font-black" style={{ color: '#EF4444' }}>
                {days} {days === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={1}
                max={30}
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="w-full h-2.5 rounded-full appearance-none"
                style={{ background: `linear-gradient(90deg, #EF4444 ${daysPct}%, #e2e8f0 0%)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1.5 font-medium">
              <span>1 day</span>
              <span>30 days</span>
            </div>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {INTEREST_SLABS.map((slab, index) => {
              const active = rate === slab.rate;
              const colors = [
                { bg: '#F0FDF4', border: '#10B981', text: '#065f46' },
                { bg: '#EFF6FF', border: '#2563EB', text: '#1e40af' },
                { bg: '#EFF6FF', border: '#3b82f6', text: '#1d4ed8' },
                { bg: '#F5F3FF', border: '#8b5cf6', text: '#5b21b6' },
                { bg: '#FEF3C7', border: '#f59e0b', text: '#92400e' },
                { bg: '#FEF2F2', border: '#EF4444', text: '#991b1b' },
              ];
              const theme = colors[index];
              return (
                <div
                  key={`${slab.max}-${slab.rate}`}
                  className="text-xs font-bold px-2.5 py-1 rounded-full border transition-all duration-200"
                  style={
                    active
                      ? { background: theme.bg, borderColor: theme.border, color: theme.text, transform: 'scale(1.08)', boxShadow: `0 0 0 2px ${theme.border}40` }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                  }
                >
                  {slab.rate === 0 ? 'FREE' : `${slab.rate}%`} ≤{slab.max}d
                </div>
              );
            })}
          </div>

          <div
            className="rounded-2xl p-6 text-center transition-all duration-500 border-2"
            style={{
              background: isFree ? 'linear-gradient(135deg, #F0FDF4, #ECFDF5)' : 'linear-gradient(135deg, #FEF2F2, #FFF5F5)',
              borderColor: isFree ? '#10B981' : '#EF4444',
            }}
          >
            {isFree ? (
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
                🎉 Zero Interest Window!
              </div>
            ) : null}
            <p className="text-sm font-semibold text-slate-500 mb-1">You repay</p>
            <p className="text-5xl font-black mb-2 transition-all duration-300" style={{ color: isFree ? '#10B981' : '#EF4444' }}>
              ₹{total.toLocaleString()}
            </p>
            <p className="text-sm font-semibold" style={{ color: isFree ? '#059669' : '#dc2626' }}>
              {isFree ? '₹0 interest — repay within 24 hours! 🎉' : `Interest: ₹${interest} (${rate}%)`}
            </p>
          </div>

          <div className="rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, #F0FDF4, #EFF6FF)', borderColor: '#a7f3d0' }}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">💰 Interest Distribution</p>
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-emerald-600">₹{lenderEarns}</p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Lender Earns</p>
                <p className="text-xs text-slate-400">85%</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-blue-600">₹{platformFee}</p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Platform Fee</p>
                <p className="text-xs text-slate-400">15%</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-slate-800">₹{amount.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">You Get Back</p>
                <p className="text-xs text-slate-400">Principal</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
