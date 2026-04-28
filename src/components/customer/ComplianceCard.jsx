// ComplianceCard — Compliance Health Score (B1) + Certification Cliff Chart (B2).
// See docs/CUSTOMER_PORTAL_FEATURES.md.
//
// Renders three sub-sections:
//   1. Fleet hero gauge — single large score card with TX-comparison message.
//   2. Per-elevator cards — one mini-card per elevator with score + expandable
//      component breakdown.
//   3. Cert-cliff chart — 12-month outlook combining the customer's upcoming
//      inspections (bars, primary axis) with the TX-wide expiration distribution
//      (line, secondary axis as percent).
//
// Self-fetches via api.getCompliance() so it can drop into any page.

import React, { useEffect, useState } from 'react';
import { Shield, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../../services/api';

const scoreColor = s => s >= 90 ? 'text-emerald-400' : s >= 75 ? 'text-blue-400' : s >= 60 ? 'text-amber-400' : s >= 40 ? 'text-orange-400' : 'text-red-400';
const scoreBg    = s => s >= 90 ? 'bg-emerald-900/20 border-emerald-700/40' : s >= 75 ? 'bg-blue-900/20 border-blue-700/40' : s >= 60 ? 'bg-amber-900/20 border-amber-700/40' : s >= 40 ? 'bg-orange-900/20 border-orange-700/40' : 'bg-red-900/20 border-red-700/40';
const scoreRing  = s => s >= 90 ? 'stroke-emerald-400' : s >= 75 ? 'stroke-blue-400' : s >= 60 ? 'stroke-amber-400' : s >= 40 ? 'stroke-orange-400' : 'stroke-red-400';

// Inline circular gauge for the fleet score. Pure SVG, no external chart lib.
const FleetGauge = ({ score, label }) => {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <svg viewBox="0 0 140 140" className="w-32 h-32">
      <circle cx="70" cy="70" r={radius} className="fill-none stroke-gray-700" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={radius}
        className={`fill-none ${scoreRing(score)}`}
        strokeWidth="10"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
      />
      <text x="70" y="68" textAnchor="middle" className={`fill-current ${scoreColor(score)} text-3xl font-bold`} style={{ fontSize: '28px' }}>{score}</text>
      <text x="70" y="92" textAnchor="middle" className="fill-current text-gray-400" style={{ fontSize: '11px' }}>{label}</text>
    </svg>
  );
};

const ElevatorScoreCard = ({ elevator }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border p-4 ${scoreBg(elevator.score)} transition-all`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">{elevator.identifier || `Elevator #${elevator.id}`}</p>
          <p className="text-gray-400 text-xs truncate">
            {[elevator.manufacturer, elevator.model].filter(Boolean).join(' ') || 'No manufacturer on record'}
          </p>
        </div>
        <div className={`text-2xl font-bold ${scoreColor(elevator.score)} flex-shrink-0`}>{elevator.score}</div>
      </div>
      <p className={`text-xs mb-3 ${scoreColor(elevator.score)}`}>{elevator.label}</p>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? 'Hide breakdown' : 'See breakdown'}
      </button>
      {open && (
        <div className="mt-3 space-y-2 pt-3 border-t border-gray-700/50">
          {elevator.components.map((c) => {
            const pct = Math.round((c.score / c.max) * 100);
            return (
              <div key={c.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-300">{c.name}</span>
                  <span className="text-gray-400 font-mono">{c.score}/{c.max}</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${scoreRing(pct).replace('stroke-', 'bg-')}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-gray-500 text-xs mt-1">{c.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CertCliffChart = ({ cliff }) => {
  if (!cliff || cliff.length === 0) return null;
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-blue-400" />
        <h3 className="text-white text-sm font-semibold">Certification cliff — next 12 months</h3>
      </div>
      <p className="text-gray-400 text-xs mb-4">
        Your upcoming elevator inspections (bars) plotted against the share of all Texas elevators with certs expiring each month (line).
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cliff} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#4b5563" />
            <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#4b5563" allowDecimals={false} label={{ value: 'Your elevators', angle: -90, position: 'insideLeft', fill: '#9ca3af', style: { textAnchor: 'middle', fontSize: 11 } }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#4b5563" tickFormatter={(v) => `${v}%`} label={{ value: 'TX %', angle: 90, position: 'insideRight', fill: '#9ca3af', style: { textAnchor: 'middle', fontSize: 11 } }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e5e7eb' }}
              labelStyle={{ color: '#9ca3af' }}
              formatter={(value, name) => name === 'TX %' ? [`${value}%`, name] : [value, name]}
            />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="your_count" name="Your inspections due" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="tx_pct" name="TX %" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ComplianceCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getCompliance()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex items-center gap-3 text-gray-400">
        <Clock className="w-5 h-5 animate-spin" />
        <span>Calculating compliance score…</span>
      </div>
    );
  }

  // Quietly hide on error rather than show a scary banner — this is a value-add
  // widget, not a critical workflow. Other dashboard sections still work.
  if (error || !data) return null;

  const { fleet, elevators, tx_benchmark, cert_cliff } = data;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-blue-400" />
        <h2 className="text-white text-lg font-semibold">Compliance health</h2>
      </div>

      {/* Hero: fleet gauge + benchmark message */}
      <div className={`rounded-xl border p-6 mb-4 ${scoreBg(fleet.score)}`}>
        <div className="flex items-center gap-6 flex-wrap">
          <FleetGauge score={fleet.score} label={fleet.label} />
          <div className="flex-1 min-w-[240px]">
            <p className="text-white text-xl font-semibold mb-1">{fleet.label}</p>
            <p className="text-gray-300 text-sm mb-3">
              {fleet.elevator_count === 0
                ? 'No elevators on record yet.'
                : `Your fleet of ${fleet.elevator_count} elevator${fleet.elevator_count > 1 ? 's' : ''} scores ${fleet.score}/100 across compliance, inspection currency, equipment age, and operational health.`}
            </p>
            {tx_benchmark && tx_benchmark.elevator_count > 0 && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Texas baseline
                  </div>
                  <p className="text-white font-semibold">
                    {tx_benchmark.expired_pct}% expired
                  </p>
                  <p className="text-gray-500">across {tx_benchmark.elevator_count.toLocaleString()} TX elevators</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Expiring within 30 days
                  </div>
                  <p className="text-white font-semibold">{tx_benchmark.expiring_30_pct}% statewide</p>
                  <p className="text-gray-500">your fleet: {tx_benchmark.your_expiring_30}/{tx_benchmark.your_total}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-elevator score grid */}
      {elevators && elevators.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {elevators.map(e => <ElevatorScoreCard key={e.id} elevator={e} />)}
        </div>
      )}

      {/* Cert cliff timeline */}
      <CertCliffChart cliff={cert_cliff} />
    </section>
  );
};

export default ComplianceCard;
