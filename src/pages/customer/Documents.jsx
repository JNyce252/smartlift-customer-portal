import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, FileText, Search, Eye, Calendar, Tag, Shield, ArrowLeft, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authHeaders } from '../../services/authService';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const CATEGORY_CONFIG = {
  contract: { label: 'Contract', color: 'text-blue-400 bg-blue-900/20 border-blue-700/30' },
  proposal: { label: 'Proposal', color: 'text-purple-400 bg-purple-900/20 border-purple-700/30' },
  inspection: { label: 'Inspection', color: 'text-green-400 bg-green-900/20 border-green-700/30' },
  certificate: { label: 'Certificate', color: 'text-amber-400 bg-amber-900/20 border-amber-700/30' },
  invoice: { label: 'Invoice', color: 'text-cyan-400 bg-cyan-900/20 border-cyan-700/30' },
  report: { label: 'Report', color: 'text-pink-400 bg-pink-900/20 border-pink-700/30' },
  general: { label: 'General', color: 'text-gray-400 bg-gray-700 border-gray-600' },
};

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetch(BASE_URL + '/documents', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const filtered = documents
    .filter(d => filterCategory === 'all' || d.category === filterCategory)
    .filter(d => !search ||
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.document_type?.toLowerCase().includes(search.toLowerCase())
    );

  const categories = [...new Set(documents.map(d => d.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Documents</h1>
                <p className="text-xs text-gray-400">Smarterlift Customer Portal</p>
              </div>
            </div>
            <Link to="/customer/dashboard"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Documents', value: documents.length, color: 'text-white', bg: 'bg-gray-800 border-gray-700' },
            { label: 'Contracts', value: documents.filter(d => d.category === 'contract').length, color: 'text-blue-400', bg: 'bg-blue-900/10 border-blue-700/30' },
            { label: 'Certificates', value: documents.filter(d => d.category === 'certificate').length, color: 'text-amber-400', bg: 'bg-amber-900/10 border-amber-700/30' },
            { label: 'Inspections', value: documents.filter(d => d.category === 'inspection').length, color: 'text-green-400', bg: 'bg-green-900/10 border-green-700/30' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 border ${s.bg}`}>
              <p className="text-gray-400 text-xs mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Expiring soon alert */}
        {documents.some(d => isExpiringSoon(d.expiration_date)) && (
          <div className="mb-6 bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-sm">
              {documents.filter(d => isExpiringSoon(d.expiration_date)).length} document{documents.filter(d => isExpiringSoon(d.expiration_date)).length > 1 ? 's' : ''} expiring within 30 days — contact your service provider
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filterCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${filterCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading documents...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No documents available</p>
            <p className="text-gray-500 text-sm mt-1">Your service provider will share contracts, certificates and reports here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(doc => {
              const catConfig = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.general;
              const expiring = isExpiringSoon(doc.expiration_date);
              const expired = isExpired(doc.expiration_date);
              return (
                <div key={doc.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center border border-gray-600 flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-medium text-sm">{doc.name || doc.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${catConfig.color}`}>
                          {catConfig.label}
                        </span>
                        {expired && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-red-900/20 text-red-400 border-red-700/30">
                            Expired
                          </span>
                        )}
                        {expiring && !expired && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-900/20 text-amber-400 border-amber-700/30">
                            Expiring Soon
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        {doc.document_type && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{doc.document_type}</span>}
                        {doc.expiration_date && (
                          <span className={`flex items-center gap-1 ${expired ? 'text-red-400' : expiring ? 'text-amber-400' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            Expires {new Date(doc.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        <span>{new Date(doc.created_at || doc.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer"
                        className="p-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border border-blue-700/30 rounded-lg transition-colors flex-shrink-0">
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  {doc.notes && (
                    <p className="text-gray-500 text-xs mt-2 ml-14">{doc.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
