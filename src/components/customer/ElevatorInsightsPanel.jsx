// ElevatorInsightsPanel — A1 (Hidden Defect Cohort Predictions).
// See docs/CUSTOMER_PORTAL_FEATURES.md.
//
// Fetches /me/elevator/:id/insights on mount. The endpoint:
//   1. Builds a cohort of similar TX elevators from the TDLR registry (148k rows).
//   2. Computes cohort statistics (cert expiry, inspection currency, age).
//   3. Calls Claude Sonnet 4.5 with cohort context.
//   4. Returns structured insights, cached server-side for 30 days.
//
// First load on a fresh elevator takes ~10s while Bedrock generates the narrative.
// Subsequent loads are instant (cache hit). This component handles both paths
// with appropriate loading/skeleton states.

import React, { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, TrendingUp, Wrench, ShieldCheck, Clock, Info } from 'lucide-react';
import { api } from '../../services/api';

const priorityStyle = (p) => {
  const k = (p || '').toLowerCase();
  if (k === 'high')   return { bg: 'bg-red-900/20 border-red-700/30',     text: 'text-red-400',    label: 'High' };
  if (k === 'medium') return { bg: 'bg-amber-900/20 border-amber-700/30', text: 'text-amber-400',  label: 'Medium' };
  return                     { bg: 'bg-blue-900/20 border-blue-700/30',   text: 'text-blue-400',   label: 'Low' };
};

const SkeletonRow = () => (
  <div className="animate-pulse">
    <div className="h-3 bg-gray-700/50 rounded mb-2 w-1/3" />
    <div className="h-3 bg-gray-700/50 rounded mb-2 w-full" />
    <div className="h-3 bg-gray-700/50 rounded w-2/3" />
  </div>
);

const ElevatorInsightsPanel = ({ elevatorId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getElevatorInsights(elevatorId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [elevatorId]);

  // Container styling matches the surrounding expanded-card visual language.
  const Wrap = ({ children }) => (
    <div className="bg-gradient-to-br from-purple-900/15 to-blue-900/10 border border-purple-700/30 rounded-xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h4 className="text-white text-sm font-semibold">AI Insights</h4>
        <span className="text-xs text-gray-500">— grounded in 148k TX elevators</span>
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <Wrap>
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
          <Clock className="w-4 h-4 animate-spin" />
          Analyzing your elevator's peer cohort and generating insights…
        </div>
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </Wrap>
    );
  }

  // Soft-fail — insights are an enhancement, not a critical path.
  if (error) return null;
  if (!data) return null;

  // Server returned a soft-decline (insufficient data, missing fields, etc.).
  if (!data.ai_narrative) {
    return (
      <Wrap>
        <div className="flex items-start gap-2 text-gray-400 text-xs">
          <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <p>{data.message || 'Not enough peer data available for predictive insights yet.'}</p>
        </div>
      </Wrap>
    );
  }

  const n = data.ai_narrative;
  const c = data.cohort;
  const stats = c?.stats;

  return (
    <Wrap>
      {/* Cohort header — context for everything below. */}
      {c && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
          <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
          <span>
            Compared against <span className="text-white font-semibold">{c.size}</span> similar passenger elevators in Texas
            {c.filters?.year_range && ` installed ${c.filters.year_range[0]}–${c.filters.year_range[1]}`}
            {c.filters?.floors_range && `, ${c.filters.floors_range[0]}–${c.filters.floors_range[1]} floors`}
          </span>
        </div>
      )}

      {/* Executive summary */}
      {n.executive_summary && (
        <p className="text-gray-200 text-sm leading-relaxed mb-4 bg-black/20 rounded-lg p-3 border border-purple-700/20">
          {n.executive_summary}
        </p>
      )}

      {/* Cohort stat trio */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2.5">
            <p className="text-gray-500 mb-0.5">Cohort expired</p>
            <p className="text-white font-semibold">{stats.expired_pct}%</p>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2.5">
            <p className="text-gray-500 mb-0.5">Expiring 90d</p>
            <p className="text-white font-semibold">{stats.expiring_90_pct}%</p>
          </div>
          <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2.5">
            <p className="text-gray-500 mb-0.5">Cohort avg age</p>
            <p className="text-white font-semibold">{stats.avg_age_years} yrs</p>
          </div>
        </div>
      )}

      {/* Watch areas */}
      {Array.isArray(n.watch_areas) && n.watch_areas.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-white text-xs font-semibold uppercase tracking-wide">Watch areas</p>
          </div>
          <div className="space-y-2">
            {n.watch_areas.map((w, i) => {
              const ps = priorityStyle(w.priority);
              return (
                <div key={i} className={`rounded-lg p-3 border ${ps.bg}`}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-white text-sm font-semibold">{w.system}</p>
                    <span className={`text-xs font-medium ${ps.text} flex-shrink-0`}>{ps.label}</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">{w.rationale}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modernization recommendation */}
      {n.modernization_recommendation && (
        <div className="bg-black/20 border border-purple-700/20 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Wrench className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-white text-xs font-semibold uppercase tracking-wide">Modernization</p>
            <span className={`text-xs font-medium ${n.modernization_recommendation.should_consider ? 'text-amber-400' : 'text-emerald-400'}`}>
              {n.modernization_recommendation.should_consider ? 'Consider' : 'Not yet'}
            </span>
          </div>
          <p className="text-gray-300 text-xs leading-relaxed mb-1.5">
            {n.modernization_recommendation.rationale}
          </p>
          {n.modernization_recommendation.estimated_payback_years != null && (
            <p className="text-gray-500 text-xs">
              Estimated payback: ~{n.modernization_recommendation.estimated_payback_years} years
            </p>
          )}
        </div>
      )}

      {/* Cohort context closing line */}
      {n.cohort_context && (
        <div className="flex items-start gap-2 text-xs text-gray-400 pt-3 border-t border-purple-700/20">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
          <p>{n.cohort_context}</p>
        </div>
      )}

      {/* Provenance */}
      <p className="text-gray-600 text-xs mt-3">
        {data.cached
          ? `Cached insight, generated ${data.generated_at ? new Date(data.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}.`
          : 'Generated just now from live cohort data.'}
      </p>
    </Wrap>
  );
};

export default ElevatorInsightsPanel;
