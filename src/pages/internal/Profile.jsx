import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, Phone, Mail, MapPin, Save, CheckCircle, Plus, Trash2, Briefcase, Wrench, Shield, Star, X, Edit2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const SPECIALIZATIONS = ['Traction Elevators', 'Hydraulic Elevators', 'Door Systems', 'Controls & Modernization', 'Safety Testing', 'TDLR Inspections', 'Emergency Repairs', 'Escalators'];
const CERTIFICATIONS = ['TDLR Licensed', 'CET Certified', 'NAEC Member', 'OSHA 10', 'OSHA 30', 'CAT 1 Testing', 'CAT 5 Testing'];

const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500 transition-colors";
const labelCls = "block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5";

const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [profile, setProfile] = useState({
    company_name: '', bio: '', certifications: '', credentials: '',
    service_area: '', years_in_business: '', tdlr_license: '',
    phone: '', email: '', website: '', logo_url: ''
  });
  const [projects, setProjects] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [addingProject, setAddingProject] = useState(false);
  const [savingTech, setSavingTech] = useState(false);
  const [techError, setTechError] = useState(null);

  const [newProject, setNewProject] = useState({
    building_name: '', building_type: 'hotel', city: '', state: 'TX',
    scope: '', year_completed: new Date().getFullYear()
  });

  const [techForm, setTechForm] = useState({
    name: '', email: '', phone: '', tdlr_license_number: '',
    certifications: [], specializations: [], hire_date: '', notes: '', status: 'active'
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  useEffect(() => {
    Promise.all([
      fetch(BASE_URL + '/profile', { headers }).then(r => r.json()),
      fetch(BASE_URL + '/projects', { headers }).then(r => r.json()).catch(() => []),
      fetch(BASE_URL + '/technicians', { headers }).then(r => r.json()).catch(() => []),
    ]).then(([prof, proj, techs]) => {
      if (prof && !prof.error) setProfile(prof);
      setProjects(Array.isArray(proj) ? proj : []);
      setTechnicians(Array.isArray(techs) ? techs : []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(BASE_URL + '/profile', { method: 'POST', headers, body: JSON.stringify(profile) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleAddProject = async () => {
    if (!newProject.building_name.trim()) return;
    setAddingProject(true);
    try {
      const res = await fetch(BASE_URL + '/projects', { method: 'POST', headers, body: JSON.stringify(newProject) });
      const data = await res.json();
      setProjects(prev => [data, ...prev]);
      setNewProject({ building_name: '', building_type: 'hotel', city: '', state: 'TX', scope: '', year_completed: new Date().getFullYear() });
      setShowAddProject(false);
    } catch(e) { console.error(e); }
    finally { setAddingProject(false); }
  };

  const handleDeleteProject = async (id) => {
    try {
      await fetch(BASE_URL + '/projects/' + id, { method: 'DELETE', headers });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch(e) {}
  };

  const resetTechForm = () => {
    setTechForm({ name: '', email: '', phone: '', tdlr_license_number: '', certifications: [], specializations: [], hire_date: '', notes: '', status: 'active' });
    setEditingTech(null);
    setTechError(null);
  };

  const openEditTech = (tech) => {
    setTechForm({
      name: tech.name || '',
      email: tech.email || '',
      phone: tech.phone || '',
      tdlr_license_number: tech.tdlr_license_number || '',
      certifications: tech.certifications || [],
      specializations: tech.specializations || [],
      hire_date: tech.hire_date ? tech.hire_date.split('T')[0] : '',
      notes: tech.notes || '',
      status: tech.status || 'active'
    });
    setEditingTech(tech);
    setShowAddTech(true);
  };

  const handleSaveTech = async () => {
    if (!techForm.name.trim()) { setTechError('Name is required'); return; }
    setSavingTech(true);
    setTechError(null);
    try {
      if (editingTech) {
        const res = await fetch(BASE_URL + '/technicians/' + editingTech.id, { method: 'PATCH', headers, body: JSON.stringify(techForm) });
        const data = await res.json();
        setTechnicians(prev => prev.map(t => t.id === editingTech.id ? data : t));
      } else {
        const res = await fetch(BASE_URL + '/technicians', { method: 'POST', headers, body: JSON.stringify(techForm) });
        const data = await res.json();
        setTechnicians(prev => [...prev, data]);
      }
      setShowAddTech(false);
      resetTechForm();
    } catch(e) { setTechError('Failed to save technician'); }
    finally { setSavingTech(false); }
  };

  const handleDeactivateTech = async (id) => {
    try {
      await fetch(BASE_URL + '/technicians/' + id, { method: 'DELETE', headers });
      setTechnicians(prev => prev.map(t => t.id === id ? { ...t, status: 'inactive' } : t));
    } catch(e) {}
  };

  const toggleArrayItem = (arr, item) =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const p = k => v => setProfile(prev => ({ ...prev, [k]: v }));
  const tf = k => v => setTechForm(prev => ({ ...prev, [k]: v }));

  const TABS = [
    { id: 'company', label: 'Company Info', icon: Building2 },
    { id: 'technicians', label: 'Technicians', icon: Wrench, badge: technicians.filter(t => t.status === 'active').length },
    { id: 'projects', label: 'Completed Projects', icon: Briefcase, badge: projects.length },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400">Loading profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700 mb-8 w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-600 text-gray-300'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Company Info Tab */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            {/* Identity */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />Company Identity
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Company Name</label>
                  <input value={profile.company_name || ''} onChange={e => p('company_name')(e.target.value)}
                    placeholder="Southwest Cabs Elevator Services" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Years in Business</label>
                  <input type="number" value={profile.years_in_business || ''} onChange={e => p('years_in_business')(e.target.value)}
                    placeholder="20" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>TDLR License Number</label>
                  <input value={profile.tdlr_license || ''} onChange={e => p('tdlr_license')(e.target.value)}
                    placeholder="TDLR License #" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Company Bio</label>
                  <textarea value={profile.bio || ''} onChange={e => p('bio')(e.target.value)}
                    placeholder="Describe your company, expertise, and what sets you apart..." rows={4}
                    className={inputCls + " resize-none"} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Certifications</label>
                  <input value={profile.certifications || ''} onChange={e => p('certifications')(e.target.value)}
                    placeholder="TDLR Licensed, NAEC Member, Fully Insured..." className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Credentials & Experience</label>
                  <textarea value={profile.credentials || ''} onChange={e => p('credentials')(e.target.value)}
                    placeholder="Detail your specific credentials and experience..." rows={3}
                    className={inputCls + " resize-none"} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Service Area</label>
                  <input value={profile.service_area || ''} onChange={e => p('service_area')(e.target.value)}
                    placeholder="Dallas, Fort Worth, Plano, Irving, Arlington..." className={inputCls} />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-5 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input value={profile.phone || ''} onChange={e => p('phone')(e.target.value)}
                      placeholder="972-974-7005" className={inputCls + " pl-9"} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input value={profile.email || ''} onChange={e => p('email')(e.target.value)}
                      placeholder="derald@swcabs.com" className={inputCls + " pl-9"} />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Website</label>
                  <input value={profile.website || ''} onChange={e => p('website')(e.target.value)}
                    placeholder="https://yourwebsite.com" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button onClick={handleSave} disabled={saving}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-lg">
              {saved ? <><CheckCircle className="w-6 h-6" />Profile Saved!</> : saving ? 'Saving...' : <><Save className="w-6 h-6" />Save Profile</>}
            </button>
          </div>
        )}

        {/* Technicians Tab */}
        {activeTab === 'technicians' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-gray-400 text-sm">{technicians.filter(t => t.status === 'active').length} active · {technicians.filter(t => t.status === 'inactive').length} inactive</p>
              </div>
              <button onClick={() => { resetTechForm(); setShowAddTech(true); }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />Add Technician
              </button>
            </div>

            {technicians.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
                <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-lg font-medium">No technicians added yet</p>
                <p className="text-gray-500 text-sm mt-1 mb-4">Add your field technicians to assign them to work orders</p>
                <button onClick={() => { resetTechForm(); setShowAddTech(true); }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
                  Add First Technician
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {technicians.map(tech => (
                  <div key={tech.id}
                    className={`bg-gray-800 rounded-xl border p-5 transition-colors ${tech.status === 'inactive' ? 'border-gray-700 opacity-60' : 'border-gray-700 hover:border-gray-600'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center border border-purple-700/30 flex-shrink-0">
                          <span className="text-purple-400 font-bold text-lg">{tech.name[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-white font-semibold">{tech.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${tech.status === 'active' ? 'bg-green-900/30 text-green-400 border-green-700/30' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                              {tech.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-400">
                            {tech.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{tech.phone}</span>}
                            {tech.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{tech.email}</span>}
                            {tech.tdlr_license_number && <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-purple-400" />{tech.tdlr_license_number}</span>}
                          </div>
                          {tech.specializations?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {tech.specializations.map(s => (
                                <span key={s} className="px-2 py-0.5 bg-blue-900/20 text-blue-400 border border-blue-700/30 rounded text-xs">{s}</span>
                              ))}
                            </div>
                          )}
                          {tech.certifications?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {tech.certifications.map(c => (
                                <span key={c} className="px-2 py-0.5 bg-green-900/20 text-green-400 border border-green-700/30 rounded text-xs flex items-center gap-1">
                                  <Star className="w-2.5 h-2.5" />{c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEditTech(tech)}
                          className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {tech.status === 'active' && (
                          <button onClick={() => handleDeactivateTech(tech.id)}
                            className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-400 text-sm">{projects.length} completed project{projects.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setShowAddProject(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />Add Project
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
                <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-lg font-medium">No projects added yet</p>
                <p className="text-gray-500 text-sm mt-1 mb-4">Add completed projects to strengthen your proposals</p>
                <button onClick={() => setShowAddProject(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
                  Add First Project
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map(proj => (
                  <div key={proj.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-white font-semibold">{proj.building_name}</h3>
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 border border-gray-600 rounded text-xs capitalize">{proj.building_type}</span>
                        <span className="text-gray-400 text-sm">{proj.year_completed}</span>
                      </div>
                      {proj.city && <p className="text-gray-400 text-sm flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{proj.city}, {proj.state}</p>}
                      {proj.scope && <p className="text-gray-500 text-sm mt-1">{proj.scope}</p>}
                    </div>
                    <button onClick={() => handleDeleteProject(proj.id)}
                      className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg flex-shrink-0 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Technician Modal */}
      {showAddTech && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{editingTech ? 'Edit Technician' : 'Add Technician'}</h2>
              <button onClick={() => { setShowAddTech(false); resetTechForm(); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {techError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 text-sm">{techError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Full Name *</label>
                  <input value={techForm.name} onChange={e => tf('name')(e.target.value)}
                    placeholder="John Smith" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input value={techForm.phone} onChange={e => tf('phone')(e.target.value)}
                    placeholder="972-555-0100" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input value={techForm.email} onChange={e => tf('email')(e.target.value)}
                    placeholder="john@swcabs.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>TDLR License Number</label>
                  <input value={techForm.tdlr_license_number} onChange={e => tf('tdlr_license_number')(e.target.value)}
                    placeholder="License #" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Hire Date</label>
                  <input type="date" value={techForm.hire_date} onChange={e => tf('hire_date')(e.target.value)}
                    className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map(s => (
                    <button key={s} onClick={() => tf('specializations')(toggleArrayItem(techForm.specializations, s))}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${techForm.specializations.includes(s) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Certifications</label>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATIONS.map(c => (
                    <button key={c} onClick={() => tf('certifications')(toggleArrayItem(techForm.certifications, c))}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${techForm.certifications.includes(c) ? 'bg-green-700 border-green-600 text-white' : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={techForm.notes} onChange={e => tf('notes')(e.target.value)}
                  placeholder="Any additional notes about this technician..." rows={3}
                  className={inputCls + " resize-none"} />
              </div>

              {editingTech && (
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={techForm.status} onChange={e => tf('status')(e.target.value)} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddTech(false); resetTechForm(); }}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleSaveTech} disabled={savingTech || !techForm.name.trim()}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                  {savingTech ? 'Saving...' : editingTech ? 'Update Technician' : 'Add Technician'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Add Completed Project</h2>
              <button onClick={() => setShowAddProject(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Building Name *</label>
                <input value={newProject.building_name} onChange={e => setNewProject(p => ({ ...p, building_name: e.target.value }))}
                  placeholder="e.g. Hyatt Regency Dallas" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Building Type</label>
                  <select value={newProject.building_type} onChange={e => setNewProject(p => ({ ...p, building_type: e.target.value }))} className={inputCls}>
                    {['hotel', 'hospital', 'office', 'apartment', 'retail', 'government', 'theme_park', 'other'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Year Completed</label>
                  <input type="number" value={newProject.year_completed} onChange={e => setNewProject(p => ({ ...p, year_completed: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input value={newProject.city} onChange={e => setNewProject(p => ({ ...p, city: e.target.value }))}
                    placeholder="Dallas" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input value={newProject.state} onChange={e => setNewProject(p => ({ ...p, state: e.target.value }))}
                    placeholder="TX" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Scope of Work</label>
                <textarea value={newProject.scope} onChange={e => setNewProject(p => ({ ...p, scope: e.target.value }))}
                  placeholder="Describe the work performed..." rows={3}
                  className={inputCls + " resize-none"} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddProject(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">Cancel</button>
                <button onClick={handleAddProject} disabled={addingProject || !newProject.building_name.trim()}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                  {addingProject ? 'Saving...' : 'Add Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
