import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Clock, Users, ArrowUp, Building2, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const Analytics = () => {
  const { user, logout } = useAuth();
  const [timeframe, setTimeframe] = useState('month');
  const [customers, setCustomers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getTickets(), api.getInvoices(), api.getProspects()])
      .then(([c, t, i, p]) => { setCustomers(c); setTickets(t); setInvoices(i); setProspects(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = invoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const paidRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const completedTickets = tickets.filter(t => t.status === 'completed').length;
  const completionRate = tickets.length ? ((completedTickets / tickets.length) * 100).toFixed(1) : 0;
  const highScoreProspects = prospects.filter(p => p.lead_score >= 70).length;

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h2>
            <p className="text-gray-400">Performance metrics and insights</p>
          </div>
          <div className="flex gap-2">
            {['week', 'month', 'quarter', 'year'].map((period) => (
              <button key={period} onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${timeframe === period ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div className="flex items-center gap-1 text-sm text-green-400"><ArrowUp className="w-4 h-4" />Live</div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-white">{loading ? '...' : `$${totalRevenue.toFixed(0)}`}</p>
            <p className="text-xs text-gray-500 mt-1">Paid: ${paidRevenue.toFixed(0)}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <div className="flex items-center gap-1 text-sm text-green-400"><ArrowUp className="w-4 h-4" />Live</div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Active Customers</p>
            <p className="text-3xl font-bold text-white">{loading ? '...' : customers.length}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-gray-400 text-sm mb-1">Open Tickets</p>
            <p className="text-3xl font-bold text-white">{loading ? '...' : tickets.filter(t => t.status === 'open').length}</p>
            <p className="text-xs text-gray-500 mt-1">Total: {tickets.length}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm mb-1">Completion Rate</p>
            <p className="text-3xl font-bold text-white">{loading ? '...' : `${completionRate}%`}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6">Invoice Summary</h3>
            <div className="space-y-4">
              {['paid', 'pending', 'overdue'].map(status => {
                const statusInvoices = invoices.filter(i => i.status === status);
                const statusTotal = statusInvoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
                const pct = totalRevenue ? (statusTotal / totalRevenue * 100) : 0;
                const colors = { paid: 'from-green-600 to-green-400', pending: 'from-amber-600 to-amber-400', overdue: 'from-red-600 to-red-400' };
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 capitalize">{status}</span>
                      <span className="text-white font-semibold">${statusTotal.toFixed(0)} ({statusInvoices.length})</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className={`bg-gradient-to-r ${colors[status]} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6">Lead Pipeline</h3>
            <div className="space-y-4">
              {[
                { label: 'Total Prospects', value: prospects.length, color: 'from-purple-600 to-purple-400' },
                { label: 'High Score (70+)', value: highScoreProspects, color: 'from-green-600 to-green-400' },
                { label: 'Contacted', value: prospects.filter(p => p.status === 'contacted').length, color: 'from-blue-600 to-blue-400' },
                { label: 'New', value: prospects.filter(p => p.status === 'new').length, color: 'from-amber-600 to-amber-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-white font-semibold">{loading ? '...' : item.value}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className={`bg-gradient-to-r ${item.color} h-2 rounded-full`}
                      style={{ width: prospects.length ? `${(item.value / prospects.length) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
