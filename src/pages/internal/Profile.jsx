import React, { useState, useEffect } from 'react';
import UserMenu from '../../components/common/UserMenu';
import { Link } from 'react-router-dom';
import { Building2, User, Phone, Mail, MapPin, Save, CheckCircle, Camera, Plus, Trash2, Briefcase } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const Profile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    company_name: '', owner_name: '', email: '', phone: '',
    website: '', address: '', city: '', state: '', tagline: '',
    logo_url: '', bio: '', years_in_business: '', service_area: '',
    tdlr_license: '', insurance_info: '', certifications: '', credentials: ''
  });
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({ building_name: '', building_type: 'hotel', city: '', state: 'TX', scope: '', year_completed: new Date().getFullYear() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    Promise.all([
      fetch(`${BASE_URL}/profile`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/projects`, { headers }).then(r => r.json()).catch(() => []),
    ])
    .then(([p, proj]) => {
      if (p) setProfile(prev => ({ ...prev, ...p }));
      setProjects(Array.isArray(proj) ? proj : []);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${BASE_URL}/profile`, { method: 'PATCH', headers, body: JSON.stringify(profile) });
      const updated = await res.json();
      setProfile(prev => ({ ...prev, ...updated }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert('Failed to save: ' + e.message); }
    finally { setSaving(false); }
  };

  const addProject = async () => {
    if (!newProject.building_name.trim()) return;
    setAddingProject(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${BASE_URL}/projects`, { method: 'POST', headers, body: JSON.stringify(newProject) });
      const saved = await res.json();
      setProjects(prev => [saved, ...prev]);
      setNewProject({ building_name: '', building_type: 'hotel', city: '', state: 'TX', scope: '', year_completed: new Date().getFullYear() });
      setShowAddProject(false);
    } catch (e) { alert('Failed to add project: ' + e.message); }
    finally { setAddingProject(false); }
  };

  const deleteProject = async (id) => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    await fetch(`${BASE_URL}/projects/${id}`, { method: 'DELETE', headers });
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const Field = ({ label, field, type = 'text', placeholder, half }) => (
    <div className={half ? '' : 'col-span-2 md:col-span-1'}>
      <label className="text-gray-400 text-sm mb-1 block">{label}</label>
      <input type={type} value={profile[field] || ''} onChange={e => setProfile(prev => ({ ...prev, [field]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400">Loading profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/dashboard"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div><h1 className="text-xl font-bold text-white">Company Profile</h1><p className="text-xs text-gray-400">{user?.email}</p></div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Company Profile</h2>
          <p className="text-gray-400">Used in proposals, introduction emails, and reports</p>
        </div>

        {/* Logo & Identity */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Camera className="w-5 h-5 text-purple-400" />Company Identity</h3>
          <div className="flex items-center gap-6 mb-4">
            <div className="w-24 h-24 bg-gray-700 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile.logo_url ? <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <Building2 className="w-10 h-10 text-gray-500" />}
            </div>
            <div className="flex-1">
              <label className="text-gray-400 text-sm mb-1 block">Logo URL</label>
              <input type="text" value={profile.logo_url || ''} onChange={e => setProfile(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://your-company.com/logo.png"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Company Tagline</label>
              <input type="text" value={profile.tagline || ''} onChange={e => setProfile(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="Texas's Premier Elevator Service Provider"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Years in Business</label>
              <input type="number" value={profile.years_in_business || ''} onChange={e => setProfile(prev => ({ ...prev, years_in_business: e.target.value }))}
                placeholder="15"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-gray-400 text-sm mb-1 block">Company Bio</label>
            <textarea value={profile.bio || ''} onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Brief description of your company, what you do, and what makes you different..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm resize-none" />
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-purple-400" />Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Company Name" field="company_name" placeholder="Southwest Cabs Elevator Services" />
            <Field label="Owner / Primary Contact" field="owner_name" placeholder="Derald Armstrong" />
            <Field label="Email Address" field="email" type="email" placeholder="derald@swcabs.com" />
            <Field label="Phone Number" field="phone" placeholder="972-974-7005" />
            <Field label="Website" field="website" placeholder="https://swcabs.com" />
            <Field label="Service Area" field="service_area" placeholder="Dallas-Fort Worth, Houston, Austin" />
            <Field label="Address" field="address" placeholder="123 Main St" />
            <Field label="City" field="city" placeholder="Dallas" />
            <Field label="State" field="state" placeholder="TX" />
          </div>
        </div>

        {/* Credentials */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-purple-400" />Credentials & Certifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="TDLR License Number" field="tdlr_license" placeholder="e.g. EL-12345" />
            <Field label="Insurance Info" field="insurance_info" placeholder="e.g. $2M General Liability" />
          </div>
          <div className="mt-4">
            <label className="text-gray-400 text-sm mb-1 block">Certifications & Associations</label>
            <textarea value={profile.certifications || ''} onChange={e => setProfile(prev => ({ ...prev, certifications: e.target.value }))}
              placeholder="e.g. NAEC member, ASME certified, OSHA compliant..."
              rows={2}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm resize-none" />
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Credentials</label>
              <textarea value={profile.credentials || ''} onChange={e => setProfile(prev => ({ ...prev, credentials: e.target.value }))}
                placeholder="e.g. Licensed Texas elevator contractor with 20+ years experience in commercial maintenance, emergency repair, and modernization"
                rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
            </div>
        </div>

        {/* Completed Projects */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold flex items-center gap-2"><Briefcase className="w-5 h-5 text-purple-400" />Completed Projects <span className="text-gray-500 text-sm font-normal">— used in proposals & intro emails</span></h3>
            <button onClick={() => setShowAddProject(!showAddProject)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />Add Project
            </button>
          </div>

          {showAddProject && (
            <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 mb-4">
              <h4 className="text-white font-medium mb-3">New Project</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Building Name</label>
                  <input type="text" value={newProject.building_name} onChange={e => setNewProject(p => ({ ...p, building_name: e.target.value }))}
                    placeholder="Hilton Garden Inn Dallas"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Building Type</label>
                  <select value={newProject.building_type} onChange={e => setNewProject(p => ({ ...p, building_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                    <option value="hotel">Hotel</option>
                    <option value="office">Office Building</option>
                    <option value="hospital">Hospital</option>
                    <option value="apartment">Apartment Complex</option>
                    <option value="government">Government</option>
                    <option value="retail">Retail/Mall</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">City</label>
                  <input type="text" value={newProject.city} onChange={e => setNewProject(p => ({ ...p, city: e.target.value }))}
                    placeholder="Dallas"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Year Completed</label>
                  <input type="number" value={newProject.year_completed} onChange={e => setNewProject(p => ({ ...p, year_completed: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-gray-400 text-xs mb-1 block">Scope of Work</label>
                <textarea value={newProject.scope} onChange={e => setNewProject(p => ({ ...p, scope: e.target.value }))}
                  placeholder="e.g. Full modernization of 4 passenger elevators, installed new controls and cab interiors"
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 resize-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={addProject} disabled={addingProject || !newProject.building_name.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm">
                  {addingProject ? 'Saving...' : 'Save Project'}
                </button>
                <button onClick={() => setShowAddProject(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-600 rounded-lg">
              <Briefcase className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No projects yet — add completed jobs to strengthen your proposals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(project => (
                <div key={project.id} className="flex items-start justify-between bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div>
                    <p className="text-white font-medium">{project.building_name}</p>
                    <p className="text-gray-400 text-sm">{project.building_type} — {project.city}, {project.state} — {project.year_completed}</p>
                    {project.scope && <p className="text-gray-500 text-xs mt-1">{project.scope}</p>}
                  </div>
                  <button onClick={() => deleteProject(project.id)} className="text-red-400 hover:text-red-300 ml-4 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold mb-4">Preview — How it appears in proposals</h3>
          <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-5">
            <div className="flex items-center gap-4 mb-3">
              {profile.logo_url ? <img src={profile.logo_url} alt="Logo" className="w-12 h-12 object-contain" /> : <div className="w-12 h-12 bg-purple-600/30 rounded-lg flex items-center justify-center"><Building2 className="w-6 h-6 text-purple-400" /></div>}
              <div>
                <p className="text-white font-bold text-lg">{profile.company_name || 'Your Company Name'}</p>
                <p className="text-purple-300 text-sm">{profile.tagline || 'Your tagline here'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div className="flex items-center gap-2 text-gray-300"><User className="w-3.5 h-3.5 text-purple-400" />{profile.owner_name || 'Owner Name'}</div>
              <div className="flex items-center gap-2 text-gray-300"><Phone className="w-3.5 h-3.5 text-purple-400" />{profile.phone || 'Phone'}</div>
              <div className="flex items-center gap-2 text-gray-300"><Mail className="w-3.5 h-3.5 text-purple-400" />{profile.email || 'Email'}</div>
              <div className="flex items-center gap-2 text-gray-300"><MapPin className="w-3.5 h-3.5 text-purple-400" />{profile.city || 'City'}, {profile.state || 'ST'}</div>
            </div>
            {profile.bio && <p className="text-gray-400 text-xs mt-2 italic">"{profile.bio}"</p>}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3">
          {saved ? <><CheckCircle className="w-6 h-6" />Profile Saved!</> : saving ? 'Saving...' : <><Save className="w-6 h-6" />Save Profile</>}
        </button>
      </div>
    </div>
  );
};

export default Profile;
