// AdminTenants — table of every service-company tenant with rolled-up stats.
// Reads GET /admin/tenants.

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Building2, Users, UserCheck, Wrench, Clock } from 'lucide-react';
import { api } from '../../services/api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtRelative = d => {
  if (!d) return 'never';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
};

const AdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.getAdminTenants()
      .then(d => { if (!cancelled) setTenants(d.tenants || []); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Tenants</h1>
          <p className="text-gray-400 text-sm">Every service company on the platform.</p>
        </div>
        <div className="text-sm text-gray-400">
          {loading ? '—' : `${tenants.length} tenant${tenants.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
          Failed to load tenants: {error}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 border-b border-gray-800">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Company</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Owner</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Users</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Customers</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Open tickets</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Last activity</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  <Clock className="w-4 h-4 animate-spin inline mr-2" />Loading tenants…
                </td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <Building2 className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  No tenants yet.
                </td></tr>
              ) : tenants.map(t => (
                <tr key={t.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{t.name || `Tenant #${t.id}`}</div>
                    <div className="text-xs text-gray-500">id={t.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{t.owner_email || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-right text-gray-200 tabular-nums">
                    <Users className="w-3 h-3 text-gray-500 inline mr-1" />{t.user_count}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-200 tabular-nums">
                    <UserCheck className="w-3 h-3 text-gray-500 inline mr-1" />{t.customer_count}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-200 tabular-nums">
                    <Wrench className="w-3 h-3 text-gray-500 inline mr-1" />{t.open_tickets}
                  </td>
                  <td className="px-4 py-3 text-gray-300" title={t.last_activity || ''}>
                    {fmtRelative(t.last_activity)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTenants;
