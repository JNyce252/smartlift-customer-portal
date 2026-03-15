import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, MapPin, Phone, Star, LogOut, Brain, TrendingUp, Wrench, Clock, AlertTriangle, CheckCircle, Calendar, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const ProspectDetails = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [prospect, setProspect] = useState(null);
  const [tdlr, setTdlr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };

    Promise.all([
      fetch(`${BASE_URL}/prospects/${id}`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/prospects/${id}/tdlr`, { headers }).then(r => r.json()).catch(() => null)
    ])
    .then(([p, t]) => { setProspect(p); setTdlr(t); })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center"><Brain className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-pulse" /><p className="text-white text-lg">Loading prospect intelligence...</p></div>
    </div>
  );

  if (error || !prospect) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center"><AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p className="text-white text-lg">{error || 'Prospect not found'}</p><Link to="/internal/leads" className="mt-4 inline-block text-purple-400 hover:text-purple-300">← Back to Leads</Link></div>
    </div>
  );

  const scoreColor = (s) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-amber-400' : 'text-red-400';
  const scoreBar = (s, max = 100) => (
    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-300" style={{ width: `${(s / max) * 100}%` }} />
    </div>
  );

  const urgencyColor = { high: 'bg-red-500/20 text-red-400 border-red-500/30', medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30', low: 'bg-green-500/20 text-green-400 border-green-500/30' };
  const annualPotential = prospect.estimated_elevators ? prospect.estimated_elevators * 8000 : null;

  const certExpired = tdlr?.summary?.expired_certs > 0;
  const lastInspection = tdlr?.summary?.last_inspection ? new Date(tdlr.summary.last_inspection) : null;
  const daysSinceInspection = lastInspection ? Math.floor((new Date() - lastInspection) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/leads"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div><h1 className="text-xl font-bold text-white">Prospect Intelligence</h1><p className="text-xs text-gray-400">{user?.email}</p></div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/internal/leads" className="text-purple-400 hover:text-purple-300 text-sm mb-6 inline-flex items-center gap-1">← Back to Lead Search</Link>

        {/* Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-600/30"><Building2 className="w-10 h-10 text-purple-400" /></div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{prospect.name}</h2>
                <div className="flex items-center gap-2 text-gray-400 mb-2"><MapPin className="w-4 h-4" />{prospect.address || `${prospect.city}, ${prospect.state}`}</div>
                {prospect.rating && <div className="flex items-center gap-2 mb-3"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="text-white font-medium">{prospect.rating}</span><span className="text-gray-400">({prospect.total_reviews?.toLocaleString()} reviews)</span></div>}
                <div className="flex gap-2 flex-wrap">
                  {prospect.service_urgency && <span className={`px-3 py-1 rounded-full text-sm border ${urgencyColor[prospect.service_urgency]}`}>{prospect.service_urgency} urgency</span>}
                  {prospect.modernization_candidate && <span className="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30">Modernization Candidate</span>}
                  {certExpired && <span className="px-3 py-1 rounded-full text-sm bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Expired Certs</span>}
                </div>
              </div>
            </div>
            <div className="text-center bg-gray-700/50 rounded-xl p-4 border border-gray-600">
              <p className="text-gray-400 text-sm mb-1">Lead Score</p>
              <p className={`text-5xl font-bold ${scoreColor(prospect.lead_score)}`}>{prospect.lead_score || 'N/A'}</p>
              <p className="text-gray-500 text-xs mt-1">out of 100</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Stats */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-purple-400" />Building Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Elevators', prospect.estimated_elevators || tdlr?.summary?.total_elevators || 'N/A'],
                ['Floors', prospect.estimated_floors || 'N/A'],
                ['Building Age', prospect.building_age ? `${prospect.building_age} yrs` : 'N/A'],
                ['Annual Value', annualPotential ? `$${annualPotential.toLocaleString()}` : 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="text-white font-bold text-lg">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" />AI Analysis</h3>
            {prospect.ai_summary ? (
              <>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">{prospect.ai_summary}</p>
                <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-3">
                  <p className="text-purple-400 text-xs font-medium mb-1">RECOMMENDATION</p>
                  <p className="text-gray-300 text-sm">{prospect.ai_recommendation}</p>
                </div>
              </>
            ) : <p className="text-gray-500 text-sm">AI analysis pending — will be scored in next nightly run.</p>}
          </div>
        </div>

        {/* TDLR Section */}
        {tdlr && parseInt(tdlr.summary?.total_elevators) > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />TDLR Inspection Records
              <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">Live Data</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                ['Registered Units', tdlr.summary.total_elevators],
                ['Passenger', tdlr.summary.passenger],
                ['Freight', tdlr.summary.freight],
                ['Expired Certs', tdlr.summary.expired_certs, tdlr.summary.expired_certs > 0 ? 'text-red-400' : 'text-green-400'],
              ].map(([label, value, cls]) => (
                <div key={label} className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className={`font-bold text-xl ${cls || 'text-white'}`}>{value}</p>
                </div>
              ))}
            </div>
            {lastInspection && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-700/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Most Recent Inspection: {lastInspection.toLocaleDateString()}</p>
                  <p className={`text-xs ${daysSinceInspection > 300 ? 'text-amber-400' : 'text-gray-400'}`}>{daysSinceInspection} days ago {daysSinceInspection > 300 ? '— inspection overdue soon' : ''}</p>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="text-left py-2 pr-4">Unit #</th>
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Drive</th>
                  <th className="text-left py-2 pr-4">Floors</th>
                  <th className="text-left py-2 pr-4">Installed</th>
                  <th className="text-left py-2 pr-4">Last Inspection</th>
                  <th className="text-left py-2">Cert Expiry</th>
                </tr></thead>
                <tbody>{tdlr.elevators.map((e, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                    <td className="py-2 pr-4 text-purple-400 font-mono text-xs">{e.elevator_number}</td>
                    <td className="py-2 pr-4 text-gray-300">{e.equipment_type}</td>
                    <td className="py-2 pr-4 text-gray-400">{e.drive_type}</td>
                    <td className="py-2 pr-4 text-gray-300">{e.floors || '—'}</td>
                    <td className="py-2 pr-4 text-gray-400">{e.year_installed || '—'}</td>
                    <td className="py-2 pr-4 text-gray-300">{e.most_recent_inspection ? new Date(e.most_recent_inspection).toLocaleDateString() : '—'}</td>
                    <td className={`py-2 ${e.expiration && new Date(e.expiration) < new Date() ? 'text-red-400' : 'text-green-400'}`}>{e.expiration ? new Date(e.expiration).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scores + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" />Intelligence Scores</h3>
            {[
              ['Lead Score', prospect.lead_score, 100],
              ['Sentiment Score', prospect.sentiment_score ? prospect.sentiment_score * 10 : null, 100],
              ['Reputation Score', prospect.reputation_score ? prospect.reputation_score * 10 : null, 100],
            ].map(([label, value, max]) => (
              <div key={label} className="mb-4">
                <div className="flex justify-between mb-1"><span className="text-gray-400 text-sm">{label}</span><span className={`font-bold ${scoreColor(value)}`}>{value ? (label === 'Lead Score' ? value : (value / 10).toFixed(1)) : 'N/A'}</span></div>
                {value && scoreBar(value, max)}
              </div>
            ))}
            {prospect.common_issues && (
              <div className="mt-4">
                <p className="text-gray-400 text-sm mb-2">Common Issues</p>
                <div className="flex gap-2 flex-wrap">
                  {(typeof prospect.common_issues === 'string' ? JSON.parse(prospect.common_issues) : prospect.common_issues).map((issue, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">{issue}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-purple-400" />Contact & Actions</h3>
            {prospect.phone && <p className="text-gray-400 text-sm mb-1">Phone: <span className="text-white">{prospect.phone}</span></p>}
            {prospect.website && <p className="text-gray-400 text-sm mb-4">Website: <a href={prospect.website} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">{prospect.website}</a></p>}
            <div className="space-y-3 mt-4">
              {prospect.phone && <a href={`tel:${prospect.phone}`} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"><Phone className="w-4 h-4" />Call Now</a>}
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"><Clock className="w-4 h-4" />Schedule Visit</button>
              <button className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"><Brain className="w-4 h-4" />Generate Proposal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProspectDetails;
