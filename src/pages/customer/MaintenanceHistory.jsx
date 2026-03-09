import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut, AlertCircle, Wrench, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const MaintenanceHistory = () => {
  const { user, logout } = useAuth();
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMaintenance().then(setMaintenance).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

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
              <Link to="/customer/dashboard"><Home className="w-8 h-8 text-blue-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Maintenance History</h1>
                <p className="text-xs text-gray-400">{user?.name}</p>
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
          <h2 className="text-3xl font-bold text-white mb-2">Maintenance History</h2>
          <p className="text-gray-400">{maintenance.length} service record{maintenance.length !== 1 ? 's' : ''}</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" /><p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {maintenance.map((record) => (
            <div key={record.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{record.service_type?.replace('_', ' ').toUpperCase()}</h3>
                  <p className="text-sm text-gray-400">{record.elevator_identifier}</p>
                </div>
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium border border-blue-600/30 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(record.service_date).toLocaleDateString()}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Technician</p>
                  <p className="text-white text-sm">{record.technician_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Cost</p>
                  <p className="text-white text-sm">${parseFloat(record.cost || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Next Service</p>
                  <p className="text-white text-sm">{record.next_service_date ? new Date(record.next_service_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              {record.work_performed && (
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Wrench className="w-3 h-3" /> Work Performed</p>
                  <p className="text-gray-300 text-sm">{record.work_performed}</p>
                </div>
              )}
            </div>
          ))}
          {maintenance.length === 0 && !loading && (
            <div className="text-center py-16">
              <Wrench className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-xl">No maintenance records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceHistory;
