import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, Star, LogOut, Brain, TrendingUp, Wrench, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const ProspectDetails = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getProspect(id)
      
      .then(setProspect)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading prospect data...</div>
    </div>
  );

  if (error || !prospect) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-red-400 text-xl">{error || 'Prospect not found'}</div>
    </div>
  );

  const urgencyColors = {
    high: 'text-red-400 bg-red-500/20 border-red-500/30',
    medium: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    low: 'text-green-400 bg-green-500/20 border-green-500/30',
  };

  const annualPotential = (prospect.estimated_elevators || 4) * 8000;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/leads"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Prospect Details</h1>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/internal/leads" className="text-purple-400 hover:text-purple-300 mb-6 inline-flex items-center gap-1">
          ← Back to Leads
        </Link>

        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-6">
              <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-600/30">
                <Building2 className="w-12 h-12 text-purple-400" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{prospect.name}</h2>
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  {prospect.address || prospect.city + ', ' + prospect.state}
                </div>
                {prospect.rating && (
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-semibold">{prospect.rating}</span>
                    <span className="text-gray-400">({Number(prospect.total_reviews).toLocaleString()} reviews)</span>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap mt-3">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30">{prospect.type}</span>
                  {prospect.service_urgency && (
                    <span className={'px-3 py-1 rounded-full text-sm border ' + (urgencyColors[prospect.service_urgency] || urgencyColors.low)}>
                      {prospect.service_urgency.toUpperCase()} URGENCY
                    </span>
                  )}
                  {prospect.modernization_candidate && (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm border border-amber-500/30">Modernization Candidate</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm mb-1">Lead Score</p>
              <p className="text-6xl font-bold text-purple-400">{prospect.lead_score}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {prospect.phone && (
              <a href={'tel:' + prospect.phone} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2">
                <Phone className="w-5 h-5" />Call Now
              </a>
            )}
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
              <Mail className="w-5 h-5" />Send Email
            </button>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2">
              <Clock className="w-5 h-5" />Schedule Visit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Building2 className="w-6 h-6 text-purple-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Est. Elevators</p>
            <p className="text-3xl font-bold text-white">{prospect.estimated_elevators || 'N/A'}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <TrendingUp className="w-6 h-6 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Est. Floors</p>
            <p className="text-3xl font-bold text-white">{prospect.estimated_floors || 'N/A'}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Clock className="w-6 h-6 text-amber-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Building Age</p>
            <p className="text-3xl font-bold text-white">{prospect.building_age ? prospect.building_age + 'yr' : 'N/A'}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <TrendingUp className="w-6 h-6 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Annual Potential</p>
            <p className="text-3xl font-bold text-green-400">${annualPotential.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-600/20 rounded-lg p-2"><Brain className="w-6 h-6 text-purple-400" /></div>
              <h3 className="text-xl font-bold text-white">AI Analysis</h3>
            </div>
            {prospect.ai_summary ? (
              <>
                <p className="text-gray-300 mb-4 leading-relaxed">{prospect.ai_summary}</p>
                <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
                  <p className="text-purple-300 text-sm font-semibold mb-2">Recommendation</p>
                  <p className="text-gray-300 text-sm">{prospect.ai_recommendation}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">AI analysis not yet available.</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Intelligence Scores</h3>
            <div className="space-y-4">
              {[
                { label: 'Lead Score', value: prospect.lead_score, max: 100, color: 'purple' },
                { label: 'Sentiment Score', value: prospect.sentiment_score ? parseFloat(prospect.sentiment_score) * 10 : null, display: prospect.sentiment_score, color: 'blue' },
                { label: 'Reputation Score', value: prospect.reputation_score ? parseFloat(prospect.reputation_score) * 10 : null, display: prospect.reputation_score, color: 'green' },
              ].map(({ label, value, color, display }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className="text-white font-semibold">{display !== undefined ? display : value || 'N/A'}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className={'h-2 rounded-full bg-gradient-to-r ' + (color === 'purple' ? 'from-purple-600 to-purple-400' : color === 'blue' ? 'from-blue-600 to-blue-400' : 'from-green-600 to-green-400')}
                      style={{ width: (value || 0) + '%' }} />
                  </div>
                </div>
              ))}
            </div>
            {prospect.common_issues && prospect.common_issues.length > 0 && (
              <div className="mt-6">
                <p className="text-gray-400 text-sm font-semibold mb-3">Common Issues</p>
                <div className="flex flex-wrap gap-2">
                  {prospect.common_issues.map((issue, i) => (
                    <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs border border-red-500/30 flex items-center gap-1">
                      <Wrench className="w-3 h-3" />{issue}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Contact and Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Phone</p>
              <p className="text-white">{prospect.phone || 'Not available'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Website</p>
              <p className="text-white">{prospect.website || 'Not available'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Status</p>
              <span className={'px-3 py-1 rounded-full text-sm border ' + (prospect.status === 'new' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : prospect.status === 'contacted' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30')}>
                {prospect.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProspectDetails;
