import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, MapPin, Users, Building2, DollarSign, LogOut, Menu, X, Clock, Brain, AlertTriangle, Star, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const InternalDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prospects, setProspects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getProspects(), api.getCustomers(), api.getTickets(), api.getInvoices()])
      .then(([p, c, t, i]) => { setProspects(p); setCustomers(c); setTickets(t); setInvoices(i); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const highScoreProspects = prospects.filter(p => p.lead_score >= 70);
  const highUrgencyProspects = prospects.filter(p => p.service_urgency === 'high');
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const pipelineValue = prospects.reduce((sum, p) => sum + ((p.estimated_elevators || 3) * 8000), 0);
  const topProspects = [...prospects].sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0)).slice(0, 5);

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
                <div className="bg-purple-600 rounded-lg p-2"><Building2 className="w-6 h-6 text-white" /></div>
                <div>
                  <h1 className="text-xl font-bold text-white">SmartLift</h1>
                  <p className="text-xs text-gray-400">Internal Portal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.name || 'Staff'}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-1">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h2>
          <p className="text-gray-400">Here's your lead pipeline and activity summary.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Search, iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400', label: 'Total Prospects', value: prospects.length, sub: `${highScoreProspects.length} high score` },
            { icon: Brain, iconBg: 'bg-purple-600/20', iconColor: 'text-purple-400', label: 'Pipeline Value', value: `$${(pipelineValue/1000).toFixed(0)}K`, sub: `${highUrgencyProspects.length} high urgency` },
            { icon: Clock, iconBg: 'bg-amber-600/20', iconColor: 'text-amber-400', label: 'Open Tickets', value: openTickets.length, sub: `${tickets.length} total` },
            { icon: Users, iconBg: 'bg-green-600/20', iconColor: 'text-green-400', label: 'Customers', value: customers.length, sub: 'Active accounts' },
          ].map(({ icon: Icon, iconBg, iconColor, label, value, sub }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`${iconBg} rounded-lg p-3`}><Icon className={`w-6 h-6 ${iconColor}`} /></div>
              </div>
              <p className="text-gray-400 text-sm mb-1">{label}</p>
              <p className="text-3xl font-bold text-white">{loading ? '...' : value}</p>
              <p className="text-xs text-gray-500 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { to: '/internal/leads', gradient: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800', icon: Search, title: 'Find New Leads', sub: 'Discover prospects' },
            { to: '/internal/customers', gradient: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800', icon: Users, title: 'Customers', sub: 'Manage accounts' },
            { to: "/internal/routes", gradient: "from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800", icon: MapPin, title: "Plan Routes", sub: "Optimize schedule" },
            { to: "/internal/pipeline", gradient: "from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800", icon: TrendingUp, title: "Pipeline", sub: "Track deal stages" },
            { to: '/internal/analytics', gradient: 'from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800', icon: TrendingUp, title: 'Analytics', sub: 'View metrics' },
          ].map(({ to, gradient, icon: Icon, title, sub }) => (
            <Link key={to} to={to} className={`bg-gradient-to-br ${gradient} rounded-xl p-5 transition-all`}>
              <Icon className="w-7 h-7 text-white mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
              <p className="text-white/70 text-sm">{sub}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Prospects */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white">Top Prospects</h3>
              <Link to="/internal/leads" className="text-purple-400 hover:text-purple-300 text-sm">View All →</Link>
            </div>
            <div className="space-y-3">
              {topProspects.map((prospect) => (
                <Link key={prospect.id} to={`/internal/prospect/${prospect.id}`}
                  className="flex items-center gap-4 bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-purple-500 transition-colors">
                  <div className="bg-purple-600/20 rounded-lg p-2.5 border border-purple-600/30 flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{prospect.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-400 text-xs">{prospect.city}, {prospect.state}</span>
                      {prospect.rating && <><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-gray-400 text-xs">{prospect.rating}</span></>}
                      {prospect.service_urgency && (
                        <span className={`px-1.5 py-0.5 rounded text-xs border ${urgencyColors[prospect.service_urgency]}`}>{prospect.service_urgency}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`font-bold text-xl ${prospect.lead_score >= 90 ? 'text-green-400' : prospect.lead_score >= 70 ? 'text-amber-400' : 'text-gray-400'}`}>{prospect.lead_score || '—'}</span>
                    <p className="text-gray-500 text-xs">score</p>
                  </div>
                </Link>
              ))}
              {prospects.length === 0 && !loading && <p className="text-gray-500 text-center py-8">No prospects found</p>}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Urgent Alerts */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />Urgent Alerts
              </h3>
              {highUrgencyProspects.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle className="w-4 h-4" />No urgent prospects</div>
              ) : (
                <div className="space-y-2">
                  {highUrgencyProspects.slice(0, 4).map(p => (
                    <Link key={p.id} to={`/internal/prospect/${p.id}`}
                      className="flex items-center justify-between p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-colors">
                      <span className="text-white text-sm truncate">{p.name}</span>
                      <span className="text-red-400 text-xs font-bold flex-shrink-0 ml-2">{p.lead_score}</span>
                    </Link>
                  ))}
                  {highUrgencyProspects.length > 4 && (
                    <Link to="/internal/leads" className="text-amber-400 text-xs hover:text-amber-300">+{highUrgencyProspects.length - 4} more →</Link>
                  )}
                </div>
              )}
            </div>

            {/* Open Tickets */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />Open Tickets
              </h3>
              {openTickets.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle className="w-4 h-4" />No open tickets</div>
              ) : (
                <div className="space-y-2">
                  {openTickets.slice(0, 4).map(t => (
                    <div key={t.id} className="p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg">
                      <p className="text-white text-sm truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${t.priority === 'high' ? 'bg-red-500/20 text-red-400' : t.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>{t.priority}</span>
                        <span className="text-gray-500 text-xs">{t.status}</span>
                      </div>
                    </div>
                  ))}
                  {openTickets.length > 4 && <p className="text-gray-500 text-xs">+{openTickets.length - 4} more tickets</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternalDashboard;
