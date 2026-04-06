import React, { useState, useEffect, useRef, useCallback } from 'react';
import UserMenu from '../../components/common/UserMenu';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Navigation, Plus, X, Clock, Map, ChevronUp, ChevronDown, Star, Zap, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY || 'AIzaSyDmTnd7Q4K9YZ_uwF7bKKU42_kDHrlwG5E';
const DEFAULT_START = { lat: 32.7767, lng: -96.7970, name: 'Dallas, TX' };

const RouteOptimizer = () => {
  const { user } = useAuth();
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const markersRef = useRef([]);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [prospects, setProspects] = useState([]);
  const [stops, setStops] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startAddress, setStartAddress] = useState('Dallas, TX');
  const [sortBy, setSortBy] = useState('score');
  const [filterUrgency, setFilterUrgency] = useState('all');

  // Load Google Maps
  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + MAPS_KEY + '&libraries=places';
    script.async = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 32.7767, lng: -96.7970 },
      zoom: 10,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1d2535' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2535' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      ]
    });
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#8B5CF6', strokeWeight: 4 }
    });
    directionsRendererRef.current.setMap(googleMapRef.current);
  }, [mapsLoaded]);

  // Load prospects
  useEffect(() => {
    api.getProspects()
      .then(data => setProspects(data.filter(p => p.latitude && p.longitude)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Place markers
  useEffect(() => {
    if (!googleMapRef.current || !mapsLoaded || prospects.length === 0) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = prospects.map(p => {
      const isStop = stops.find(s => s.id === p.id);
      const isHighUrgency = p.service_urgency === 'high';
      const marker = new window.google.maps.Marker({
        position: { lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) },
        map: googleMapRef.current,
        title: p.name + ' — Score: ' + (p.lead_score || 'N/A'),
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isStop ? 10 : 8,
          fillColor: isStop ? '#8B5CF6' : isHighUrgency ? '#EF4444' : '#6B7280',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        }
      });
      marker.addListener('click', () => addStop(p));
      return marker;
    });
  }, [mapsLoaded, prospects, stops]);

  const addStop = (prospect) => {
    if (stops.find(s => s.id === prospect.id)) return;
    setStops(prev => [...prev, prospect]);
  };

  const removeStop = (id) => {
    setStops(prev => prev.filter(s => s.id !== id));
    setRouteInfo(null);
  };

  const moveStop = (index, dir) => {
    const newStops = [...stops];
    const swap = index + dir;
    if (swap < 0 || swap >= newStops.length) return;
    [newStops[index], newStops[swap]] = [newStops[swap], newStops[index]];
    setStops(newStops);
    setRouteInfo(null);
  };

  const addTopProspects = () => {
    const top = [...prospects]
      .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))
      .slice(0, 5)
      .filter(p => !stops.find(s => s.id === p.id));
    setStops(prev => [...prev, ...top]);
    setRouteInfo(null);
  };

  const calculateRoute = useCallback(async () => {
    if (stops.length < 2) return;
    setCalculating(true);
    setError(null);
    try {
      const geocoder = new window.google.maps.Geocoder();
      const service = new window.google.maps.DirectionsService();

      // Geocode start address
      const geocodeResult = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: startAddress }, (results, status) => {
          if (status === 'OK') resolve(results[0].geometry.location);
          else reject(new Error('Could not find start address'));
        });
      });

      const origin = geocodeResult;
      const destination = { lat: parseFloat(stops[stops.length - 1].latitude), lng: parseFloat(stops[stops.length - 1].longitude) };
      const waypoints = stops.slice(0, -1).map(s => ({
        location: { lat: parseFloat(s.latitude), lng: parseFloat(s.longitude) },
        stopover: true
      }));

      service.route({
        origin, destination, waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      }, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result);
          const legs = result.routes[0].legs;
          const totalDist = legs.reduce((a, l) => a + l.distance.value, 0);
          const totalTime = legs.reduce((a, l) => a + l.duration.value, 0);
          setRouteInfo({
            legs: legs.map((l, i) => ({
              from: i === 0 ? startAddress : stops[i - 1]?.name,
              to: stops[i]?.name,
              distance: l.distance.text,
              duration: l.duration.text,
            })),
            totalDistance: (totalDist / 1609.34).toFixed(1) + ' mi',
            totalTime: Math.floor(totalTime / 3600) > 0
              ? Math.floor(totalTime / 3600) + 'h ' + Math.round((totalTime % 3600) / 60) + 'min'
              : Math.round(totalTime / 60) + ' min',
            stops: stops.length,
          });
        } else {
          setError('Could not calculate route: ' + status);
        }
        setCalculating(false);
      });
    } catch (e) {
      setError(e.message);
      setCalculating(false);
    }
  }, [stops, startAddress]);

  const sortedProspects = [...prospects]
    .filter(p => filterUrgency === 'all' || p.service_urgency === filterUrgency)
    .sort((a, b) => {
      if (sortBy === 'score') return (b.lead_score || 0) - (a.lead_score || 0);
      if (sortBy === 'urgency') {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.service_urgency] || 2) - (order[b.service_urgency] || 2);
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/dashboard"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Route Planner</h1>
                <p className="text-xs text-gray-400">{prospects.length} prospects with location</p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Left Panel */}
        <div className="w-96 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">

          {/* Start Location */}
          <div className="p-4 border-b border-gray-700">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-2">Starting From</label>
            <input
              type="text"
              value={startAddress}
              onChange={e => setStartAddress(e.target.value)}
              placeholder="Enter starting address..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Stops */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Map className="w-4 h-4 text-purple-400" />Stops ({stops.length})
              </h3>
              <div className="flex gap-2">
                {stops.length > 0 && (
                  <button onClick={() => { setStops([]); setRouteInfo(null); }}
                    className="p-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg" title="Clear all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {stops.length >= 2 && (
                  <button onClick={calculateRoute} disabled={calculating}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" />{calculating ? 'Calculating...' : 'Get Route'}
                  </button>
                )}
              </div>
            </div>
            {stops.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-3">Click a prospect below or on the map to add stops</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stops.map((stop, i) => (
                  <div key={stop.id} className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2">
                    <span className="w-6 h-6 bg-purple-600 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{stop.name}</p>
                      <p className="text-gray-400 text-xs">{stop.city}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => moveStop(i, -1)} className="text-gray-400 hover:text-white p-0.5"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveStop(i, 1)} className="text-gray-400 hover:text-white p-0.5"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeStop(stop.id)} className="text-red-400 hover:text-red-300 p-0.5"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Route Summary */}
          {routeInfo && (
            <div className="p-4 border-b border-gray-700 bg-purple-900/10">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-400" />Route Summary
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Stops</p>
                  <p className="text-white font-bold">{routeInfo.stops}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Time</p>
                  <p className="text-white font-bold text-sm">{routeInfo.totalTime}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Miles</p>
                  <p className="text-white font-bold text-sm">{routeInfo.totalDistance}</p>
                </div>
              </div>
              <div className="space-y-1">
                {routeInfo.legs.map((leg, i) => (
                  <div key={i} className="text-xs flex justify-between items-center gap-2">
                    <span className="text-gray-400 truncate flex-1">{leg.from} → {leg.to}</span>
                    <span className="text-gray-300 flex-shrink-0">{leg.distance} · {leg.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mx-4 mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
          )}

          {/* Prospect List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium text-sm">Prospects ({sortedProspects.length})</h3>
                <button onClick={addTopProspects} disabled={prospects.length === 0}
                  className="px-2 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700/30 rounded text-xs flex items-center gap-1">
                  <Zap className="w-3 h-3" />Add Top 5
                </button>
              </div>
              <div className="flex gap-2">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none">
                  <option value="score">Sort: Score</option>
                  <option value="urgency">Sort: Urgency</option>
                  <option value="name">Sort: Name</option>
                </select>
                <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 text-xs focus:outline-none">
                  <option value="all">All urgency</option>
                  <option value="high">High only</option>
                  <option value="medium">Medium only</option>
                </select>
              </div>
            </div>

            <div className="p-3 space-y-2">
              {sortedProspects.map(p => {
                const isAdded = !!stops.find(s => s.id === p.id);
                const urgencyColor = p.service_urgency === 'high' ? 'border-red-700/40' : p.service_urgency === 'medium' ? 'border-amber-700/40' : 'border-gray-600';
                return (
                  <button key={p.id} onClick={() => addStop(p)} disabled={isAdded}
                    className={'w-full text-left p-3 rounded-lg border transition-colors ' + (isAdded ? 'bg-purple-600/20 border-purple-600/30 cursor-default' : 'bg-gray-700/50 ' + urgencyColor + ' hover:border-purple-500')}>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium truncate flex-1">{p.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {p.lead_score && (
                          <span className={'text-xs font-bold ' + (p.lead_score >= 80 ? 'text-green-400' : p.lead_score >= 60 ? 'text-amber-400' : 'text-gray-400')}>
                            {p.lead_score}
                          </span>
                        )}
                        {isAdded ? <span className="text-purple-400 text-xs">✓</span> : <Plus className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-gray-400 text-xs">{p.city}</span>
                      {p.rating && <span className="text-gray-400 text-xs flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />{p.rating}</span>}
                      {p.service_urgency === 'high' && <span className="text-red-400 text-xs font-medium">High urgency</span>}
                    </div>
                  </button>
                );
              })}
              {sortedProspects.length === 0 && !loading && (
                <p className="text-gray-500 text-sm text-center py-8">No prospects with location data. Import prospects from Lead Search first.</p>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {!mapsLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <Navigation className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-pulse" />
                <p className="text-white">Loading map...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
          {/* Map legend */}
          <div className="absolute bottom-4 left-4 bg-gray-800/90 rounded-lg p-3 border border-gray-700 text-xs">
            <p className="text-gray-400 font-medium mb-2">Map Legend</p>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-gray-300">Added to route</span></div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-gray-300">High urgency</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-500"></div><span className="text-gray-300">Available</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;
