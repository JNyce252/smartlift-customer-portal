import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Calendar, Plus, X, CheckCircle, AlertTriangle, Clock, Wrench, ChevronDown, ChevronUp, User, Repeat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import UserMenu from '../../components/common/UserMenu';
import NotificationBell from '../../components/common/NotificationBell';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'semi_annual', label: 'Semi-Annual', days: 180 },
  { value: 'annual', label: 'Annual', days: 365 },
];

const SCHEDULE_TYPES = [
  'Preventive Maintenance',
  'Annual Inspection',
  'Safety Test (CAT 1)',
  'Safety Test (CAT 5)',
  'Lubrication Service',
  'Door Adjustment',
  'Modernization Review',
  'TDLR Compliance Check',
];

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
};

const getDueBadge = (days) => {
  if (days === null) return { label: 'Not Set', color: 'bg-gray-700 text-gray-400 border-gray-600' };
  if (days < 0) return { label: 'Overdue', color: 'bg-red-900/30 text-red-400 border-red-700/30' };
  if (days <= 7) return { label: 'Due in ' + days + 'd', color: 'bg-red-900/30 text-red-400 border-red-700/30' };
  if (days <= 30) return { label: 'Due in ' + days + 'd', color: 'bg-amber-900/30 text-amber-400 border-amber-700/30' };
  return { label: 'Due in ' + days + 'd', color: 'bg-green-900/30 text-green-400 border-green-700/30' };
};

const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500";
const labelCls = "block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5";

