// AdminActivity — paginated activity_log viewer across all tenants.
// Reads GET /admin/activity with optional ?company_id, ?action, ?before for
// cursor pagination.

import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Activity, Filter, Clock, ChevronDown } from 'lucide-react';
import { api } from '../../services/api';

const fmtDateTime = d => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const AdminActivity = () => {
  const [events, setEvents] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [expanded, setExpanded] = useState(null);

  const fetchPage = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminActivity({
        action: filterAction || undefined,
        company_id: filterCompanyId || undefined,
        before: opts.before || undefined,
        limit: 50,
      });
      if (opts.append) {
        setEvents(prev => [...prev, ...(data.events || [])]);
      } else {
        setEvents(data.events || []);
      }
      setNextCursor(data.next_cursor || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterAction, filterCompanyId]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const loadMore = () => {
    if (nextCursor && !loading) fetchPage({ before: nextCursor, append: true });
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Activity log</h1>
        <p className="text-gray-400 text-sm">All audit-tracked events across the platform. Newest first.</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-500" />
        <input
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          placeholder="Filter by action (e.g. emergency_downgraded)"
          className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500 w-72"
        />
        <input
          value={filterCompanyId}
          onChange={e => setFilterCompanyId(e.target.value.replace(/\D/g, ''))}
          placeholder="Tenant ID"
          className="bg-gray-900 border border-gray-700 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500 w-32"
        />
        {(filterAction || filterCompanyId) && (
          <button
            onClick={() => { setFilterAction(''); setFilterCompanyId(''); }}
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
        {loading && events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-5 h-5 animate-spin inline mr-2" />Loading…
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Activity className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            No events match the current filter.
          </div>
        ) : (
          <ul>
            {events.map(e => (
              <li key={e.id} className="border-b border-gray-800 last:border-0">
                <button
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800/40 transition-colors flex items-start gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono text-purple-300 text-xs">{e.action}</span>
                      {e.resource_type && <span className="text-xs text-gray-500">{e.resource_type}{e.resource_id ? ' #' + e.resource_id : ''}</span>}
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-400">{e.company_name || `tenant #${e.company_id}`}</span>
                      {e.user_email && <>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-400">{e.user_email}</span>
                      </>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">{fmtDateTime(e.created_at)}</div>
                </button>
                {expanded === e.id && e.metadata && (
                  <div className="px-12 pb-3">
                    <pre className="text-xs bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-300 overflow-x-auto">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {nextCursor && (
          <div className="border-t border-gray-800 p-3 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1.5 mx-auto disabled:opacity-50"
            >
              {loading ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Load more
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminActivity;
