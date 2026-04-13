import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, FileText, DollarSign, ArrowUpDown, MessageSquare, Calendar, Clock, CheckCircle, LogOut, Phone, AlertCircle, ChevronRight, Shield, Bell, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [elevators, setElevators] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const headers = {
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  useEffect(() => {
    Promise.all([
      api.getElevators().catch(() => []),
      api.getTickets().catch(() => []),
      api.getMaintenance().catch(() => []),
      fetch(BASE_URL + '/profile', { headers }).then(r => r.json()).catch(() => ({})),
    ]).then(([elev, tick, maint, prof]) => {
      setElevators(Array.isArray(elev) ? elev : []);
      setTickets(Array.isArray(tick) ? tick : []);
      setMaintenance(Array.isArray(maint) ? maint : []);
      setProfile(prof || {});
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, []);

  const operational = elevators.filter(e => e.status === 'operational' || !e.status).length;
  const outOfService = elevators.filter(e => e.status === 'out_of_service').length;
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const hasEmergency = openTickets.some(t => t.priority === 'emergency');

  const nextService = maintenance
    .filter(m => m.next_service_date && new Date(m.next_service_date) > new Date())
    .sort((a, b) => new Date(a.next_service_date) - new Date(b.next_service_date))[0];

  const daysUntilService = nextService
    ? Math.ceil((new Date(nextService.next_service_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const priorityConfig = {
    emergency: { color: 'text-red-400 bg-red-900/20 border-red-700/30', dot: 'bg-red-400' },
    high: { color: 'text-amber-400 bg-amber-900/20 border-amber-700/30', dot: 'bg-amber-400' },
    medium: { color: 'text-blue-400 bg-blue-900/20 border-blue-700/30', dot: 'bg-blue-400' },
    low: { color: 'text-gray-400 bg-gray-700/30 border-gray-600', dot: 'bg-gray-400' },
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Smarterlift</h1>
                <p className="text-xs text-gray-400">Customer Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {openTickets.length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-gray-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                    {openTickets.length}
                  </span>
                </div>
              )}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user?.name || 'Customer'}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button onClick={logout}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 text-sm transition-colors">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Greeting */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">
              {greeting()}{user?.name ? ', ' + user.name.split(' ')[0] : ''}
            </h2>
            <p className="text-gray-400">
              {outOfService > 0
                ? outOfService + ' elevator' + (outOfService > 1 ? 's' : '') + ' currently out of service — contact your service provider'
                : openTickets.length > 0
                ? openTickets.length + ' open service request' + (openTickets.length > 1 ? 's' : '') + ' in progress'
                : daysUntilService !== null
                ? 'Next scheduled service in ' + daysUntilService + ' days'
                : 'All systems operational — no upcoming service scheduled'}
            </p>
          </div>
          <p className="text-gray-500 text-sm hidden lg:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Emergency Banner — only shows when needed */}
        {hasEmergency && (
          <div className="mb-6 bg-red-900/20 border border-red-700/50 rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-900/40 rounded-lg flex items-center justify-center border border-red-700/40 flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Emergency Service Request Active</p>
                <p className="text-red-300 text-sm">Our team has been notified and is responding</p>
              </div>
            </div>
            {profile.phone && (
              <a href={'tel:' + profile.phone.replace(/\D/g, '')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 flex-shrink-0 transition-colors">
                <Phone className="w-4 h-4" />Call Now
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Elevators',
              value: loading ? '—' : elevators.length,
              sub: operational + ' operational',
              color: 'text-green-400',
              bg: 'bg-green-900/10 border-green-700/30',
              icon: ArrowUpDown,
            },
            {
              label: 'Open Requests',
              value: loading ? '—' : openTickets.length,
              sub: openTickets.length === 0 ? 'All clear' : hasEmergency ? 'Emergency active' : 'In progress',
              color: openTickets.length > 0 ? 'text-amber-400' : 'text-green-400',
              bg: openTickets.length > 0 ? 'bg-amber-900/10 border-amber-700/30' : 'bg-gray-800 border-gray-700',
              icon: Wrench,
            },
            {
              label: 'Next Service',
              value: loading ? '—' : daysUntilService !== null ? daysUntilService + 'd' : 'N/A',
              sub: nextService ? new Date(nextService.next_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not scheduled',
              color: daysUntilService !== null && daysUntilService <= 14 ? 'text-amber-400' : 'text-blue-400',
              bg: 'bg-blue-900/10 border-blue-700/30',
              icon: Calendar,
            },
            {
              label: 'Service Records',
              value: loading ? '—' : maintenance.length,
              sub: 'Total history',
              color: 'text-purple-400',
              bg: 'bg-purple-900/10 border-purple-700/30',
              icon: Shield,
            },
          ].map(({ label, value, sub, color, bg, icon: Icon }) => (
            <div key={label} className={`rounded-xl p-5 border ${bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-bold ${color} mb-0.5`}>{value}</p>
              <p className="text-gray-500 text-xs">{sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { to: '/customer/service-request', icon: Wrench, label: 'Request Service', sub: 'Submit a new request', gradient: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' },
            { to: '/customer/elevators', icon: ArrowUpDown, label: 'My Elevators', sub: 'View fleet status', gradient: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' },
            { to: '/customer/maintenance', icon: FileText, label: 'Service History', sub: 'View all records', gradient: 'from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800' },
            { to: '/customer/support', icon: MessageSquare, label: 'Get Support', sub: 'Contact our team', gradient: 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800' },
          ].map(({ to, icon: Icon, label, sub, gradient }) => (
            <Link key={to} to={to}
              className={`bg-gradient-to-br ${gradient} rounded-xl p-5 transition-all group`}>
              <Icon className="w-7 h-7 text-white mb-3" />
              <h3 className="text-white font-bold mb-0.5">{label}</h3>
              <p className="text-white/70 text-sm">{sub}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Open Service Requests */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Service Requests</h3>
              <Link to="/customer/service-request"
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors">
                New Request <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {openTickets.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-white font-medium">No open requests</p>
                <p className="text-gray-500 text-sm mt-1">All your service requests have been resolved</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openTickets.slice(0, 4).map(t => {
                  const pc = priorityConfig[t.priority] || priorityConfig.medium;
                  return (
                    <div key={t.id} className={`p-4 rounded-xl border ${pc.color}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${pc.dot}`}></div>
                          <div className="min-w-0">
                            <p className="text-white font-medium text-sm truncate">{t.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {t.ticket_number && <span className="text-gray-500 text-xs">{t.ticket_number}</span>}
                              <span className="text-gray-500 text-xs capitalize">{t.status?.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                        {t.assigned_technician && (
                          <span className="text-gray-400 text-xs flex-shrink-0">{t.assigned_technician}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {openTickets.length > 4 && (
                  <p className="text-gray-500 text-xs text-center">+{openTickets.length - 4} more requests</p>
                )}
              </div>
            )}
          </div>

          {/* Recent Maintenance */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Recent Maintenance</h3>
              <Link to="/customer/maintenance"
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition-colors">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {maintenance.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 font-medium">No service records yet</p>
                <p className="text-gray-500 text-sm mt-1">Service history will appear here after work is completed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenance.slice(0, 4).map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-3 bg-gray-700/40 rounded-xl border border-gray-600">
                    <div className="w-9 h-9 bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0 border border-purple-700/30">
                      <Wrench className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{m.service_type || 'Service'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.elevator_identifier && <span className="text-gray-400 text-xs">{m.elevator_identifier}</span>}
                        <span className="text-gray-500 text-xs">
                          {new Date(m.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {m.next_service_date && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-gray-500 text-xs">Next</p>
                        <p className="text-blue-400 text-xs font-medium">
                          {new Date(m.next_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Emergency Contact */}
            {profile.phone && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Emergency Line</p>
                    <p className="text-white text-sm font-medium mt-0.5">{profile.phone}</p>
                  </div>
                  <a href={'tel:' + profile.phone.replace(/\D/g, '')}
                    className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
                    <Phone className="w-3.5 h-3.5" />Call
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
