import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileText, Plus, X, Search, Download, Trash2, Upload, Calendar, Tag, Eye, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../../components/common/UserMenu';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const CATEGORIES = [
  { value: 'contract', label: 'Contracts', color: 'text-blue-400 bg-blue-900/20 border-blue-700/30' },
  { value: 'proposal', label: 'Proposals', color: 'text-purple-400 bg-purple-900/20 border-purple-700/30' },
  { value: 'inspection', label: 'Inspections', color: 'text-green-400 bg-green-900/20 border-green-700/30' },
  { value: 'certificate', label: 'Certificates', color: 'text-amber-400 bg-amber-900/20 border-amber-700/30' },
  { value: 'invoice', label: 'Invoices', color: 'text-cyan-400 bg-cyan-900/20 border-cyan-700/30' },
  { value: 'report', label: 'Reports', color: 'text-pink-400 bg-pink-900/20 border-pink-700/30' },
  { value: 'general', label: 'General', color: 'text-gray-400 bg-gray-700 border-gray-600' },
];

const DOC_TYPES = ['Service Contract', 'Maintenance Agreement', 'Proposal', 'TDLR Certificate', 'Inspection Report', 'CAT 1 Test Report', 'CAT 5 Test Report', 'Work Order', 'Invoice', 'Insurance Certificate', 'Warranty Document', 'Other'];

const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500";
const labelCls = "block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5";

const Documents = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [form, setForm] = useState({
    name: '', document_type: 'Service Contract', category: 'contract',
    customer_id: '', file_url: '', notes: '', expiration_date: ''
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  const fetchData = async () => {
    try {
      const [docs, cust] = await Promise.all([
        fetch(BASE_URL + '/documents', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/customers', { headers }).then(r => r.json()),
      ]);
      setDocuments(Array.isArray(docs) ? docs : []);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const createDocument = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch(BASE_URL + '/documents', {
        method: 'POST', headers, body: JSON.stringify(form)
      });
      const data = await res.json();
      setDocuments(prev => [data, ...prev]);
      setShowCreate(false);
      resetForm();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await fetch(BASE_URL + '/documents/' + id, { method: 'DELETE', headers });
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch(e) {}
  };

  const resetForm = () => setForm({
    name: '', document_type: 'Service Contract', category: 'contract',
    customer_id: '', file_url: '', notes: '', expiration_date: ''
  });

  const getCategoryConfig = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];

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
    .filter(d => !filterCustomer || String(d.customer_id) === filterCustomer)
    .filter(d => !search ||
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.document_type?.toLowerCase().includes(search.toLowerCase())
    );

  // Stats
  const expiringSoon = documents.filter(d => isExpiringSoon(d.expiration_date)).length;
  const expired = documents.filter(d => isExpired(d.expiration_date)).length;

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/dashboard"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Documents</h1>
                <p className="text-xs text-gray-400">{documents.length} total documents</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />Add Document
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Documents', value: documents.length, color: 'text-white', bg: 'bg-gray-800 border-gray-700' },
            { label: 'Contracts', value: documents.filter(d => d.category === 'contract').length, color: 'text-blue-400', bg: 'bg-blue-900/10 border-blue-700/30' },
            { label: 'Expiring Soon', value: expiringSoon, color: 'text-amber-400', bg: expiringSoon > 0 ? 'bg-amber-900/10 border-amber-700/30' : 'bg-gray-800 border-gray-700' },
            { label: 'Expired', value: expired, color: 'text-red-400', bg: expired > 0 ? 'bg-red-900/10 border-red-700/30' : 'bg-gray-800 border-gray-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-5 border ${s.bg}`}>
              <p className="text-gray-400 text-sm mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCategory === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'}`}>
            All
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setFilterCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCategory === cat.value ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'}`}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search + Customer filter */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none">
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading documents...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No documents yet</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">Store contracts, proposals, certificates and inspection reports</p>
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
              Add First Document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(doc => {
              const catConfig = getCategoryConfig(doc.category);
              const expiring = isExpiringSoon(doc.expiration_date);
              const expired = isExpired(doc.expiration_date);
              return (
                <div key={doc.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center border border-gray-600 flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-white font-medium text-sm truncate">{doc.name || doc.title}</h3>
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
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        {doc.customer_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{doc.customer_name}</span>}
                        {doc.document_type && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{doc.document_type}</span>}
                        {doc.expiration_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Expires {new Date(doc.expiration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        <span>{new Date(doc.created_at || doc.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer"
                          className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => deleteDocument(doc.id)}
                        className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Add Document</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Document Name *</label>
                <input value={form.name} onChange={e => f('name')(e.target.value)}
                  placeholder="e.g. Hyatt Regency — Service Contract 2026" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Document Type</label>
                  <select value={form.document_type} onChange={e => f('document_type')(e.target.value)} className={inputCls}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={form.category} onChange={e => f('category')(e.target.value)} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Customer</label>
                  <select value={form.customer_id} onChange={e => f('customer_id')(e.target.value)} className={inputCls}>
                    <option value="">Not linked</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Expiration Date</label>
                  <input type="date" value={form.expiration_date} onChange={e => f('expiration_date')(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>File URL (Google Drive, Dropbox, etc.)</label>
                <input value={form.file_url} onChange={e => f('file_url')(e.target.value)}
                  placeholder="https://drive.google.com/..." className={inputCls} />
                <p className="text-gray-500 text-xs mt-1">Paste a shareable link to the document</p>
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => f('notes')(e.target.value)}
                  placeholder="Any additional notes..." rows={3}
                  className={inputCls + " resize-none"} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowCreate(false); resetForm(); }}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={createDocument} disabled={saving || !form.name}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {saving ? 'Saving...' : 'Add Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
