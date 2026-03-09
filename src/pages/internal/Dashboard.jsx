import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, MapPin, Users, Building2, DollarSign, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const InternalDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prospects, setProspects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getProspects(), api.getCustomers()])
      .then(([p, c]) => { setProspects(p); setCustomers(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const highScoreProspects = prospects.filter(p => p.lead_score >= 70);
  const contactedProspects = prospects.filter(p => p.status === 'contacted');

  const urgencyColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-400 hover:text-white">
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 rounded-lg p-2">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">SmartLift</h1>
                  <p className="text-xs text-gray-400">Internal Portal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h2>
          <p className="text-gray-400">Here's what's happening with your leads today.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-600/20 rounded-lg p-3"><Search className="w-6 h-6 text-blue-400" /></div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Total Prospects</p>
            <p className="text-3xl font-bold text-white">{loading ? '...' : prospects.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-600/20 rounded-lg p-3"><TrendingUp className="w-6 h-6 text-green-400" /></div>
            </div>
            <p className="text-gray-400 text-sm mb-1">High Score Leads</p>
            <p className="text-3xl font-bold text-white">{loading ? '...' : highScoreProspects.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-600/20 rounded-lg p-3"><Users className="w-6 h-6 text-purple-400" /></div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Customers</p>
            <p className="text-3xl font-bold text-white">{loading ? '...' : customers.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-600/20 rounded-lg p-3"><DollarSign className="w-6 h-6 text-amber-400" /></div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Contacted</p>
            <p className="text-3xl font-bold text-white">{loading ? '...' : contactedProspects.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/internal/leads" className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 hover:from-blue-700 hover:to-blue-800 transition-all">
            <Search className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Find New Leads</h3>
            <p className="text-blue-100">Search for elevator service opportunities</p>
          </Link>
          <Link to="/internal/customers" className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 hover:from-green-700 hover:to-green-800 transition-all">
            <Users className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Customers</h3>
            <p className="text-green-100">Manage customer accounts</p>
          </Link>
          <Link to="/internal/routes" className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 hover:from-purple-700 hover:to-purple-800 transition-all">
            <MapPin className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Plan Routes</h3>
            <p className="text-purple-100">Optimize your travel schedule</p>
          </Link>
          <Link to="/internal/analytics" className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg p-6 hover:from-amber-700 hover:to-amber-800 transition-all">
            <TrendingUp className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Analytics</h3>
            <p className="text-amber-100">View performance metrics</p>
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">High-Priority Prospects</h3>
            <Link to="/internal/leads" className="text-blue-400 hover:text-blue-300 text-sm font-medium">View All →</Link>
          </div>
          <div className="space-y-4">
            {prospects.slice(0, 5).map((prospect) => (
              <Link key={prospect.id} to={`/internal/prospect/${prospect.id}`}
                className="block bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-1">{prospect.name}</h4>
                    <p className="text-sm text-gray-400">{prospect.city}, {prospect.state}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm font-medium border border-purple-600/30">
                      Score: {prospect.lead_score || 'N/A'}
                    </span>
                    {prospect.service_urgency && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${urgencyColors[prospect.service_urgency] || urgencyColors.low}`}>
                        {prospect.service_urgency.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{prospect.type}</span>
                  {prospect.rating && <span>⭐ {prospect.rating}</span>}
                  <span className={`px-2 py-0.5 rounded text-xs ${prospect.status === 'new' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {prospect.status}
                  </span>
                </div>
              </Link>
            ))}
            {prospects.length === 0 && !loading && (
              <p className="text-gray-500 text-center py-8">No prospects found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternalDashboard;
