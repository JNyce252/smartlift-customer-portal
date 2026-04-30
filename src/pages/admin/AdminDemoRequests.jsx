// AdminDemoRequests — incoming demo request queue with one-click provisioning.
//
// GET /admin/demo-requests powers the list. PATCH updates status/notes inline.
// POST /admin/demo-requests/:id/approve runs the heavy provisioning (creates
// companies row, Cognito Owner user, sends invites). The Approve modal lets
// the founder edit the company name + owner email before pulling the trigger
// because intake fields are often messy.

import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Sparkles, Inbox, Clock, Check, Building2, User, Phone, Mail, Globe,
  CheckCircle, XCircle, MessageSquare, Save, Send, AlertTriangle, Rocket,
} from 'lucide-react';
import { api } from '../../services/api';

const fmtDateTime = d => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const fmtRelative = d => {
  if (!d) return '—';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms/60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms/3_600_000)}h ago`;
  if (ms < 7*86_400_000) return `${Math.floor(ms/86_400_000)}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const STATUS_TABS = [
  { value: '',          label: 'Active',     desc: 'new + contacted + qualified' },
  { value: 'new',       label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'approved',  label: 'Approved' },
  { value: 'declined',  label: 'Declined' },
  { value: 'all',       label: 'All' },
];

const statusStyle = (s) => {
  switch ((s || '').toLowerCase()) {
    case 'new':       return 'bg-purple-900/40 text-purple-200 border-purple-700/50';
    case 'contacted': return 'bg-blue-900/40 text-blue-200 border-blue-700/50';
    case 'qualified': return 'bg-cyan-900/40 text-cyan-200 border-cyan-700/50';
    case 'approved':  return 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50';
    case 'converted': return 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50';
    case 'declined':  return 'bg-gray-800 text-gray-400 border-gray-700';
    default:          return 'bg-gray-800 text-gray-300 border-gray-700';
  }
};

