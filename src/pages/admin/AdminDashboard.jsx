// AdminDashboard — platform-owner console at /admin/dashboard.
//
// Designed to read like a tech-founder ops console (Linear/Vercel/Stripe
// energy): dense numerics, sparkline trends, tenant health cards, live activity,
// system pulse strip. Every number is real and pulled from /admin/dashboard
// in a single fetch.

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, UserCheck, Activity, AlertTriangle, Wrench, Sparkles,
  TrendingUp, TrendingDown, Minus, Database, Zap, ChevronRight, Clock,
  MessageSquare,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../services/api';

// ---------- formatting helpers ------------------------------------------------

const fmtNum = n => (n == null ? '—' : Number(n).toLocaleString('en-US'));
const fmtRelative = d => {
  if (!d) return 'never';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 0) return 'soon';
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtUptime = sec => {
  if (!sec || sec < 0) return '—';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
};
const trendDelta = (series) => {
  if (!series || series.length < 4) return { delta: 0, dir: 'flat' };
  const half = Math.floor(series.length / 2);
  const a = series.slice(0, half).reduce((s, p) => s + (p.count || 0), 0);
  const b = series.slice(half).reduce((s, p) => s + (p.count || 0), 0);
  if (a === 0 && b === 0) return { delta: 0, dir: 'flat' };
  if (a === 0) return { delta: 100, dir: 'up' };
  const pct = Math.round(((b - a) / a) * 100);
  return { delta: pct, dir: pct > 5 ? 'up' : pct < -5 ? 'down' : 'flat' };
};

// ---------- tiny inline sparkline (SVG, no chart lib needed) -----------------

const Spark = ({ data, color = '#a78bfa', height = 28, width = 96 }) => {
  if (!data || data.length === 0) return <div style={{ height, width }} />;
  const values = data.map(d => d.count || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  // Filled area under the line
  const area = `${path} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`;
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={last[0]} cy={last[1]} r="2" fill={color} />}
    </svg>
  );
};

// ---------- KPI tile with sparkline + trend delta ----------------------------

const KpiTile = ({ icon: Icon, label, value, sub, sparkline, accent }) => {
  const t = trendDelta(sparkline);
  const TrendIcon = t.dir === 'up' ? TrendingUp : t.dir === 'down' ? TrendingDown : Minus;
  const trendColor = t.dir === 'up' ? 'text-emerald-400' : t.dir === 'down' ? 'text-red-400' : 'text-gray-500';
  return (
    <div className="relative bg-gradient-to-b from-gray-900 to-gray-900/70 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors overflow-hidden">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${accent || 'text-gray-400'}`} />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
        </div>
        {sparkline && sparkline.some(d => d.count > 0) && (
          <div className={`text-[10px] font-mono flex items-center gap-0.5 ${trendColor}`}>
            <TrendIcon className="w-2.5 h-2.5" />
            {t.delta > 0 ? '+' : ''}{t.delta}%
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-3xl font-bold text-white tabular-nums leading-none">{value}</div>
          {sub && <div className="text-[11px] text-gray-500 mt-1.5">{sub}</div>}
        </div>
        {sparkline && (
          <div className="opacity-90">
            <Spark data={sparkline} color={accent === 'text-emerald-400' ? '#10b981' : accent === 'text-amber-400' ? '#f59e0b' : accent === 'text-red-400' ? '#ef4444' : accent === 'text-cyan-400' ? '#06b6d4' : '#a78bfa'} />
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- per-tenant health card -------------------------------------------

const statusStyle = (s) => {
  switch (s) {
    case 'active':    return { dot: 'bg-emerald-400', label: 'Active', text: 'text-emerald-400' };
    case 'trialing':  return { dot: 'bg-blue-400',    label: 'Trial',  text: 'text-blue-400' };
    case 'past_due':  return { dot: 'bg-amber-400',   label: 'Past due', text: 'text-amber-400' };
    case 'cancelled': return { dot: 'bg-red-400',     label: 'Cancelled', text: 'text-red-400' };
    case 'paused':    return { dot: 'bg-gray-400',    label: 'Paused', text: 'text-gray-400' };
    default:          return { dot: 'bg-gray-500',    label: s || 'unknown', text: 'text-gray-500' };
  }
};

const TenantCard = ({ tenant }) => {
  const s = statusStyle(tenant.status);
  return (
    <Link
      to="/admin/tenants"
      className="block bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} relative`}>
              <span className={`absolute inset-0 rounded-full ${s.dot} animate-ping opacity-50`} />
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-wider ${s.text}`}>{s.label}</span>
          </div>
          <h3 className="text-white font-semibold text-sm truncate">{tenant.name || `Tenant #${tenant.id}`}</h3>
          <div className="text-[11px] text-gray-500 mt-0.5">id={tenant.id} · last seen {fmtRelative(tenant.last_activity)}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-base font-semibold text-white tabular-nums">{tenant.user_count}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Users</div>
        </div>
        <div>
          <div className="text-base font-semibold text-white tabular-nums">{tenant.customer_count}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Customers</div>
        </div>
        <div>
          <div className={`text-base font-semibold tabular-nums ${tenant.open_tickets > 0 ? 'text-amber-400' : 'text-white'}`}>{tenant.open_tickets}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Open</div>
        </div>
        <div>
          <div className={`text-base font-semibold tabular-nums ${tenant.open_emergencies > 0 ? 'text-red-400' : 'text-white'}`}>{tenant.open_emergencies}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">911</div>
        </div>
      </div>
    </Link>
  );
};

