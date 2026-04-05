import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, MapPin, Users, Building2, DollarSign, LogOut, Menu, X, Clock, Brain, AlertTriangle, Star, CheckCircle, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const PLACES_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY || 'AIzaSyDmTnd7Q4K9YZ_uwF7bKKU42_kDHrlwG5E';
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';
const TX_CITIES = ['Dallas, TX', 'Houston, TX', 'Austin, TX', 'San Antonio, TX', 'Fort Worth, TX'];
const TX_TYPES = [
  { label: 'Hotels', query: 'hotel' },
  { label: 'Office Buildings', query: 'office building' },
  { label: 'Hospitals', query: 'hospital medical center' },
  { label: 'Apartments', query: 'apartment complex' },
];

const InternalDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [showAutoProspect, setShowAutoProspect] = useState(false);
  const [customCities, setCustomCities] = useState(['Dallas, TX', 'Houston, TX', 'Austin, TX', 'San Antonio, TX', 'Fort Worth, TX']);
  const [newCity, setNewCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoProgress, setAutoProgress] = useState({ step: '', current: 0, total: 0, imported: 0, skipped: 0 });
  const [autoDone, setAutoDone] = useState(false);
  const [prospects, setProspects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({});
  const [tdlrStats, setTdlrStats] = useState({});

  useEffect(() => {
    Promise.all([
      api.getProspects(),
      api.getCustomers(),
      api.getTickets(),
      api.getInvoices(),
      fetch(`${BASE_URL}/profile`, { headers: { Authorization: `Bearer ${localStorage.getItem('smartlift_token')}` } }).then(r => r.json()),
      fetch(`${BASE_URL}/analytics/tdlr`, { headers: { Authorization: `Bearer ${localStorage.getItem('smartlift_token')}` } }).then(r => r.json()),
    ])
      .then(([p, c, t, i, prof, tdlr]) => {
        setProspects(p); setCustomers(c); setTickets(t); setInvoices(i);
        setProfile(prof || {});
        setTdlrStats(tdlr || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshTick]);

  const highScoreProspects = prospects.filter(p => p.lead_score >= 70);
  const highUrgencyProspects = prospects.filter(p => p.service_urgency === 'high');
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const pipelineValue = prospects.reduce((sum, p) => sum + ((p.estimated_elevators || 3) * 8000), 0);
  const topProspects = [...prospects].sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0)).slice(0, 5);

  const urgencyColors = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const fetchCitySuggestions = (input) => {
    if (input.length < 2) { setCitySuggestions([]); return; }
    if (!window.google) return;
    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      { input, types: ['(cities)'], componentRestrictions: { country: 'us' } },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setCitySuggestions(predictions);
          setShowCitySuggestions(true);
        }
      }
    );
  };

  const addCity = (cityName) => {
    const clean = cityName.replace(', USA', '');
    if (!customCities.includes(clean)) {
      setCustomCities(prev => [...prev, clean]);
    }
    setNewCity('');
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  const removeCity = (city) => setCustomCities(prev => prev.filter(c => c !== city));

  const runAutoProspect = async () => {
    setAutoRunning(true);
    setAutoDone(false);
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    let totalImported = 0;
    let totalSkipped = 0;
    const total = TX_CITIES.length * TX_TYPES.length;
    let current = 0;

    for (const city of customCities) {
      for (const type of TX_TYPES) {
        current++;
        setAutoProgress({ step: `Searching ${type.label} in ${city.split(',')[0]}...`, current, total, imported: totalImported, skipped: totalSkipped });

        try {
          // Geocode city
          if (!window.google) continue;
          const geocoder = new window.google.maps.Geocoder();
          const geoResult = await new Promise(resolve => {
            geocoder.geocode({ address: city }, (results, status) => {
              resolve(status === 'OK' ? results[0] : null);
            });
          });
          if (!geoResult) continue;

          const lat = geoResult.geometry.location.lat();
          const lng = geoResult.geometry.location.lng();

          // Search places
          const places = await new Promise(resolve => {
            const mapDiv = document.createElement('div');
            const map = new window.google.maps.Map(mapDiv);
            const service = new window.google.maps.places.PlacesService(map);
            service.nearbySearch({ location: { lat, lng }, radius: 48280, keyword: type.query }, (results, status) => {
              resolve(status === window.google.maps.places.PlacesServiceStatus.OK ? results || [] : []);
            });
          });

          if (!places.length) continue;

          // Format for AI scoring
          const formatted = places.slice(0, 20).map(p => ({
            google_place_id: p.place_id,
            name: p.name,
            address: p.formatted_address || p.vicinity,
            city: city.split(',')[0],
            state: 'TX',
            rating: p.rating,
            total_reviews: p.user_ratings_total,
            type: type.query,
            lat: typeof p.geometry?.location?.lat === 'function' ? p.geometry.location.lat() : p.geometry?.location?.lat,
            lng: typeof p.geometry?.location?.lng === 'function' ? p.geometry.location.lng() : p.geometry?.location?.lng,
          }));

          setAutoProgress(prev => ({ ...prev, step: `AI scoring ${type.label} in ${city.split(',')[0]}...` }));

          // AI score
          const aiRes = await fetch(`${BASE_URL}/ai/score-results`, {
            method: 'POST', headers,
            body: JSON.stringify({ results: formatted, buildingType: type.label, city: city.split(',')[0], state: 'TX' })
          });
          const aiData = await aiRes.json();
          const scored = aiData.results || [];
          const highScorers = scored.filter(r => r.ai_score >= 70);

          // Import high scorers with website and phone fetch
          for (const place of highScorers) {
            try {
              let enriched = { ...place, lead_score: place.ai_score };
              try {
                const details = await new Promise(resolve => {
                  const mapDiv = document.createElement('div');
                  const map = new window.google.maps.Map(mapDiv);
                  const service = new window.google.maps.places.PlacesService(map);
                  service.getDetails({
                    placeId: place.google_place_id,
                    fields: ['website', 'formatted_phone_number']
                  }, (result, status) => {
                    resolve(status === window.google.maps.places.PlacesServiceStatus.OK ? result : {});
                  });
                });
                if (details.website) enriched.website = details.website;
                if (details.formatted_phone_number) enriched.phone = details.formatted_phone_number;
              } catch {}
              const res = await fetch(`${BASE_URL}/prospects`, {
                method: 'POST', headers,
                body: JSON.stringify(enriched)
              });
              if (res.ok) totalImported++;
              else totalSkipped++;
            } catch { totalSkipped++; }
          }

          setAutoProgress(prev => ({ ...prev, imported: totalImported, skipped: totalSkipped }));

          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 500));

        } catch (e) { console.error(e); }
      }
    }

    setAutoRunning(false);
    setAutoDone(true);
    setAutoProgress(prev => ({ ...prev, step: 'Complete!', imported: totalImported }));
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-400 hover:text-white">
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-purple-600 rounded-lg p-2"><Building2 className="w-6 h-6 text-white" /></div>
                <div>
                  <h1 className="text-xl font-bold text-white">{profile.company_name || 'Smarterlift'}</h1>
                  <p className="text-xs text-gray-400">AI Powered Lead Intelligence</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.name || 'Staff'}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <Link to="/internal/profile" className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
                <Settings className="w-4 h-4" /><span className="hidden sm:inline">Profile</span>
              </Link>
              <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
              </h2>
              <p className="text-gray-400">
                {prospects.length === 0 
                  ? "Let's find your first leads — click Find New Leads to get started." 
                  : `You have ${prospects.filter(p => p.lead_score >= 80).length} high-priority prospects and ${tdlrStats.expiring_soon || 0} TDLR certifications expiring soon.`}
              </p>
            </div>
            <div className="hidden lg:block text-right">
              <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              {profile.company_name && <p className="text-purple-400 text-sm font-medium mt-1">{profile.company_name}</p>}
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: Search, iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400', label: 'Total Prospects', value: prospects.length, sub: `${highScoreProspects.length} high score (80+)` },
            { icon: Brain, iconBg: 'bg-purple-600/20', iconColor: 'text-purple-400', label: 'High Urgency', value: highUrgencyProspects.length, sub: `${prospects.filter(p => p.service_urgency === 'medium').length} medium urgency` },
            { icon: AlertTriangle, iconBg: 'bg-amber-600/20', iconColor: 'text-amber-400', label: 'TDLR Expiring Soon', value: loading ? '...' : (tdlrStats.expiring_soon || 0), sub: `${tdlrStats.expired_certs || 0} already expired` },
            { icon: Users, iconBg: 'bg-green-600/20', iconColor: 'text-green-400', label: 'Customers', value: customers.length, sub: `${tdlrStats.total_records ? tdlrStats.total_records.toLocaleString() : '0'} TX elevators tracked` },
          ].map(({ icon: Icon, iconBg, iconColor, label, value, sub }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`${iconBg} rounded-lg p-3`}><Icon className={`w-6 h-6 ${iconColor}`} /></div>
              </div>
              <p className="text-gray-400 text-sm mb-1">{label}</p>
              <p className="text-3xl font-bold text-white">{loading ? '...' : value}</p>
              <p className="text-xs text-gray-500 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { to: null, gradient: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800', icon: Search, title: 'Find New Leads', sub: 'Auto-prospect Texas' },
            { to: '/internal/customers', gradient: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800', icon: Users, title: 'Customers', sub: 'Manage accounts' },
            { to: "/internal/routes", gradient: "from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800", icon: MapPin, title: "Plan Routes", sub: "Optimize schedule" },
            { to: "/internal/pipeline", gradient: "from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800", icon: TrendingUp, title: "Pipeline", sub: "Track deal stages" },
            { to: '/internal/analytics', gradient: 'from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800', icon: TrendingUp, title: 'Analytics', sub: 'View metrics' },
            { to: '/internal/profile', gradient: 'from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800', icon: Users, title: 'Profile', sub: 'Company settings' },
          ].map(({ to, gradient, icon: Icon, title, sub }) => (
            to ? (
              <Link key={title} to={to} className={`bg-gradient-to-br ${gradient} rounded-xl p-5 transition-all cursor-pointer`}>
                <Icon className="w-7 h-7 text-white mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
                <p className="text-white/70 text-sm">{sub}</p>
              </Link>
            ) : (
              <button key={title} onClick={() => { setShowAutoProspect(true); setAutoDone(false); setAutoProgress({ step: '', current: 0, total: 0, imported: 0, skipped: 0 }); }} className={`bg-gradient-to-br ${gradient} rounded-xl p-5 transition-all text-left w-full`}>
                <Icon className="w-7 h-7 text-white mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
                <p className="text-white/70 text-sm">{sub}</p>
              </button>
            )
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Prospects */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white">Top Prospects</h3>
              <Link to="/internal/leads" className="text-purple-400 hover:text-purple-300 text-sm">View All →</Link>
            </div>
            <div className="space-y-3">
              {topProspects.map((prospect) => (
                <Link key={prospect.id} to={`/internal/prospect/${prospect.id}`}
                  className="flex items-center gap-4 bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-purple-500 transition-colors">
                  <div className="bg-purple-600/20 rounded-lg p-2.5 border border-purple-600/30 flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{prospect.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-400 text-xs">{prospect.city}, {prospect.state}</span>
                      {prospect.rating && <><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-gray-400 text-xs">{prospect.rating}</span></>}
                      {prospect.service_urgency && (
                        <span className={`px-1.5 py-0.5 rounded text-xs border ${urgencyColors[prospect.service_urgency]}`}>{prospect.service_urgency}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`font-bold text-xl ${prospect.lead_score >= 90 ? 'text-green-400' : prospect.lead_score >= 70 ? 'text-amber-400' : 'text-gray-400'}`}>{prospect.lead_score || '—'}</span>
                    <p className="text-gray-500 text-xs">score</p>
                  </div>
                </Link>
              ))}
              {prospects.length === 0 && !loading && <p className="text-gray-500 text-center py-8">No prospects found</p>}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Urgent Alerts */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />Urgent Alerts
              </h3>
              {highUrgencyProspects.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle className="w-4 h-4" />No urgent prospects</div>
              ) : (
                <div className="space-y-2">
                  {highUrgencyProspects.slice(0, 4).map(p => (
                    <Link key={p.id} to={`/internal/prospect/${p.id}`}
                      className="flex items-center justify-between p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-colors">
                      <span className="text-white text-sm truncate">{p.name}</span>
                      <span className="text-red-400 text-xs font-bold flex-shrink-0 ml-2">{p.lead_score}</span>
                    </Link>
                  ))}
                  {highUrgencyProspects.length > 4 && (
                    <Link to="/internal/leads" className="text-amber-400 text-xs hover:text-amber-300">+{highUrgencyProspects.length - 4} more →</Link>
                  )}
                </div>
              )}
            </div>

            {/* Open Tickets */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />Open Tickets
              </h3>
              {openTickets.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle className="w-4 h-4" />No open tickets</div>
              ) : (
                <div className="space-y-2">
                  {openTickets.slice(0, 4).map(t => (
                    <div key={t.id} className="p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg">
                      <p className="text-white text-sm truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${t.priority === 'high' ? 'bg-red-500/20 text-red-400' : t.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>{t.priority}</span>
                        <span className="text-gray-500 text-xs">{t.status}</span>
                      </div>
                    </div>
                  ))}
                  {openTickets.length > 4 && <p className="text-gray-500 text-xs">+{openTickets.length - 4} more tickets</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto Prospect Modal */}
      {showAutoProspect && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-blue-500/30 w-full max-w-lg">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-400" />Find New Leads — Texas Auto-Prospect
              </h2>
              <p className="text-gray-400 text-sm mt-1">Searches 5 major Texas cities across 4 building types. AI filters and only imports leads scoring 70+.</p>
            </div>
            <div className="p-6">
              {!autoRunning && !autoDone && (
                <>
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm font-medium mb-2">Cities to search:</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {customCities.map(city => (
                        <span key={city} className="flex items-center gap-1 px-3 py-1 bg-blue-600/20 border border-blue-600/30 text-blue-400 rounded-full text-xs font-medium">
                          {city}
                          <button onClick={() => removeCity(city)} className="text-blue-400 hover:text-red-400 ml-1">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={newCity}
                        onChange={e => { setNewCity(e.target.value); fetchCitySuggestions(e.target.value); }}
                        onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
                        placeholder="Add a city (e.g. Chicago, IL)..."
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      {showCitySuggestions && citySuggestions.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden shadow-xl">
                          {citySuggestions.map(s => (
                            <button key={s.place_id} onMouseDown={() => addCity(s.description)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 border-b border-gray-700 last:border-0">
                              {s.description.replace(', USA', '')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                    <p className="text-gray-400 text-xs">Building types: Hotels, Office Buildings, Hospitals, Apartments</p>
                    <p className="text-blue-400 text-xs mt-1">Only prospects scoring 70+ will be imported. Keep this tab open while running.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAutoProspect(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
                    <button onClick={runAutoProspect} disabled={customCities.length === 0}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                      <Search className="w-4 h-4" />Start Auto-Prospect ({customCities.length} cities)
                    </button>
                  </div>
                </>
              )}
              {autoRunning && (
                <div className="space-y-4">
                  <p className="text-blue-400 text-sm font-medium">{autoProgress.step}</p>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: autoProgress.total ? `${(autoProgress.current / autoProgress.total) * 100}%` : '0%' }} />
                  </div>
                  <p className="text-gray-400 text-xs">{autoProgress.current} of {autoProgress.total} searches complete</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 text-center">
                      <p className="text-green-400 font-bold text-2xl">{autoProgress.imported}</p>
                      <p className="text-gray-400 text-xs">Imported</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-gray-300 font-bold text-2xl">{autoProgress.skipped}</p>
                      <p className="text-gray-400 text-xs">Skipped</p>
                    </div>
                  </div>
                  <p className="text-amber-400 text-xs text-center">Keep this tab open while running...</p>
                </div>
              )}
              {autoDone && (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">🎯</div>
                  <h3 className="text-white font-bold text-xl mb-2">Auto-Prospect Complete!</h3>
                  <p className="text-green-400 text-lg font-bold mb-1">{autoProgress.imported} new leads imported</p>
                  <p className="text-gray-400 text-sm mb-6">All scored 70+ by AI — ready for outreach</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAutoProspect(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Close</button>
                    <Link to="/internal/leads" onClick={() => setShowAutoProspect(false)} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium text-center">View Leads</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalDashboard;
