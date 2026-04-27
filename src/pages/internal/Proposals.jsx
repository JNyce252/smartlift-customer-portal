import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Search, Building2, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { authHeaders } from '../../services/authService';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const STATUS_STYLE = {
  new:           { label: 'New',           color: '#60a5fa', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)' },
  contacted:     { label: 'Contacted',     color: '#a78bfa', bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.3)' },
  proposal_sent: { label: 'Proposal Sent', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)' },
  won:           { label: 'Won',           color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)' },
  lost:          { label: 'Lost',          color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
};

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtDateTime = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const Proposals = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BASE_URL}/proposals`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        setProposals(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const q = search.toLowerCase();
  const filtered = proposals.filter(p => {
    const matchesSearch = !q
      || p.prospect_name?.toLowerCase().includes(q)
      || p.prospect_city?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || p.prospect_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total:   proposals.length,
    sent:    proposals.filter(p => p.prospect_status === 'proposal_sent').length,
    won:     proposals.filter(p => p.prospect_status === 'won').length,
    pending: proposals.filter(p => !['won','lost'].includes(p.prospect_status)).length,
  };

  const s = {
    page: { minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '32px 36px' },
    label: { fontSize: '11px', fontWeight: '500', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' },
    bigNum: { fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', color: '#fff' },
    input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px 10px 36px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    select: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' },
  };

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading proposals...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Couldn't load proposals</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={26} color="#a78bfa" />
            Proposals
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            {stats.total} total · {stats.pending} in flight · {stats.won} won
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Proposals',  val: stats.total,   color: '#fff' },
          { label: 'Awaiting Response', val: stats.sent,    color: '#fbbf24' },
          { label: 'Pipeline',          val: stats.pending, color: '#a78bfa' },
          { label: 'Won',               val: stats.won,     color: '#6ee7b7' },
        ].map(({ label, val, color }) => (
          <div key={label} style={s.card}>
            <p style={s.label}>{label}</p>
            <p style={{ ...s.bigNum, color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...s.card, marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by prospect name or city..."
              style={{ ...s.input, width: '100%' }} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={s.select}>
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
            Showing {filtered.length} of {proposals.length}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', padding: '48px 24px' }}>
          <FileText size={32} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
            {proposals.length === 0 ? 'No proposals yet' : 'No proposals match your filters'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
            {proposals.length === 0
              ? 'Generate a proposal from a prospect detail page to see it here.'
              : 'Try clearing the search or status filter.'}
          </p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && (
        <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{ ...s.label, textAlign: 'left', padding: '12px 16px', margin: 0 }}>Prospect</th>
                <th style={{ ...s.label, textAlign: 'left', padding: '12px 16px', margin: 0 }}>Location</th>
                <th style={{ ...s.label, textAlign: 'left', padding: '12px 16px', margin: 0 }}>Status</th>
                <th style={{ ...s.label, textAlign: 'right', padding: '12px 16px', margin: 0 }}>Lead Score</th>
                <th style={{ ...s.label, textAlign: 'right', padding: '12px 16px', margin: 0 }}>Est. Elevators</th>
                <th style={{ ...s.label, textAlign: 'left', padding: '12px 16px', margin: 0 }}>Generated</th>
                <th style={{ ...s.label, textAlign: 'right', padding: '12px 16px', margin: 0, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const sc = STATUS_STYLE[p.prospect_status] || { label: p.prospect_status || '—', color: '#9ca3af', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };
                return (
                  <tr key={p.id}
                    onClick={() => navigate(`/internal/prospect/${p.prospect_id}`)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={14} color="#a78bfa" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                            {p.prospect_name || 'Unnamed prospect'}
                          </p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                            {p.content_length ? `${(p.content_length / 1024).toFixed(1)}KB proposal` : 'no content'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                      {[p.prospect_city, p.prospect_state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: '3px 8px', borderRadius: '6px' }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: (p.lead_score || 0) >= 70 ? '#6ee7b7' : (p.lead_score || 0) >= 50 ? '#fbbf24' : 'rgba(255,255,255,0.4)' }}>
                      {p.lead_score ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                      {p.estimated_elevators ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} title={fmtDateTime(p.generated_at)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} color="rgba(255,255,255,0.3)" />
                        {fmtDate(p.generated_at)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <ArrowRight size={14} color="rgba(255,255,255,0.3)" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Proposals;
