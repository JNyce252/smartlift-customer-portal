// AdminFeedback — platform feedback queue (feature requests, bugs, questions, general).
// Reads GET /admin/feedback and PATCH /admin/feedback/:id.
//
// Three-column layout: status tabs on top, list on the left, detail+actions on the right.
// Click any item to open it; status/priority/notes update inline and persist on blur.

import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  MessageSquare, Lightbulb, AlertTriangle, HelpCircle, Inbox,
  Clock, Building2, User, Save, Check
} from 'lucide-react';
import { api } from '../../services/api';

const fmtDateTime = d => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const TYPE_META = {
  feature_request: { label: 'Feature',     icon: Lightbulb,      color: 'text-purple-300', bg: 'bg-purple-900/30' },
  system_issue:    { label: 'Bug',         icon: AlertTriangle,  color: 'text-red-300',    bg: 'bg-red-900/30' },
  feedback:        { label: 'Feedback',    icon: MessageSquare,  color: 'text-blue-300',   bg: 'bg-blue-900/30' },
  question:        { label: 'Question',    icon: HelpCircle,     color: 'text-cyan-300',   bg: 'bg-cyan-900/30' },
};

const STATUS_TABS = [
  { value: 'open,in_review', label: 'Active' },     // default — both open + in_review
  { value: 'open',           label: 'Open' },
  { value: 'in_review',      label: 'In review' },
  { value: 'resolved',       label: 'Resolved' },
  { value: 'wont_fix',       label: 'Won\'t fix' },
  { value: 'duplicate',      label: 'Duplicate' },
];

const priorityStyle = (p) => {
  switch ((p || '').toLowerCase()) {
    case 'urgent': return 'bg-red-900/40 text-red-200 border-red-700/50';
    case 'high':   return 'bg-orange-900/40 text-orange-200 border-orange-700/50';
    case 'medium': return 'bg-yellow-900/30 text-yellow-200 border-yellow-700/40';
    default:       return 'bg-gray-800 text-gray-300 border-gray-700';
  }
};

