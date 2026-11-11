import { useEffect, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

import { apiClient } from '../services/api';
import { ComparisonRate } from '../types';

const MAX_BORROWER = 40;
const MAX_LENDER = 20;

export default function ComparisonChart() {
  const [tab, setTab] = useState<'borrower' | 'lender'>('borrower');
  const [animated, setAnimated] = useState(false);
  const [borrowerData, setBorrowerData] = useState<ComparisonRate[]>([]);
  const [lenderData, setLenderData] = useState<ComparisonRate[]>([]);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getComparisonRates()
      .then((res) => {
        if (isMounted) {
          if (res.borrower?.length) setBorrowerData(res.borrower);
          if (res.lender?.length) setLenderData(res.lender);
        }
      })
      .catch(() => {});

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setAnimated(true), 100);
        }
      },
      { threshold: 0.15 },
    );

    if (elementRef.current) observer.observe(elementRef.current);
    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, []);

  const activeDataset = tab === 'borrower' ? borrowerData : lenderData;

  const chartData = {
    labels: activeDataset.map((item) => item.label),
    datasets: [
      {
        label: tab === 'borrower' ? 'Interest rate' : 'Annual return',
        data: activeDataset.map((item) => item.rate),
        backgroundColor: activeDataset.map((item) => item.color),
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
          callback: (value: number | string) => `${value}%`,
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
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-800">IRA performance comparison</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Database Synced
                </span>
              </div>
              <p className="text-slate-400 text-xs">Live comparison benchmark fetched from platform database</p>
            </div>
          </div>
          <div className="flex gap-1.5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
            <button
              type="button"
              onClick={() => setTab('borrower')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'borrower' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              style={tab === 'borrower' ? { backgroundColor: '#2563EB' } : {}}
            >
              Borrower Rates
            </button>
            <button
              type="button"
              onClick={() => setTab('lender')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'lender' ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              style={tab === 'lender' ? { backgroundColor: '#10B981' } : {}}
            >
              Lender Returns
            </button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="h-64 sm:h-72">
          {activeDataset.length > 0 ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Loading comparison rates from database...
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          {activeDataset.map((item) => (
            <div key={item.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-bold text-slate-700 truncate">{item.label}</span>
              </div>
              <p className="text-lg font-black text-slate-900">{item.rate}%</p>
              <p className="text-[11px] text-slate-400 truncate">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