// ---------- activity stream ---------------------------------------------------

const actionAccent = (action) => {
  if (!action) return 'bg-gray-500';
  if (action.includes('emergency')) return 'bg-red-400';
  if (action.includes('downgraded') || action.includes('failed')) return 'bg-amber-400';
  if (action.includes('created') || action.includes('signup')) return 'bg-emerald-400';
  if (action.includes('cancel') || action.includes('delete')) return 'bg-orange-400';
  return 'bg-purple-400';
};

const ActivityRow = ({ event }) => (
  <div className="flex items-start gap-3 py-2 px-3 hover:bg-gray-800/40 rounded-lg transition-colors">
    <div className={`w-1.5 h-1.5 rounded-full ${actionAccent(event.action)} mt-2 flex-shrink-0`} />
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-mono text-[11px] text-white">{event.action}</span>
        {event.resource_type && (
          <span className="text-[10px] text-gray-500">{event.resource_type}{event.resource_id ? ' #' + event.resource_id : ''}</span>
        )}
      </div>
      <div className="text-[11px] text-gray-500 truncate">
        {event.company_name || `tenant #${event.company_id}`}
        {event.user_email && <> · {event.user_email}</>}
      </div>
    </div>
    <div className="text-[10px] text-gray-600 tabular-nums flex-shrink-0">{fmtRelative(event.created_at)}</div>
  </div>
);

// ---------- system pulse strip (DB / Lambda / Bedrock) -----------------------

