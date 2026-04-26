import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Plus, Mail, Shield, Wrench, BarChart2, UserCheck, UserX, ChevronDown, X, CheckCircle, Clock, AlertCircle, Star, Edit2, Send } from 'lucide-react';
import { authService } from '../../services/authService';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const ROLE_CONFIG = {
  owner:      { label: 'Owner',        color: '#a78bfa', bg: 'rgba(124,58,237,0.15)',  border: 'rgba(124,58,237,0.3)',  icon: Shield },
  sales:      { label: 'Sales & Office',color: '#93c5fd', bg: 'rgba(29,78,216,0.15)',   border: 'rgba(29,78,216,0.3)',   icon: BarChart2 },
  technician: { label: 'Technician',   color: '#fbbf24', bg: 'rgba(180,83,9,0.15)',    border: 'rgba(180,83,9,0.3)',    icon: Wrench },
  staff:      { label: 'Staff',        color: '#9ca3af', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)', icon: Users },
  customer:   { label: 'Customer',     color: '#6ee7b7', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',  icon: UserCheck },
};

const inputCls = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' };
const labelCls = { display: 'block', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' };

const CERTIFICATIONS = ['TDLR Licensed','CET','NAEC Member','OSHA 10','OSHA 30','CAT 1 Testing','CAT 5 Testing','Electrical License','Hydraulic Specialist'];
const SPECIALIZATIONS = ['Traction Elevators','Hydraulic Elevators','Door Systems','Controls & Electrical','Safety Testing','TDLR Inspections','Modernization','Emergency Repair'];

const TeamManagement = () => {
  const { user, isOwner, getToken } = useAuth();
  const [tab, setTab] = useState('users');
  const [platformUsers, setPlatformUsers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateTech, setShowCreateTech] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'staff' });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [techForm, setTechForm] = useState({ name: '', email: '', phone: '', tdlr_license_number: '', certifications: [], specializations: [], status: 'active' });
  const [saving, setSaving] = useState(false);
  const [editTech, setEditTech] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (getToken() || authService.getIdToken()) };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [users, techs, wo] = await Promise.all([
        isOwner ? fetch(BASE_URL + '/team/users', { headers }).then(r => r.json()) : Promise.resolve([]),
        fetch(BASE_URL + '/technicians', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/work-orders', { headers }).then(r => r.json()),
      ]);
      setPlatformUsers(Array.isArray(users) ? users.filter(u => u.role !== 'customer') : []);
      setTechnicians(Array.isArray(techs) ? techs : []);
      setWorkOrders(Array.isArray(wo) ? wo : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      const res = await fetch(BASE_URL + '/team/users/invite', {
        method: 'POST', headers,
        body: JSON.stringify({ email: inviteForm.email, name: inviteForm.name, userRole: inviteForm.role })
      });
      const data = await res.json();
      if (data.success) {
        setInviteSuccess(inviteForm.email);
        setInviteForm({ email: '', name: '', role: 'staff' });
        setShowInvite(false);
        fetchData();
      }
    } catch(e) { console.error(e); }
    finally { setInviting(false); }
  };

  const handleRoleChange = async (userEmail, newRole) => {
    try {
      await fetch(BASE_URL + '/team/users/' + encodeURIComponent(userEmail) + '/role', {
        method: 'PATCH', headers, body: JSON.stringify({ role: newRole })
      });
      fetchData();
    } catch(e) { console.error(e); }
  };

  const handleToggleStatus = async (userEmail, enabled) => {
    try {
      await fetch(BASE_URL + '/team/users/' + encodeURIComponent(userEmail) + '/status', {
        method: 'PATCH', headers, body: JSON.stringify({ enabled: !enabled })
      });
      fetchData();
    } catch(e) { console.error(e); }
  };

  const handleSaveTech = async () => {
    setSaving(true);
    try {
      const url = editTech ? BASE_URL + '/technicians/' + editTech.id : BASE_URL + '/technicians';
      const method = editTech ? 'PATCH' : 'POST';
      await fetch(url, { method, headers, body: JSON.stringify(techForm) });
      setShowCreateTech(false);
      setEditTech(null);
      setTechForm({ name: '', email: '', phone: '', tdlr_license_number: '', certifications: [], specializations: [], status: 'active' });
      fetchData();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const toggleChip = (arr, val, setter, key) => {
    setter(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(x => x !== val) : [...prev[key], val]
    }));
  };

  const s = { container: { minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '32px' } };

  if (loading) return <div style={{ ...s.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'rgba(255,255,255,0.4)' }}>Loading team...</div></div>;

  const activeUsers = platformUsers.filter(u => u.enabled);
  const activeTechs = technicians.filter(t => t.status === 'active');
  const unassigned = workOrders.filter(w => !w.assigned_technician && w.status === 'open');

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '4px' }}>Team Management</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>{activeUsers.length} platform users · {activeTechs.length} active technicians</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowInvite(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            <Plus size={16} />Invite User
          </button>
        )}
      </div>

      {inviteSuccess && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={16} color="#6ee7b7" />
          <span style={{ fontSize: '13px', color: '#6ee7b7' }}>Invitation sent to {inviteSuccess} — they'll receive an email with login instructions.</span>
          <button onClick={() => setInviteSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[['users', 'Platform Users'], ['technicians', 'Field Technicians']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: tab === key ? '600' : '400',
              background: tab === key ? 'rgba(124,58,237,0.3)' : 'transparent',
              color: tab === key ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* PLATFORM USERS TAB */}
      {tab === 'users' && (
        <div>
          {!isOwner && (
            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              Only Owners can manage platform users.
            </div>
          )}
          {isOwner && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {platformUsers.map(u => {
                const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.staff;
                const Icon = rc.icon;
                return (
                  <div key={u.sub} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', opacity: u.enabled ? 1 : 0.5 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: rc.bg, border: `1px solid ${rc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={rc.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{u.name}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{u.email}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Role selector */}
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.email, e.target.value)}
                        style={{ background: rc.bg, border: `1px solid ${rc.border}`, borderRadius: '8px', padding: '6px 10px', color: rc.color, fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="owner">Owner</option>
                        <option value="sales">Sales & Office</option>
                        <option value="technician">Technician</option>
                        <option value="staff">Staff</option>
                      </select>
                      {/* Enable/disable */}
                      <button onClick={() => handleToggleStatus(u.email, u.enabled)}
                        title={u.enabled ? 'Disable access' : 'Enable access'}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: u.enabled ? '#f87171' : '#6ee7b7', cursor: 'pointer', fontSize: '12px' }}>
                        {u.enabled ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                    {!u.enabled && <span style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '2px 8px' }}>Disabled</span>}
                  </div>
                );
              })}
              {platformUsers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                  No platform users yet. Invite your team.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TECHNICIANS TAB */}
      {tab === 'technicians' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => { setShowCreateTech(true); setEditTech(null); setTechForm({ name: '', email: '', phone: '', tdlr_license_number: '', certifications: [], specializations: [], status: 'active' }); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '9px', color: '#a78bfa', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              <Plus size={15} />Add Technician
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {technicians.map(tech => {
              const assigned = workOrders.filter(w => w.assigned_technician === tech.name && ['open','in_progress','scheduled'].includes(w.status));
              return (
                <div key={tech.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(180,83,9,0.15)', border: '1px solid rgba(180,83,9,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wrench size={20} color="#fbbf24" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <p style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{tech.name}</p>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: tech.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: tech.status === 'active' ? '#6ee7b7' : '#9ca3af', border: `1px solid ${tech.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}` }}>
                          {tech.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        {tech.phone && <span>{tech.phone}</span>}
                        {tech.email && <span>{tech.email}</span>}
                        {tech.tdlr_license_number && <span>TDLR: {tech.tdlr_license_number}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: assigned.length > 0 ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>{assigned.length}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>active jobs</p>
                    </div>
                    <button onClick={() => { setEditTech(tech); setTechForm({ name: tech.name, email: tech.email||'', phone: tech.phone||'', tdlr_license_number: tech.tdlr_license_number||'', certifications: tech.certifications||[], specializations: tech.specializations||[], status: tech.status }); setShowCreateTech(true); }}
                      style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                      <Edit2 size={14} />
                    </button>
                  </div>
                  {tech.certifications?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {tech.certifications.map(c => (
                        <span key={c} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {technicians.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>No technicians yet.</div>
            )}
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#13111f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', width: '440px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelCls}>Email Address *</label>
              <input style={inputCls} type="email" placeholder="colleague@company.com"
                value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelCls}>Full Name</label>
              <input style={inputCls} placeholder="John Smith"
                value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelCls}>Role</label>
              <select style={{ ...inputCls, cursor: 'pointer' }} value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}>
                <option value="staff">Staff — basic access</option>
                <option value="technician">Technician — work orders and routes</option>
                <option value="sales">Sales & Office — leads and pipeline</option>
                <option value="owner">Owner — full access</option>
              </select>
            </div>
            <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              An email will be sent with a temporary password. They'll be prompted to set a new password on first login.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowInvite(false)}
                style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleInvite} disabled={inviting || !inviteForm.email}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: inviting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: inviting ? 0.7 : 1 }}>
                <Send size={14} />{inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT TECHNICIAN MODAL */}
      {showCreateTech && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }}>
          <div style={{ background: '#13111f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', width: '520px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{editTech ? 'Edit Technician' : 'Add Technician'}</h2>
              <button onClick={() => { setShowCreateTech(false); setEditTech(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelCls}>Full Name *</label>
                <input style={inputCls} placeholder="John Smith" value={techForm.name} onChange={e => setTechForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={labelCls}>Email</label>
                <input style={inputCls} type="email" placeholder="tech@company.com" value={techForm.email} onChange={e => setTechForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label style={labelCls}>Phone</label>
                <input style={inputCls} placeholder="214-555-0100" value={techForm.phone} onChange={e => setTechForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label style={labelCls}>TDLR License #</label>
                <input style={inputCls} placeholder="20001" value={techForm.tdlr_license_number} onChange={e => setTechForm(p => ({ ...p, tdlr_license_number: e.target.value }))} />
              </div>
              <div>
                <label style={labelCls}>Status</label>
                <select style={{ ...inputCls, cursor: 'pointer' }} value={techForm.status} onChange={e => setTechForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelCls}>Certifications</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CERTIFICATIONS.map(c => (
                  <button key={c} onClick={() => toggleChip(techForm.certifications, c, setTechForm, 'certifications')}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid', fontSize: '12px', cursor: 'pointer',
                      background: techForm.certifications.includes(c) ? 'rgba(124,58,237,0.3)' : 'transparent',
                      borderColor: techForm.certifications.includes(c) ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.15)',
                      color: techForm.certifications.includes(c) ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelCls}>Specializations</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SPECIALIZATIONS.map(s => (
                  <button key={s} onClick={() => toggleChip(techForm.specializations, s, setTechForm, 'specializations')}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid', fontSize: '12px', cursor: 'pointer',
                      background: techForm.specializations.includes(s) ? 'rgba(180,83,9,0.2)' : 'transparent',
                      borderColor: techForm.specializations.includes(s) ? 'rgba(180,83,9,0.4)' : 'rgba(255,255,255,0.15)',
                      color: techForm.specializations.includes(s) ? '#fbbf24' : 'rgba(255,255,255,0.4)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowCreateTech(false); setEditTech(null); }}
                style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveTech} disabled={saving || !techForm.name}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editTech ? 'Save Changes' : 'Add Technician'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
