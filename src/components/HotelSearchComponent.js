// src/components/HotelSearchComponent.js
// This component uses Google Places Autocomplete + Text Search

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Loader } from 'lucide-react';

const HotelSearchComponent = ({ onHotelsFound }) => {
  const [city, setCity] = useState('');
  const [state, setState] = useState('TX');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load Google Maps JavaScript API
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_PLACES_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const searchHotels = async () => {
    if (!city.trim()) {
      setError('Please enter a city name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Wait for Google Maps to load
      await waitForGoogleMaps();

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      // Search for hotels
      const request = {
        query: `hotels in ${city}, ${state}`,
        type: 'lodging'
      };

      service.textSearch(request, async (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          // Get detailed info for each hotel
          const hotelsWithDetails = [];
          
          for (const place of results.slice(0, 20)) { // Limit to 20 hotels
            const details = await getPlaceDetails(service, place.place_id);
            if (details) {
              const processedHotel = processHotelData(details);
              hotelsWithDetails.push(processedHotel);
            }
          }

          onHotelsFound(hotelsWithDetails);
          setIsLoading(false);
        } else {
          setError(`Search failed: ${status}`);
          setIsLoading(false);
        }
      });
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Wait for Google Maps API to load
  const waitForGoogleMaps = () => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const checkGoogle = setInterval(() => {
        attempts++;
        if (window.google && window.google.maps) {
          clearInterval(checkGoogle);
          resolve();
        } else if (attempts > 50) {
          clearInterval(checkGoogle);
          reject(new Error('Google Maps failed to load'));
        }
      }, 100);
    });
  };

  // Get detailed place information
  const getPlaceDetails = (service, placeId) => {
    return new Promise((resolve) => {
      service.getDetails(
        {
          placeId: placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'formatted_phone_number',
            'rating',
            'user_ratings_total',
            'reviews',
            'photos',
            'geometry'
          ]
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            resolve(place);
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  // Process hotel data into our format
  const processHotelData = (place) => {
    const elevatorAnalysis = analyzeElevatorReviews(place.reviews || []);
    
    return {
      id: Date.now() + Math.random(), // Temporary ID
      google_place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || '',
      city: extractCity(place.formatted_address),
      state: extractState(place.formatted_address),
      rating: place.rating || 0,
      floors: estimateFloors(place),
      elevators: estimateElevators(place),
      reputation_score: elevatorAnalysis.score,
      urgency: elevatorAnalysis.urgency,
      issues: elevatorAnalysis.issues,
      mentions: elevatorAnalysis.mentions,
      status: 'new',
      estimatedValue: estimateProjectValue(elevatorAnalysis),
      contact: {
        name: '',
        title: '',
        email: '',
        phone: place.formatted_phone_number || ''
      },
      notes: [],
      lastContact: null,
      nextFollowUp: null,
      reviews: place.reviews || []
    };
  };

  // Analyze elevator mentions in reviews
  const analyzeElevatorReviews = (reviews) => {
    const elevatorKeywords = [
      'elevator', 'elevators', 'lift', 'lifts',
      'slow elevator', 'broken elevator', 'elevator down'
    ];
    
    const issueKeywords = {
      breakdowns: ['broken', 'down', 'out of order', 'not working'],
      slow_service: ['slow', 'takes forever', 'long wait'],
      reliability: ['unreliable', 'always breaking'],
      noise: ['noisy', 'loud', 'squeaking'],
      maintenance: ['old', 'outdated', 'needs repair']
    };
    
    let mentions = 0;
    let negativeCount = 0;
    const issues = new Set();
    
    reviews.forEach(review => {
      const text = review.text.toLowerCase();
      const hasElevator = elevatorKeywords.some(k => text.includes(k));
      
      if (hasElevator) {
        mentions++;
        
        if (review.rating <= 3) {
          negativeCount++;
          
          Object.entries(issueKeywords).forEach(([issue, keywords]) => {
            if (keywords.some(k => text.includes(k))) {
              issues.add(issue);
            }
          });
        }
      }
    });
    
    // Calculate score
    let score = 7.0;
    if (mentions > 0) {
      score = ((mentions - negativeCount * 2) / mentions) * 10;
      score = Math.max(0, Math.min(10, score));
    }
    
    // Determine urgency
    let urgency = 'low';
    if (negativeCount >= 5) urgency = 'critical';
    else if (negativeCount >= 3) urgency = 'high';
    else if (negativeCount >= 1) urgency = 'medium';
    
    return {
      mentions,
      issues: Array.from(issues),
      score: Math.round(score * 10) / 10,
      urgency
    };
  };

  const estimateFloors = (place) => {
    const name = place.name.toLowerCase();
    if (name.includes('tower') || name.includes('high-rise')) return 25;
    if (name.includes('resort')) return 8;
    if (name.includes('suites')) return 6;
    if (name.includes('inn')) return 3;
    return place.user_ratings_total > 1000 ? 20 : 8;
  };

  const estimateElevators = (place) => {
    const floors = estimateFloors(place);
    if (floors <= 3) return 1;
    if (floors <= 6) return 2;
    if (floors <= 12) return 4;
    return 6;
  };

  const estimateProjectValue = (analysis) => {
    let base = 35000;
    if (analysis.urgency === 'critical') base += 70000;
    else if (analysis.urgency === 'high') base += 45000;
    else if (analysis.urgency === 'medium') base += 25000;
    return base + (analysis.issues.length * 10000);
  };

  const extractCity = (address) => {
    const parts = address.split(',');
    return parts.length >= 2 ? parts[parts.length - 3]?.trim() || '' : '';
  };

  const extractState = (address) => {
    const parts = address.split(',');
    return parts.length >= 2 ? parts[parts.length - 2]?.trim().split(' ')[0] || '' : '';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-4">Search for Hotels</h2>
      <p className="text-gray-400 mb-6">Find hotels with potential elevator service needs</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-gray-400 text-sm mb-2">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Dallas, Houston, Austin..."
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && searchHotels()}
          />
        </div>
        
        <div>
          <label className="block text-gray-400 text-sm mb-2">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="TX">Texas</option>
            <option value="OK">Oklahoma</option>
          </select>
        </div>
        
        <div>
          <label className="block text-gray-400 text-sm mb-2">&nbsp;</label>
          <button
            onClick={searchHotels}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search Hotels
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {!process.env.REACT_APP_GOOGLE_PLACES_API_KEY && (
        <div className="p-4 bg-yellow-600/20 border border-yellow-600/30 rounded-lg text-yellow-400 text-sm">
          <strong>Note:</strong> Add your Google Places API key to environment variables:
          <code className="block mt-2 bg-gray-900 p-2 rounded">
            REACT_APP_GOOGLE_PLACES_API_KEY=your_key_here
          </code>
        </div>
      )}
    </div>
  );
};

export default HotelSearchComponent;
