import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, Clock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';

const RouteOptimizer = () => {
  const [selectedDate, setSelectedDate] = useState('2026-01-20');

  const routes = [
    {
      id: 1,
      technician: 'Mike Johnson',
      phone: '(555) 123-4567',
      stops: 5,
      totalDistance: 24.3,
      estimatedTime: 6.5,
      status: 'in-progress',
      jobs: [
        { id: 1, customer: 'Acme Hotel Group', address: '123 Main St, Dallas, TX', time: '9:00 AM', duration: 1.5, status: 'completed' },
        { id: 2, customer: 'Heritage Medical Center', address: '321 Hospital Dr, Fort Worth, TX', time: '11:00 AM', duration: 2, status: 'in-progress' },
        { id: 3, customer: 'Downtown Properties LLC', address: '456 Commerce St, Houston, TX', time: '2:00 PM', duration: 1.5, status: 'scheduled' },
      ],
    },
    {
      id: 2,
      technician: 'Sarah Chen',
      phone: '(555) 234-5678',
      stops: 3,
      totalDistance: 18.7,
      estimatedTime: 5.5,
      status: 'scheduled',
      jobs: [
        { id: 1, customer: 'Grand Hyatt Hotel', address: '2525 Main St, Dallas, TX', time: '9:30 AM', duration: 2, status: 'scheduled' },
        { id: 2, customer: 'Marriott Downtown', address: '1500 Commerce St, Houston, TX', time: '12:00 PM', duration: 1.5, status: 'scheduled' },
      ],
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      scheduled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status] || colors.scheduled;
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4" />;
    if (status === 'in-progress') return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/internal/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back</Link>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Route Optimizer</h1>
            <p className="text-gray-400">Plan and optimize technician routes</p>
          </div>
          <div className="flex gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
              Optimize Routes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <User className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Active Technicians</p>
            <p className="text-3xl font-bold text-white">{routes.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <MapPin className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Stops</p>
            <p className="text-3xl font-bold text-white">{routes.reduce((sum, r) => sum + r.stops, 0)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Navigation className="w-8 h-8 text-purple-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Distance</p>
            <p className="text-3xl font-bold text-white">{routes.reduce((sum, r) => sum + r.totalDistance, 0).toFixed(1)} mi</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Clock className="w-8 h-8 text-amber-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Time</p>
            <p className="text-3xl font-bold text-white">{routes.reduce((sum, r) => sum + r.estimatedTime, 0).toFixed(1)} hrs</p>
          </div>
        </div>

        <div className="space-y-6">
          {routes.map((route) => (
            <div key={route.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="bg-gray-900 p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 rounded-lg p-3 border border-blue-600/30">
                      <User className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{route.technician}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {route.phone}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(route.status)}`}>
                          {route.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Stops</p>
                        <p className="text-xl font-bold text-white">{route.stops}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Distance</p>
                        <p className="text-xl font-bold text-white">{route.totalDistance} mi</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Time</p>
                        <p className="text-xl font-bold text-white">{route.estimatedTime} hrs</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {route.jobs.map((job, idx) => (
                    <div key={job.id} className="relative">
                      {idx < route.jobs.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-700" />
                      )}
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold border-4 border-gray-800 relative z-10">
                          {idx + 1}
                        </div>

                        <div className="flex-1 bg-gray-900 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-lg font-bold text-white mb-1">{job.customer}</h4>
                              <p className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4" />
                                {job.address}
                              </p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-gray-400 flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {job.time}
                                </span>
                                <span className="text-gray-400">Duration: {job.duration}h</span>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${getStatusColor(job.status)}`}>
                              {getStatusIcon(job.status)}
                              {job.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;
