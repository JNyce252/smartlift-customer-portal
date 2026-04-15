import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Phone, User, DollarSign, TrendingUp, AlertCircle, Archive, ArchiveRestore } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const CustomerManagement = () => {
  const { user, logout } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchCustomers = () => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    fetch(`${BASE_URL}/customers`, { headers })
      .then(r => r.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleArchive = async (id, archived) => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    await fetch(`${BASE_URL}/customers/${id}/archive`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ archived })
    });
    fetchCustomers();
  };

  const active = customers.filter(c => !c.archived);
  const archived = customers.filter(c => c.archived);
  const displayed = showArchived ? archived : active;
  const totalElevators = active.reduce((sum, c) => sum + parseInt(c.elevator_count || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Customer Management</h2>
            <p className="text-gray-400">Manage all customer accounts</p>
          </div>
          <button onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${showArchived ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
            <Archive className="w-4 h-4" />{showArchived ? `Active (${active.length})` : `Archived (${archived.length})`}
          </button>
        </div>

        {error && <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-400" /><p className="text-red-300">{error}</p></div>}

        {!showArchived && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: User, label: 'Total Customers', value: active.length, color: 'text-blue-400' },
              { icon: Building2, label: 'Total Elevators', value: totalElevators, color: 'text-purple-400' },
              { icon: DollarSign, label: 'Active Accounts', value: active.filter(c => c.account_status === 'active').length, color: 'text-green-400' },
              { icon: TrendingUp, label: 'Avg Elevators', value: active.length ? (totalElevators / active.length).toFixed(1) : 0, color: 'text-amber-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <Icon className={`w-6 h-6 ${color} mb-3`} />
                <p className="text-gray-400 text-sm mb-1">{label}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {displayed.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-xl">{showArchived ? 'No archived customers' : 'No customers found'}</p>
              {!showArchived && <p className="text-gray-500 text-sm mt-2">Customers appear here when prospects are marked as Won in the pipeline</p>}
            </div>
          ) : displayed.map((customer) => (
            <div key={customer.id} className={`bg-gray-800 rounded-xl border p-6 transition-colors ${customer.archived ? 'border-gray-600 opacity-75' : 'border-gray-700'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-bold text-lg">{customer.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${customer.account_status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {(customer.account_status || 'active').toUpperCase()}
                      </span>
                      {customer.archived && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-900/30 text-amber-400">ARCHIVED</span>}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      {customer.primary_contact_name && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{customer.primary_contact_name}</span>}
                      {customer.primary_contact_phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.primary_contact_phone}</span>}
                      {customer.city && <span>{customer.city}, {customer.state}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {customer.elevator_count > 0 && (
                    <div className="text-right mr-4">
                      <p className="text-gray-400 text-xs">Elevators</p>
                      <p className="text-purple-400 font-bold text-xl">{customer.elevator_count}</p>
                    </div>
                  )}
                  <button
                    onClick={() => handleArchive(customer.id, !customer.archived)}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${customer.archived ? 'bg-green-700/20 hover:bg-green-700/30 text-green-400' : 'bg-amber-700/20 hover:bg-amber-700/30 text-amber-400'}`}
                    title={customer.archived ? 'Restore' : 'Archive'}>
                    {customer.archived ? <><ArchiveRestore className="w-4 h-4" />Restore</> : <><Archive className="w-4 h-4" />Archive</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;
