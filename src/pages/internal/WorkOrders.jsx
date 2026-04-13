import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateWorkOrderPDF } from '../../utils/pdfGenerator';
import { exportWorkOrdersCSV } from '../../utils/csvExport';
// already imported from '../../utils/pdfGenerator';
import { Building2, Wrench, Plus, X, Clock, CheckCircle, AlertTriangle, Search, Filter, ChevronDown, User, Calendar, Tool , Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../../components/common/UserMenu';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const STATUSES = ['open', 'in_progress', 'scheduled', 'completed', 'cancelled'];
const PRIORITIES = ['low', 'medium', 'high', 'emergency'];

const statusColors = {
  open: 'bg-blue-900/30 text-blue-400 border-blue-700/30',
  in_progress: 'bg-amber-900/30 text-amber-400 border-amber-700/30',
  scheduled: 'bg-purple-900/30 text-purple-400 border-purple-700/30',
  completed: 'bg-green-900/30 text-green-400 border-green-700/30',
  cancelled: 'bg-gray-700 text-gray-400 border-gray-600',
};

const priorityColors = {
  low: 'bg-gray-700 text-gray-300 border-gray-600',
  medium: 'bg-blue-900/30 text-blue-400 border-blue-700/30',
  high: 'bg-amber-900/30 text-amber-400 border-amber-700/30',
  emergency: 'bg-red-900/30 text-red-400 border-red-700/30',
};

const Badge = ({ value, colorMap }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${colorMap[value] || colorMap.low}`}>
    {value?.replace('_', ' ')}
  </span>
);

const WorkOrders = () => {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [elevators, setElevators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: '', elevator_id: '', title: '', description: '',
    priority: 'medium', status: 'open', assigned_technician: '',
    scheduled_date: '', reported_by: ''
  });
  const [logForm, setLogForm] = useState({
    service_type: '', technician_name: '', work_performed: '',
    parts_replaced: '', next_service_date: '', cost: ''
  });
  const [savingLog, setSavingLog] = useState(false);
  const [technicians, setTechnicians] = useState([]);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  const fetchData = async () => {
    try {
      const [wo, cust, techs] = await Promise.all([
        fetch(BASE_URL + '/work-orders', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/customers', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/technicians', { headers }).then(r => r.json()).catch(() => []),
      ]);
      setWorkOrders(Array.isArray(wo) ? wo : []);
      setCustomers(Array.isArray(cust) ? cust : []);
      setTechnicians(Array.isArray(techs) ? techs.filter(t => t.status === 'active') : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchElevators = async (customerId) => {
    if (!customerId) return;
    try {
      const data = await fetch(BASE_URL + '/customers/' + customerId + '/elevators', { headers }).then(r => r.json());
      setElevators(Array.isArray(data) ? data : []);
    } catch(e) {}
  };

  const createWorkOrder = async () => {
    if (!form.title || !form.customer_id) return;
    setSaving(true);
    try {
      const res = await fetch(BASE_URL + '/work-orders', {
        method: 'POST', headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setWorkOrders(prev => [data, ...prev]);
      setShowCreate(false);
      setForm({ customer_id: '', elevator_id: '', title: '', description: '', priority: 'medium', status: 'open', assigned_technician: '', scheduled_date: '', reported_by: '' });
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(BASE_URL + '/work-orders/' + id, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status })
      });
      setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, status } : wo));
      if (showDetail?.id === id) setShowDetail(prev => ({ ...prev, status }));
    } catch(e) {}
  };

  const saveLog = async () => {
    if (!logForm.service_type || !showDetail) return;
    setSavingLog(true);
    try {
      await fetch(BASE_URL + '/work-orders/' + showDetail.id + '/log', {
        method: 'POST', headers,
        body: JSON.stringify({ ...logForm, elevator_id: showDetail.elevator_id })
      });
      setLogForm({ service_type: '', technician_name: '', work_performed: '', parts_replaced: '', next_service_date: '', cost: '' });
      await fetchData();
    } catch(e) {}
    finally { setSavingLog(false); }
  };

  const filtered = workOrders.filter(wo => {
    if (filterStatus !== 'all' && wo.status !== filterStatus) return false;
    if (filterPriority !== 'all' && wo.priority !== filterPriority) return false;
    if (search && !wo.title?.toLowerCase().includes(search.toLowerCase()) && !wo.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    open: workOrders.filter(w => w.status === 'open').length,
    in_progress: workOrders.filter(w => w.status === 'in_progress').length,
    scheduled: workOrders.filter(w => w.status === 'scheduled').length,
    emergency: workOrders.filter(w => w.priority === 'emergency').length,
  };

  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const lf = k => v => setLogForm(p => ({ ...p, [k]: v }));

  const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500";
  const labelCls = "block text-gray-400 text-xs font-medium mb-1 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/dashboard"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Work Orders</h1>
                <p className="text-xs text-gray-400">{workOrders.length} total work orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => exportWorkOrdersCSV(workOrders)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors border border-gray-600">
                <Download className="w-4 h-4" />Export CSV
              </button>
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" />New Work Order
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Open', value: stats.open, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-700/30' },
            { label: 'In Progress', value: stats.in_progress, color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-700/30' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/30' },
            { label: 'Emergency', value: stats.emergency, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-5 border ${s.bg}`}>
              <p className="text-gray-400 text-sm">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search work orders..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none">
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none">
            <option value="all">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Work Orders List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading work orders...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No work orders yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first work order to get started</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
              Create Work Order
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(wo => (
              <div key={wo.id} onClick={() => setShowDetail(wo)}
                className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-purple-600/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-white font-semibold">{wo.title}</span>
                      <Badge value={wo.priority} colorMap={priorityColors} />
                      <Badge value={wo.status} colorMap={statusColors} />
                      {wo.ticket_number && <span className="text-gray-500 text-xs">#{wo.ticket_number}</span>}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {wo.customer_name && <span className="text-gray-400 text-sm flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{wo.customer_name}</span>}
                      {wo.assigned_technician && <span className="text-gray-400 text-sm flex items-center gap-1"><User className="w-3.5 h-3.5" />{wo.assigned_technician}</span>}
                      {wo.scheduled_date && <span className="text-gray-400 text-sm flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(wo.scheduled_date).toLocaleDateString()}</span>}
                    </div>
                    {wo.description && <p className="text-gray-500 text-sm mt-2 truncate">{wo.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                      <select value={wo.status}
                        onChange={e => { e.stopPropagation(); updateStatus(wo.id, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-gray-300 text-xs focus:outline-none">
                        {STATUSES.filter(s => s !== 'cancelled').map(s => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Work Order Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">New Work Order</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Title *</label>
                  <input value={form.title} onChange={e => f('title')(e.target.value)}
                    placeholder="e.g. Annual maintenance inspection"
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Customer *</label>
                  <select value={form.customer_id} onChange={e => { f('customer_id')(e.target.value); fetchElevators(e.target.value); }}
                    className={inputCls}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Elevator</label>
                  <select value={form.elevator_id} onChange={e => f('elevator_id')(e.target.value)}
                    className={inputCls} disabled={!form.customer_id}>
                    <option value="">Select elevator...</option>
                    {elevators.map(e => <option key={e.id} value={e.id}>{e.elevator_identifier || 'Elevator #' + e.id}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select value={form.priority} onChange={e => f('priority')(e.target.value)} className={inputCls}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={e => f('status')(e.target.value)} className={inputCls}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Assigned Technician</label>
                  <select value={form.assigned_technician} onChange={e => f('assigned_technician')(e.target.value)} className={inputCls}>
                    <option value="">Select technician...</option>
                    {technicians.map(t => <option key={t.id} value={t.name}>{t.name}{t.tdlr_license_number ? ' — ' + t.tdlr_license_number : ''}</option>)}
                    <option value="__other__">Other (type name)</option>
                  </select>
                  {form.assigned_technician === '__other__' && (
                    <input onChange={e => f('assigned_technician')(e.target.value)}
                      placeholder="Enter technician name" className={inputCls + " mt-2"} />
                  )}
                </div>
                <div>
                  <label className={labelCls}>Scheduled Date</label>
                  <input type="datetime-local" value={form.scheduled_date} onChange={e => f('scheduled_date')(e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Reported By</label>
                  <input value={form.reported_by} onChange={e => f('reported_by')(e.target.value)}
                    placeholder="Who reported this issue"
                    className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Description</label>
                  <textarea value={form.description} onChange={e => f('description')(e.target.value)}
                    placeholder="Describe the work needed..."
                    rows={4} className={inputCls + " resize-none"} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={createWorkOrder} disabled={saving || !form.title || !form.customer_id}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {saving ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Work Order Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white">{showDetail.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge value={showDetail.priority} colorMap={priorityColors} />
                  <Badge value={showDetail.status} colorMap={statusColors} />
                  {showDetail.ticket_number && <span className="text-gray-500 text-xs">#{showDetail.ticket_number}</span>}
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                {showDetail.customer_name && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Customer</p>
                    <p className="text-white text-sm font-medium">{showDetail.customer_name}</p>
                  </div>
                )}
                {showDetail.assigned_technician && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Technician</p>
                    <p className="text-white text-sm font-medium">{showDetail.assigned_technician}</p>
                  </div>
                )}
                {showDetail.scheduled_date && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Scheduled</p>
                    <p className="text-white text-sm font-medium">{new Date(showDetail.scheduled_date).toLocaleString()}</p>
                  </div>
                )}
                {showDetail.reported_by && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Reported By</p>
                    <p className="text-white text-sm font-medium">{showDetail.reported_by}</p>
                  </div>
                )}
              </div>

              {showDetail.description && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Description</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{showDetail.description}</p>
                </div>
              )}

              {/* Update Status */}
              {showDetail.status !== 'completed' && showDetail.status !== 'cancelled' && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Update Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {STATUSES.filter(s => s !== showDetail.status && s !== 'cancelled').map(s => (
                      <button key={s} onClick={() => updateStatus(showDetail.id, s)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-purple-600 text-gray-300 hover:text-white rounded-lg text-xs capitalize transition-colors">
                        Mark {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Log Work Completed */}
              <div className="border-t border-gray-700 pt-6">
                <p className="text-white font-medium mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-purple-400" />Log Work Completed
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Service Type</label>
                    <select value={logForm.service_type} onChange={e => lf('service_type')(e.target.value)} className={inputCls}>
                      <option value="">Select type...</option>
                      <option>Preventive Maintenance</option>
                      <option>Emergency Repair</option>
                      <option>Inspection</option>
                      <option>Modernization</option>
                      <option>Parts Replacement</option>
                      <option>Safety Test</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Technician Name</label>
                    <select value={logForm.technician_name} onChange={e => lf('technician_name')(e.target.value)} className={inputCls}>
                      <option value="">Select technician...</option>
                      {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      <option value="__other__">Other</option>
                    </select>
                    {logForm.technician_name === '__other__' && (
                      <input onChange={e => lf('technician_name')(e.target.value)}
                        placeholder="Enter name" className={inputCls + " mt-2"} />
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Next Service Date</label>
                    <input type="date" value={logForm.next_service_date} onChange={e => lf('next_service_date')(e.target.value)}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Cost ($)</label>
                    <input type="number" value={logForm.cost} onChange={e => lf('cost')(e.target.value)}
                      placeholder="0.00"
                      className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Work Performed</label>
                    <textarea value={logForm.work_performed} onChange={e => lf('work_performed')(e.target.value)}
                      placeholder="Describe the work that was done..."
                      rows={3} className={inputCls + " resize-none"} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Parts Replaced</label>
                    <input value={logForm.parts_replaced} onChange={e => lf('parts_replaced')(e.target.value)}
                      placeholder="e.g. Door sensor, brake pads (comma separated)"
                      className={inputCls} />
                  </div>
                </div>
                <button onClick={saveLog} disabled={savingLog || !logForm.service_type}
                  className="w-full mt-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {savingLog ? 'Saving...' : 'Save Work Log & Mark Completed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;
