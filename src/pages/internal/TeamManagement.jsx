import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Phone, Mail, Plus, X, CheckCircle, Clock, AlertCircle, Star, Wrench, Shield, Edit2, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../../components/common/UserMenu';
import NotificationBell from '../../components/common/NotificationBell';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500";
const labelCls = "block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5";

const CERTIFICATIONS = ['TDLR Licensed', 'CET', 'NAEC Member', 'OSHA 10', 'OSHA 30', 'CAT 1 Testing', 'CAT 5 Testing', 'Electrical License', 'Hydraulic Specialist'];
const SPECIALIZATIONS = ['Traction Elevators', 'Hydraulic Elevators', 'Door Systems', 'Controls & Electrical', 'Safety Testing', 'TDLR Inspections', 'Modernization', 'Emergency Repair'];

const TeamManagement = () => {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTech, setEditTech] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', tdlr_license_number: '',
    certifications: [], specializations: [], hire_date: '', notes: '', status: 'active'
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  const fetchData = async () => {
    try {
      const [techs, wo] = await Promise.all([
        fetch(BASE_URL + '/technicians', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/work-orders', { headers }).then(r => r.json()),
      ]);
      setTechnicians(Array.isArray(techs) ? techs : []);
      setWorkOrders(Array.isArray(wo) ? wo : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const activeTechs = technicians.filter(t => t.status === 'active');
  const unassignedJobs = workOrders.filter(w => !w.assigned_technician && w.status === 'open');
  const inProgressJobs = workOrders.filter(w => w.status === 'in_progress');

  const getTechJobs = (techName) => workOrders.filter(w =>
    w.assigned_technician === techName && (w.status === 'open' || w.status === 'in_progress')
  );

  const saveTechnician = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const method = editTech ? 'PATCH' : 'POST';
      const url = editTech ? BASE_URL + '/technicians/' + editTech.id : BASE_URL + '/technicians';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (editTech) {
        setTechnicians(prev => prev.map(t => t.id === editTech.id ? { ...t, ...data } : t));
      } else {
        setTechnicians(prev => [...prev, data]);
      }
      setShowCreate(false);
      setEditTech(null);
      resetForm();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deactivateTech = async (id) => {
    try {
      await fetch(BASE_URL + '/technicians/' + id, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'inactive' })
      });
      setTechnicians(prev => prev.map(t => t.id === id ? { ...t, status: 'inactive' } : t));
    } catch(e) {}
  };

  const reactivateTech = async (id) => {
    try {
      await fetch(BASE_URL + '/technicians/' + id, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'active' })
      });
      setTechnicians(prev => prev.map(t => t.id === id ? { ...t, status: 'active' } : t));
    } catch(e) {}
  };

  const resetForm = () => setForm({
    name: '', email: '', phone: '', tdlr_license_number: '',
    certifications: [], specializations: [], hire_date: '', notes: '', status: 'active'
  });

  const openEdit = (tech) => {
    setEditTech(tech);
    setForm({
      name: tech.name || '',
      email: tech.email || '',
      phone: tech.phone || '',
      tdlr_license_number: tech.tdlr_license_number || '',
      certifications: tech.certifications || [],
      specializations: tech.specializations || [],
      hire_date: tech.hire_date || '',
      notes: tech.notes || '',
      status: tech.status || 'active'
    });
    setShowCreate(true);
  };

  const toggleArr = (key, val) => setForm(p => ({
    ...p,
    [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val]
  }));

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/dashboard"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Team Management</h1>
                <p className="text-xs text-gray-400">{activeTechs.length} active technicians</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { resetForm(); setEditTech(null); setShowCreate(true); }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />Add Technician
              </button>
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Technicians', value: technicians.length, color: 'text-white', bg: 'bg-gray-800 border-gray-700', icon: Users },
            { label: 'Active', value: activeTechs.length, color: 'text-green-400', bg: 'bg-green-900/10 border-green-700/30', icon: CheckCircle },
            { label: 'Jobs In Progress', value: inProgressJobs.length, color: 'text-blue-400', bg: 'bg-blue-900/10 border-blue-700/30', icon: Clock },
            { label: 'Unassigned Jobs', value: unassignedJobs.length, color: unassignedJobs.length > 0 ? 'text-amber-400' : 'text-gray-400', bg: unassignedJobs.length > 0 ? 'bg-amber-900/10 border-amber-700/30' : 'bg-gray-800 border-gray-700', icon: AlertCircle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className={`rounded-xl p-5 border ${bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Technician List */}
          <div className="lg:col-span-2">
            <h2 className="text-white font-bold text-lg mb-4">Technicians</h2>
            {loading ? (
              <div className="text-center py-16 text-gray-400">Loading team...</div>
            ) : technicians.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No technicians yet</p>
                <p className="text-gray-500 text-sm mt-1 mb-4">Add your first technician to start assigning work orders</p>
                <button onClick={() => setShowCreate(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
                  Add First Technician
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {technicians.map(tech => {
                  const techJobs = getTechJobs(tech.name);
                  const isActive = tech.status === 'active';
                  return (
                    <div key={tech.id} className={`bg-gray-800 rounded-xl border p-5 transition-colors ${isActive ? 'border-gray-700 hover:border-gray-600' : 'border-gray-800 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${isActive ? 'bg-purple-900/30 border-purple-700/30' : 'bg-gray-700 border-gray-600'}`}>
                            <Users className={`w-6 h-6 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-white font-semibold">{tech.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isActive ? 'bg-green-900/20 text-green-400 border-green-700/30' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                              {techJobs.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-900/20 text-blue-400 border-blue-700/30">
                                  {techJobs.length} active job{techJobs.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                              {tech.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{tech.email}</span>}
                              {tech.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{tech.phone}</span>}
                            </div>
                            {tech.tdlr_license_number && (
                              <div className="flex items-center gap-1 mt-1">
                                <Shield className="w-3.5 h-3.5 text-gold-400" style={{ color: '#D4A843' }} />
                                <span className="text-xs text-gray-400">TDLR: {tech.tdlr_license_number}</span>
                              </div>
                            )}
                            {tech.specializations && tech.specializations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {tech.specializations.slice(0, 3).map(s => (
                                  <span key={s} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs border border-gray-600">{s}</span>
                                ))}
                                {tech.specializations.length > 3 && (
                                  <span className="px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">+{tech.specializations.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => openEdit(tech)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isActive ? (
                            <button onClick={() => deactivateTech(tech.id)}
                              className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700/30 rounded-lg text-xs transition-colors">
                              Deactivate
                            </button>
                          ) : (
                            <button onClick={() => reactivateTech(tech.id)}
                              className="px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700/30 rounded-lg text-xs transition-colors">
                              Reactivate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unassigned Jobs */}
          <div>
            <h2 className="text-white font-bold text-lg mb-4">Unassigned Jobs</h2>
            {unassignedJobs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-gray-400 font-medium text-sm">All jobs assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedJobs.map(job => {
                  const priorityConfig = {
                    emergency: 'bg-red-900/20 text-red-400 border-red-700/30',
                    high: 'bg-amber-900/20 text-amber-400 border-amber-700/30',
                    medium: 'bg-blue-900/20 text-blue-400 border-blue-700/30',
                    low: 'bg-gray-700 text-gray-400 border-gray-600',
                  };
                  return (
                    <div key={job.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-white font-medium text-sm">{job.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${priorityConfig[job.priority] || priorityConfig.medium}`}>
                          {job.priority}
                        </span>
                      </div>
                      {job.customer_name && (
                        <p className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                          <Building2 className="w-3 h-3" />{job.customer_name}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mb-3">{job.ticket_number}</p>
                      <Link to="/internal/work-orders"
                        className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-700/30 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors">
                        Assign Technician <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Certifications legend */}
            <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-white font-semibold text-sm mb-3">Required Certifications</h3>
              <div className="space-y-2">
                {['TDLR Licensed', 'CAT 1 Testing', 'CAT 5 Testing', 'OSHA 30'].map(cert => (
                  <div key={cert} className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{cert}</span>
                    <span className="text-xs text-green-400">
                      {technicians.filter(t => t.certifications && t.certifications.includes(cert) && t.status === 'active').length} certified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{editTech ? 'Edit Technician' : 'Add Technician'}</h2>
              <button onClick={() => { setShowCreate(false); setEditTech(null); resetForm(); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Full Name *</label>
                  <input value={form.name} onChange={e => f('name')(e.target.value)} placeholder="Technician name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input value={form.email} onChange={e => f('email')(e.target.value)} placeholder="email@company.com" className={inputCls} type="email" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input value={form.phone} onChange={e => f('phone')(e.target.value)} placeholder="(555) 000-0000" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>TDLR License Number</label>
                  <input value={form.tdlr_license_number} onChange={e => f('tdlr_license_number')(e.target.value)} placeholder="License #" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Hire Date</label>
                  <input type="date" value={form.hire_date} onChange={e => f('hire_date')(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Certifications</label>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATIONS.map(c => (
                    <button key={c} onClick={() => toggleArr('certifications', c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${form.certifications.includes(c) ? 'bg-green-900/30 text-green-400 border-green-700/30' : 'bg-gray-700 text-gray-400 border-gray-600 hover:border-gray-500'}`}>
                      {form.certifications.includes(c) ? '✓ ' : ''}{c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map(s => (
                    <button key={s} onClick={() => toggleArr('specializations', s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${form.specializations.includes(s) ? 'bg-purple-900/30 text-purple-400 border-purple-700/30' : 'bg-gray-700 text-gray-400 border-gray-600 hover:border-gray-500'}`}>
                      {form.specializations.includes(s) ? '✓ ' : ''}{s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => f('notes')(e.target.value)}
                  placeholder="Any additional notes..." rows={3}
                  className={inputCls + " resize-none"} />
              </div>

              {editTech && (
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={e => f('status')(e.target.value)} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowCreate(false); setEditTech(null); resetForm(); }}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={saveTechnician} disabled={saving || !form.name}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {saving ? 'Saving...' : editTech ? 'Save Changes' : 'Add Technician'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
