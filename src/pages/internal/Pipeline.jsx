import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Building2, LogOut, Star, Brain, Eye, GripVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const COLUMNS = [
  { id: 'new', label: 'New', color: 'border-blue-500', bg: 'bg-blue-500/10', badge: 'bg-blue-500/20 text-blue-400' },
  { id: 'contacted', label: 'Contacted', color: 'border-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-400' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'border-purple-500', bg: 'bg-purple-500/10', badge: 'bg-purple-500/20 text-purple-400' },
  { id: 'won', label: 'Won', color: 'border-green-500', bg: 'bg-green-500/10', badge: 'bg-green-500/20 text-green-400' },
  { id: 'lost', label: 'Lost', color: 'border-red-500', bg: 'bg-red-500/10', badge: 'bg-red-500/20 text-red-400' },
];

const Pipeline = () => {
  const { user, logout } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [showContractModal, setShowContractModal] = useState(false);
  const [pendingWonProspect, setPendingWonProspect] = useState(null);
  const [contract, setContract] = useState({ annual_value: '', monthly_value: '', start_date: '', term_months: '12', elevators_under_contract: '', service_frequency: 'monthly', notes: '' });
  const [savingContract, setSavingContract] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [showFilterMenu, setShowFilterMenu] = useState(null);

  useEffect(() => {
    api.getProspects()
      .then(data => setProspects(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshTick]);
  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);


  const clearColumn = async (columnId) => {
    if (!window.confirm(`Move all prospects from this column to Lost?`)) return;
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    const colProspects = prospects.filter(p => (p.status || 'new') === columnId);
    for (const p of colProspects) {
      await fetch(`${BASE_URL}/prospects/${p.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'lost' }) });
    }
    setProspects(prev => prev.map(p => (p.status || 'new') === columnId ? { ...p, status: 'lost' } : p));
  };

  const getColumnProspects = (status) => {
    const filter = columnFilters[status] || '';
    return prospects
      .filter(p => (p.status || 'new') === status)
      .filter(p => !filter || p.name?.toLowerCase().includes(filter.toLowerCase()) || p.city?.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));
  };

  const updateStatus = async (prospectId, newStatus) => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    await fetch(`${BASE_URL}/prospects/${prospectId}/status`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ status: newStatus })
    });
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, status: newStatus } : p));

    // Show contract modal when moved to Won
    if (newStatus === 'won') {
      const prospect = prospects.find(p => p.id === prospectId);
      if (prospect) {
        setPendingWonProspect(prospect);
        setContract({
          annual_value: prospect.estimated_annual_value || '',
          monthly_value: '',
          start_date: new Date().toISOString().split('T')[0],
          term_months: '12',
          elevators_under_contract: prospect.estimated_elevators || '',
          service_frequency: 'monthly',
          notes: ''
        });
        setShowContractModal(true);
      }
    }
  };

  const handleDragStart = (e, prospect) => {
    setDragging(prospect);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(columnId);
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    if (dragging && dragging.status !== columnId) {
      await updateStatus(dragging.id, columnId);
    }
    setDragging(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  const scoreColor = (s) => s >= 90 ? 'text-green-400' : s >= 70 ? 'text-amber-400' : 'text-red-400';
  const urgencyColors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-green-500/20 text-green-400',
  };

  const totalPipelineValue = prospects
    .filter(p => !['lost'].includes(p.status))
    .reduce((sum, p) => sum + ((p.estimated_elevators || 3) * 8000), 0);

  const saveContract = async () => {
    if (!pendingWonProspect) return;
    setSavingContract(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      await fetch(`${BASE_URL}/contracts`, {
        method: 'POST', headers,
        body: JSON.stringify({
          prospect_id: pendingWonProspect.id,
          company_name: pendingWonProspect.name,
          ...contract,
          annual_value: contract.annual_value || (contract.monthly_value ? contract.monthly_value * 12 : 0),
          monthly_value: contract.monthly_value || (contract.annual_value ? contract.annual_value / 12 : 0),
        })
      });
      setShowContractModal(false);
      setPendingWonProspect(null);
    } catch (e) {
      alert('Failed to save contract: ' + e.message);
    } finally {
      setSavingContract(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-full px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/dashboard"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Pipeline</h1>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-gray-700/50 rounded-lg px-4 py-2 border border-gray-600">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400 text-sm">Active Pipeline:</span>
                <span className="text-white font-bold">${(totalPipelineValue/1000).toFixed(0)}K</span>
              </div>
              <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Sales Pipeline</h2>
            <p className="text-gray-400 text-sm mt-1">Drag and drop prospects between stages</p>
          </div>
          <div className="flex gap-4">
            {COLUMNS.map(col => {
              const count = getColumnProspects(col.id).length;
              return count > 0 ? (
                <div key={col.id} className="text-center hidden lg:block">
                  <p className="text-gray-400 text-xs">{col.label}</p>
                  <p className="text-white font-bold">{count}</p>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Brain className="w-10 h-10 text-purple-400 animate-pulse" />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {COLUMNS.map(col => {
              const colProspects = getColumnProspects(col.id);
              const isDragTarget = dragOver === col.id;
              return (
                <div key={col.id}
                  className={`flex-shrink-0 w-72 rounded-xl border-t-4 ${col.color} ${col.bg} ${isDragTarget ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''} transition-all`}
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDrop={e => handleDrop(e, col.id)}
                  onDragLeave={() => setDragOver(null)}>
                  
                  {/* Column Header */}
                  <div className="p-4 border-b border-gray-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-bold">{col.label}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badge}`}>{colProspects.length}</span>
                        {col.id !== 'won' && col.id !== 'lost' && colProspects.length > 0 && (
                          <button onClick={() => clearColumn(col.id)}
                            title="Clear column — move all to Lost"
                            className="text-gray-500 hover:text-red-400 text-xs px-1">✕ Clear</button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mb-2">
                      ${colProspects.reduce((sum, p) => sum + ((p.estimated_elevators || 3) * 8000), 0).toLocaleString()} potential
                    </p>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={columnFilters[col.id] || ''}
                      onChange={e => setColumnFilters(prev => ({ ...prev, [col.id]: e.target.value }))}
                      className="w-full px-2 py-1 bg-gray-900/50 border border-gray-700 rounded text-gray-300 text-xs placeholder-gray-600 focus:outline-none focus:border-gray-500"
                    />
                  </div>

                  {/* Cards */}
                  <div className="p-3 space-y-3" style={{ minHeight: '200px' }}>
                    {colProspects.map(prospect => (
                      <div key={prospect.id}
                        draggable
                        onDragStart={e => handleDragStart(e, prospect)}
                        onDragEnd={handleDragEnd}
                        className={`bg-gray-800 rounded-lg border border-gray-700 p-4 cursor-grab active:cursor-grabbing hover:border-purple-500 transition-all ${dragging?.id === prospect.id ? 'opacity-50 scale-95' : ''}`}>
                        
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <p className="text-white font-medium text-sm leading-tight">{prospect.name}</p>
                          </div>
                          <span className={`font-bold text-sm flex-shrink-0 ml-2 ${scoreColor(prospect.lead_score)}`}>{prospect.lead_score}</span>
                        </div>

                        <p className="text-gray-500 text-xs mb-2 ml-6">{prospect.city}, {prospect.state}</p>

                        {prospect.rating && (
                          <div className="flex items-center gap-1 mb-2 ml-6">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-gray-400 text-xs">{prospect.rating}</span>
                          </div>
                        )}

                        {prospect.service_urgency && (
                          <div className="ml-6 mb-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${urgencyColors[prospect.service_urgency]}`}>
                              {prospect.service_urgency} urgency
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between ml-6 pt-2 border-t border-gray-700">
                          <p className="text-gray-500 text-xs">${((prospect.estimated_elevators || 3) * 8000).toLocaleString()}/yr</p>
                          <Link to={`/internal/prospect/${prospect.id}`}
                            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs"
                            onClick={e => e.stopPropagation()}>
                            <Eye className="w-3 h-3" />View
                          </Link>
                        </div>
                      </div>
                    ))}

                    {colProspects.length === 0 && (
                      <div className={`border-2 border-dashed ${isDragTarget ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700'} rounded-lg p-8 text-center transition-colors`}>
                        <p className="text-gray-600 text-sm">{isDragTarget ? 'Drop here' : 'No prospects'}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contract Modal */}
      {showContractModal && pendingWonProspect && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-green-500/30 w-full max-w-lg">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🎉 Deal Won — Record Contract
              </h2>
              <p className="text-green-400 text-sm mt-1">{pendingWonProspect.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Annual Value ($)</label>
                  <input type="number" value={contract.annual_value} onChange={e => setContract(p => ({...p, annual_value: e.target.value, monthly_value: e.target.value ? (e.target.value/12).toFixed(2) : ''}))}
                    placeholder="32000"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Monthly Value ($)</label>
                  <input type="number" value={contract.monthly_value} onChange={e => setContract(p => ({...p, monthly_value: e.target.value, annual_value: e.target.value ? (e.target.value*12).toFixed(2) : ''}))}
                    placeholder="2667"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Start Date</label>
                  <input type="date" value={contract.start_date} onChange={e => setContract(p => ({...p, start_date: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Term (months)</label>
                  <select value={contract.term_months} onChange={e => setContract(p => ({...p, term_months: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500">
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Elevators Under Contract</label>
                  <input type="number" value={contract.elevators_under_contract} onChange={e => setContract(p => ({...p, elevators_under_contract: e.target.value}))}
                    placeholder="4"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Service Frequency</label>
                  <select value={contract.service_frequency} onChange={e => setContract(p => ({...p, service_frequency: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="biannual">Bi-Annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Contract Notes</label>
                <textarea value={contract.notes} onChange={e => setContract(p => ({...p, notes: e.target.value}))}
                  placeholder="Any special terms, scope details, or notes..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowContractModal(false); setPendingWonProspect(null); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                  Skip for Now
                </button>
                <button onClick={saveContract} disabled={savingContract}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {savingContract ? 'Saving...' : 'Save Contract'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipeline;
