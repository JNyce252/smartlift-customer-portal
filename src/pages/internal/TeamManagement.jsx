import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Phone, Mail, Calendar, CheckCircle, Clock, AlertCircle, Star } from 'lucide-react';

const TeamManagement = () => {
  const technicians = [
    {
      id: 1,
      name: 'Mike Johnson',
      email: 'mike.johnson@smartlift.com',
      phone: '(555) 123-4567',
      status: 'active',
      currentJob: 'Heritage Medical Center',
      jobsCompleted: 48,
      avgRating: 4.8,
      availability: 'Available',
      skills: ['Routine Maintenance', 'Emergency Repair', 'Modernization'],
      certifications: ['OSHA Certified', 'ASME A17.1'],
    },
    {
      id: 2,
      name: 'Sarah Chen',
      email: 'sarah.chen@smartlift.com',
      phone: '(555) 234-5678',
      status: 'on-job',
      currentJob: 'Grand Hyatt Hotel',
      jobsCompleted: 52,
      avgRating: 4.9,
      availability: 'Busy until 2:30 PM',
      skills: ['Routine Maintenance', 'Inspection', 'Electrical'],
      certifications: ['OSHA Certified', 'Electrical License', 'ASME A17.1'],
    },
    {
      id: 3,
      name: 'David Martinez',
      email: 'david.martinez@smartlift.com',
      phone: '(555) 345-6789',
      status: 'active',
      currentJob: null,
      jobsCompleted: 45,
      avgRating: 4.7,
      availability: 'Available',
      skills: ['Emergency Repair', 'Hydraulic Systems', 'Troubleshooting'],
      certifications: ['OSHA Certified', 'Hydraulic Specialist'],
    },
  ];

  const pendingAssignments = [
    {
      id: 1,
      customer: 'Skyline Residential',
      address: '789 Tower Blvd, Austin, TX',
      priority: 'high',
      type: 'Emergency Repair',
      scheduledTime: '4:00 PM',
    },
    {
      id: 2,
      customer: 'Downtown Office Tower',
      address: '555 Business St, Dallas, TX',
      priority: 'medium',
      type: 'Routine Maintenance',
      scheduledTime: 'Tomorrow 9:00 AM',
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      'on-job': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      offline: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status] || colors.offline;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/internal/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Dashboard</Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
          <p className="text-gray-400">Manage technicians and assign jobs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Users className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Technicians</p>
            <p className="text-3xl font-bold text-white">{technicians.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Available</p>
            <p className="text-3xl font-bold text-white">{technicians.filter(t => t.status === 'active').length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Clock className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">On Job</p>
            <p className="text-3xl font-bold text-white">{technicians.filter(t => t.status === 'on-job').length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Unassigned Jobs</p>
            <p className="text-3xl font-bold text-white">{pendingAssignments.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Technicians</h2>
            {technicians.map((tech) => (
              <div key={tech.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-600/20 rounded-lg p-3 border border-blue-600/30">
                      <Users className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{tech.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(tech.status)}`}>
                          {tech.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {tech.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {tech.email}
                        </span>
                      </div>
                      {tech.currentJob && (
                        <p className="text-sm text-blue-400">Currently at: {tech.currentJob}</p>
                      )}
                      <p className="text-sm text-gray-400 mt-1">{tech.availability}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-400 mb-2">
                      <Star className="w-5 h-5 fill-yellow-400" />
                      <span className="font-bold">{tech.avgRating}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{tech.jobsCompleted} jobs</p>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {tech.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs border border-blue-600/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {tech.certifications.map((cert, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs border border-green-600/30">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Assign Job
                  </button>
                  <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    View Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Pending Assignments</h2>
            <div className="space-y-4">
              {pendingAssignments.map((job) => (
                <div key={job.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{job.customer}</h3>
                      <p className="text-gray-400 text-sm mb-2">{job.address}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">{job.scheduledTime}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(job.priority)}`}>
                      {job.priority.toUpperCase()} PRIORITY
                    </span>
                    <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">
                      {job.type}
                    </span>
                  </div>

                  <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Assign Technician
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
