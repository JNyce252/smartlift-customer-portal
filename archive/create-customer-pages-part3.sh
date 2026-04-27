#!/bin/bash

echo "🏗️ Creating final customer portal pages..."

# 4. Maintenance History Page
cat > src/pages/customer/MaintenanceHistory.jsx << 'EOF'
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, Wrench, FileText, DollarSign, User, Clock, Download, Filter } from 'lucide-react';

const MaintenanceHistory = () => {
  const [selectedElevator, setSelectedElevator] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const elevators = ['All Elevators', 'Main Tower - Elevator 1', 'Main Tower - Elevator 2', 'South Wing - Elevator 1'];
  
  const serviceTypes = [
    { value: 'all', label: 'All Services' },
    { value: 'routine_maintenance', label: 'Routine Maintenance' },
    { value: 'emergency_repair', label: 'Emergency Repair' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'modernization', label: 'Modernization' },
  ];

  const maintenanceRecords = [
    {
      id: 1,
      elevator: 'Main Tower - Elevator 1',
      type: 'routine_maintenance',
      date: '2024-12-15',
      technician: 'Mike Johnson',
      duration: '2 hours',
      workPerformed: 'Performed quarterly maintenance: lubricated cables, checked safety systems, tested emergency brake, inspected door mechanisms',
      partsReplaced: ['Door sensor', 'Emergency light bulb'],
      cost: 450.00,
      nextService: '2025-03-15',
      status: 'completed',
      invoice: 'INV-2024-12-001',
      notes: 'All systems functioning normally. Recommended cable replacement in next 6 months.',
    },
    {
      id: 2,
      elevator: 'Main Tower - Elevator 2',
      type: 'emergency_repair',
      date: '2024-12-10',
      technician: 'Sarah Chen',
      duration: '4 hours',
      workPerformed: 'Emergency repair: Replaced faulty door motor, recalibrated door timing, tested safety mechanisms',
      partsReplaced: ['Door motor assembly', 'Door timing belt'],
      cost: 1250.00,
      nextService: '2025-02-20',
      status: 'completed',
      invoice: 'INV-2024-12-002',
      notes: 'Issue resolved. Door now operating smoothly.',
    },
    {
      id: 3,
      elevator: 'South Wing - Elevator 1',
      type: 'inspection',
      date: '2024-11-20',
      technician: 'David Martinez',
      duration: '3 hours',
      workPerformed: 'Annual safety inspection: Tested all safety systems, load testing, emergency systems check, compliance verification',
      partsReplaced: [],
      cost: 550.00,
      nextService: '2025-11-20',
      status: 'completed',
      invoice: 'INV-2024-11-003',
      notes: 'Passed all safety inspections. Certificate renewed.',
    },
  ];

  const getTypeIcon = (type) => {
    const icons = {
      routine_maintenance: Wrench,
      emergency_repair: CheckCircle,
      inspection: FileText,
      modernization: Calendar,
    };
    return icons[type] || Wrench;
  };

  const getTypeColor = (type) => {
    const colors = {
      routine_maintenance: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      emergency_repair: 'bg-red-500/20 text-red-400 border-red-500/30',
      inspection: 'bg-green-500/20 text-green-400 border-green-500/30',
      modernization: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[type] || colors.routine_maintenance;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/customer/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Dashboard</Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Maintenance History</h1>
          <p className="text-gray-400">View complete service records for all your elevators</p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Elevator</label>
              <select 
                value={selectedElevator}
                onChange={(e) => setSelectedElevator(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                {elevators.map((elevator, idx) => (
                  <option key={idx} value={elevator.toLowerCase().replace(/ /g, '-')}>{elevator}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Service Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                {serviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Calendar className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Services</p>
            <p className="text-3xl font-bold text-white">{maintenanceRecords.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <DollarSign className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Spent</p>
            <p className="text-3xl font-bold text-white">${maintenanceRecords.reduce((sum, r) => sum + r.cost, 0).toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Clock className="w-8 h-8 text-amber-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Avg Response Time</p>
            <p className="text-3xl font-bold text-white">2.5h</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Completed</p>
            <p className="text-3xl font-bold text-white">100%</p>
          </div>
        </div>

        {/* Maintenance Records */}
        <div className="space-y-6">
          {maintenanceRecords.map((record) => {
            const TypeIcon = getTypeIcon(record.type);
            return (
              <div key={record.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 p-4 border-b border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg border ${getTypeColor(record.type)}`}>
                        <TypeIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{record.elevator}</h3>
                        <p className="text-gray-400 text-sm">
                          {record.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-gray-400 text-sm">{record.duration}</p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-blue-400" />
                        <h4 className="text-white font-semibold">Technician</h4>
                      </div>
                      <p className="text-gray-300">{record.technician}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <h4 className="text-white font-semibold">Cost</h4>
                      </div>
                      <p className="text-2xl font-bold text-white">${record.cost.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-white font-semibold mb-3">Work Performed</h4>
                    <p className="text-gray-300 leading-relaxed">{record.workPerformed}</p>
                  </div>

                  {record.partsReplaced.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-white font-semibold mb-3">Parts Replaced</h4>
                      <div className="flex flex-wrap gap-2">
                        {record.partsReplaced.map((part, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm border border-blue-600/30">
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {record.notes && (
                    <div className="mb-6 bg-gray-900 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">Technician Notes</h4>
                      <p className="text-gray-400 text-sm">{record.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-gray-700">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Next Service Due</p>
                      <p className="text-white font-semibold">{new Date(record.nextService).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors">
                        <Download className="w-4 h-4" />
                        Invoice
                      </button>
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
                        <FileText className="w-4 h-4" />
                        Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Export Button */}
        <div className="mt-8 text-center">
          <button className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium border border-gray-600 transition-colors inline-flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Complete History (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceHistory;
EOF

echo "✅ Maintenance History page created!"

