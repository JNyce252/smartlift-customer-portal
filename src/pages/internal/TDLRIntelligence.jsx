import { useUserPreferences } from '../../hooks/useUserPreferences';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, AlertTriangle, Clock, CheckCircle, Plus, Search, Filter, MapPin, Calendar, Zap, TrendingUp, ChevronRight, RefreshCw, Mail, X, Shield } from 'lucide-react';
import { authService } from '../../services/authService';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const urgencyConfig = {
  expired: { label: 'Expired', color: 'text-red-400 bg-red-900/20 border-red-700/30', dot: 'bg-red-400', priority: 1 },
  critical: { label: 'Critical', color: 'text-orange-400 bg-orange-900/20 border-orange-700/30', dot: 'bg-orange-400', priority: 2 },
  warning: { label: 'Due Soon', color: 'text-amber-400 bg-amber-900/20 border-amber-700/30', dot: 'bg-amber-400', priority: 3 },
  upcoming: { label: 'Upcoming', color: 'text-blue-400 bg-blue-900/20 border-blue-700/30', dot: 'bg-blue-400', priority: 4 },
};

const TDLRIntelligence = () => {
  const navigate = useNavigate();
  const { get, savePreference, savePreferences, loading: prefsLoading } = useUserPreferences();
  const [records, setRecords] = useState([]);
  const [counts, setCounts] = useState({});
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState({});
  const [added, setAdded] = useState({});
  const [search, setSearch] = useState('');
  const [filterDays, setFilterDays] = useState('30');
  const [filterCity, setFilterCity] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showEmailModal, setShowEmailModal] = useState(null);

  // Restore this user's last filter settings when preferences load
  React.useEffect(() => {
    if (prefsLoading) return;
    const savedCity = get('tdlr_city_filter', '');
    const savedDays = get('tdlr_days_filter', '30');
    const savedUrgency = get('tdlr_urgency_filter', 'all');
    const savedType = get('tdlr_type_filter', '');
    if (savedCity) setFilterCity(savedCity);
    if (savedDays) setFilterDays(savedDays);
    if (savedUrgency) setFilterUrgency(savedUrgency);
    if (savedType) setFilterType(savedType);
  }, [prefsLoading]);
  const LIMIT = 25;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + authService.getIdToken()
  };

  const fetchRecords = useCallback(async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);
    try {
      const params = new URLSearchParams({
        days: filterDays,
        limit: LIMIT,
        offset: currentPage * LIMIT,
        ...(filterCity && { city: filterCity }),
        ...(filterType && { equipment_type: filterType }),
      });
      const res = await fetch(BASE_URL + '/tdlr/expiring?' + params, { headers });
      const data = await res.json();
      setRecords(data.records || []);
      setCounts(data.counts || {});
      setCities(data.cities || []);
      setTotal(parseInt(data.counts?.total || 0));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterDays, filterCity, filterType, page]);

  useEffect(() => { fetchRecords(true); }, [filterDays, filterCity, filterType]);
  useEffect(() => { fetchRecords(); }, [page]);

  const addToProspects = async (record) => {
    setAdding(prev => ({ ...prev, [record.id]: true }));
    try {
      const res = await fetch(BASE_URL + '/tdlr/add-prospect', {
        method: 'POST', headers,
        body: JSON.stringify({
          tdlr_id: record.id,
          building_name: record.building_name,
          building_address: record.building_address,
          building_city: record.building_city,
          building_state: record.building_state,
          building_zip: record.building_zip,
          owner_name: record.owner_name,
          elevator_number: record.elevator_number,
        })
      });
      const data = await res.json();
      setAdded(prev => ({ ...prev, [record.id]: { id: data.prospect_id, existed: data.already_existed } }));
    } catch(e) { console.error(e); }
    finally { setAdding(prev => ({ ...prev, [record.id]: false })); }
  };

  const generateEmail = (record) => {
    const daysLeft = record.days_until_expiration;
    const expired = daysLeft < 0;
    const subject = expired
      ? `Elevator Compliance Notice — ${record.building_name}`
      : `Upcoming Elevator Inspection Required — ${record.building_name}`;
    const body = expired
      ? `Dear ${record.owner_name || 'Building Manager'},\n\nOur records indicate that elevator unit ${record.elevator_number} at ${record.building_address}, ${record.building_city} TX has an expired TDLR inspection certificate (expired ${Math.abs(daysLeft)} days ago).\n\nAs a licensed elevator service company, we can help you get back into compliance quickly. Operating an elevator with an expired certificate can result in fines and mandatory shutdown.\n\nWe would like to schedule an inspection at your earliest convenience. Please reply to this email or call us to discuss.\n\nBest regards,\nDerald Armstrong\nSouthwest Cabs Elevator Services\n972-974-7005`
      : `Dear ${record.owner_name || 'Building Manager'},\n\nThis is a courtesy notice that elevator unit ${record.elevator_number} at ${record.building_address}, ${record.building_city} TX is due for its annual TDLR inspection in ${daysLeft} days (expiration: ${new Date(record.expiration).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}).\n\nWe are a licensed elevator service company serving the ${record.building_city} area. We can schedule and complete your required inspection to keep you in compliance with Texas state law.\n\nPlease reply or call us to schedule at your convenience.\n\nBest regards,\nDerald Armstrong\nSouthwest Cabs Elevator Services\n972-974-7005`;
    return { subject, body };
  };

  const filtered = records.filter(r => {
    if (filterUrgency !== 'all' && r.urgency !== filterUrgency) return false;
    if (search && !r.building_name?.toLowerCase().includes(search.toLowerCase()) &&
      !r.building_address?.toLowerCase().includes(search.toLowerCase()) &&
      !r.owner_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Expired Now',
              value: counts.expired ? parseInt(counts.expired).toLocaleString() : '9,838',
              sub: 'Out of compliance',
              color: 'text-red-400',
              bg: 'bg-red-900/10 border-red-700/30',
              icon: AlertTriangle,
              filter: 'expired',
            },
            {
              label: 'Expiring in 30 Days',
              value: counts.expiring_30 ? parseInt(counts.expiring_30).toLocaleString() : '2,693',
              sub: 'Critical leads',
              color: 'text-orange-400',
              bg: 'bg-orange-900/10 border-orange-700/30',
              icon: Zap,
              filter: 'critical',
            },
            {
              label: 'Expiring in 60 Days',
              value: counts.expiring_60 ? parseInt(counts.expiring_60).toLocaleString() : '5,379',
              sub: 'Warm leads',
              color: 'text-amber-400',
              bg: 'bg-amber-900/10 border-amber-700/30',
              icon: Clock,
              filter: 'warning',
            },
            {
              label: 'Expiring in 90 Days',
              value: counts.expiring_90 ? parseInt(counts.expiring_90).toLocaleString() : '7,829',
              sub: 'Pipeline leads',
              color: 'text-blue-400',
              bg: 'bg-blue-900/10 border-blue-700/30',
              icon: TrendingUp,
              filter: 'upcoming',
            },
          ].map(({ label, value, sub, color, bg, icon: Icon, filter }) => (
            <button key={label} onClick={() => { const next = filterUrgency === filter ? 'all' : filter; setFilterUrgency(next); savePreference('tdlr_urgency_filter', next); setFilterDays('90'); savePreference('tdlr_days_filter', '90'); }}
              className={`rounded-xl p-5 border text-left transition-all hover:scale-105 ${bg} ${filterUrgency === filter ? 'ring-2 ring-purple-500' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-bold ${color} mb-0.5`}>{value}</p>
              <p className="text-gray-500 text-xs">{sub}</p>
            </button>
          ))}
        </div>

        {/* Value proposition banner */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-bold mb-1">How to Use This Intelligence</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                {[
                  { step: '1', title: 'Filter by City', desc: 'Start with Dallas or Fort Worth — your target market. Sort by expired first.' },
                  { step: '2', title: 'Add to Prospects', desc: 'Click "Add to Prospects" to pull them into your pipeline automatically.' },
                  { step: '3', title: 'Send Outreach', desc: 'Use the pre-written compliance email to contact building owners instantly.' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{s.step}</div>
                    <div>
                      <p className="text-white text-sm font-semibold">{s.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search building name, address, owner..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <select value={filterDays} onChange={e => { const v = e.target.value; setFilterDays(v); setFilterUrgency('all'); savePreference('tdlr_days_filter', v); savePreference('tdlr_urgency_filter', 'all'); }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-purple-500">
              <option value="30">Expiring in 30 days</option>
              <option value="60">Expiring in 60 days</option>
              <option value="90">Expiring in 90 days</option>
              <option value="365">All + Expired (1yr)</option>
            </select>
            <select value={filterCity} onChange={e => { setFilterCity(e.target.value); savePreference('tdlr_city_filter', e.target.value); }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-purple-500">
              <option value="">All Cities</option>
              {cities.map(c => (
                <option key={c.building_city} value={c.building_city}>
                  {c.building_city} ({parseInt(c.count).toLocaleString()})
                </option>
              ))}
            </select>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); savePreference('tdlr_type_filter', e.target.value); }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-purple-500">
              <option value="">All Types</option>
              <option value="PASSENGER">Passenger</option>
              <option value="FREIGHT">Freight</option>
              <option value="ESCALATOR">Escalator</option>
              <option value="ACCESSIBILITY">Accessibility</option>
            </select>
            {(filterCity || filterType || filterUrgency !== 'all' || search) && (
              <button onClick={() => { setFilterCity(''); setFilterType(''); setFilterUrgency('all'); setSearch(''); savePreferences({ tdlr_city_filter: '', tdlr_type_filter: '', tdlr_urgency_filter: 'all', tdlr_days_filter: '30' }); }}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                <X className="w-3.5 h-3.5" />Clear
              </button>
            )}
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400 text-sm">
            Showing <span className="text-white font-medium">{filtered.length}</span> of <span className="text-white font-medium">{records.length}</span> records
            {filterCity && <span className="text-purple-400"> in {filterCity}</span>}
          </p>
          <div className="flex gap-2">
            {Object.entries(urgencyConfig).map(([key, cfg]) => (
              <button key={key} onClick={() => setFilterUrgency(filterUrgency === key ? 'all' : key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterUrgency === key ? cfg.color : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'}`}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Records list */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-400">Loading TDLR records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No records found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(record => {
              const urgency = urgencyConfig[record.urgency] || urgencyConfig.upcoming;
              const isAdded = added[record.id];
              const isAdding = adding[record.id];
              const daysLeft = record.days_until_expiration;
              const alreadyLinked = record.prospect_id;

              return (
                <div key={record.id + '-' + record.elevator_number}
                  className="bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${urgency.dot} mt-1.5`}></div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-white font-semibold text-sm">{record.building_name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${urgency.color}`}>
                              {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? 'Expires Today' : `Expires in ${daysLeft}d`}
                            </span>
                            {alreadyLinked && !isAdded && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-green-900/20 text-green-400 border-green-700/30">
                                In Pipeline
                              </span>
                            )}
                            {isAdded && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-green-900/20 text-green-400 border-green-700/30">
                                {isAdded.existed ? '✓ Already in Pipeline' : '✓ Added to Pipeline'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {record.building_address}, {record.building_city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Cert expires: {new Date(record.expiration).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                            {record.equipment_type && <span>{record.equipment_type}</span>}
                            {record.drive_type && <span>{record.drive_type}</span>}
                            {record.floors && <span>{record.floors} floors</span>}
                            {record.year_installed && <span>Installed {record.year_installed}</span>}
                            <span className="text-gray-600">#{record.elevator_number}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setShowEmailModal(record)}
                          className="p-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-700/30 rounded-lg transition-colors"
                          title="Generate outreach email">
                          <Mail className="w-4 h-4" />
                        </button>
                        {!isAdded && !alreadyLinked ? (
                          <button onClick={() => addToProspects(record)}
                            disabled={isAdding}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                            {isAdding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            {isAdding ? 'Adding...' : 'Add to Pipeline'}
                          </button>
                        ) : isAdded ? (
                          <button onClick={() => navigate('/internal/prospect/' + isAdded.id)}
                            className="px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                            View Prospect <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => navigate('/internal/prospect/' + record.prospect_id)}
                            className="px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                            View Prospect <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {records.length === LIMIT && (
          <div className="flex justify-center gap-3 mt-8">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm border border-gray-700 transition-colors">
              ← Previous
            </button>
            <span className="px-4 py-2 text-gray-400 text-sm">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm border border-gray-700 transition-colors">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (() => {
        const { subject, body } = generateEmail(showEmailModal);
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl font-bold text-white">Compliance Outreach Email</h2>
                  <p className="text-gray-400 text-sm mt-0.5">{showEmailModal.building_name}</p>
                </div>
                <button onClick={() => setShowEmailModal(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Subject Line</p>
                  <div className="bg-gray-700 rounded-lg p-3 flex items-center justify-between gap-3">
                    <p className="text-white text-sm">{subject}</p>
                    <button onClick={() => navigator.clipboard.writeText(subject)}
                      className="text-purple-400 hover:text-purple-300 text-xs flex-shrink-0 transition-colors">Copy</button>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Email Body</p>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{body}</pre>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => {
                    navigator.clipboard.writeText(body);
                  }} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                    Copy Email Body
                  </button>
                  <a href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium text-center transition-colors flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />Open in Email Client
                  </a>
                </div>
                <div className="bg-blue-900/10 border border-blue-700/30 rounded-lg p-3">
                  <p className="text-blue-400 text-xs font-medium mb-1">💡 Pro Tip</p>
                  <p className="text-gray-400 text-xs">Find the building owner's contact info by adding them to your pipeline first, then use the Contact Intelligence feature to auto-populate their email address.</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TDLRIntelligence;
