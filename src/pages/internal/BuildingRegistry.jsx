import { useUserPreferences } from '../../hooks/useUserPreferences';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../../services/authService';
import {
  Building2, AlertTriangle, TrendingUp, Filter, Plus, Search,
  MapPin, Calendar, ChevronRight, ChevronDown, RefreshCw, Mail, X, Shield,
} from 'lucide-react';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';
const LIMIT = 50;
const STATE = 'TX';

const URGENCY_BORDER = {
  expired:     'border-l-red-500',
  expiring_30: 'border-l-orange-500',
  expiring_60: 'border-l-amber-500',
  expiring_90: 'border-l-blue-500',
  current:     'border-l-green-600',
};

const URGENCY_BADGE = {
  expired:     'text-red-400 bg-red-900/20 border-red-700/30',
  expiring_30: 'text-orange-400 bg-orange-900/20 border-orange-700/30',
  expiring_60: 'text-amber-400 bg-amber-900/20 border-amber-700/30',
  expiring_90: 'text-blue-400 bg-blue-900/20 border-blue-700/30',
  current:     'text-green-400 bg-green-900/20 border-green-700/30',
};

const URGENCY_LABEL = {
  expired:     'Expired',
  expiring_30: 'Expires < 30d',
  expiring_60: 'Expires < 60d',
  expiring_90: 'Expires < 90d',
  current:     'Current',
};

