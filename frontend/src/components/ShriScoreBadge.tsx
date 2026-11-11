import { Award, CheckCircle2, HelpCircle, Sparkles, TrendingUp } from 'lucide-react';
import { useState } from 'react';

function getTier(score: number) {
  if (score >= 900)
    return {
      name: 'Prime',
      multiplier: '0.80x',
      discount: '20% Interest Discount',
      color: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      nextTier: null,
      needed: 0,
    };
  if (score >= 750)
    return {
      name: 'Trusted',
      multiplier: '0.85x',
      discount: '15% Interest Discount',
      color: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
      nextTier: 'Prime',
      needed: 900 - score,
    };
  if (score >= 600)
    return {
      name: 'Steady',
      multiplier: '0.92x',
      discount: '8% Interest Discount',
      color: 'from-indigo-500 to-purple-600',
      badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      nextTier: 'Trusted',
      needed: 750 - score,
    };
  if (score >= 400)
    return {
      name: 'Rising',
      multiplier: '1.00x',
      discount: 'Standard Base Rate',
      color: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      nextTier: 'Steady',
      needed: 600 - score,
    };
  return {
    name: 'Starter',
    multiplier: '1.15x',
    discount: '+15% Risk Buffer',
    color: 'from-slate-500 to-slate-700',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    nextTier: 'Rising',
    needed: 400 - score,
  };
}

export default function ShriScoreBadge({ score }: { score: number }) {
  const tier = getTier(score);
  const [showTooltip, setShowTooltip] = useState(false);

  // Normalize score between 300 and 950 for meter percentage
  const percentage = Math.min(100, Math.max(10, ((score - 300) / (950 - 300)) * 100));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-900 leading-tight">Shri Score</h2>
              <button
                type="button"
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-slate-400 hover:text-slate-600"
                title="What is Shri Score?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">Campus credit reputation</p>
          </div>
        </div>

        <span
          className={`px-3 py-1 text-xs font-bold rounded-xl border flex items-center gap-1 ${tier.badgeBg}`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>{tier.name} Tier</span>
        </span>
      </div>

      {showTooltip && (
        <div className="mb-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
          <strong>Shri Score (300-950)</strong> reflects your on-time repayment history, college endorsement, and peer guarantor network. Higher scores unlock lower interest rates and faster automated loan matching.
        </div>
      )}

      {/* Score and Multiplier Display */}
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <div className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1.5">
            <span>{score}</span>
            <span className="text-xs font-semibold text-slate-400">/ 950</span>
          </div>
          <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{tier.discount}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-400 block">Rate Multiplier</span>
          <span className="text-sm font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg inline-block">
            {tier.multiplier}
          </span>
        </div>
      </div>

      {/* Visual Score Meter */}
      <div className="space-y-1">
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${tier.color} transition-all duration-500 rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
          <span>300 (Starter)</span>
          {tier.nextTier ? (
            <span className="text-indigo-600 font-semibold">
              +{tier.needed} pts to {tier.nextTier}
            </span>
          ) : (
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> Max Tier Achieved
            </span>
          )}
          <span>950 (Prime)</span>
        </div>
      </div>
    </div>
  );
}
