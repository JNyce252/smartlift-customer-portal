import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, LogOut, Navigation, Plus, X, Clock, Map, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const MAPS_KEY = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;

const RouteOptimizer = () => {
  const { user, logout } = useAuth();
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

  // Load Google Maps
  useEffect(() => {
    if (window.google) { setMapsLoaded(true); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
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

  // Place markers when prospects load
  useEffect(() => {
    if (!googleMapRef.current || !mapsLoaded || prospects.length === 0) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = prospects.map(p => {
      const marker = new window.google.maps.Marker({
        position: { lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) },
        map: googleMapRef.current,
        title: p.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: stops.find(s => s.id === p.id) ? '#8B5CF6' : '#6B7280',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        }
      });
      marker.addListener('click', () => addStop(p));
      return marker;
    });
  }, [mapsLoaded, prospects]);

  const addStop = (prospect) => {
    if (stops.find(s => s.id === prospect.id)) return;
    setStops(prev => [...prev, prospect]);
  };

  const removeStop = (id) => setStops(prev => prev.filter(s => s.id !== id));

  const moveStop = (index, dir) => {
    const newStops = [...stops];
    const swap = index + dir;
    if (swap < 0 || swap >= newStops.length) return;
    [newStops[index], newStops[swap]] = [newStops[swap], newStops[index]];
    setStops(newStops);
  };

  const calculateRoute = useCallback(async () => {
    if (stops.length < 2) return;
    setCalculating(true);
    setError(null);
    try {
      const service = new window.google.maps.DirectionsService();
      const origin = { lat: parseFloat(stops[0].latitude), lng: parseFloat(stops[0].longitude) };
      const destination = { lat: parseFloat(stops[stops.length - 1].latitude), lng: parseFloat(stops[stops.length - 1].longitude) };
      const waypoints = stops.slice(1, -1).map(s => ({
        location: { lat: parseFloat(s.latitude), lng: parseFloat(s.longitude) },
        stopover: true
      }));

      service.route({
        origin, destination, waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true,
      }, (result, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(result);
          const legs = result.routes[0].legs;
          const totalDist = legs.reduce((a, l) => a + l.distance.value, 0);
          const totalTime = legs.reduce((a, l) => a + l.duration.value, 0);
          setRouteInfo({
            legs: legs.map((l, i) => ({
              from: stops[i]?.name,
              to: stops[i + 1]?.name,
              distance: l.distance.text,
              duration: l.duration.text,
            })),
            totalDistance: (totalDist / 1000).toFixed(1) + ' km',
            totalTime: Math.round(totalTime / 60) + ' min',
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
  }, [stops]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/dashboard"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Route Optimizer</h1>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Left Panel */}
        <div className="w-96 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white mb-1">Plan Your Route</h2>
            <p className="text-gray-400 text-sm">Click prospects on the map or list to add stops</p>
          </div>

          {/* Stops */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium flex items-center gap-2"><Map className="w-4 h-4 text-purple-400" />Stops ({stops.length})</h3>
              {stops.length >= 2 && (
                <button onClick={calculateRoute} disabled={calculating}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" />{calculating ? 'Calculating...' : 'Calculate'}
                </button>
              )}
            </div>
            {stops.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Add stops from the prospect list below</p>
            ) : (
              <div className="space-y-2">
                {stops.map((stop, i) => (
                  <div key={stop.id} className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2">
                    <span className="w-6 h-6 bg-purple-600 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <span className="text-white text-sm flex-1 truncate">{stop.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveStop(i, -1)} className="text-gray-400 hover:text-white"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => moveStop(i, 1)} className="text-gray-400 hover:text-white"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeStop(stop.id)} className="text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Route Info */}
          {routeInfo && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-green-400" />Route Summary</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Total Time</p>
                  <p className="text-white font-bold">{routeInfo.totalTime}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <p className="text-gray-400 text-xs">Total Distance</p>
                  <p className="text-white font-bold">{routeInfo.totalDistance}</p>
                </div>
              </div>
              <div className="space-y-1">
                {routeInfo.legs.map((leg, i) => (
                  <div key={i} className="text-xs text-gray-400 flex justify-between">
                    <span className="truncate flex-1">{leg.from} → {leg.to}</span>
                    <span className="text-gray-300 ml-2 flex-shrink-0">{leg.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="mx-4 mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

          {/* Prospect List */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-white font-medium mb-3">Prospects ({prospects.length} with location)</h3>
            <div className="space-y-2">
              {prospects.map(p => (
                <button key={p.id} onClick={() => addStop(p)}
                  disabled={!!stops.find(s => s.id === p.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    stops.find(s => s.id === p.id)
                      ? 'bg-purple-600/20 border-purple-600/30 cursor-default'
                      : 'bg-gray-700/50 border-gray-600 hover:border-purple-500'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium truncate">{p.name}</span>
                    {stops.find(s => s.id === p.id)
                      ? <span className="text-purple-400 text-xs flex-shrink-0 ml-2">Added</span>
                      : <Plus className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-400 text-xs truncate">{p.city}, {p.state}</span>
                    {p.rating && <><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-gray-400 text-xs">{p.rating}</span></>}
                  </div>
                </button>
              ))}
              {prospects.length === 0 && !loading && (
                <p className="text-gray-500 text-sm text-center py-4">No prospects with location data yet. Import some from Discover New.</p>
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
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;