const AdminFeedback = () => {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('open,in_review');
  const [selectedId, setSelectedId] = useState(null);
  // Local edit buffer for the detail pane — flushed via patch on Save.
  const [draft, setDraft] = useState({ status: '', priority: '', admin_notes: '' });
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The default endpoint behavior already returns open+in_review when no
      // status param. For "open,in_review" we explicitly skip status to use that
      // default. For the explicit single-status tabs we forward the value.
      const params = (tab === 'open,in_review') ? {} : { status: tab };
      const data = await api.getAdminFeedback({ ...params, limit: 200 });
      setItems(data.items || []);
      setCounts(data.counts || {});
      // Auto-select the first item when the tab changes — fast triage.
      if (data.items && data.items.length && !data.items.some(i => i.id === selectedId)) {
        setSelectedId(data.items[0].id);
      } else if (!data.items?.length) {
        setSelectedId(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  // Sync draft buffer whenever the selected item changes.
  useEffect(() => {
    const sel = items.find(i => i.id === selectedId);
    if (sel) {
      setDraft({ status: sel.status || 'open', priority: sel.priority || 'medium', admin_notes: sel.admin_notes || '' });
      setSavedOk(false);
    }
  }, [selectedId, items]);

  const selected = items.find(i => i.id === selectedId);

  // Patch on demand — user clicks Save, we PATCH, then re-load the list so
  // counts + ordering update.
  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await api.patchAdminFeedback(selected.id, draft);
      setSavedOk(true);
      // If the new status moves it out of the current tab, the next load will
      // drop it from the list. Either way, reload to refresh counts.
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      // Clear the success indicator after 2s.
      setTimeout(() => setSavedOk(false), 2000);
    }
  };

  const totalActive = (counts.open || 0) + (counts.in_review || 0);

  return (
    <AdminLayout>
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            Feedback queue
          </h1>
          <p className="text-gray-400 text-sm">
            Feature requests, bug reports, questions, and feedback from every user across every tenant.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm">
          <span className="text-gray-500 mr-2">Active</span>
          <span className="text-white font-semibold">{totalActive}</span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-800">
        {STATUS_TABS.map(t => {
          const tabCount = t.value === 'open,in_review'
            ? (counts.open || 0) + (counts.in_review || 0)
            : (counts[t.value] || 0);
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 -mb-px ${
                active ? 'text-purple-300 border-purple-500' : 'text-gray-500 hover:text-white border-transparent'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded ${active ? 'bg-purple-900/50 text-purple-200' : 'bg-gray-800 text-gray-500'}`}>
                {tabCount}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/40 rounded-xl p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Two-column: list (left) + detail (right). Stacks on mobile. */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-5 h-5 animate-spin inline mr-2" />Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Inbox className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              Nothing here.
            </div>
          ) : (
            <ul>
              {items.map(it => {
                const meta = TYPE_META[it.type] || TYPE_META.feedback;
                const Icon = meta.icon;
                const isActive = it.id === selectedId;
                return (
                  <li key={it.id} className="border-b border-gray-800 last:border-0">
                    <button
                      onClick={() => setSelectedId(it.id)}
                      className={`w-full text-left px-3 py-3 transition-colors flex items-start gap-3 ${
                        isActive ? 'bg-purple-900/15 border-l-2 border-purple-500' : 'hover:bg-gray-800/40'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{it.subject}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${priorityStyle(it.priority)}`}>
                            {it.priority}
                          </span>
                          <span className="text-gray-600">·</span>
                          <span>{fmtDateTime(it.created_at)}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5 truncate">
                          {it.user_email || 'unknown'} · {it.company_name || (it.company_id ? `tenant #${it.company_id}` : 'platform')}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-5 min-h-[40vh]">
          {!selected ? (
            <div className="text-center text-gray-500 py-12">
              <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              Select an item from the list.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                    <span className="font-mono">#{selected.id}</span>
                    <span>·</span>
                    <span>{(TYPE_META[selected.type] || TYPE_META.feedback).label}</span>
                    <span>·</span>
                    <span>{fmtDateTime(selected.created_at)}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-white">{selected.subject}</h2>
                  <div className="text-xs text-gray-400 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />{selected.user_email || 'unknown'}
                    </span>
                    {selected.user_role && (
                      <span className="text-gray-500">({selected.user_role})</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />{selected.company_name || (selected.company_id ? `tenant #${selected.company_id}` : 'platform-level')}
                    </span>
                    {selected.page_url && (
                      <a href={selected.page_url} target="_blank" rel="noopener noreferrer"
                         className="text-purple-400 hover:text-purple-300 truncate max-w-[200px]" title={selected.page_url}>
                        {selected.page_url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap mb-5">
                {selected.body}
              </div>

              {/* Action panel */}
              <div className="border-t border-gray-800 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <label className="text-xs text-gray-400">
                    Status
                    <select
                      value={draft.status}
                      onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                      className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-2.5 py-1.5 rounded focus:outline-none focus:border-purple-500"
                    >
                      <option value="open">Open</option>
                      <option value="in_review">In review</option>
                      <option value="resolved">Resolved</option>
                      <option value="wont_fix">Won't fix</option>
                      <option value="duplicate">Duplicate</option>
                    </select>
                  </label>
                  <label className="text-xs text-gray-400">
                    Priority
                    <select
                      value={draft.priority}
                      onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}
                      className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-2.5 py-1.5 rounded focus:outline-none focus:border-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                </div>

                <label className="text-xs text-gray-400 block mb-3">
                  Admin notes (internal — not visible to user)
                  <textarea
                    value={draft.admin_notes}
                    onChange={e => setDraft(d => ({ ...d, admin_notes: e.target.value }))}
                    rows={3}
                    placeholder="Why won't fix? What's the workaround? Link to PR…"
                    className="mt-1 w-full bg-gray-950 border border-gray-700 text-gray-200 text-sm px-2.5 py-1.5 rounded focus:outline-none focus:border-purple-500"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : savedOk ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? 'Saving…' : savedOk ? 'Saved' : 'Save'}
                  </button>
                  {selected.resolved_at && (
                    <span className="text-xs text-gray-500">
                      Resolved {fmtDateTime(selected.resolved_at)}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFeedback;
