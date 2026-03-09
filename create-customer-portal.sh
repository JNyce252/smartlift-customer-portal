#!/bin/bash

echo "🏗️ Building Enhanced Customer Portal..."

# 1. Enhanced Customer Dashboard
cat > src/pages/customer/CustomerDashboard.jsx << 'EOF'
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, Wrench, FileText, DollarSign, Home, 
  MessageSquare, Calendar, TrendingUp, Clock, CheckCircle,
  LogOut, Bell, Phone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();

  const quickStats = [
    { label: 'Active Elevators', value: '3', status: 'operational', icon: Home, color: 'green' },
    { label: 'Open Tickets', value: '1', status: 'in-progress', icon: Wrench, color: 'amber' },
    { label: 'Overdue Payments', value: '$0', status: 'paid', icon: DollarSign, color: 'green' },
    { label: 'Next Service', value: '15 days', status: 'scheduled', icon: Calendar, color: 'blue' },
  ];

  const recentActivity = [
    { type: 'service', title: 'Routine Maintenance Completed', elevator: 'Main Tower - Elevator 1', time: '2 hours ago', status: 'completed' },
    { type: 'ticket', title: 'Unusual Noise Reported', elevator: 'Main Tower - Elevator 2', time: '1 day ago', status: 'in-progress' },
    { type: 'payment', title: 'Invoice #2024-12-001 Paid', amount: '$487.13', time: '3 days ago', status: 'completed' },
  ];

  const upcomingMaintenance = [
    { elevator: 'Main Tower - Elevator 1', date: 'Jan 28, 2026', type: 'Quarterly Inspection', technician: 'Mike Johnson' },
    { elevator: 'South Wing - Elevator 1', date: 'Feb 05, 2026', type: 'Routine Maintenance', technician: 'Sarah Chen' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      operational: 'text-green-400 bg-green-500/20 border-green-500/30',
      'in-progress': 'text-amber-400 bg-amber-500/20 border-amber-500/30',
      completed: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      paid: 'text-green-400 bg-green-500/20 border-green-500/30',
      scheduled: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    };
    return colors[status] || 'text-gray-400 bg-gray-500/20 border-gray-500/30';
  };

  const getColorClasses = (color) => {
    const colors = {
      green: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
      amber: 'from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800',
      blue: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
    };
    return colors[color];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Home className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">SmartLift Customer Portal</h1>
                <p className="text-xs text-gray-400">Acme Hotel Group</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-white relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name || 'Customer'}!</h2>
          <p className="text-gray-400">Manage your elevator service and maintenance</p>
        </div>

        {/* Emergency Button */}
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`bg-${stat.color}-600/20 rounded-lg p-3`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(stat.status)}`}>
                  {stat.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/customer/service-request" className={`bg-gradient-to-br ${getColorClasses('blue')} rounded-lg p-6 transition-all`}>
            <Wrench className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Request Service</h3>
            <p className="text-blue-100 text-sm">Submit a new service ticket</p>
          </Link>

          <Link to="/customer/elevators" className={`bg-gradient-to-br ${getColorClasses('green')} rounded-lg p-6 transition-all`}>
            <Home className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">My Elevators</h3>
            <p className="text-green-100 text-sm">View all elevator status</p>
          </Link>

          <Link to="/customer/maintenance" className={`bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg p-6 transition-all`}>
            <FileText className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Service History</h3>
            <p className="text-purple-100 text-sm">View maintenance records</p>
          </Link>

          <Link to="/customer/billing" className={`bg-gradient-to-br ${getColorClasses('amber')} rounded-lg p-6 transition-all`}>
            <DollarSign className="w-8 h-8 text-white mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Billing</h3>
            <p className="text-amber-100 text-sm">Pay invoices online</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Recent Activity</h3>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">{activity.title}</h4>
                      <p className="text-sm text-gray-400">{activity.elevator || activity.amount}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(activity.status)}`}>
                      {activity.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Maintenance */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Upcoming Maintenance</h3>
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-4">
              {upcomingMaintenance.map((maintenance, idx) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold">{maintenance.elevator}</h4>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs font-medium border border-blue-600/30">
                      {maintenance.date}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{maintenance.type}</p>
                  <p className="text-xs text-gray-500">Technician: {maintenance.technician}</p>
                </div>
              ))}
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Schedule New Service
              </button>
            </div>
          </div>
        </div>

        {/* Help Section */}
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
EOF

echo "✅ Enhanced Customer Dashboard created!"
