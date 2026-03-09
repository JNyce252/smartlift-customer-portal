import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, MapPin, Star, Phone, Mail, Eye, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const LeadSearch = () => {
  const { user, logout } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getProspects().then(data => { setProspects(data); setFiltered(data); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(prospects.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.state?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    ));
  }, [search, prospects]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (score >= 60) return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
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
                <h1 className="text-xl font-bold text-white">Lead Search</h1>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">AI-Powered Lead Search</h2>
          <p className="text-gray-400">Find elevator service opportunities — {filtered.length} prospects</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" /><p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, or address..."
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((prospect) => (
            <div key={prospect.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-600/20 rounded-lg p-3 border border-purple-600/30">
                    <Building2 className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{prospect.name}</h3>
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <MapPin className="w-4 h-4" />
                      {prospect.address || `${prospect.city}, ${prospect.state}`}
                    </div>
                    {prospect.rating && (
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-white">{prospect.rating}</span>
                        {prospect.total_reviews && <span className="text-gray-400">({prospect.total_reviews} reviews)</span>}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs border ${
                        prospect.status === 'new' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>{prospect.status}</span>
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">{prospect.type}</span>
                      {prospect.service_urgency && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30">
                          {prospect.service_urgency} urgency
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-1">Lead Score</p>
                  <span className={`text-3xl font-bold px-3 py-1 rounded-lg border ${getScoreColor(prospect.lead_score)}`}>
                    {prospect.lead_score || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <Link to={`/internal/prospect/${prospect.id}`}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" />View Details
                </Link>
                {prospect.phone && (
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2">
                    <Phone className="w-4 h-4" />Call
                  </button>
                )}
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                  <Mail className="w-4 h-4" />Email
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-xl">No prospects found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadSearch;
