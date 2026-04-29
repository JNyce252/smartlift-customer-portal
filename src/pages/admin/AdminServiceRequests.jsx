// AdminServiceRequests — cross-tenant service ticket queue.
// Reads GET /admin/service-requests with optional ?status, ?priority, ?company_id.
// Default view = open + in_progress. Sorted emergency-first.
//
// This is the platform's ops pulse: every active ticket on every tenant in one view.
// Links to the tenant detail page eventually; for now it's a flat queue with filters.

import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Wrench, AlertTriangle, Clock, Filter, ChevronDown, Building2, User } from 'lucide-react';
import { api } from '../../services/api';

const fmtDateTime = d => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const fmtAge = d => {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
};

// Priority pill colors map to severity. Emergency stays red across the board
// because that's the single most important signal on this page.
const priorityStyle = (p) => {
  switch ((p || '').toLowerCase()) {
    case 'emergency': return 'bg-red-900/40 text-red-200 border-red-700/50';
    case 'high':      return 'bg-orange-900/40 text-orange-200 border-orange-700/50';
    case 'medium':    return 'bg-yellow-900/30 text-yellow-200 border-yellow-700/40';
    default:          return 'bg-gray-800 text-gray-300 border-gray-700';
  }
};
const statusStyle = (s) => {
  switch ((s || '').toLowerCase()) {
    case 'open':        return 'bg-blue-900/40 text-blue-200';
    case 'in_progress': return 'bg-purple-900/40 text-purple-200';
    case 'scheduled':   return 'bg-cyan-900/40 text-cyan-200';
    case 'resolved':    return 'bg-emerald-900/40 text-emerald-200';
    default:            return 'bg-gray-800 text-gray-300';
  }
};

const AdminServiceRequests = () => {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('open,in_progress');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [companyIdFilter, setCompanyIdFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminServiceRequests({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        company_id: companyIdFilter || undefined,
        limit: 200,
      });
      setItems(data.items || []);
      setCounts(data.counts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, companyIdFilter]);

  useEffect(() => { load(); }, [load]);

  // Header counts: total open vs in_progress vs emergency-flagged.
  const totalOpen     = counts.filter(c => c.status === 'open').reduce((a,b) => a + b.n, 0);
  const totalInProg   = counts.filter(c => c.status === 'in_progress').reduce((a,b) => a + b.n, 0);
  const totalEmerg    = counts.filter(c => c.priority === 'emergency').reduce((a,b) => a + b.n, 0);

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-purple-400" />
            Service requests
          </h1>
          <p className="text-gray-400 text-sm">Every active ticket across every tenant. Emergencies first.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <span className="text-gray-500 mr-2">Open</span>
            <span className="text-white font-semibold">{totalOpen}</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
            <span className="text-gray-500 mr-2">In progress</span>
            <span className="text-white font-semibold">{totalInProg}</span>
          </div>
          <div className={`bg-gray-900 border rounded-lg px-3 py-1.5 ${totalEmerg > 0 ? 'border-red-700/60' : 'border-gray-800'}`}>
            <span className="text-gray-500 mr-2 flex items-center gap-1 inline-flex">
              <AlertTriangle className={`w-3.5 h-3.5 ${totalEmerg > 0 ? 'text-red-400' : 'text-gray-600'}`} />
              Emergency
            </span>
            <span className={`font-semibold ml-1 ${totalEmerg > 0 ? 'text-red-300' : 'text-white'}`}>{totalEmerg}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="open,in_progress">Active queue</option>
          <option value="open">Open only</option>
          <option value="in_progress">In progress only</option>
          <option value="scheduled">Scheduled</option>
          <option value="resolved">Resolved</option>
          <option value="">All statuses</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="">All priorities</option>
          <option value="emergency">Emergency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          value={companyIdFilter}
          onChange={e => setCompanyIdFilter(e.target.value.replace(/\D/g, ''))}
          placeholder="Tenant ID"
          className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500 w-32"
        />
        {(priorityFilter || companyIdFilter || statusFilter !== 'open,in_progress') && (
          <button
            onClick={() => { setPriorityFilter(''); setCompanyIdFilter(''); setStatusFilter('open,in_progress'); }}
            className="text-xs text-gray-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-xl p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-5 h-5 animate-spin inline mr-2" />Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Wrench className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            No tickets match the current filter.
          </div>
        ) : (
          <ul>
            {items.map(t => (
              <li key={t.id} className="border-b border-gray-800 last:border-0">
                <button
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded border font-mono ${priorityStyle(t.priority)}`}>
                          {t.priority || '—'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusStyle(t.status)}`}>
                          {t.status || '—'}
                        </span>
                        {t.ticket_number && (
                          <span className="font-mono text-xs text-gray-500">#{t.ticket_number}</span>
                        )}
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-400">{fmtAge(t.created_at)}</span>
                      </div>
                      <div className="text-sm text-white font-medium truncate">{t.title || '(no title)'}</div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{t.company_name || `tenant #${t.company_id}`}
                        </span>
                        {t.customer_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />{t.customer_name}
                          </span>
                        )}
                        {t.elevator_identifier && (
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" />{t.elevator_identifier}
                          </span>
                        )}
                        {t.assigned_technician && (
                          <span className="text-gray-400">→ {t.assigned_technician}</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${expanded === t.id ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expanded === t.id && (
                  <div className="px-12 pb-4 text-sm">
                    <div className="text-gray-300 whitespace-pre-wrap mb-3">{t.description || '(no description)'}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
                      <div><span className="text-gray-600">Created:</span><br/>{fmtDateTime(t.created_at)}</div>
                      <div><span className="text-gray-600">Updated:</span><br/>{fmtDateTime(t.updated_at)}</div>
                      {t.scheduled_date && <div><span className="text-gray-600">Scheduled:</span><br/>{fmtDateTime(t.scheduled_date)}</div>}
                      {t.reported_by && <div><span className="text-gray-600">Reported by:</span><br/>{t.reported_by}</div>}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminServiceRequests;
