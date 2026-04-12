import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut, AlertCircle, CheckCircle, Wrench, Clock, ChevronDown, ChevronUp, Calendar, Hash, Layers, Gauge, ArrowUpDown, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const MyElevators = () => {
  const { user, logout } = useAuth();
  const [elevators, setElevators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.getElevators()
      .then(data => setElevators(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const statusConfig = {
    operational: {
      label: 'Operational',
      color: 'text-green-400 bg-green-500/10 border-green-500/30',
      dot: 'bg-green-400',
      icon: CheckCircle,
    },
    maintenance: {
      label: 'In Maintenance',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      dot: 'bg-amber-400',
      icon: Wrench,
    },
    out_of_service: {
      label: 'Out of Service',
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
      dot: 'bg-red-400',
      icon: AlertCircle,
    },
  };

  const getAge = (installDate) => {
    if (!installDate) return null;
    const years = new Date().getFullYear() - new Date(installDate).getFullYear();
    return years;
  };

  const getAgeColor = (years) => {
    if (!years) return 'text-gray-400';
    if (years < 10) return 'text-green-400';
    if (years < 20) return 'text-amber-400';
    return 'text-red-400';
  };

  const getDaysUntilService = (nextServiceDate) => {
    if (!nextServiceDate) return null;
    const days = Math.ceil((new Date(nextServiceDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const operational = elevators.filter(e => e.status === 'operational' || !e.status).length;
  const maintenance = elevators.filter(e => e.status === 'maintenance').length;
  const outOfService = elevators.filter(e => e.status === 'out_of_service').length;

  return (
    <div className="min-h-screen bg-gray-900">
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
            <div className="flex items-center gap-3">
              <Link to="/customer/service-request"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Wrench className="w-4 h-4" />Request Service
              </Link>
              <button onClick={logout}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Fleet Status */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-5 border border-green-700/30 bg-green-900/10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <p className="text-gray-400 text-sm">Operational</p>
            </div>
            <p className="text-3xl font-bold text-green-400">{operational}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-amber-700/30 bg-amber-900/10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <p className="text-gray-400 text-sm">In Maintenance</p>
            </div>
            <p className="text-3xl font-bold text-amber-400">{maintenance}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-red-700/30 bg-red-900/10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <p className="text-gray-400 text-sm">Out of Service</p>
            </div>
            <p className="text-3xl font-bold text-red-400">{outOfService}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading your elevator fleet...</div>
        ) : elevators.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <ArrowUpDown className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No elevators registered</p>
            <p className="text-gray-500 text-sm mt-1">Contact your service provider to register your elevators</p>
          </div>
        ) : (
          <div className="space-y-4">
            {elevators.map(elevator => {
              const config = statusConfig[elevator.status] || statusConfig.operational;
              const StatusIcon = config.icon;
              const age = getAge(elevator.install_date);
              const daysUntilService = getDaysUntilService(elevator.next_service_date);
              const isExpanded = expanded === elevator.id;

              return (
                <div key={elevator.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">

                  {/* Main Row */}
                  <button className="w-full text-left p-6"
                    onClick={() => setExpanded(isExpanded ? null : elevator.id)}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">

                        {/* Status Indicator */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center border border-gray-600">
                            <ArrowUpDown className="w-6 h-6 text-blue-400" />
                          </div>
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${config.dot}`}></div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h3 className="text-white font-semibold text-lg">{elevator.elevator_identifier || 'Elevator #' + elevator.id}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
                              {config.label}
                            </span>
                            {daysUntilService !== null && daysUntilService <= 30 && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-900/20 text-amber-400 border-amber-700/30">
                                Service due in {daysUntilService} days
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            {elevator.manufacturer && (
                              <span className="text-gray-400 text-sm">{elevator.manufacturer}{elevator.model ? ' — ' + elevator.model : ''}</span>
                            )}
                            {age !== null && (
                              <span className={`text-sm font-medium ${getAgeColor(age)}`}>{age} years old</span>
                            )}
                            {elevator.last_service_date && (
                              <span className="text-gray-500 text-sm flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Last service: {new Date(elevator.last_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 px-6 pb-6 pt-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        {[
                          { icon: Gauge, label: 'Capacity', value: elevator.capacity_lbs ? elevator.capacity_lbs.toLocaleString() + ' lbs' : 'N/A' },
                          { icon: Layers, label: 'Floors Served', value: elevator.floors_served || 'N/A' },
                          { icon: Calendar, label: 'Installed', value: elevator.install_date ? new Date(elevator.install_date).getFullYear() : 'N/A' },
                          { icon: Hash, label: 'Serial Number', value: elevator.serial_number || 'N/A' },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className="w-3.5 h-3.5 text-gray-400" />
                              <p className="text-gray-400 text-xs">{label}</p>
                            </div>
                            <p className="text-white font-medium text-sm">{value}</p>
                          </div>
                        ))}
                      </div>

                      {elevator.last_modernization_date && (
                        <div className="bg-purple-900/10 border border-purple-700/30 rounded-lg p-3 mb-4">
                          <p className="text-purple-400 text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Last modernization: {new Date(elevator.last_modernization_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      )}

                      {elevator.next_service_date && (
                        <div className={`rounded-lg p-3 mb-4 border ${daysUntilService <= 14 ? 'bg-red-900/10 border-red-700/30' : daysUntilService <= 30 ? 'bg-amber-900/10 border-amber-700/30' : 'bg-blue-900/10 border-blue-700/30'}`}>
                          <p className={`text-sm flex items-center gap-2 ${daysUntilService <= 14 ? 'text-red-400' : daysUntilService <= 30 ? 'text-amber-400' : 'text-blue-400'}`}>
                            <Calendar className="w-4 h-4" />
                            Next scheduled service: {new Date(elevator.next_service_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            {daysUntilService !== null && ` (${daysUntilService > 0 ? daysUntilService + ' days away' : 'overdue'})`}
                          </p>
                        </div>
                      )}

                      {elevator.last_technician && (
                        <p className="text-gray-500 text-xs mb-4">Last serviced by: {elevator.last_technician}</p>
                      )}

                      {elevator.notes && (
                        <div className="bg-gray-700/30 rounded-lg p-3 mb-4">
                          <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Notes</p>
                          <p className="text-gray-300 text-sm">{elevator.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Link to={`/customer/service-request?elevator=${elevator.id}`}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium text-center transition-colors">
                          Request Service
                        </Link>
                        <Link to="/customer/maintenance"
                          className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium text-center transition-colors">
                          View Service History
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyElevators;