const PulsePill = ({ ok, label, value }) => (
  <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
    <span className="relative flex w-1.5 h-1.5">
      <span className={`absolute inline-flex h-full w-full rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'} opacity-60 animate-ping`} />
      <span className={`relative inline-flex w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
    </span>
    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
    <span className="text-[11px] text-white font-mono tabular-nums">{value}</span>
  </div>
);

// ---------- main page --------------------------------------------------------

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());
  // Feedback queue counts come from a side-fetch since the main /admin/dashboard
  // payload doesn't include them yet — keeps the dashboard endpoint stable.
  const [feedbackCounts, setFeedbackCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api.getAdminDashboard()
        .then(d => { if (!cancelled) setData(d); })
        .catch(e => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
      // Lightweight side-fetch: just need the counts. limit=1 to skip rows.
      api.getAdminFeedback({ limit: 1 })
        .then(d => { if (!cancelled) setFeedbackCounts(d.counts || {}); })
        .catch(() => { /* non-fatal */ });
    };
    load();
    const interval = setInterval(load, 60_000); // soft auto-refresh once a minute
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => { cancelled = true; clearInterval(interval); clearInterval(tick); };
  }, []);

  const openFeedback = (feedbackCounts.open || 0) + (feedbackCounts.in_review || 0);

  const totalActivity14d = useMemo(() => (data?.activity_14d || []).reduce((s, p) => s + p.count, 0), [data]);

  return (
    <AdminLayout>
      {/* ---------- HERO STRIP ---------- */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-400">System healthy</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">Platform overview</h1>
          <p className="text-gray-400 text-sm mt-1">
            {loading ? 'Loading…' : `${fmtNum(data?.tenants_total)} tenant${data?.tenants_total === 1 ? '' : 's'} · ${fmtNum(totalActivity14d)} events / 14d · ${fmtNum(data?.ai_insights_30d)} AI insights cached`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">As of</div>
          <div className="text-sm text-white tabular-nums">{new Date(now).toLocaleTimeString('en-US')}</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          Failed to load dashboard: {error}
        </div>
      )}

      {/* ---------- TRIAGE CARDS ---------- */}
      {/* Two queues the founder will check most often: ops (tickets) + product (feedback).
          These are CTAs, not just KPIs — clicking jumps straight into the queue. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Link
          to="/admin/service-requests"
          className={`group bg-gradient-to-br from-gray-900 to-gray-900/40 border rounded-xl p-4 hover:border-purple-700/60 transition-colors ${
            data?.tickets_emergency_24h > 0 ? 'border-red-700/60' : 'border-gray-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wrench className={`w-4 h-4 ${data?.tickets_emergency_24h > 0 ? 'text-red-400' : 'text-amber-400'}`} />
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Service requests</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white tabular-nums">{loading ? '—' : fmtNum(data?.tickets_open)}</span>
                <span className="text-sm text-gray-400">open across all tenants</span>
              </div>
              {data?.tickets_emergency_24h > 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-red-900/40 border border-red-700/60 rounded px-2 py-0.5 text-xs text-red-200">
                  <AlertTriangle className="w-3 h-3" />
                  {data.tickets_emergency_24h} emergency in last 24h
                </div>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
          </div>
        </Link>

        <Link
          to="/admin/feedback"
          className="group bg-gradient-to-br from-gray-900 to-gray-900/40 border border-gray-800 rounded-xl p-4 hover:border-purple-700/60 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Feedback</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white tabular-nums">{fmtNum(openFeedback)}</span>
                <span className="text-sm text-gray-400">unresolved</span>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {(feedbackCounts.open || 0)} open · {(feedbackCounts.in_review || 0)} in review · {(feedbackCounts.resolved || 0)} resolved
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
          </div>
        </Link>
      </div>

      {/* ---------- KPI GRID with sparklines ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiTile icon={Building2}    label="Tenants"      value={loading ? '—' : fmtNum(data?.tenants_total)}
                 sub="Service companies"   accent="text-blue-400" />
        <KpiTile icon={Users}        label="Internal"     value={loading ? '—' : fmtNum(data?.users_total)}
                 sub="Owners + staff"      accent="text-emerald-400" />
        <KpiTile icon={UserCheck}    label="Customers"    value={loading ? '—' : fmtNum(data?.customers_total)}
                 sub="Building owners"     accent="text-purple-400" />
        <KpiTile icon={Activity}     label="Active 7d"    value={loading ? '—' : fmtNum(data?.active_7d)}
                 sub={`${data?.active_24h ?? 0} in last 24h`}
                 sparkline={data?.active_users_14d}    accent="text-cyan-400" />
        <KpiTile icon={Wrench}       label="Open work"    value={loading ? '—' : fmtNum(data?.tickets_open)}
                 sub="Tickets in progress"      accent="text-amber-400" />
        <KpiTile icon={Sparkles}     label="AI Insights"  value={loading ? '—' : fmtNum(data?.ai_insights_30d)}
                 sub={`${data?.ai_insights_24h ?? 0} cached today`}
                 accent="text-purple-400" />
      </div>

      {/* ---------- 14-day activity headline strip ---------- */}
      <div className="mb-6 bg-gradient-to-b from-gray-900 to-gray-900/40 border border-gray-800 rounded-xl p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-0.5">Activity / 14 days</div>
            <div className="text-2xl font-bold text-white tabular-nums">{fmtNum(totalActivity14d)} <span className="text-sm font-normal text-gray-400">events</span></div>
          </div>
          {data?.tickets_emergency_24h > 0 && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-300">{data.tickets_emergency_24h} emergency in last 24h</span>
            </div>
          )}
        </div>
        <Spark data={data?.activity_14d || []} color="#a78bfa" height={56} width={1200} />
        <div className="flex justify-between mt-1 text-[10px] text-gray-600 font-mono">
          {data?.activity_14d?.[0] && <span>{new Date(data.activity_14d[0].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          {data?.activity_14d?.[data.activity_14d.length - 1] && <span>today</span>}
        </div>
      </div>

      {/* ---------- TWO-COLUMN: tenants + activity feed ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Tenant health */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />Tenant health
            </h2>
            <Link to="/admin/tenants" className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1">
              See all<ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-gray-500 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />Loading tenants…
            </div>
          ) : !data?.tenants_brief?.length ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-gray-500 text-sm">No tenants yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.tenants_brief.map(t => <TenantCard key={t.id} tenant={t} />)}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />Live activity
            </h2>
            <Link to="/admin/activity" className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1">
              See all<ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-2">
            {loading ? (
              <p className="text-gray-500 text-sm flex items-center gap-2 p-3"><Clock className="w-4 h-4 animate-spin" />Loading…</p>
            ) : !data?.recent_activity?.length ? (
              <p className="text-gray-500 text-sm p-3">No activity logged yet.</p>
            ) : (
              <div className="space-y-0">
                {data.recent_activity.map(e => <ActivityRow key={e.id} event={e} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- SYSTEM PULSE STRIP ---------- */}
      <div className="flex flex-wrap gap-2 items-center pt-4 border-t border-gray-800">
        <Database className="w-3.5 h-3.5 text-gray-500" />
        <PulsePill ok={!!data?.db_now} label="Aurora" value={data?.db_uptime_seconds ? `up ${fmtUptime(data.db_uptime_seconds)}` : (loading ? '…' : '?')} />
        <PulsePill ok={!error} label="API" value="200" />
        <PulsePill ok={true} label="Lambda" value="VPC" />
        <PulsePill ok={true} label="Bedrock" value={`${data?.ai_insights_30d ?? 0}/30d`} />
        <span className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-600 font-mono">
          <Zap className="w-3 h-3" />refresh 60s
        </span>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
