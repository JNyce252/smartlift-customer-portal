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
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => {
    api.getProspects()
      .then(data => setProspects(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getColumnProspects = (status) =>
    prospects.filter(p => (p.status || 'new') === status)
      .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));

  const updateStatus = async (prospectId, newStatus) => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    await fetch(`${BASE_URL}/prospects/${prospectId}/status`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ status: newStatus })
    });
    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, status: newStatus } : p));
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-bold">{col.label}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badge}`}>{colProspects.length}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      ${colProspects.reduce((sum, p) => sum + ((p.estimated_elevators || 3) * 8000), 0).toLocaleString()} potential
                    </p>
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
    </div>
  );
};

export default Pipeline;
