import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, Star } from 'lucide-react';

const ProspectDetails = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/internal/leads" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Leads</Link>
        
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div className="flex items-start gap-6 mb-6">
            <Building2 className="w-12 h-12 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Grand Hyatt Hotel</h1>
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <MapPin className="w-4 h-4" />
                2525 Main St, Dallas, TX 75201
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-white">4.2</span>
                <span className="text-gray-400">(1847 reviews)</span>
              </div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-gray-400 text-sm">Lead Score</p>
              <p className="text-5xl font-bold text-blue-400">92</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Estimated Elevators</p>
              <p className="text-2xl font-bold text-white">8</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Floors</p>
              <p className="text-2xl font-bold text-white">25</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Annual Potential</p>
              <p className="text-2xl font-bold text-green-400">$48,000</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call Now
            </button>
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProspectDetails;