const AdminDemoRequests = () => {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ admin_notes: '' });
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = tab ? { status: tab } : {};
      const data = await api.getAdminDemoRequests({ ...params, limit: 200 });
      setItems(data.items || []);
      setCounts(data.counts || {});
      if (data.items?.length && !data.items.some(i => i.id === selectedId)) {
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

  const selected = items.find(i => i.id === selectedId);

  // Sync draft buffer when selection changes.
  useEffect(() => {
    if (selected) {
      setDraft({ admin_notes: selected.admin_notes || '' });
      setSavedOk(false);
    }
  }, [selectedId, selected]);

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      await api.patchAdminDemoRequest(selected.id, { admin_notes: draft.admin_notes });
      setSavedOk(true);
      await load();
      setTimeout(() => setSavedOk(false), 1500);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const setStatus = async (newStatus) => {
    if (!selected) return;
    setError(null);
    try {
      await api.patchAdminDemoRequest(selected.id, { status: newStatus });
      await load();
    } catch (e) { setError(e.message); }
  };

  const totalActive = (counts.new || 0) + (counts.contacted || 0) + (counts.qualified || 0);

  return (
    <AdminLayout>
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Demo requests
          </h1>
          <p className="text-gray-400 text-sm">
            Inbound from <span className="font-mono text-gray-300">smarterlift.app/demo</span>. Approve to provision a 14-day trial tenant + invite the owner.
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
          const tabCount = t.value === ''
            ? totalActive
            : t.value === 'all'
              ? Object.values(counts).reduce((a,b) => a + b, 0)
              : (counts[t.value] || 0);
          const active = tab === t.value;
          return (
            <button
              key={t.value || 'active'}
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
              No demo requests in this view.
            </div>
          ) : (
            <ul>
              {items.map(it => {
                const isActive = it.id === selectedId;
                return (
                  <li key={it.id} className="border-b border-gray-800 last:border-0">
                    <button
                      onClick={() => setSelectedId(it.id)}
                      className={`w-full text-left px-3 py-3 transition-colors ${
                        isActive ? 'bg-purple-900/15 border-l-2 border-purple-500' : 'hover:bg-gray-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm text-white font-medium truncate">{it.company || it.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${statusStyle(it.status)}`}>
                          {it.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 truncate">{it.name} · {it.email}</div>
                      <div className="text-[11px] text-gray-600 mt-0.5">{fmtRelative(it.created_at)}</div>
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
              <Sparkles className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              Select a request from the list.
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                    <span className="font-mono">#{selected.id}</span>
                    <span>·</span>
                    <span>{fmtDateTime(selected.created_at)}</span>
                    <span>·</span>
                    <span className="text-gray-400">{selected.source}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-white">{selected.company || selected.name}</h2>
                  {selected.company && selected.name !== selected.company && (
                    <div className="text-sm text-gray-400 mt-0.5">contact: {selected.name}</div>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded border font-mono ${statusStyle(selected.status)}`}>
                  {selected.status}
                </span>
              </div>

              {/* Contact card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />Email</div>
                  <a href={`mailto:${selected.email}`} className="text-purple-300 hover:text-purple-200 break-all">{selected.email}</a>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</div>
                  <span className="text-white">{selected.phone || '—'}</span>
                </div>
              </div>

              {selected.message && (
                <div className="mb-5">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />What they said</div>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-200 whitespace-pre-wrap">
                    {selected.message}
                  </div>
                </div>
              )}

              {selected.approved_company_id && (
                <div className="mb-5 bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-200">
                    Provisioned as tenant <span className="font-semibold">{selected.approved_company_name}</span> (#{selected.approved_company_id}) on {fmtDateTime(selected.approved_at)}.
                  </span>
                </div>
              )}

              {/* Quick status transitions — only show if not yet approved */}
              {!selected.approved_company_id && (
                <div className="mb-5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 mr-1">Move to:</span>
                  {selected.status !== 'contacted' && (
                    <button onClick={() => setStatus('contacted')} className="text-xs px-2.5 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 text-blue-200 border border-blue-700/40">
                      Contacted
                    </button>
                  )}
                  {selected.status !== 'qualified' && (
                    <button onClick={() => setStatus('qualified')} className="text-xs px-2.5 py-1 rounded bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-700/40">
                      Qualified
                    </button>
                  )}
                  {selected.status !== 'declined' && (
                    <button onClick={() => setStatus('declined')} className="text-xs px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700">
                      <XCircle className="w-3 h-3 inline mr-1" />Decline
                    </button>
                  )}
                  <button
                    onClick={() => setApproveOpen(true)}
                    className="ml-auto text-sm px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-1.5 border border-purple-500"
                  >
                    <Rocket className="w-3.5 h-3.5" />Approve & Provision
                  </button>
                </div>
              )}

              {/* Admin notes */}
              <label className="block text-xs text-gray-400 mb-3">
                Admin notes (internal only)
                <textarea
                  value={draft.admin_notes}
                  onChange={e => setDraft(d => ({ ...d, admin_notes: e.target.value }))}
                  rows={3}
                  placeholder="Call notes, qualification fit, why declined…"
                  className="mt-1 w-full bg-gray-950 border border-gray-700 text-gray-200 text-sm px-2.5 py-1.5 rounded focus:outline-none focus:border-purple-500"
                />
              </label>
              <button
                onClick={saveNotes}
                disabled={saving}
                className="text-sm px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 flex items-center gap-1.5"
              >
                {saving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : savedOk ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : savedOk ? 'Saved' : 'Save notes'}
              </button>
            </>
          )}
        </div>
      </div>

      {approveOpen && selected && (
        <ApproveModal
          request={selected}
          onClose={() => setApproveOpen(false)}
          onApproved={async () => { setApproveOpen(false); await load(); }}
        />
      )}
    </AdminLayout>
  );
};

// ApproveModal — confirms what's about to happen and lets the founder
// override the company name and owner email (the intake values are often
// half-typed). Two SES emails will fire after success: Cognito's invite-with-
// temp-password, and our custom welcome email.
const ApproveModal = ({ request, onClose, onApproved }) => {
  const [companyName, setCompanyName] = useState(request.company || request.name || '');
  const [ownerEmail, setOwnerEmail]   = useState(request.email || '');
  // AM-4: defense against intake-typo takeover. The tenant approval flow
  // forces email_verified=true on AdminCreateUser, which means whatever email
  // address is on the demo_request gets a temp password with no verification
  // step. Force the founder to type the email twice — if they don't match the
  // submit is blocked. Initially seeded empty so the founder has to actually
  // glance at the address rather than hitting Approve on autopilot.
  const [confirmEmail, setConfirmEmail] = useState('');
  const [ownerName, setOwnerName]     = useState(request.name || '');
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);

  const normalizedOwnerEmail   = ownerEmail.trim().toLowerCase();
  const normalizedConfirmEmail = confirmEmail.trim().toLowerCase();
  const emailsMatch            = normalizedOwnerEmail.length > 0 && normalizedOwnerEmail === normalizedConfirmEmail;

  const submit = async () => {
    if (!companyName.trim() || !ownerEmail.trim()) { setError('Company name and owner email are required.'); return; }
    if (!emailsMatch) { setError('Confirm owner email must match.'); return; }
    setSubmitting(true); setError(null);
    try {
      const r = await api.approveDemoRequest(request.id, {
        company_name: companyName.trim(),
        owner_email: normalizedOwnerEmail,
        owner_name: ownerName.trim(),
      });
      setResult(r);
    } catch (e) {
      setError(e.message || 'Provisioning failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-purple-400" />
            <h2 className="text-white font-semibold">Approve & provision</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {result ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-emerald-900/40 border border-emerald-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-white font-medium mb-1">Tenant provisioned.</p>
            <div className="text-sm text-gray-400 space-y-1 mb-4">
              <p>Company <span className="text-white">{result.company_name}</span> (#{result.company_id}, slug <code className="text-purple-300">{result.slug}</code>)</p>
              <p>Owner invite sent to <span className="text-white">{result.owner_email}</span></p>
              <p>Trial ends in {result.trial_ends_at_days} days</p>
            </div>
            <button onClick={onApproved} className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg">Done</button>
          </div>
        ) : (
          <div className="p-5">
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 mb-4 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                Clicking Approve will: (1) create a <strong>companies</strong> row with status=trialing (14-day trial), (2) create a Cognito Owner user (Cognito sends invite + temp password), (3) send our welcome email. This is reversible only by manual cleanup.
              </div>
            </div>

            <label className="block text-xs text-gray-400 mb-3">
              Company name <span className="text-red-400">*</span>
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value.slice(0, 200))}
                className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-purple-500"
              />
            </label>

            <label className="block text-xs text-gray-400 mb-3">
              Owner email <span className="text-red-400">*</span>
              <input
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value.slice(0, 320))}
                type="email"
                autoComplete="off"
                className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-purple-500"
              />
              <span className="text-[11px] text-gray-600 mt-0.5 block">Cognito will email this address with a temporary password. Triple-check it — Cognito treats this address as pre-verified.</span>
            </label>

            <label className="block text-xs text-gray-400 mb-3">
              Confirm owner email <span className="text-red-400">*</span>
              <input
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value.slice(0, 320))}
                type="email"
                autoComplete="off"
                placeholder="Re-type to confirm"
                className={`mt-1 w-full bg-gray-950 border text-white text-sm px-3 py-2 rounded focus:outline-none ${
                  confirmEmail.length === 0
                    ? 'border-gray-700 focus:border-purple-500'
                    : emailsMatch
                      ? 'border-emerald-700 focus:border-emerald-500'
                      : 'border-red-700 focus:border-red-500'
                }`}
              />
              {confirmEmail.length > 0 && !emailsMatch && (
                <span className="text-[11px] text-red-400 mt-0.5 block">Doesn't match the address above.</span>
              )}
              {confirmEmail.length > 0 && emailsMatch && (
                <span className="text-[11px] text-emerald-400 mt-0.5 block">✓ Matches.</span>
              )}
            </label>

            <label className="block text-xs text-gray-400 mb-4">
              Owner name
              <input
                value={ownerName}
                onChange={e => setOwnerName(e.target.value.slice(0, 200))}
                className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-purple-500"
              />
            </label>

            {error && (
              <div className="mb-3 bg-red-900/20 border border-red-700/40 rounded-lg p-2.5 text-red-300 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button onClick={onClose} disabled={submitting} className="text-sm text-gray-400 hover:text-white px-3 py-1.5">Cancel</button>
              <button
                onClick={submit}
                disabled={submitting || !companyName.trim() || !emailsMatch}
                title={!emailsMatch ? 'Confirm owner email must match before approval' : ''}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Provisioning…' : 'Approve & provision'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDemoRequests;
