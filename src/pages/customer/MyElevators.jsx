import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut, AlertCircle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const MyElevators = () => {
  const { user, logout } = useAuth();
  const [elevators, setElevators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getElevators().then(setElevators).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const statusConfig = {
    operational: { color: 'text-green-400 bg-green-500/20 border-green-500/30', icon: CheckCircle },
    maintenance: { color: 'text-amber-400 bg-amber-500/20 border-amber-500/30', icon: Wrench },
    out_of_service: { color: 'text-red-400 bg-red-500/20 border-red-500/30', icon: AlertCircle },
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
              <Link to="/customer/dashboard"><Home className="w-8 h-8 text-blue-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">My Elevators</h1>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Elevators</h2>
            <p className="text-gray-400">{elevators.length} elevator{elevators.length !== 1 ? 's' : ''} registered</p>
          </div>
          <Link to="/customer/service-request" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Request Service
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elevators.map((elevator) => {
            const config = statusConfig[elevator.status] || statusConfig.operational;
            const StatusIcon = config.icon;
            return (
              <div key={elevator.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{elevator.elevator_identifier}</h3>
                    <p className="text-sm text-gray-400">{elevator.manufacturer} {elevator.model}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${config.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {elevator.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Capacity</span>
                    <span className="text-white">{elevator.capacity_lbs} lbs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Floors Served</span>
                    <span className="text-white">{elevator.floors_served}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Install Date</span>
                    <span className="text-white">{elevator.install_date ? new Date(elevator.install_date).getFullYear() : 'N/A'}</span>
                  </div>
                  {elevator.serial_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Serial #</span>
                      <span className="text-white">{elevator.serial_number}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <Link to="/customer/service-request" className="w-full block text-center py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-sm font-medium transition-colors border border-blue-600/30">
                    Request Service
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {elevators.length === 0 && !loading && (
          <div className="text-center py-16">
            <Home className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">No elevators found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyElevators;
