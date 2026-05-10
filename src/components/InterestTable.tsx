interface Props {
  principal?: number;
}

const slabs = [
  { window: 'Within 24 hours', rate: 0, rowClass: 'interest-row-green', badge: '🟢 Free!' },
  { window: '2–3 days', rate: 3, rowClass: 'interest-row-blue', badge: '🔵 Low' },
  { window: '4–7 days', rate: 5, rowClass: 'interest-row-blue', badge: '🔵 Low' },
  { window: '8–14 days', rate: 7, rowClass: 'interest-row-blue', badge: '🔵 Moderate' },
  { window: '15–21 days', rate: 9, rowClass: 'interest-row-blue-red', badge: '🟣 Medium' },
  { window: '22–30 days', rate: 12, rowClass: 'interest-row-red', badge: '🔴 High' },
];

export default function InterestTable({ principal = 2000 }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-50">
        <h3 className="font-bold text-slate-800 text-lg">⏱️ Time-Based Interest</h3>
        <p className="text-sm text-slate-500 mt-0.5">Interest depends on when you repay — repay faster, pay less!</p>
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
            {slabs.map((slab) => {
              const interest = Math.round((principal * slab.rate) / 100);
              return (
                <tr key={slab.window} className={`${slab.rowClass} transition-all hover:opacity-90`}>
                  <td className="px-5 py-3.5 font-semibold text-slate-700 text-sm">{slab.window}</td>
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
            })}
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
