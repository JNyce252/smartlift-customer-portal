import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, MapPin, Phone, Star, LogOut, Brain, TrendingUp, Wrench, Clock, AlertTriangle, CheckCircle, Calendar, Layers, ChevronDown, ChevronUp, Mail, User, Search, Plus, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';
const HUNTER_KEY = process.env.REACT_APP_HUNTER_API_KEY;

const ProspectDetails = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [prospect, setProspect] = useState(null);
  const [tdlr, setTdlr] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tdlrExpanded, setTdlrExpanded] = useState(false);
  const [hunterLoading, setHunterLoading] = useState(false);
  const [hunterDomain, setHunterDomain] = useState('');
  const [hunterError, setHunterError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    Promise.all([
      fetch(`${BASE_URL}/prospects/${id}`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/prospects/${id}/tdlr`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${BASE_URL}/prospects/${id}/contacts`, { headers }).then(r => r.json()).catch(() => []),
    ])
    .then(([p, t, c]) => {
      setProspect(p);
      setTdlr(t);
      setContacts(Array.isArray(c) ? c : []);
      if (p.website) {
        try { setHunterDomain(new URL(p.website).hostname.replace('www.', '')); } catch {}
      }
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [id]);

  const searchHunter = async () => {
    if (!hunterDomain) return;
    setHunterLoading(true);
    setHunterError(null);
    try {
      const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${hunterDomain}&api_key=${HUNTER_KEY}&limit=10`);
      const data = await res.json();
      if (data.errors) { setHunterError(data.errors[0]?.details || 'Hunter.io error'); return; }

      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };

      const newContacts = [];
      for (const email of (data.data?.emails || [])) {
        try {
          const r = await fetch(`${BASE_URL}/prospects/${id}/contacts`, {
            method: 'POST', headers,
            body: JSON.stringify({
              first_name: email.first_name,
              last_name: email.last_name,
              email: email.value,
              title: email.position,
              linkedin_url: email.linkedin,
              confidence: email.confidence,
              source: 'hunter'
            })
          });
          const saved = await r.json();
          newContacts.push(saved);
        } catch {}
      }
      setContacts(prev => {
        const existing = prev.map(c => c.email);
        const fresh = newContacts.filter(c => !existing.includes(c.email));
        return [...prev, ...fresh];
      });
      if (newContacts.length === 0) setHunterError('No contacts found for this domain.');
    } catch (e) {
      setHunterError('Failed to search Hunter.io: ' + e.message);
    } finally {
      setHunterLoading(false);
    }
  };

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
      <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-300" style={{ width: `${Math.min((s / max) * 100, 100)}%` }} />
    </div>
  );

  const urgencyColor = { high: 'bg-red-500/20 text-red-400 border-red-500/30', medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30', low: 'bg-green-500/20 text-green-400 border-green-500/30' };
  const annualPotential = prospect.estimated_elevators ? prospect.estimated_elevators * 8000 : null;
  const hasTdlr = tdlr && parseInt(tdlr.summary?.total_elevators) > 0;
  const certExpired = tdlr?.summary?.expired_certs > 0;
  const lastInspection = tdlr?.summary?.last_inspection ? new Date(tdlr.summary.last_inspection) : null;
  const certExpiry = tdlr?.summary?.cert_expiry ? new Date(tdlr.summary.cert_expiry) : null;
  const daysSinceInspection = lastInspection ? Math.floor((new Date() - lastInspection) / (1000 * 60 * 60 * 24)) : null;
  const daysUntilExpiry = certExpiry ? Math.floor((certExpiry - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const groupedByType = tdlr?.elevators?.reduce((acc, e) => {
    const type = e.equipment_type || 'UNKNOWN';
    if (!acc[type]) acc[type] = [];
    acc[type].push(e);
    return acc;
  }, {});

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
        {hasTdlr && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />TDLR Inspection Records
                <span className="ml-1 px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">Live Data</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="bg-gray-700/50 rounded-xl p-4 text-center border border-gray-600">
                <p className="text-gray-400 text-xs mb-1">Registered Units</p>
                <p className="text-white font-bold text-3xl">{tdlr.summary.total_elevators}</p>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-4 text-center border border-gray-600">
                <p className="text-gray-400 text-xs mb-1">Equipment Breakdown</p>
                <p className="text-white font-bold text-lg">{tdlr.summary.passenger} pass / {tdlr.summary.freight} freight</p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${daysSinceInspection > 300 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-gray-700/50 border-gray-600'}`}>
                <p className="text-gray-400 text-xs mb-1">Last Inspection</p>
                <p className={`font-bold text-lg ${daysSinceInspection > 300 ? 'text-amber-400' : 'text-white'}`}>{lastInspection ? lastInspection.toLocaleDateString() : '—'}</p>
                {daysSinceInspection && <p className="text-gray-500 text-xs mt-0.5">{daysSinceInspection} days ago</p>}
              </div>
              <div className={`rounded-xl p-4 text-center border ${certExpired ? 'bg-red-500/10 border-red-500/30' : daysUntilExpiry < 60 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className="text-gray-400 text-xs mb-1">Cert Expiry</p>
                <p className={`font-bold text-lg ${certExpired ? 'text-red-400' : daysUntilExpiry < 60 ? 'text-amber-400' : 'text-green-400'}`}>{certExpiry ? certExpiry.toLocaleDateString() : '—'}</p>
                {daysUntilExpiry !== null && <p className="text-gray-500 text-xs mt-0.5">{certExpired ? 'EXPIRED' : `${daysUntilExpiry} days remaining`}</p>}
              </div>
            </div>
            {groupedByType && (
              <div className="flex gap-3 mb-5 flex-wrap">
                {Object.entries(groupedByType).map(([type, units]) => (
                  <div key={type} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-4 py-2 border border-gray-600">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span className="text-gray-300 text-sm font-medium">{type}</span>
                    <span className="text-white font-bold">{units.length}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setTdlrExpanded(!tdlrExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors">
              <span className="text-white text-sm font-medium">View All {tdlr.elevators.length} Inspection Records</span>
              {tdlrExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {tdlrExpanded && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-700/50 text-gray-400 text-xs">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Drive</th>
                    <th className="text-left px-4 py-3">Floors</th>
                    <th className="text-left px-4 py-3">Installed</th>
                    <th className="text-left px-4 py-3">Last Inspection</th>
                    <th className="text-left px-4 py-3">Cert Expiry</th>
                  </tr></thead>
                  <tbody>{tdlr.elevators.map((e, i) => {
                    const expired = e.expiration && new Date(e.expiration) < new Date();
                    return (
                      <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-gray-300">{e.equipment_type}</td>
                        <td className="px-4 py-2.5 text-gray-400">{e.drive_type}</td>
                        <td className="px-4 py-2.5 text-gray-300">{e.floors || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400">{e.year_installed || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-300">{e.most_recent_inspection ? new Date(e.most_recent_inspection).toLocaleDateString() : '—'}</td>
                        <td className={`px-4 py-2.5 font-medium ${expired ? 'text-red-400' : 'text-green-400'}`}>{e.expiration ? new Date(e.expiration).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Contacts Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />Contact Intelligence
            <span className="ml-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs">Hunter.io</span>
          </h3>

          {/* Domain Search */}
          <div className="flex gap-3 mb-5">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input type="text" value={hunterDomain} onChange={e => setHunterDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchHunter()}
                placeholder="company domain (e.g. marriott.com)"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
            </div>
            <button onClick={searchHunter} disabled={hunterLoading || !hunterDomain}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2">
              <Search className="w-4 h-4" />{hunterLoading ? 'Searching...' : 'Find Contacts'}
            </button>
          </div>

          {hunterError && <p className="text-red-400 text-sm mb-4">{hunterError}</p>}

          {contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-full border border-purple-600/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{c.first_name || ''} {c.last_name || ''}</p>
                      {c.title && <p className="text-gray-400 text-sm">{c.title}</p>}
                      <p className="text-purple-400 text-sm">{c.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.confidence && (
                      <div className="text-center">
                        <p className="text-gray-500 text-xs">Confidence</p>
                        <p className={`font-bold text-sm ${c.confidence >= 80 ? 'text-green-400' : c.confidence >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{c.confidence}%</p>
                      </div>
                    )}
                    <a href={`mailto:${c.email}`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />Email
                    </a>
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-600 rounded-lg">
              <User className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No contacts yet — search by company domain above</p>
              <p className="text-gray-500 text-xs mt-1">Powered by Hunter.io</p>
            </div>
          )}
        </div>

        {/* Scores + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" />Intelligence Scores</h3>
            {[
              ['Lead Score', prospect.lead_score, 100, prospect.lead_score],
              ['Sentiment Score', prospect.sentiment_score, 10, prospect.sentiment_score ? prospect.sentiment_score * 10 : null],
              ['Reputation Score', prospect.reputation_score, 10, prospect.reputation_score ? prospect.reputation_score * 10 : null],
            ].map(([label, raw, max, barVal]) => (
              <div key={label} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className={`font-bold ${scoreColor(barVal)}`}>{raw ? (label === 'Lead Score' ? raw : parseFloat(raw).toFixed(1)) : 'N/A'}</span>
                </div>
                {barVal && scoreBar(barVal, 100)}
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
