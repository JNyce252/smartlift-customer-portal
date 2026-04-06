import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wrench, FileText, DollarSign, Home, 
  MessageSquare, Calendar, TrendingUp, Clock, CheckCircle,
  LogOut, Bell, Phone, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [elevators, setElevators] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [elevData, tickData, invData, maintData] = await Promise.all([
          api.getElevators(),
          api.getTickets(),
          api.getInvoices(),
          api.getMaintenance(),
        ]);
        setElevators(elevData);
        setTickets(tickData);
        setInvoices(invData);
        setMaintenance(maintData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeElevators = elevators.filter(e => e.status === 'operational').length;
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const nextMaintenance = maintenance.filter(m => m.next_service_date).sort((a, b) => 
    new Date(a.next_service_date) - new Date(b.next_service_date))[0];
  const daysUntilService = nextMaintenance 
    ? Math.ceil((new Date(nextMaintenance.next_service_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusColor = (status) => {
    const colors = {
      operational: 'text-green-400 bg-green-500/20 border-green-500/30',
      'in-progress': 'text-amber-400 bg-amber-500/20 border-amber-500/30',
      'in_progress': 'text-amber-400 bg-amber-500/20 border-amber-500/30',
      completed: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      paid: 'text-green-400 bg-green-500/20 border-green-500/30',
      scheduled: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      open: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    };
    return colors[status] || 'text-gray-400 bg-gray-500/20 border-gray-500/30';
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
              <Home className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Smarterlift</h1>
                <p className="text-xs text-gray-400">{user?.name || 'Customer'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-white relative">
                <Bell className="w-5 h-5" />
                {openTickets > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
              <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name || 'Customer'}!</h2>
          <p className="text-gray-400">Manage your elevator service and maintenance</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">Failed to load data: {error}</p>
          </div>
        )}

        <div className="mb-8 bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 border-2 border-red-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-full p-4">
                <Phone className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Emergency Service</h3>
                <p className="text-red-100">24/7 immediate assistance for elevator emergencies</p>
              </div>
            </div>
            <button className="px-8 py-4 bg-white text-red-600 font-bold text-lg rounded-lg hover:bg-red-50 transition-colors">
              Call Now: (555) 911-LIFT
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-600/20 rounded-lg p-3"><Home className="w-6 h-6 text-green-400" /></div>
              <span className="px-3 py-1 rounded-full text-xs font-medium border text-green-400 bg-green-500/20 border-green-500/30">OPERATIONAL</span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Active Elevators</p>
            <p className="text-3xl font-bold text-white">{activeElevators}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-amber-600/20 rounded-lg p-3"><Wrench className="w-6 h-6 text-amber-400" /></div>
              <span className="px-3 py-1 rounded-full text-xs font-medium border text-amber-400 bg-amber-500/20 border-amber-500/30">IN PROGRESS</span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Open Tickets</p>
            <p className="text-3xl font-bold text-white">{openTickets}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-600/20 rounded-lg p-3"><DollarSign className="w-6 h-6 text-green-400" /></div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${overdueAmount > 0 ? 'text-red-400 bg-red-500/20 border-red-500/30' : 'text-green-400 bg-green-500/20 border-green-500/30'}`}>
                {overdueAmount > 0 ? 'OVERDUE' : 'PAID'}
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Overdue Payments</p>
            <p className="text-3xl font-bold text-white">${overdueAmount.toFixed(0)}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-600/20 rounded-lg p-3"><Calendar className="w-6 h-6 text-blue-400" /></div>
              <span className="px-3 py-1 rounded-full text-xs font-medium border text-blue-400 bg-blue-500/20 border-blue-500/30">SCHEDULED</span>
            </div>
            <p className="text-gray-400 text-sm mb-1">Next Service</p>
            <p className="text-3xl font-bold text-white">{daysUntilService ? `${daysUntilService}d` : 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/customer/service-request" className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg p-6 transition-all">
            <Wrench className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Request Service</h3>
            <p className="text-blue-100 text-sm">Submit a new service ticket</p>
          </Link>
          <Link to="/customer/elevators" className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg p-6 transition-all">
            <Home className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">My Elevators</h3>
            <p className="text-green-100 text-sm">View all elevator status</p>
          </Link>
          <Link to="/customer/maintenance" className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg p-6 transition-all">
            <FileText className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Service History</h3>
            <p className="text-purple-100 text-sm">View maintenance records</p>
          </Link>
          <Link to="/customer/billing" className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-lg p-6 transition-all">
            <DollarSign className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Billing</h3>
            <p className="text-amber-100 text-sm">Pay invoices online</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Recent Tickets</h3>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-4">
              {tickets.slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">{ticket.title}</h4>
                      <p className="text-sm text-gray-400">{ticket.elevator_identifier}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                      {ticket.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{ticket.priority?.toUpperCase()} priority</p>
                </div>
              ))}
              {tickets.length === 0 && <p className="text-gray-500 text-center py-4">No tickets found</p>}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Recent Maintenance</h3>
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-4">
              {maintenance.slice(0, 2).map((m) => (
                <div key={m.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold">{m.elevator_identifier}</h4>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-medium border border-blue-600/30">
                      {new Date(m.service_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{m.service_type}</p>
                  <p className="text-xs text-gray-500">Technician: {m.technician_name}</p>
                </div>
              ))}
              {maintenance.length === 0 && <p className="text-gray-500 text-center py-4">No maintenance records found</p>}
              <Link to="/customer/service-request" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-center">
                Schedule New Service
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-6 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MessageSquare className="w-8 h-8 text-blue-400" />
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Need Help?</h3>
                <p className="text-gray-400">Chat with our support team or browse FAQs</p>
              </div>
            </div>
            <Link to="/customer/support" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Get Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
