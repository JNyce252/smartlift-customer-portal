// AdminDashboard — platform-owner view at /admin/dashboard.
// KPI cards driven by GET /admin/dashboard, plus a recent-activity preview.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, UserCheck, Activity, AlertTriangle, Wrench, ChevronRight, Clock } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api } from '../../services/api';

const fmtDate = d => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const KPI = ({ icon: Icon, label, value, sub, color }) => (
  <div className={`rounded-xl border p-5 ${color}`}>
    <div className="flex items-center justify-between mb-3">
      <p className="text-gray-400 text-sm">{label}</p>
      <Icon className="w-4 h-4 text-gray-300" />
    </div>
    <p className="text-3xl font-bold mb-0.5 text-white">{value}</p>
    {sub && <p className="text-gray-500 text-xs">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getAdminDashboard()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Platform overview</h1>
        <p className="text-gray-400 text-sm">Top-level health across every Smarterlift tenant.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          Failed to load dashboard: {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KPI icon={Building2} label="Tenants"           value={loading ? '—' : data?.tenants_total ?? 0}
             sub="Service companies"   color="bg-blue-900/15 border-blue-700/30" />
        <KPI icon={Users}      label="Internal users"   value={loading ? '—' : data?.users_total ?? 0}
             sub="Owners + staff"      color="bg-emerald-900/15 border-emerald-700/30" />
        <KPI icon={UserCheck}  label="Customers"         value={loading ? '—' : data?.customers_total ?? 0}
             sub="Building owners"     color="bg-purple-900/15 border-purple-700/30" />
        <KPI icon={Activity}   label="Active in 24h"     value={loading ? '—' : data?.active_24h ?? 0}
             sub={`${data?.active_7d ?? 0} in last 7 days`}
             color="bg-amber-900/15 border-amber-700/30" />
        <KPI icon={Wrench}     label="Open tickets"      value={loading ? '—' : data?.tickets_open ?? 0}
             sub="Across all tenants"  color="bg-cyan-900/15 border-cyan-700/30" />
        <KPI icon={AlertTriangle} label="Emergencies 24h" value={loading ? '—' : data?.tickets_emergency_24h ?? 0}
             sub="Customer-submitted"  color="bg-red-900/15 border-red-700/30" />
      </div>

      {/* Recent activity preview */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent activity</h2>
          <Link to="/admin/activity" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
            See all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <p className="text-gray-500 text-sm flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" />Loading…</p>
        ) : !data?.recent_activity?.length ? (
          <p className="text-gray-500 text-sm">No activity logged yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recent_activity.map(e => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    <span className="font-mono text-gray-400 text-xs mr-2">{e.action}</span>
                    {e.resource_type && <span className="text-gray-500 text-xs mr-2">{e.resource_type}{e.resource_id ? ' #' + e.resource_id : ''}</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {e.company_name || `Tenant #${e.company_id}`}
                    {e.user_email && ` • ${e.user_email}`}
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">{fmtDate(e.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
