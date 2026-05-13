import { useEffect, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

const BORROWER_DATA = [
  { label: 'IRA (24h)', rate: 0, color: '#10B981', note: 'Zero interest!' },
  { label: 'IRA (30d)', rate: 12, color: '#2563EB', note: 'Student P2P' },
  { label: 'Bank personal loan', rate: 11.5, color: '#94a3b8', note: 'Salary proof required' },
  { label: 'Credit card', rate: 36, color: '#dc2626', note: 'Revolving credit' },
  { label: 'Payday app', rate: 24, color: '#f97316', note: 'Fast cash, high cost' },
];

const LENDER_DATA = [
  { label: 'Savings account', rate: 3.5, color: '#94a3b8', note: 'Bank savings' },
  { label: 'Fixed deposit', rate: 7.1, color: '#64748b', note: '1-year FD' },
  { label: 'Mutual funds', rate: 11, color: '#f59e0b', note: 'Market-linked' },
  { label: 'IRA returns', rate: 14.5, color: '#10B981', note: 'Student lending' },
];

const MAX_BORROWER = 40;
const MAX_LENDER = 20;

export default function ComparisonChart() {
  const [tab, setTab] = useState<'borrower' | 'lender'>('borrower');
  const [animated, setAnimated] = useState(false);
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

  const chartData = {
    labels: (tab === 'borrower' ? BORROWER_DATA : LENDER_DATA).map((item) => item.label),
    datasets: [
      {
        label: tab === 'borrower' ? 'Interest rate' : 'Annual return',
        data: (tab === 'borrower' ? BORROWER_DATA : LENDER_DATA).map((item) => item.rate),
        backgroundColor: (tab === 'borrower' ? BORROWER_DATA : LENDER_DATA).map((item) => item.color),
        borderRadius: 14,
        barThickness: 28,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: animated ? 700 : 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.parsed.x}% ${tab === 'borrower' ? 'interest' : 'return'}`,
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: tab === 'borrower' ? MAX_BORROWER : MAX_LENDER,
        ticks: {
          color: '#64748b',
          callback: (value: number) => `${value}%`,
        },
        grid: { color: '#e2e8f0' },
      },
      y: {
        ticks: { color: '#334155', font: { size: 13 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div ref={elementRef} className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-50" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl gradient-blue-green flex items-center justify-center text-xl shadow-sm">📊</div>
            <div>
              <h3 className="text-xl font-black text-slate-800">IRA performance comparison</h3>
              <p className="text-slate-400 text-xs">A quick view of borrowing vs lending alternatives.</p>
            </div>
          </div>
          <div className="flex gap-1.5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
            <button
              type="button"
              onClick={() => setTab('borrower')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'borrower' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              style={tab === 'borrower' ? { background: 'linear-gradient(135deg, #EF4444, #2563EB)' } : {}}
            >
              🚀 Borrowers
            </button>
            <button
              type="button"
              onClick={() => setTab('lender')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'lender' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              style={tab === 'lender' ? { background: 'linear-gradient(135deg, #10B981, #2563EB)' } : {}}
            >
              💰 Lenders
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tab === 'borrower' ? (
            <>
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">✅ 0% interest window</span>
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">✅ Cheaper than credit cards</span>
              <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">✅ Transparent fees</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">✅ Better than savings</span>
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">✅ Stronger than FD</span>
              <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">✅ No market risk</span>
            </>
          )}
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="h-[360px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
