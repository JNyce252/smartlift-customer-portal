import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, MapPin, Star, Phone, Mail, Eye } from 'lucide-react';

const LeadSearch = () => {
  const leads = [
    {
      id: 1,
      name: 'Grand Hyatt Hotel',
      address: '2525 Main St, Dallas, TX 75201',
      leadScore: 92,
      rating: 4.2,
      reviews: 1847,
      issues: ['slow elevators', 'frequent breakdowns'],
    },
    {
      id: 2,
      name: 'Marriott Downtown',
      address: '1500 Commerce St, Houston, TX 77002',
      leadScore: 85,
      rating: 4.5,
      reviews: 2341,
      issues: ['maintenance complaints'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/internal/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Dashboard</Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI-Powered Lead Search</h1>
          <p className="text-gray-400">Find elevator service opportunities</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, address, or city..."
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <Building2 className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{lead.name}</h3>
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <MapPin className="w-4 h-4" />
                      {lead.address}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-white">{lead.rating}</span>
                      <span className="text-gray-400">({lead.reviews} reviews)</span>
                    </div>
                    <div className="flex gap-2">
                      {lead.issues.map((issue, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-1">Lead Score</p>
                  <p className="text-3xl font-bold text-blue-400">{lead.leadScore}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <Link 
                  to={`/internal/prospect/${lead.id}`}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" />
                  View Details
                </Link>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Call
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadSearch;
