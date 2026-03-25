import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Clock, Users, ArrowUp, Building2, LogOut, CheckCircle, Brain, AlertTriangle, Star, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const Analytics = () => {
  const { user, logout } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [tdlrStats, setTdlrStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };

    Promise.all([
      api.getCustomers(),
      api.getTickets(),
      api.getInvoices(),
      api.getProspects(),
      fetch(`${BASE_URL}/analytics/tdlr`, { headers }).then(r => r.json()).catch(() => null),
    ])
    .then(([c, t, i, p, td]) => {
      setCustomers(c);
      setTickets(t);
      setInvoices(i);
      setProspects(p);
      setTdlrStats(td);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const totalRevenue = invoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const completedTickets = tickets.filter(t => t.status === 'completed').length;
  const completionRate = tickets.length ? ((completedTickets / tickets.length) * 100).toFixed(1) : 0;
  const highScoreProspects = prospects.filter(p => p.lead_score >= 70).length;
  const avgLeadScore = prospects.length ? Math.round(prospects.reduce((sum, p) => sum + (p.lead_score || 0), 0) / prospects.length) : 0;
  const pipelineValue = prospects.reduce((sum, p) => sum + ((p.estimated_elevators || 3) * 8000), 0);
  const modernizationCandidates = prospects.filter(p => p.modernization_candidate).length;
  const urgencyBreakdown = {
    high: prospects.filter(p => p.service_urgency === 'high').length,
    medium: prospects.filter(p => p.service_urgency === 'medium').length,
    low: prospects.filter(p => p.service_urgency === 'low').length,
  };
  const topProspects = [...prospects].sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0)).slice(0, 5);

  const StatCard = ({ icon: Icon, iconColor, label, value, sub, badge }) => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-8 h-8 ${iconColor}`} />
        {badge && <span className="flex items-center gap-1 text-xs text-green-400"><ArrowUp className="w-3 h-3" />{badge}</span>}
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{loading ? '...' : value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
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
                <h1 className="text-xl font-bold text-white">Analytics</h1>
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
          <h2 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h2>
          <p className="text-gray-400">Live performance metrics and lead intelligence</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={DollarSign} iconColor="text-green-400" label="Total Revenue" value={`$${totalRevenue.toLocaleString('en', {maximumFractionDigits:0})}`} sub={`Paid: $${paidRevenue.toLocaleString('en', {maximumFractionDigits:0})}`} badge="Live" />
          <StatCard icon={Users} iconColor="text-blue-400" label="Active Customers" value={customers.length} badge="Live" />
          <StatCard icon={Clock} iconColor="text-amber-400" label="Open Tickets" value={tickets.filter(t => t.status === 'open').length} sub={`${completionRate}% completion rate`} />
          <StatCard icon={Brain} iconColor="text-purple-400" label="Lead Pipeline Value" value={`$${(pipelineValue/1000).toFixed(0)}K`} sub={`${prospects.length} prospects`} badge="AI" />
        </div>

        {/* AI Lead Intelligence */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />AI Lead Intelligence
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              ['Avg Lead Score', avgLeadScore, avgLeadScore >= 80 ? 'text-green-400' : 'text-amber-400'],
              ['High Priority (70+)', highScoreProspects, 'text-purple-400'],
              ['Modernization Candidates', modernizationCandidates, 'text-blue-400'],
              ['Annual Pipeline', `$${(pipelineValue/1000).toFixed(0)}K`, 'text-green-400'],
            ].map(([label, value, cls]) => (
              <div key={label} className="bg-gray-700/50 rounded-xl p-4 text-center border border-gray-600">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className={`font-bold text-2xl ${cls}`}>{loading ? '...' : value}</p>
              </div>
            ))}
          </div>

          {/* Urgency Breakdown */}
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-3">Service Urgency Breakdown</p>
            <div className="space-y-2">
              {[
                ['High Urgency', urgencyBreakdown.high, 'from-red-600 to-red-400', 'text-red-400'],
                ['Medium Urgency', urgencyBreakdown.medium, 'from-amber-600 to-amber-400', 'text-amber-400'],
                ['Low Urgency', urgencyBreakdown.low, 'from-green-600 to-green-400', 'text-green-400'],
              ].map(([label, value, gradient, textColor]) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className={`font-bold text-sm ${textColor}`}>{value} prospects</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className={`bg-gradient-to-r ${gradient} h-2 rounded-full`}
                      style={{ width: prospects.length ? `${(value / prospects.length) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Prospects */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />Top Prospects by Score
            </h3>
            <div className="space-y-3">
              {topProspects.map((p, i) => (
                <Link to={`/internal/prospect/${p.id}`} key={p.id}
                  className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-purple-500 transition-colors">
                  <span className="w-6 h-6 bg-purple-600/30 rounded-full text-purple-400 text-xs flex items-center justify-center font-bold">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-400 text-xs">{p.city}, {p.state}</span>
                      {p.service_urgency && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.service_urgency === 'high' ? 'bg-red-500/20 text-red-400' : p.service_urgency === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                          {p.service_urgency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`font-bold text-lg ${p.lead_score >= 90 ? 'text-green-400' : p.lead_score >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{p.lead_score}</span>
                    {p.rating && <div className="flex items-center gap-1 justify-end mt-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-gray-400 text-xs">{p.rating}</span></div>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Invoice + Ticket Summary */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />Invoice Summary
              </h3>
              <div className="space-y-3">
                {['paid', 'pending', 'overdue'].map(status => {
                  const statusInvoices = invoices.filter(i => i.status === status);
                  const statusTotal = statusInvoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
                  const pct = totalRevenue ? (statusTotal / totalRevenue * 100) : 0;
                  const colors = { paid: 'from-green-600 to-green-400', pending: 'from-amber-600 to-amber-400', overdue: 'from-red-600 to-red-400' };
                  const textColors = { paid: 'text-green-400', pending: 'text-amber-400', overdue: 'text-red-400' };
                  return (
                    <div key={status}>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400 text-sm capitalize">{status}</span>
                        <span className={`font-bold text-sm ${textColors[status]}`}>${statusTotal.toLocaleString('en', {maximumFractionDigits:0})} ({statusInvoices.length})</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className={`bg-gradient-to-r ${colors[status]} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />Ticket Priority
              </h3>
              <div className="space-y-3">
                {['high', 'medium', 'low'].map(priority => {
                  const count = tickets.filter(t => t.priority === priority).length;
                  const pct = tickets.length ? (count / tickets.length * 100) : 0;
                  const colors = { high: 'from-red-600 to-red-400', medium: 'from-amber-600 to-amber-400', low: 'from-green-600 to-green-400' };
                  const textColors = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-green-400' };
                  return (
                    <div key={priority}>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400 text-sm capitalize">{priority} Priority</span>
                        <span className={`font-bold text-sm ${textColors[priority]}`}>{count} tickets</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className={`bg-gradient-to-r ${colors[priority]} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Lead Status Pipeline */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-400" />Lead Status Pipeline
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['New', prospects.filter(p => p.status === 'new').length, 'bg-blue-500/20 border-blue-500/30 text-blue-400'],
              ['Contacted', prospects.filter(p => p.status === 'contacted').length, 'bg-amber-500/20 border-amber-500/30 text-amber-400'],
              ['Proposal Sent', prospects.filter(p => p.status === 'proposal_sent').length, 'bg-purple-500/20 border-purple-500/30 text-purple-400'],
              ['Won', prospects.filter(p => p.status === 'won').length, 'bg-green-500/20 border-green-500/30 text-green-400'],
            ].map(([label, value, cls]) => (
              <div key={label} className={`rounded-xl p-4 text-center border ${cls}`}>
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className={`font-bold text-3xl ${cls.split(' ')[2]}`}>{loading ? '...' : value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
