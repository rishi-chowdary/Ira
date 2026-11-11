import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { InterestSlab } from '../types';

interface Props {
  principal?: number;
}

export default function InterestTable({ principal = 2000 }: Props) {
  const [slabs, setSlabs] = useState<InterestSlab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getInterestSlabs()
      .then((data) => {
        if (isMounted) {
          setSlabs(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <span>⏱️ Time-Based Interest</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live DB Synced
            </span>
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Interest fetched dynamically from database schema (interest_rate_table)
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3">Repayment Window</th>
              <th className="text-center px-4 py-3">Rate</th>
              <th className="text-center px-4 py-3">On ₹{principal.toLocaleString()}</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && slabs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-xs text-slate-400">
                  Loading interest rate brackets from database...
                </td>
              </tr>
            ) : (
              slabs.map((slab) => {
                const interest = Math.round((principal * slab.rate) / 100);
                return (
                  <tr key={slab.id || slab.window_label} className={`${slab.row_class} transition-all hover:opacity-90`}>
                    <td className="px-5 py-3.5 font-semibold text-slate-700 text-sm">{slab.window_label}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">{slab.rate}%</td>
                    <td className="px-4 py-3.5 text-center">
                      {interest === 0 ? (
                        <span className="font-bold text-emerald-600">₹0 🎉</span>
                      ) : (
                        <span className="font-bold text-slate-800">₹{interest}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs font-semibold">{slab.badge}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 flex items-start gap-2">
        <span>⚠️</span>
        <span>
          After 30 days: <strong>0.05% daily penalty</strong> added on top of 12% base rate. Capped at 50% of principal.
        </span>
      </div>
    </div>
  );
}
