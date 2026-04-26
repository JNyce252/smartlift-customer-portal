import { useUserPreferences } from '../../hooks/useUserPreferences';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, MapPin, AlertCircle, Plus, CheckCircle, Star, Phone, Eye, Filter , Download } from 'lucide-react';
import { exportProspectsCSV } from '../../utils/csvExport';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { authService } from '../../services/authService';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';
const PLACES_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;

const BUILDING_TYPES = [
  { label: 'Hotels', googleTypes: ['lodging'] },
  { label: 'Apartments', googleTypes: ['apartment_complex'] },
  { label: 'Hospitals', googleTypes: ['hospital'] },
  { label: 'Universities', googleTypes: ['university'] },
  { label: 'Shopping Centers', googleTypes: ['shopping_mall'] },
  { label: 'Government', googleTypes: ['city_hall', 'courthouse', 'local_government_office'] },
  { label: 'Corporate Office Tower', googleTypes: ['establishment'], requiresQualifier: true },
];

const LeadSearch = () => {
  const { user, logout } = useAuth();
  const { get, savePreference, loading: prefsLoading } = useUserPreferences();

  // Restore this user's last search state
  useEffect(() => {
    if (prefsLoading) return;
    const savedSearch = get('lead_search_query', '');
    if (savedSearch) setSearch(savedSearch);
  }, [prefsLoading]);
  const [mode, setMode] = useState('saved');
  const [lastRefresh, setLastRefresh] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [prospects, setProspects] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  // Discover state
  const [buildingName, setBuildingName] = useState('');
  const [location, setLocation] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiScoring, setAiScoring] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedType, setSelectedType] = useState(BUILDING_TYPES[0]);
  const [placeResults, setPlaceResults] = useState([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [importing, setImporting] = useState({});
  const [imported, setImported] = useState({});
  const [rawResultCount, setRawResultCount] = useState(0);

  useEffect(() => {
    api.getProspects()
      .then(data => { setProspects(data); setFiltered(data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [lastRefresh]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(prospects.filter(p => {
      const matchesSearch = !q || p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.state?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q);
      const matchesUrgency = urgencyFilter === 'all' || p.service_urgency === urgencyFilter;
      const matchesCity = cityFilter === 'all' || p.city === cityFilter;
      const matchesScore = !minScore || (p.lead_score || 0) >= minScore;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesUrgency && matchesCity && matchesScore && matchesStatus;
    }));
  }, [search, prospects, urgencyFilter, cityFilter, minScore, statusFilter]);

  const cities = [...new Set(prospects.map(p => p.city).filter(Boolean))].sort();
  const activeFilters = [urgencyFilter !== 'all', cityFilter !== 'all', minScore > 0, statusFilter !== 'all'].filter(Boolean).length;

  const archiveProspect = async (id) => {
    const token = authService.getIdToken();
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    await fetch(`${BASE_URL}/prospects/${id}/archive`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ archived: true })
    });
    setProspects(prev => prev.filter(p => p.id !== id));
  };

  const fetchLocationSuggestions = (input) => {
    if (input.length < 2) { setLocationSuggestions([]); return; }
    if (!window.google) return;
    try {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        { input, types: ['(cities)'], componentRestrictions: { country: 'us' } },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setLocationSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setLocationSuggestions([]);
          }
        }
      );
    } catch(e) { console.error(e); }
  };

  const searchPlaces = async () => {
    if (!location.trim()) { setError('Please enter a city or state'); return; }
    setPlaceLoading(true);
    setError(null);
    setPlaceResults([]);
    setRawResultCount(0);
    try {
      // Geocode via REST API
      const geoRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${PLACES_KEY}`
      );
      const geoData = await geoRes.json();
      if (!geoData.results?.length) {
        setError('Could not find that location — try adding a state, e.g. "Dallas, TX"');
        setPlaceLoading(false);
        return;
      }
      const geoResult = geoData.results[0];
      const lat = geoResult.geometry.location.lat;
      const lng = geoResult.geometry.location.lng;
      const geoCity = geoResult.address_components?.find(c => c.types.includes('locality'))?.long_name
        || location.split(',')[0].trim();
      const geoState = geoResult.address_components?.find(c => c.types.includes('administrative_area_level_1'))?.short_name || 'TX';

      // Search with increasing radii using Places API (New)
      const radii = [8000, 24000, 48000, 96000]; // ~5mi, 15mi, 30mi, 60mi
      let allResults = [];

      for (const radiusMeters of radii) {
        const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': PLACES_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount'
          },
          body: JSON.stringify({
            includedTypes: selectedType.googleTypes,
            maxResultCount: 20,
            locationRestriction: {
              circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters }
            }
          })
        });
        const data = await res.json();
        for (const p of (data.places || [])) {
          if (!allResults.find(r => r.google_place_id === p.id)) {
            const pLat = p.location?.latitude ?? 0;
            const pLng = p.location?.longitude ?? 0;
            allResults.push({
              google_place_id: p.id,
              name: p.displayName?.text || '',
              address: p.formattedAddress || '',
              city: geoCity,
              state: geoState,
              rating: p.rating,
              total_reviews: p.userRatingCount,
              types: p.types || [],
              lat: pLat,
              lng: pLng,
              distance_meters: Math.round(Math.sqrt(
                Math.pow((pLat - lat) * 111000, 2) +
                Math.pow((pLng - lng) * 111000 * Math.cos(lat * Math.PI / 180), 2)
              ))
            });
          }
        }
        if (allResults.length >= 20) break;
      }

      if (allResults.length === 0) {
        setError('No results found — try a different building type or location');
        return;
      }

      // Corporate Office Tower: run Claude qualifier to remove single-tenant offices
      if (selectedType.requiresQualifier) {
        try {
          const token = authService.getIdToken();
          const qRes = await fetch(`${BASE_URL}/lead-search/qualify-office-results`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
            body: JSON.stringify({
              results: allResults.slice(0, 20).map(r => ({
                name: r.name,
                formattedAddress: r.address,
                types: r.types || [],
                rating: r.rating
              }))
            })
          });
          const qData = await qRes.json();
          if (Array.isArray(qData.results)) {
            allResults = allResults.filter((_, i) => qData.results[i]?.keep !== false);
          }
        } catch {
          // qualifier failure is non-blocking — proceed with unfiltered results
        }
      }

      // Client-side filter by building name if provided
      const nameFilter = buildingName.trim().toLowerCase();
      const nameFiltered = nameFilter
        ? allResults.filter(r => r.name.toLowerCase().includes(nameFilter))
        : allResults;

      if (nameFiltered.length === 0) {
        setError(nameFilter
          ? `No results matched "${buildingName}" — try a broader name or clear the building name field`
          : 'No results found — try a different building type or location'
        );
        return;
      }

      setRawResultCount(allResults.length);

      // AI scoring
      setAiScoring(true);
      const cityName = location.split(',')[0].trim();
      const stateName = location.split(',')[1]?.trim() || 'TX';

      try {
        const token = authService.getIdToken();
        const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
        const aiRes = await fetch(`${BASE_URL}/ai/score-results`, {
          method: 'POST', headers,
          body: JSON.stringify({
            results: nameFiltered.slice(0, 20).map(r => ({
              name: r.name,
              rating: r.rating,
              buildingType: selectedType.label,
              google_types: r.types || [],
              city: cityName,
              state: stateName
            })),
            buildingType: selectedType.label,
            city: cityName,
            state: stateName
          })
        });
        const aiData = await aiRes.json();
        if (aiData.results?.length) {
          const scored = nameFiltered.slice(0, 20).map((r, i) => ({
            ...r,
            ai_score: aiData.results[i]?.ai_score || 50,
            ai_reason: aiData.results[i]?.ai_reason,
            should_import: aiData.results[i]?.should_import !== false
          }));
          setPlaceResults(scored);
        } else {
          nameFiltered.sort((a, b) => a.distance_meters - b.distance_meters);
          setPlaceResults(nameFiltered.slice(0, 20));
        }
      } catch {
        nameFiltered.sort((a, b) => a.distance_meters - b.distance_meters);
        setPlaceResults(nameFiltered.slice(0, 20));
      } finally {
        setAiScoring(false);
      }
    } catch (e) {
      setError('Search failed: ' + e.message);
    } finally {
      setPlaceLoading(false);
    }
  };

  const importProspect = async (place) => {
    setImporting(prev => ({ ...prev, [place.google_place_id]: true }));
    try {
      let enriched = { ...place };
      try {
        const detailRes = await fetch(
          `https://places.googleapis.com/v1/places/${place.google_place_id}`,
          {
            headers: {
              'X-Goog-Api-Key': PLACES_KEY,
              'X-Goog-FieldMask': 'websiteUri,nationalPhoneNumber'
            }
          }
        );
        const details = await detailRes.json();
        if (details.websiteUri) enriched.website = details.websiteUri;
        if (details.nationalPhoneNumber) enriched.phone = details.nationalPhoneNumber;
      } catch {}
      const newProspect = await api.createProspect(enriched);
      setImported(prev => ({ ...prev, [place.google_place_id]: true }));
      // Trigger review analysis in background - fire and forget
      if (newProspect && newProspect.id && place.google_place_id) {
        const token = authService.getIdToken();
        fetch(`${BASE_URL}/prospects/${newProspect.id}/analyze-reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify({ place_id: place.google_place_id })
        }).catch(() => {}); // non-blocking, ignore errors
      }
      const updated = await api.getProspects();
      setProspects(updated);
      setFiltered(updated);
    } catch (e) {
      if (e.message.includes('409') || e.message.includes('already')) {
        setImported(prev => ({ ...prev, [place.google_place_id]: true }));
      } else {
        setError('Import failed: ' + e.message);
      }
    } finally {
      setImporting(prev => ({ ...prev, [place.google_place_id]: false }));
    }
  };

  const getScoreColor = (score) => score >= 80 ? 'text-green-400 bg-green-500/20 border-green-500/30' : score >= 60 ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' : 'text-red-400 bg-red-500/20 border-red-500/30';
  const urgencyColors = { high: 'text-red-400 bg-red-500/20 border-red-500/30', medium: 'text-amber-400 bg-amber-500/20 border-amber-500/30', low: 'text-green-400 bg-green-500/20 border-green-500/30' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">AI-Powered Lead Search</h2>
            <p className="text-gray-400">Find elevator service opportunities</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setMode('saved'); setLastRefresh(Date.now()); }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'saved' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              Saved ({prospects.length})
            </button>
            <button onClick={() => setMode('discover')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'discover' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              Discover New
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" /><p className="text-red-400">{error}</p>
          </div>
        )}

        {mode === 'saved' && (
          <>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="relative mb-3">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, city, or address..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div className="flex gap-3 flex-wrap items-center">
                <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                  <option value="all">All Urgency</option>
                  <option value="high">High Urgency</option>
                  <option value="medium">Medium Urgency</option>
                  <option value="low">Low Urgency</option>
                </select>
                <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                  <option value="all">All Cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Min Score:</span>
                  <input type="number" value={minScore} onChange={e => setMinScore(Number(e.target.value))}
                    min="0" max="100" placeholder="0"
                    className="w-16 px-2 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                {activeFilters > 0 && (
                  <button onClick={() => { setUrgencyFilter('all'); setCityFilter('all'); setMinScore(0); setStatusFilter('all'); }}
                    className="px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/30">
                    Clear ({activeFilters})
                  </button>
                )}
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">{filtered.length} of {prospects.length} prospects</p>
            <div className="space-y-4">
              {filtered.map(prospect => (
                <div key={prospect.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-purple-600/20 rounded-lg p-3 border border-purple-600/30">
                        <Building2 className="w-8 h-8 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{prospect.name}</h3>
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <MapPin className="w-4 h-4" />{prospect.address || `${prospect.city}, ${prospect.state}`}
                        </div>
                        {prospect.rating && (
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-white">{prospect.rating}</span>
                            {prospect.total_reviews && <span className="text-gray-400">({prospect.total_reviews?.toLocaleString()} reviews)</span>}
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <span className={`px-2 py-1 rounded text-xs border ${prospect.status === 'new' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>{prospect.status}</span>
                          {prospect.service_urgency && <span className={`px-2 py-1 rounded text-xs border ${urgencyColors[prospect.service_urgency]}`}>{prospect.service_urgency} urgency</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs mb-1">Lead Score</p>
                      <span className={`text-3xl font-bold px-3 py-1 rounded-lg border ${getScoreColor(prospect.lead_score)}`}>{prospect.lead_score || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-700">
                    <Link to={`/internal/prospect/${prospect.id}`}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />View Details
                    </Link>
                    {prospect.phone && (
                      <a href={`tel:${prospect.phone}`} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2">
                        <Phone className="w-4 h-4" />Call
                      </a>
                    )}
                    <button onClick={() => archiveProspect(prospect.id)}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">
                      Archive
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && !loading && (
                <div className="text-center py-16">
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-xl">No prospects found</p>
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'discover' && (
          <>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">Search for Buildings</h3>

              {/* Building type selector */}
              <div className="flex gap-2 flex-wrap mb-4">
                {BUILDING_TYPES.map(type => (
                  <button key={type.label} onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedType.label === type.label ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                  <Building2 className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input type="text" value={buildingName} onChange={e => setBuildingName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchPlaces()}
                    placeholder="Building name (optional)..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div className="relative flex-1 min-w-48">
                  <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input type="text" value={location}
                    onChange={e => { setLocation(e.target.value); fetchLocationSuggestions(e.target.value); }}
                    onKeyDown={e => { if (e.key === 'Enter') { setShowSuggestions(false); searchPlaces(); } if (e.key === 'Escape') setShowSuggestions(false); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="City or State (e.g. Dallas TX, New York, Chicago)..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden shadow-xl">
                      {locationSuggestions.map(s => (
                        <button key={s.place_id} onMouseDown={() => { setLocation(s.description); setShowSuggestions(false); setLocationSuggestions([]); }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-3 border-b border-gray-700 last:border-0">
                          <MapPin className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />{s.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={searchPlaces} disabled={placeLoading || !location.trim()}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2 whitespace-nowrap">
                  <Search className="w-4 h-4" />{aiScoring ? 'AI Scoring...' : placeLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-3">Searches within 55 miles — works anywhere in the United States</p>
            </div>

            {buildingName.trim() && placeResults.length > 0 && (
              <p className="text-purple-400 text-sm mb-2">
                Showing {placeResults.length} of {rawResultCount} results matching &ldquo;{buildingName}&rdquo;
              </p>
            )}
            <div className="space-y-4">
              {placeResults.map(place => (
                <div key={place.google_place_id} className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-purple-500 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-600/20 rounded-lg p-3 border border-blue-600/30">
                        <Building2 className="w-8 h-8 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{place.name}</h3>
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <MapPin className="w-4 h-4" />{place.address}
                        </div>
                        {place.rating && (
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-white">{place.rating}</span>
                            {place.total_reviews && <span className="text-gray-400">({place.total_reviews?.toLocaleString()} reviews)</span>}
                            {place.ai_score && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${place.ai_score >= 80 ? 'bg-green-900/40 text-green-400' : place.ai_score >= 60 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
                                AI {place.ai_score}
                              </span>
                            )}
                            {place.ai_reason && <span className="text-purple-400 text-xs italic">— {place.ai_reason}</span>}
                            {place.distance_meters && <span className="text-gray-500 text-xs">{(place.distance_meters / 1609).toFixed(1)} mi away</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={`https://www.google.com/search?q=${encodeURIComponent(place.name + ' ' + (place.address || ''))}`}
                        target="_blank" rel="noreferrer"
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5" />Google
                      </a>
                      <button onClick={() => importProspect(place)}
                        disabled={importing[place.google_place_id] || imported[place.google_place_id]}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                          imported[place.google_place_id] ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                        {imported[place.google_place_id] ? <><CheckCircle className="w-4 h-4" />Imported</> : importing[place.google_place_id] ? 'Importing...' : <><Plus className="w-4 h-4" />Import</>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {placeResults.length === 0 && !placeLoading && (
                <div className="text-center py-16">
                  <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-xl">Search for buildings to discover new leads</p>
                  <p className="text-gray-500 mt-2">Select a building type, enter a location, and click Search</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeadSearch;
