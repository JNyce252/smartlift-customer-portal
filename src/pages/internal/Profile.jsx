import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, LogOut, User, Phone, Mail, MapPin, Globe, Save, CheckCircle, Camera, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const Profile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    company_name: '', owner_name: '', email: '', phone: '',
    website: '', address: '', city: '', state: '', tagline: '', logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    fetch(`${BASE_URL}/profile`, { headers })
      .then(r => r.json())
      .then(data => { if (data) setProfile(prev => ({ ...prev, ...data })); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${BASE_URL}/profile`, {
        method: 'PATCH', headers,
        body: JSON.stringify(profile)
      });
      const updated = await res.json();
      setProfile(prev => ({ ...prev, ...updated }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, field, type = 'text', placeholder }) => (
    <div>
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
              <div>
                <h1 className="text-xl font-bold text-white">Company Profile</h1>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Company Profile</h2>
          <p className="text-gray-400">This information is used in proposals, emails, and reports</p>
        </div>

        {/* Logo & Identity */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Camera className="w-5 h-5 text-purple-400" />Company Identity</h3>
          <div className="flex items-center gap-6 mb-4">
            <div className="w-24 h-24 bg-gray-700 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-10 h-10 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              <label className="text-gray-400 text-sm mb-1 block">Logo URL</label>
              <input type="text" value={profile.logo_url || ''} onChange={e => setProfile(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://your-company.com/logo.png"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
              <p className="text-gray-500 text-xs mt-1">Enter a URL to your company logo</p>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Company Tagline</label>
            <input type="text" value={profile.tagline || ''} onChange={e => setProfile(prev => ({ ...prev, tagline: e.target.value }))}
              placeholder="e.g. Texas's Premier Elevator Service Provider"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
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
            <Field label="Address" field="address" placeholder="123 Main St" />
            <Field label="City" field="city" placeholder="Dallas" />
            <Field label="State" field="state" placeholder="TX" />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold mb-4">Preview — How it appears in proposals</h3>
          <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-5">
            <div className="flex items-center gap-4 mb-3">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <div className="w-12 h-12 bg-purple-600/30 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-400" />
                </div>
              )}
              <div>
                <p className="text-white font-bold text-lg">{profile.company_name || 'Your Company Name'}</p>
                <p className="text-purple-300 text-sm">{profile.tagline || 'Your tagline here'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-300"><User className="w-3.5 h-3.5 text-purple-400" />{profile.owner_name || 'Owner Name'}</div>
              <div className="flex items-center gap-2 text-gray-300"><Phone className="w-3.5 h-3.5 text-purple-400" />{profile.phone || 'Phone'}</div>
              <div className="flex items-center gap-2 text-gray-300"><Mail className="w-3.5 h-3.5 text-purple-400" />{profile.email || 'Email'}</div>
              <div className="flex items-center gap-2 text-gray-300"><MapPin className="w-3.5 h-3.5 text-purple-400" />{profile.city || 'City'}, {profile.state || 'ST'}</div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors">
          {saved ? <><CheckCircle className="w-6 h-6" />Profile Saved!</> : saving ? 'Saving...' : <><Save className="w-6 h-6" />Save Profile</>}
        </button>
      </div>
    </div>
  );
};

export default Profile;
