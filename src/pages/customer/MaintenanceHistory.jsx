import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut, AlertCircle, Wrench, Calendar, Building2, User, DollarSign, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const MaintenanceHistory = () => {
  const { user, logout } = useAuth();
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    api.getMaintenance()
      .then(data => setMaintenance(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const serviceTypes = [...new Set(maintenance.map(m => m.service_type).filter(Boolean))];

  const filtered = maintenance.filter(m =>
    filterType === 'all' || m.service_type === filterType
  );

  const totalCost = maintenance.reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
  const thisYear = maintenance.filter(m => new Date(m.service_date).getFullYear() === new Date().getFullYear()).length;

  const serviceTypeColors = {
    'Preventive Maintenance': 'bg-green-900/30 text-green-400 border-green-700/30',
    'Emergency Repair': 'bg-red-900/30 text-red-400 border-red-700/30',
    'Inspection': 'bg-blue-900/30 text-blue-400 border-blue-700/30',
    'Modernization': 'bg-purple-900/30 text-purple-400 border-purple-700/30',
    'Parts Replacement': 'bg-amber-900/30 text-amber-400 border-amber-700/30',
    'Safety Test': 'bg-teal-900/30 text-teal-400 border-teal-700/30',
  };

  return (
    <div className="min-h-screen bg-gray-900">
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
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 text-sm">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Records</p>
            <p className="text-3xl font-bold text-white mt-1">{maintenance.length}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-sm">This Year</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">{thisYear}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Invested</p>
            <p className="text-3xl font-bold text-green-400 mt-1">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-500">
            <option value="all">All Service Types</option>
            {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="text-gray-500 text-sm">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" /><p className="text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading maintenance records...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg">No maintenance records yet</p>
            <p className="text-gray-500 text-sm mt-1">Service history will appear here after work is completed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => (
              <div key={record.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <button className="w-full text-left p-5 hover:bg-gray-750 transition-colors"
                  onClick={() => setExpanded(expanded === record.id ? null : record.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-700/30">
                        <Wrench className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${serviceTypeColors[record.service_type] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                            {record.service_type || 'Service'}
                          </span>
                          {record.elevator_identifier && (
                            <span className="text-gray-400 text-xs">Elevator: {record.elevator_identifier}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(record.service_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          {record.technician_name && (
                            <span className="text-gray-400 text-sm flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />{record.technician_name}
                            </span>
                          )}
                          {record.cost > 0 && (
                            <span className="text-green-400 text-sm flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" />{parseFloat(record.cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expanded === record.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </div>
                </button>

                {expanded === record.id && (
                  <div className="px-5 pb-5 border-t border-gray-700 pt-4 space-y-4">
                    {record.work_performed && (
                      <div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Work Performed</p>
                        <p className="text-gray-300 text-sm leading-relaxed bg-gray-900/50 rounded-lg p-3">{record.work_performed}</p>
                      </div>
                    )}
                    {(() => {
                      // CM-4: defensive parse. Pre-fix the inline JSON.parse
                      // would throw on a malformed parts_replaced column,
                      // crashing the maintenance history page for every
                      // customer. Falls back to empty array if parse fails.
                      let parts = [];
                      try {
                        parts = Array.isArray(record.parts_replaced)
                          ? record.parts_replaced
                          : (record.parts_replaced ? JSON.parse(record.parts_replaced) : []);
                      } catch (e) {
                        console.warn('[MaintenanceHistory] failed to parse parts_replaced for record', record.id, e.message);
                        parts = [];
                      }
                      if (!parts.length) return null;
                      return (
                        <div>
                          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Parts Replaced</p>
                          <div className="flex flex-wrap gap-2">
                            {parts.map((part, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">{part}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {record.next_service_date && (
                      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                        <p className="text-blue-400 text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Next scheduled service: {new Date(record.next_service_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceHistory;