const MaintenanceScheduling = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [elevators, setElevators] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    customer_id: '', elevator_id: '', schedule_type: 'Preventive Maintenance',
    frequency: 'quarterly', last_service_date: '', next_due_date: '',
    assigned_technician_id: '', notes: ''
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  const fetchData = async () => {
    try {
      const [sched, cust, techs] = await Promise.all([
        fetch(BASE_URL + '/maintenance-schedules', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/customers', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/technicians', { headers }).then(r => r.json()),
      ]);
      setSchedules(Array.isArray(sched) ? sched : []);
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

  const calcNextDue = (lastDate, frequency) => {
    if (!lastDate || !frequency) return '';
    const freq = FREQUENCIES.find(f => f.value === frequency);
    if (!freq) return '';
    const next = new Date(lastDate);
    next.setDate(next.getDate() + freq.days);
    return next.toISOString().split('T')[0];
  };

  const createSchedule = async () => {
    if (!form.schedule_type || !form.frequency) return;
    setSaving(true);
    try {
      const res = await fetch(BASE_URL + '/maintenance-schedules', {
        method: 'POST', headers, body: JSON.stringify(form)
      });
      const data = await res.json();
      setSchedules(prev => [...prev, data]);
      setShowCreate(false);
      setForm({ customer_id: '', elevator_id: '', schedule_type: 'Preventive Maintenance', frequency: 'quarterly', last_service_date: '', next_due_date: '', assigned_technician_id: '', notes: '' });
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteSchedule = async (id) => {
    try {
      await fetch(BASE_URL + '/maintenance-schedules/' + id, { method: 'DELETE', headers });
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch(e) {}
  };

  const filtered = schedules.filter(s => {
    const days = getDaysUntil(s.next_due_date);
    if (filter === 'overdue') return days !== null && days < 0;
    if (filter === 'this_week') return days !== null && days >= 0 && days <= 7;
    if (filter === 'this_month') return days !== null && days >= 0 && days <= 30;
    return true;
  }).sort((a, b) => {
    const da = getDaysUntil(a.next_due_date) ?? 999;
    const db = getDaysUntil(b.next_due_date) ?? 999;
    return da - db;
  });

  const overdue = schedules.filter(s => { const d = getDaysUntil(s.next_due_date); return d !== null && d < 0; }).length;
  const thisWeek = schedules.filter(s => { const d = getDaysUntil(s.next_due_date); return d !== null && d >= 0 && d <= 7; }).length;
  const thisMonth = schedules.filter(s => { const d = getDaysUntil(s.next_due_date); return d !== null && d >= 0 && d <= 30; }).length;

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/dashboard"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Maintenance Scheduling</h1>
                <p className="text-xs text-gray-400">{schedules.length} active schedules</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Plus className="w-4 h-4" />New Schedule
              </button>
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Schedules', value: schedules.length, color: 'text-white', bg: 'bg-gray-800 border-gray-700' },
            { label: 'Overdue', value: overdue, color: 'text-red-400', bg: 'bg-red-900/10 border-red-700/30' },
            { label: 'Due This Week', value: thisWeek, color: 'text-amber-400', bg: 'bg-amber-900/10 border-amber-700/30' },
            { label: 'Due This Month', value: thisMonth, color: 'text-blue-400', bg: 'bg-blue-900/10 border-blue-700/30' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-5 border ${s.bg}`}>
              <p className="text-gray-400 text-sm mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 'all', label: 'All Schedules' },
            { value: 'overdue', label: 'Overdue' + (overdue > 0 ? ' (' + overdue + ')' : '') },
            { value: 'this_week', label: 'This Week' + (thisWeek > 0 ? ' (' + thisWeek + ')' : '') },
            { value: 'this_month', label: 'This Month' + (thisMonth > 0 ? ' (' + thisMonth + ')' : '') },
          ].map(tab => (
            <button key={tab.value} onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === tab.value ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Schedule List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading schedules...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">
              {filter === 'all' ? 'No maintenance schedules yet' : 'No schedules matching this filter'}
            </p>
            <p className="text-gray-500 text-sm mt-1 mb-4">
              {filter === 'all' ? 'Create schedules to track recurring maintenance for your customers' : 'Try a different filter'}
            </p>
            {filter === 'all' && (
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
                Create First Schedule
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(schedule => {
              const days = getDaysUntil(schedule.next_due_date);
              const badge = getDueBadge(days);
              return (
                <div key={schedule.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-purple-900/30 rounded-xl flex items-center justify-center border border-purple-700/30 flex-shrink-0">
                        <Repeat className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-semibold">{schedule.schedule_type}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs border bg-gray-700 text-gray-300 border-gray-600 capitalize">
                            {schedule.frequency?.replace('_', '-')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap text-sm text-gray-400">
                          {schedule.customer_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />{schedule.customer_name}
                            </span>
                          )}
                          {schedule.elevator_identifier && (
                            <span className="flex items-center gap-1">
                              <Wrench className="w-3.5 h-3.5" />{schedule.elevator_identifier}
                            </span>
                          )}
                          {schedule.technician_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />{schedule.technician_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                          {schedule.last_service_date && (
                            <span>Last: {new Date(schedule.last_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          )}
                          {schedule.next_due_date && (
                            <span>Next: {new Date(schedule.next_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          )}
                        </div>
                        {schedule.notes && <p className="text-gray-500 text-sm mt-1.5">{schedule.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link to="/internal/work-orders"
                        className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-700/30 rounded-lg text-xs transition-colors">
                        Create Work Order
                      </Link>
                      <button onClick={() => deleteSchedule(schedule.id)}
                        className="p-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">New Maintenance Schedule</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Service Type</label>
                  <select value={form.schedule_type} onChange={e => f('schedule_type')(e.target.value)} className={inputCls}>
                    {SCHEDULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Frequency</label>
                  <select value={form.frequency} onChange={e => {
                    f('frequency')(e.target.value);
                    const next = calcNextDue(form.last_service_date, e.target.value);
                    if (next) f('next_due_date')(next);
                  }} className={inputCls}>
                    {FREQUENCIES.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Customer</label>
                  <select value={form.customer_id} onChange={e => { f('customer_id')(e.target.value); fetchElevators(e.target.value); }} className={inputCls}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Elevator (optional)</label>
                  <select value={form.elevator_id} onChange={e => f('elevator_id')(e.target.value)} className={inputCls} disabled={!form.customer_id}>
                    <option value="">All elevators</option>
                    {elevators.map(e => <option key={e.id} value={e.id}>{e.elevator_identifier}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Assigned Technician</label>
                  <select value={form.assigned_technician_id} onChange={e => f('assigned_technician_id')(e.target.value)} className={inputCls}>
                    <option value="">Unassigned</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Last Service Date</label>
                  <input type="date" value={form.last_service_date} onChange={e => {
                    f('last_service_date')(e.target.value);
                    const next = calcNextDue(e.target.value, form.frequency);
                    if (next) f('next_due_date')(next);
                  }} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Next Due Date</label>
                  <input type="date" value={form.next_due_date} onChange={e => f('next_due_date')(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Notes</label>
                  <textarea value={form.notes} onChange={e => f('notes')(e.target.value)}
                    placeholder="Any special instructions or notes..." rows={3}
                    className={inputCls + " resize-none"} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={createSchedule} disabled={saving || !form.schedule_type}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {saving ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceScheduling;
