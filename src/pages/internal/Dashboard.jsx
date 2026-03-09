import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, TrendingUp, MapPin, Users, Calendar, 
  AlertTriangle, Building2, DollarSign, LogOut, Menu, X 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const InternalDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats = {
    totalLeads: 247,
    qualifiedLeads: 89,
    monthlyContacts: 134,
    conversionRate: 18.5,
  };

  const recentLeads = [
    { id: 1, name: 'Grand Hyatt Hotel', city: 'Dallas', state: 'TX', leadScore: 92, urgency: 'high', issues: ['slow', 'outdated'] },
    { id: 2, name: 'Marriott Downtown', city: 'Houston', state: 'TX', leadScore: 85, urgency: 'medium', issues: ['maintenance'] },
    { id: 3, name: 'Four Seasons Resort', city: 'Austin', state: 'TX', leadScore: 78, urgency: 'high', issues: ['broken', 'frequent_complaints'] },
  ];

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
                <div className="bg-blue-600 rounded-lg p-2">
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
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
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
              <div className="bg-blue-600/20 rounded-lg p-3">
                <Search className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-green-400 text-sm font-medium">+12%</span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Total Leads</p>
            <p className="text-3xl font-bold text-white">{stats.totalLeads}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-600/20 rounded-lg p-3">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-green-400 text-sm font-medium">+8%</span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Qualified Leads</p>
            <p className="text-3xl font-bold text-white">{stats.qualifiedLeads}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-600/20 rounded-lg p-3">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-green-400 text-sm font-medium">+23%</span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Contacts Made</p>
            <p className="text-3xl font-bold text-white">{stats.monthlyContacts}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-600/20 rounded-lg p-3">
                <DollarSign className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-green-400 text-sm font-medium">+5%</span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Conversion Rate</p>
            <p className="text-3xl font-bold text-white">{stats.conversionRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/internal/leads" className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 hover:from-blue-700 hover:to-blue-800 transition-all group">
            <Search className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Find New Leads</h3>
            <p className="text-blue-100">Search for elevator service opportunities</p>
          </Link>

          <Link to="/internal/customers" className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 hover:from-green-700 hover:to-green-800 transition-all group">
            <Users className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Customers</h3>
            <p className="text-green-100">Manage customer accounts</p>
          </Link>

          <Link to="/internal/routes" className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 hover:from-purple-700 hover:to-purple-800 transition-all group">
            <MapPin className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Plan Routes</h3>
            <p className="text-purple-100">Optimize your travel schedule</p>
          </Link>

          <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg p-6">
            <Calendar className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Today's Tasks</h3>
            <p className="text-amber-100">3 follow-ups scheduled</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">High-Priority Leads</h3>
            <Link to="/internal/leads" className="text-blue-400 hover:text-blue-300 text-sm font-medium">View All →</Link>
          </div>

          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <Link key={lead.id} to={`/internal/prospect/${lead.id}`}
                className="block bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-1">{lead.name}</h4>
                    <p className="text-sm text-gray-400">{lead.city}, {lead.state}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium border border-blue-600/30">
                      Score: {lead.leadScore}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${urgencyColors[lead.urgency]}`}>
                      {lead.urgency.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lead.issues.map((issue, idx) => (
                    <span key={idx} className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs border border-red-500/20">
                      {issue.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternalDashboard;
