import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Phone, User, DollarSign, CheckCircle, TrendingUp } from 'lucide-react';

const CustomerManagement = () => {
  const customers = [
    {
      id: 1,
      name: 'Acme Hotel Group',
      contact: 'John Smith',
      phone: '(555) 123-4567',
      elevators: 12,
      revenue: 6400,
      uptime: 99.2,
    },
    {
      id: 2,
      name: 'Downtown Properties LLC',
      contact: 'Sarah Johnson',
      phone: '(555) 234-5678',
      elevators: 8,
      revenue: 4200,
      uptime: 98.7,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/internal/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back</Link>
        
        <h1 className="text-3xl font-bold text-white mb-2">Customer Management</h1>
        <p className="text-gray-400 mb-8">Manage all customer accounts</p>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <User className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm">Total Customers</p>
            <p className="text-3xl font-bold text-white">{customers.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Building2 className="w-8 h-8 text-purple-400 mb-3" />
            <p className="text-gray-400 text-sm">Total Elevators</p>
            <p className="text-3xl font-bold text-white">{customers.reduce((sum, c) => sum + c.elevators, 0)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <DollarSign className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm">Monthly Revenue</p>
            <p className="text-3xl font-bold text-white">${customers.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <TrendingUp className="w-8 h-8 text-amber-400 mb-3" />
            <p className="text-gray-400 text-sm">Avg Uptime</p>
            <p className="text-3xl font-bold text-white">98.9%</p>
          </div>
        </div>

        <div className="space-y-4">
          {customers.map((customer) => (
            <div key={customer.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600/20 rounded-lg p-3 border border-blue-600/30">
                    <Building2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{customer.name}</h3>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/30">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-gray-400 flex items-center gap-2 mb-1">
                      <User className="w-4 h-4" />
                      {customer.contact}
                    </p>
                    <p className="text-gray-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {customer.phone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-green-400">${customer.revenue.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm mt-2">{customer.elevators} Elevators</p>
                  <p className="text-green-400 text-sm">Uptime: {customer.uptime}%</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
                <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">View Details</button>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Call</button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">Schedule</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;
