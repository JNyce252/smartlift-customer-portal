import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Phone, User, DollarSign, TrendingUp, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const CustomerManagement = () => {
  const { user, logout } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const totalElevators = customers.reduce((sum, c) => sum + parseInt(c.elevator_count || 0), 0);

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
                <h1 className="text-xl font-bold text-white">Customer Management</h1>
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
          <h2 className="text-3xl font-bold text-white mb-2">Customer Management</h2>
          <p className="text-gray-400">Manage all customer accounts</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" /><p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <User className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm">Total Customers</p>
            <p className="text-3xl font-bold text-white">{customers.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Building2 className="w-8 h-8 text-purple-400 mb-3" />
            <p className="text-gray-400 text-sm">Total Elevators</p>
            <p className="text-3xl font-bold text-white">{totalElevators}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <DollarSign className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm">Active Accounts</p>
            <p className="text-3xl font-bold text-white">{customers.filter(c => c.account_status === 'active').length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <TrendingUp className="w-8 h-8 text-amber-400 mb-3" />
            <p className="text-gray-400 text-sm">Avg Elevators</p>
            <p className="text-3xl font-bold text-white">{customers.length ? (totalElevators / customers.length).toFixed(1) : 0}</p>
          </div>
        </div>

        <div className="space-y-4">
          {customers.map((customer) => (
            <div key={customer.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-600/20 rounded-lg p-3 border border-purple-600/30">
                    <Building2 className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{customer.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        customer.account_status === 'active' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>
                        {(customer.account_status || 'active').toUpperCase()}
                      </span>
                    </div>
                    {customer.primary_contact_name && (
                      <p className="text-gray-400 flex items-center gap-2 mb-1">
                        <User className="w-4 h-4" />{customer.primary_contact_name}
                      </p>
                    )}
                    {customer.primary_contact_phone && (
                      <p className="text-gray-400 flex items-center gap-2 mb-1">
                        <Phone className="w-4 h-4" />{customer.primary_contact_phone}
                      </p>
                    )}
                    {customer.city && (
                      <p className="text-gray-500 text-sm">{customer.city}, {customer.state}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-1">Elevators</p>
                  <p className="text-2xl font-bold text-purple-400">{customer.elevator_count}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
                <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">View Details</button>
                {customer.primary_contact_phone && (
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">Call</button>
                )}
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Schedule</button>
              </div>
            </div>
          ))}
          {customers.length === 0 && !loading && (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-xl">No customers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;
