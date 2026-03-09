import React, { useState } from 'react';
import { Home, AlertCircle, CheckCircle, Clock, Wrench, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const MyElevators = () => {
  const [selectedElevator, setSelectedElevator] = useState(null);

  const elevators = [
    {
      id: 1,
      name: 'Main Tower - Elevator 1',
      location: 'Building A, Floor 1-25',
      manufacturer: 'Otis',
      model: 'Gen2',
      serialNumber: 'OT-2015-001',
      installDate: '2015-06-15',
      lastService: '2024-12-15',
      nextService: '2025-03-15',
      status: 'operational',
      uptime: 99.8,
      capacity: '3500 lbs',
      floors: 25,
      issues: [],
      warranty: 'Active until 2026-06-15',
    },
    {
      id: 2,
      name: 'Main Tower - Elevator 2',
      location: 'Building A, Floor 1-25',
      manufacturer: 'Otis',
      model: 'Gen2',
      serialNumber: 'OT-2015-002',
      installDate: '2015-06-15',
      lastService: '2024-11-20',
      nextService: '2025-02-20',
      status: 'maintenance',
      uptime: 98.2,
      capacity: '3500 lbs',
      floors: 25,
      issues: ['Unusual noise reported', 'Scheduled for inspection'],
      warranty: 'Active until 2026-06-15',
    },
    {
      id: 3,
      name: 'South Wing - Elevator 1',
      location: 'Building B, Floor 1-15',
      manufacturer: 'Schindler',
      model: '3300',
      serialNumber: 'SC-2010-001',
      installDate: '2010-03-20',
      lastService: '2024-10-05',
      nextService: '2025-01-05',
      status: 'operational',
      uptime: 97.5,
      capacity: '2500 lbs',
      floors: 15,
      issues: [],
      warranty: 'Expired',
    },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      operational: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Operational' },
      maintenance: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock, label: 'Under Maintenance' },
      'out-of-service': { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle, label: 'Out of Service' },
    };
    return badges[status] || badges.operational;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/customer/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Dashboard</Link>
          <h1 className="text-3xl font-bold text-white mb-2">My Elevators</h1>
          <p className="text-gray-400">Manage and monitor all your elevators</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Home className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-bold text-white">{elevators.filter(e => e.status === 'operational').length}</span>
            </div>
            <p className="text-gray-400">Operational</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Wrench className="w-8 h-8 text-amber-400" />
              <span className="text-3xl font-bold text-white">{elevators.filter(e => e.status === 'maintenance').length}</span>
            </div>
            <p className="text-gray-400">Under Maintenance</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              <span className="text-3xl font-bold text-white">98.5%</span>
            </div>
            <p className="text-gray-400">Average Uptime</p>
          </div>
        </div>

        {/* Elevators Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {elevators.map((elevator) => {
            const statusBadge = getStatusBadge(elevator.status);
            return (
              <div key={elevator.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors">
                {/* Header */}
                <div className="bg-gray-900 p-4 border-b border-gray-700">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{elevator.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <MapPin className="w-4 h-4" />
                        {elevator.location}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${statusBadge.color}`}>
                      <statusBadge.icon className="w-4 h-4" />
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Manufacturer</p>
                      <p className="text-white font-semibold">{elevator.manufacturer} {elevator.model}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Capacity</p>
                      <p className="text-white font-semibold">{elevator.capacity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Floors Served</p>
                      <p className="text-white font-semibold">{elevator.floors} floors</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Uptime</p>
                      <p className="text-green-400 font-semibold">{elevator.uptime}%</p>
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="bg-gray-900 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <h4 className="text-white font-semibold">Service Schedule</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Last Service:</span>
                        <span className="text-white">{new Date(elevator.lastService).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Next Service:</span>
                        <span className="text-blue-400 font-semibold">{new Date(elevator.nextService).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Warranty:</span>
                        <span className={elevator.warranty.includes('Active') ? 'text-green-400' : 'text-red-400'}>
                          {elevator.warranty}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  {elevator.issues.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <h4 className="text-amber-400 font-semibold">Active Issues</h4>
                      </div>
                      <ul className="space-y-1 text-sm">
                        {elevator.issues.map((issue, idx) => (
                          <li key={idx} className="text-amber-300">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Link to={`/customer/service-request?elevator=${elevator.id}`} 
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg font-medium transition-colors">
                      Request Service
                    </Link>
                    <Link to={`/customer/maintenance?elevator=${elevator.id}`}
                      className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-center rounded-lg font-medium transition-colors">
                      View History
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Elevator Button */}
        <div className="mt-8 bg-gray-800 rounded-lg p-8 border border-dashed border-gray-600 text-center">
          <Home className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Add New Elevator</h3>
          <p className="text-gray-400 mb-4">Register a new elevator to start tracking service and maintenance</p>
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            + Add Elevator
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyElevators;