const BuildingRegistry = () => {
  const navigate = useNavigate();
  const { get, savePreference, savePreferences, loading: prefsLoading } = useUserPreferences();

  const [summary, setSummary]           = useState(null);
  const [buildings, setBuildings]       = useState([]);
  const [cities, setCities]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [promoting, setPromoting]       = useState({});
  const [expanded, setExpanded]         = useState({});
  const [toast, setToast]               = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(null);
  const [requestingState, setRequestingState] = useState(false);
  const [requestSent, setRequestSent]   = useState(false);

  const [certStatus, setCertStatus]     = useState('all');
  const [equipType, setEquipType]       = useState('all');
  const [city, setCity]                 = useState('');
  const [excludeExisting, setExclude]   = useState(true);
  const [q, setQ]                       = useState('');
  const [page, setPage]                 = useState(0);

  // headers built per-call via authHeaders() (only sets Authorization when a token exists)
  const authHeader = authHeaders;

  // Restore saved preferences once they load
  useEffect(() => {
    if (prefsLoading) return;
    setCertStatus(get('registry_cert_status', 'all'));
    setEquipType(get('registry_equip_type', 'all'));
    setCity(get('registry_city', ''));
    setExclude(get('registry_exclude_existing', true) !== false);
  }, [prefsLoading]); // eslint-disable-line

  // Load city list once on mount
  useEffect(() => {
    fetch(`${BASE_URL}/building-registry/cities?state=${STATE}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => setCities(d.cities || []))
      .catch(() => {});
  }, []); // eslint-disable-line

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBuildings = useCallback(async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);
    try {
      const params = new URLSearchParams({ state: STATE, limit: LIMIT, offset: currentPage * LIMIT });
      if (certStatus !== 'all') params.set('cert_status', certStatus);
      if (equipType !== 'all')  params.set('equipment_type', equipType);
      if (city)                 params.set('city', city);
      if (q)                    params.set('q', q);
      if (!excludeExisting)     params.set('exclude_existing', 'false');
      const res = await fetch(`${BASE_URL}/building-registry?${params}`, { headers: authHeader() });
      const data = await res.json();
      setSummary(data.summary || null);
      setBuildings(data.buildings || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [certStatus, equipType, city, q, excludeExisting, page]); // eslint-disable-line

  useEffect(() => { if (!prefsLoading) fetchBuildings(true); }, [certStatus, equipType, city, q, excludeExisting, prefsLoading]); // eslint-disable-line
  useEffect(() => { if (!prefsLoading) fetchBuildings(); }, [page]); // eslint-disable-line

  const promote = async (building) => {
    setPromoting(prev => ({ ...prev, [building.building_key]: true }));
    try {
      const res = await fetch(`${BASE_URL}/building-registry/promote`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ building_key: building.building_key, registry_ids: building.registry_ids }),
      });
      const data = await res.json();
      if (res.status === 409) {
        showToast('Already a prospect — taking you there now.', 'info');
        setTimeout(() => navigate(`/internal/prospect/${data.id}`), 900);
      } else if (res.status === 201) {
        showToast('Prospect created with AI scoring!');
        setTimeout(() => navigate(`/internal/prospect/${data.id}`), 700);
      } else {
        showToast(data.error || 'Something went wrong', 'error');
      }
    } catch (e) {
      showToast('Network error — try again.', 'error');
    } finally {
      setPromoting(prev => ({ ...prev, [building.building_key]: false }));
    }
  };

  const sendRegistryRequest = async () => {
    setRequestingState(true);
    try {
      const res = await fetch(`${BASE_URL}/registry-requests`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ state: 'GA', notes: 'Requested from Building Registry empty state' }),
      });
      if (res.ok) setRequestSent(true);
    } catch (e) { /* non-fatal */ }
    finally { setRequestingState(false); }
  };

  const generateEmail = (b) => {
    const earliest = b.earliest_expiration ? new Date(b.earliest_expiration) : null;
    const daysUntil = earliest ? Math.ceil((earliest - new Date()) / 86400000) : null;
    const subject = b.expired_count > 0
      ? `Elevator Compliance Notice — ${b.building_name}`
      : `Upcoming Elevator Inspection Required — ${b.building_name}`;
    const body = b.expired_count > 0
      ? `Dear ${b.owner_name || 'Building Manager'},\n\nOur records indicate that ${b.expired_count} elevator${b.expired_count > 1 ? 's' : ''} at ${b.building_address}, ${b.building_city} TX ${b.expired_count > 1 ? 'have' : 'has'} an expired TDLR inspection certificate.\n\nAs a licensed elevator service company, we can help you get back into compliance quickly. Operating an elevator with an expired certificate can result in fines and mandatory shutdown.\n\nWe would like to schedule an inspection at your earliest convenience. Please reply to this email or call us to discuss.\n\nBest regards,\nDerald Armstrong\nSouthwest Cabs Elevator Services\n972-974-7005`
      : `Dear ${b.owner_name || 'Building Manager'},\n\nThis is a courtesy notice that elevator${b.elevator_count > 1 ? 's' : ''} at ${b.building_address}, ${b.building_city} TX ${b.elevator_count > 1 ? 'are' : 'is'} due for ${b.elevator_count > 1 ? 'their' : 'its'} annual TDLR inspection${daysUntil != null ? ` in ${daysUntil} days` : ' soon'} (earliest expiration: ${earliest ? earliest.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}).\n\nWe are a licensed elevator service company serving the ${b.building_city} area. We can schedule and complete your required inspection to keep you in compliance with Texas state law.\n\nPlease reply or call us to schedule at your convenience.\n\nBest regards,\nDerald Armstrong\nSouthwest Cabs Elevator Services\n972-974-7005`;
    return { subject, body };
  };

  const clearFilters = () => {
    setCertStatus('all'); setEquipType('all'); setCity(''); setQ('');
    savePreferences({ registry_cert_status: 'all', registry_equip_type: 'all', registry_city: '' });
  };
  const hasFilters = certStatus !== 'all' || equipType !== 'all' || city || q;
  const notAvailable = summary && !summary.data_available;

  return (
    <div className="min-h-screen bg-gray-900">

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}
          className={`px-4 py-3 rounded-xl border text-sm font-medium shadow-xl ${
            toast.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-200'
            : toast.type === 'info' ? 'bg-blue-900/90 border-blue-700 text-blue-200'
            : 'bg-green-900/90 border-green-700 text-green-200'
          }`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Building Registry</h1>
          <p className="text-gray-400 text-sm mt-1">
            Texas elevator compliance data
            {summary ? ` — ${summary.total_buildings.toLocaleString()} buildings tracked` : ''}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Buildings', value: summary?.total_buildings,
              sub: 'In TX registry', color: 'text-gray-300',
              bg: 'bg-gray-800 border-gray-700', icon: Building2,
            },
            {
              label: 'Expired Now', value: summary?.expired_now,
              sub: 'Out of compliance', color: 'text-red-400',
              bg: 'bg-red-900/10 border-red-700/30', icon: AlertTriangle, status: 'expired',
            },
            {
              label: 'Expiring 90 Days', value: summary?.expiring_90d,
              sub: 'Active opportunity', color: 'text-blue-400',
              bg: 'bg-blue-900/10 border-blue-700/30', icon: TrendingUp, status: 'expiring_90',
            },
            {
              label: 'Matching Filter', value: summary?.matching_filter,
              sub: excludeExisting ? 'Excl. existing prospects' : 'All buildings',
              color: 'text-purple-400',
              bg: 'bg-purple-900/10 border-purple-700/30', icon: Filter,
            },
          ].map(({ label, value, sub, color, bg, icon: Icon, status }) => (
            <button key={label}
              onClick={() => {
                if (!status) return;
                const next = certStatus === status ? 'all' : status;
                setCertStatus(next);
                savePreference('registry_cert_status', next);
              }}
              className={`rounded-xl p-5 border text-left transition-all ${bg} ${status ? 'hover:scale-105 cursor-pointer' : 'cursor-default'} ${certStatus === status && status ? 'ring-2 ring-purple-500' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-bold ${color} mb-0.5`}>
                {value != null ? value.toLocaleString() : <span className="text-gray-600">—</span>}
              </p>
              <p className="text-gray-500 text-xs">{sub}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search building, address, owner..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <select value={certStatus}
              onChange={e => { const v = e.target.value; setCertStatus(v); savePreference('registry_cert_status', v); }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-purple-500">
              <option value="all">All Status</option>
              <option value="expired">Expired</option>
              <option value="expiring_30">Expiring &lt; 30 days</option>
              <option value="expiring_60">Expiring &lt; 60 days</option>
              <option value="expiring_90">Expiring &lt; 90 days</option>
              <option value="current">Current</option>
            </select>
            <select value={city}
              onChange={e => { const v = e.target.value; setCity(v); savePreference('registry_city', v); }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-purple-500">
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={equipType}
              onChange={e => { const v = e.target.value; setEquipType(v); savePreference('registry_equip_type', v); }}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-purple-500">
              <option value="all">All Types</option>
              <option value="PASSENGER">Passenger</option>
              <option value="FREIGHT">Freight</option>
              <option value="ESCALATOR">Escalator</option>
            </select>
            <button
              onClick={() => { const v = !excludeExisting; setExclude(v); savePreference('registry_exclude_existing', v); }}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                excludeExisting
                  ? 'bg-purple-900/30 border-purple-700/50 text-purple-300'
                  : 'bg-gray-700 border-gray-600 text-gray-400 hover:text-gray-200'
              }`}>
              {excludeExisting ? '✓ Hide Existing' : 'Show All'}
            </button>
            {hasFilters && (
              <button onClick={clearFilters}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                <X className="w-3.5 h-3.5" />Clear
              </button>
            )}
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400 text-sm">
            {summary
              ? <>Showing <span className="text-white font-medium">{buildings.length}</span> of{' '}
                  <span className="text-white font-medium">{summary.matching_filter.toLocaleString()}</span> buildings
                  {city && <span className="text-purple-400"> in {city}</span>}</>
              : 'Loading...'}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />Expired</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" />&lt;30d</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />&lt;60d</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" />&lt;90d</span>
          </div>
        </div>

        {/* Main content */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-400">Loading registry...</p>
          </div>
        ) : notAvailable ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 text-lg font-semibold mb-1">Registry data not yet available</p>
            <p className="text-gray-500 text-sm mb-6">We're tracking TX today. Request early access for additional states.</p>
            {requestSent ? (
              <p className="text-green-400 text-sm font-medium">✓ Request received — we'll notify you when data is available.</p>
            ) : (
              <button onClick={sendRegistryRequest} disabled={requestingState}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                {requestingState ? 'Sending...' : 'Request data for this state'}
              </button>
            )}
          </div>
        ) : buildings.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No buildings found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {buildings.map(building => {
              const key = building.building_key;
              const isExpanded = expanded[key];
              const isPromoting = promoting[key];
              const earliest = building.earliest_expiration ? new Date(building.earliest_expiration) : null;
              const daysUntil = earliest ? Math.ceil((earliest - new Date()) / 86400000) : null;

              return (
                <div key={key}
                  className={`bg-gray-800 rounded-xl border border-gray-700 border-l-4 ${URGENCY_BORDER[building.urgency_signal] || 'border-l-gray-600'} hover:border-gray-600 transition-colors`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-semibold text-sm">{building.building_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${URGENCY_BADGE[building.urgency_signal] || ''}`}>
                            {URGENCY_LABEL[building.urgency_signal] || building.urgency_signal}
                          </span>
                          {building.is_existing_prospect && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-green-900/20 text-green-400 border-green-700/30">
                              In Pipeline
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{building.building_address}, {building.building_city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {building.elevator_count} elevator{building.elevator_count !== 1 ? 's' : ''}
                          </span>
                          {earliest && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {daysUntil < 0
                                ? `Expired ${Math.abs(daysUntil)}d ago`
                                : daysUntil === 0 ? 'Expires today'
                                : `Cert expires ${earliest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            </span>
                          )}
                        </div>
                        {building.expired_count > 0 && (
                          <p className="text-red-400 text-xs mt-1">
                            {building.expired_count} expired cert{building.expired_count > 1 ? 's' : ''}
                            {building.expiring_90d_count > 0 && `, ${building.expiring_90d_count} expiring within 90 days`}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setShowEmailModal(building)}
                          className="p-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-700/30 rounded-lg transition-colors"
                          title="Generate outreach email">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpanded(prev => ({ ...prev, [key]: !isExpanded }))}
                          className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg transition-colors"
                          title="Show details">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {building.is_existing_prospect ? (
                          <button onClick={() => navigate(`/internal/prospect/${building.existing_prospect_id}`)}
                            className="px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                            View Prospect <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => promote(building)} disabled={isPromoting}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                            {isPromoting
                              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Creating...</>
                              : <><Plus className="w-3.5 h-3.5" />Add as Prospect</>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible detail panel */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-gray-500 mb-1">Equipment Types</p>
                          <div className="space-y-0.5">
                            {building.passenger_count > 0 && <p className="text-gray-300">{building.passenger_count} Passenger</p>}
                            {building.freight_count > 0   && <p className="text-gray-300">{building.freight_count} Freight</p>}
                            {building.escalator_count > 0 && <p className="text-gray-300">{building.escalator_count} Escalator</p>}
                            {!building.passenger_count && !building.freight_count && !building.escalator_count && <p className="text-gray-500">—</p>}
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Drive Types</p>
                          <p className="text-gray-300">{building.drive_types?.join(', ') || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Year Installed</p>
                          <p className="text-gray-300">
                            {building.year_oldest && building.year_newest && building.year_oldest !== building.year_newest
                              ? `${building.year_oldest}–${building.year_newest}`
                              : building.year_oldest || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Max Floors</p>
                          <p className="text-gray-300">{building.max_floors || '—'}</p>
                        </div>
                        {building.owner_name && (
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-gray-500 mb-1">Owner</p>
                            <p className="text-gray-300">{building.owner_name}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {summary && summary.matching_filter > LIMIT && (
          <div className="flex justify-center gap-3 mt-8">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm border border-gray-700 transition-colors">
              ← Previous
            </button>
            <span className="px-4 py-2 text-gray-400 text-sm">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * LIMIT >= summary.matching_filter}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm border border-gray-700 transition-colors">
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
                <button onClick={() => setShowEmailModal(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
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
                  <button onClick={() => navigator.clipboard.writeText(body)}
                    className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                    Copy Email Body
                  </button>
                  <a href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium text-center transition-colors flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />Open in Email Client
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default BuildingRegistry;
