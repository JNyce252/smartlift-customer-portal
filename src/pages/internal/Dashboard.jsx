import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import {
  DollarSign, TrendingUp, AlertTriangle, ClipboardList,
  ArrowRight, Shield, Users, Zap, ChevronUp, ChevronDown,
  Clock, CheckCircle, AlertCircle, BarChart2, MapPin, Star
} from 'lucide-react';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const fmt$ = (n) => {
  if (!n) return '$0';
  if (n >= 1000000) return '$' + (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n/1000).toFixed(0) + 'K';
  return '$' + parseInt(n).toLocaleString();
};

const PRIORITY_COLOR = {
  emergency: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#f87171' },
  high:      { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24' },
  medium:    { bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.3)', text: '#a78bfa' },
  low:       { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', text: '#9ca3af' },
};

const STATUS_COLOR = {
  open:        { text: '#60a5fa' },
  in_progress: { text: '#fbbf24' },
  scheduled:   { text: '#a78bfa' },
  completed:   { text: '#6ee7b7' },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { savePreference } = useUserPreferences();

  const [profile, setProfile] = useState({});
  const [tdlr, setTdlr] = useState({});
  const [contracts, setContracts] = useState({});
  const [prospects, setProspects] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('smartlift_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    savePreference('last_dashboard_visit', new Date().toISOString());
    const load = async () => {
      try {
        const [prof, tdlrData, contractData, prospectsData, woData, invData] = await Promise.all([
          fetch(`${BASE_URL}/profile`, { headers }).then(r => r.json()).catch(() => ({})),
          fetch(`${BASE_URL}/analytics/tdlr`, { headers }).then(r => r.json()).catch(() => ({})),
          fetch(`${BASE_URL}/analytics/contracts`, { headers }).then(r => r.json()).catch(() => ({})),
          fetch(`${BASE_URL}/prospects`, { headers }).then(r => r.json()).catch(() => []),
          fetch(`${BASE_URL}/work-orders`, { headers }).then(r => r.json()).catch(() => []),
          fetch(`${BASE_URL}/invoices`, { headers }).then(r => r.json()).catch(() => []),
        ]);
        setProfile(prof);
        setTdlr(tdlrData);
        setContracts(contractData);
        setProspects(Array.isArray(prospectsData) ? prospectsData : []);
        setWorkOrders(Array.isArray(woData) ? woData : []);
        setInvoices(Array.isArray(invData) ? invData : []);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Computed metrics
  const mrr = parseFloat(contracts.total_monthly_revenue) || 0;
  const arr = mrr * 12;
  const activeContracts = parseInt(contracts.active_contracts) || 0;
  const elevatorsContracted = parseInt(contracts.total_elevators_contracted) || 0;
  const expiredCerts = parseInt(tdlr.expired_certs) || 0;
  const expiringSoon = parseInt(tdlr.expiring_soon) || 0;

  const openWO = workOrders.filter(w => w.status === 'open');
  const inProgressWO = workOrders.filter(w => w.status === 'in_progress');
  const emergencyWO = workOrders.filter(w => w.priority === 'emergency' && w.status !== 'completed');
  const activeWO = workOrders.filter(w => ['open','in_progress','scheduled'].includes(w.status));

  const topProspects = [...prospects]
    .sort((a,b) => (b.lead_score||0) - (a.lead_score||0))
    .slice(0, 6);

  const pipelineValue = prospects
    .filter(p => !['won','lost','archived'].includes(p.status))
    .reduce((sum,p) => sum + ((p.estimated_elevators||3) * 8000), 0);

  const recentInvoices = [...invoices]
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  const s = {
    page: { minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '32px 36px' },
    card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' },
    cardHover: { cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' },
    label: { fontSize: '12px', fontWeight: '500', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
    bigNum: { fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', color: '#fff' },
    sub: { fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' },
  };

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            {greeting}, {firstName}! 👋
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            {emergencyWO.length > 0
              ? `⚠️ ${emergencyWO.length} emergency work order${emergencyWO.length > 1 ? 's' : ''} need attention`
              : `${activeWO.length} active work orders · ${expiredCerts.toLocaleString()} expired TDLR certs in Texas`}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>{today}</p>
          <p style={{ fontSize: '13px', color: '#a78bfa', fontWeight: '600' }}>{profile.company_name || 'Southwest Cabs Elevator Services'}</p>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>

        {/* MRR */}
        <div style={{ ...s.card, borderColor: mrr > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)' }}
          onClick={() => navigate('/internal/analytics')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={s.label}>Monthly Revenue</p>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="#6ee7b7" />
            </div>
          </div>
          <p style={{ ...s.bigNum, color: mrr > 0 ? '#6ee7b7' : 'rgba(255,255,255,0.3)' }}>{fmt$(mrr)}</p>
          <p style={s.sub}>{fmt$(arr)} ARR · {activeContracts} active contract{activeContracts !== 1 ? 's' : ''}</p>
        </div>

        {/* Pipeline Value */}
        <div style={{ ...s.card }} onClick={() => navigate('/internal/pipeline')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={s.label}>Pipeline Value</p>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#a78bfa" />
            </div>
          </div>
          <p style={{ ...s.bigNum, color: '#a78bfa' }}>{fmt$(pipelineValue)}</p>
          <p style={s.sub}>{prospects.filter(p => !['won','lost','archived'].includes(p.status)).length} active prospects</p>
        </div>

        {/* Work Orders */}
        <div style={{ ...s.card, borderColor: emergencyWO.length > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)' }}
          onClick={() => navigate('/internal/work-orders')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={s.label}>Work Orders</p>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: emergencyWO.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={16} color={emergencyWO.length > 0 ? '#f87171' : '#fbbf24'} />
            </div>
          </div>
          <p style={{ ...s.bigNum, color: emergencyWO.length > 0 ? '#f87171' : '#fbbf24' }}>{activeWO.length}</p>
          <p style={s.sub}>
            {emergencyWO.length > 0 ? `${emergencyWO.length} emergency · ` : ''}{inProgressWO.length} in progress · {openWO.length} open
          </p>
        </div>

        {/* TDLR Opportunity */}
        <div style={{ ...s.card, borderColor: 'rgba(251,191,36,0.2)' }}
          onClick={() => navigate('/internal/tdlr')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={s.label}>TDLR Opportunity</p>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="#fbbf24" />
            </div>
          </div>
          <p style={{ ...s.bigNum, color: '#fbbf24' }}>{expiringSoon.toLocaleString()}</p>
          <p style={s.sub}>{expiredCerts.toLocaleString()} already expired · 90-day window</p>
        </div>
      </div>

      {/* Main Content — 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Top Prospects */}
        <div style={{ ...s.card, gridColumn: '1 / 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={16} color="#a78bfa" />
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Top Prospects</p>
            </div>
            <Link to="/internal/leads" style={{ fontSize: '12px', color: '#a78bfa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topProspects.length === 0 && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0' }}>No prospects yet</p>
            )}
            {topProspects.map(p => (
              <div key={p.id} onClick={() => navigate(`/internal/prospect/${p.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '9px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{p.city || ''}{p.city && p.state ? ', ' : ''}{p.state || ''}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: (p.lead_score||0) >= 70 ? '#6ee7b7' : (p.lead_score||0) >= 50 ? '#fbbf24' : '#9ca3af' }}>
                    {p.lead_score || '—'}
                  </div>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>score</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Work Orders */}
        <div style={{ ...s.card, gridColumn: '2 / 3' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={16} color="#fbbf24" />
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Active Work Orders</p>
            </div>
            <Link to="/internal/work-orders" style={{ fontSize: '12px', color: '#a78bfa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeWO.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle size={24} color="#6ee7b7" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>All caught up</p>
              </div>
            )}
            {activeWO.slice(0, 6).map(wo => {
              const pc = PRIORITY_COLOR[wo.priority] || PRIORITY_COLOR.medium;
              const sc = STATUS_COLOR[wo.status] || { text: '#9ca3af' };
              return (
                <div key={wo.id} onClick={() => navigate('/internal/work-orders')}
                  style={{ padding: '10px 12px', borderRadius: '9px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', borderLeft: `3px solid ${pc.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wo.title}</p>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: pc.text, background: pc.bg, padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', flexShrink: 0 }}>{wo.priority}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{wo.customer_name || 'No customer'}</p>
                    <p style={{ fontSize: '11px', color: sc.text }}>{wo.status?.replace('_',' ')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TDLR Intelligence snapshot */}
        <div style={{ ...s.card, gridColumn: '3 / 4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="#fbbf24" />
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>TDLR Snapshot</p>
            </div>
            <Link to="/internal/tdlr" style={{ fontSize: '12px', color: '#a78bfa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={12} />
            </Link>
          </div>

          {/* Stat rows */}
          {[
            { label: 'Expired Now', value: expiredCerts.toLocaleString(), color: '#f87171', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', desc: 'Operating illegally' },
            { label: 'Expiring 30 days', value: parseInt(tdlr.expiring_soon||0) > 0 ? Math.round(parseInt(tdlr.expiring_soon)/3).toLocaleString() : '0', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', desc: 'Highest urgency' },
            { label: 'Expiring 90 days', value: expiringSoon.toLocaleString(), color: '#a78bfa', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', desc: 'Active opportunity' },
            { label: 'Total TX Elevators', value: parseInt(tdlr.total_records||0).toLocaleString(), color: '#9ca3af', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', desc: 'Market size' },
          ].map(({ label, value, color, bg, border, desc }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '9px', background: bg, border: `1px solid ${border}`, marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>{label}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{desc}</p>
              </div>
              <p style={{ fontSize: '20px', fontWeight: '800', color, letterSpacing: '-0.5px' }}>{value}</p>
            </div>
          ))}

          <Link to="/internal/tdlr"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '10px', marginTop: '4px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '9px', color: '#a78bfa', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
            <Zap size={14} />Find Leads Now
          </Link>
        </div>
      </div>

      {/* Bottom Row — Contracts + Recent Invoices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Contracts summary */}
        <div style={{ ...s.card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} color="#6ee7b7" />
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Contract Performance</p>
            </div>
            <Link to="/internal/analytics" style={{ fontSize: '12px', color: '#a78bfa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Analytics <ArrowRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Monthly Revenue', value: fmt$(mrr), color: '#6ee7b7' },
              { label: 'Annual Revenue', value: fmt$(arr), color: '#6ee7b7' },
              { label: 'Active Contracts', value: activeContracts, color: '#a78bfa' },
              { label: 'Elevators Contracted', value: elevatorsContracted, color: '#a78bfa' },
              { label: 'Pipeline Value', value: fmt$(pipelineValue), color: '#fbbf24' },
              { label: 'Total Prospects', value: prospects.length, color: '#60a5fa' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</p>
                <p style={{ fontSize: '20px', fontWeight: '800', color, letterSpacing: '-0.5px' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div style={{ ...s.card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={16} color="#6ee7b7" />
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>Recent Invoices</p>
            </div>
            <Link to="/internal/invoices" style={{ fontSize: '12px', color: '#a78bfa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No invoices yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentInvoices.map(inv => {
                const isPaid = inv.status === 'paid';
                const isOverdue = inv.status === 'overdue';
                const statusColor = isPaid ? '#6ee7b7' : isOverdue ? '#f87171' : '#fbbf24';
                const statusBg = isPaid ? 'rgba(16,185,129,0.1)' : isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)';
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '9px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.invoice_number || 'INV-' + inv.id}
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                        {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{fmt$(inv.total_amount || inv.amount)}</p>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: statusColor, background: statusBg, padding: '3px 8px', borderRadius: '6px' }}>
                      {inv.status || 'draft'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
