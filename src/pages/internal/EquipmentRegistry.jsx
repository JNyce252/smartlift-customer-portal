import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, X, Search, AlertTriangle, CheckCircle, Wrench, Calendar, Hash, Layers, ArrowUpDown, Shield, TrendingUp, Edit2 , Download } from 'lucide-react';
import { exportEquipmentCSV } from '../../utils/csvExport';
import { useAuth } from '../../context/AuthContext';
import { authHeaders, authService } from '../../services/authService';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500";
const labelCls = "block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5";

const getRiskColor = (score) => {
  if (score >= 70) return { color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30', label: 'High Risk' };
  if (score >= 40) return { color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-700/30', label: 'Medium Risk' };
  return { color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30', label: 'Low Risk' };
};

const statusConfig = {
  operational: { color: 'text-green-400 bg-green-900/20 border-green-700/30', dot: 'bg-green-400', label: 'Operational' },
  maintenance: { color: 'text-amber-400 bg-amber-900/20 border-amber-700/30', dot: 'bg-amber-400', label: 'In Maintenance' },
  out_of_service: { color: 'text-red-400 bg-red-900/20 border-red-700/30', dot: 'bg-red-400', label: 'Out of Service' },
};

const EquipmentRegistry = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [form, setForm] = useState({
    customer_id: '', elevator_identifier: '', manufacturer: '',
    model: '', serial_number: '', install_date: '', capacity_lbs: '',
    floors_served: '', status: 'operational', tdlr_certificate_number: '',
    last_inspection_date: '', next_inspection_date: '', notes: '',
    modernization_needed: false
  });

  // headers built per fetch via authHeaders() — see authService.js

  const fetchData = async () => {
    try {
      const [equip, cust] = await Promise.all([
        fetch(BASE_URL + '/equipment', { headers: authHeaders() }).then(r => r.json()),
        fetch(BASE_URL + '/customers', { headers: authHeaders() }).then(r => r.json()),
      ]);
      setEquipment(Array.isArray(equip) ? equip : []);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const createEquipment = async () => {
    if (!form.customer_id || !form.elevator_identifier) return;
    setSaving(true);
    try {
      const res = await fetch(BASE_URL + '/equipment', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form)
      });
      const data = await res.json();
      setEquipment(prev => [...prev, data]);
      setShowCreate(false);
      setForm({ customer_id: '', elevator_identifier: '', manufacturer: '', model: '', serial_number: '', install_date: '', capacity_lbs: '', floors_served: '', status: 'operational', tdlr_certificate_number: '', last_inspection_date: '', next_inspection_date: '', notes: '', modernization_needed: false });
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updateEquipment = async (id, updates) => {
    try {
      const res = await fetch(BASE_URL + '/equipment/' + id, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(updates)
      });
      const data = await res.json();
      setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
      if (showDetail?.id === id) setShowDetail(prev => ({ ...prev, ...data }));
    } catch(e) {}
  };

  const filtered = equipment
    .filter(e => filterStatus === 'all' || e.status === filterStatus)
    .filter(e => {
      if (filterRisk === 'high') return e.risk_score >= 70;
      if (filterRisk === 'medium') return e.risk_score >= 40 && e.risk_score < 70;
      if (filterRisk === 'low') return e.risk_score < 40;
      return true;
    })
    .filter(e => !search ||
      e.elevator_identifier?.toLowerCase().includes(search.toLowerCase()) ||
      e.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.manufacturer?.toLowerCase().includes(search.toLowerCase()) ||
      e.serial_number?.toLowerCase().includes(search.toLowerCase())
    );

  const highRisk = equipment.filter(e => e.risk_score >= 70).length;
  const modernizationNeeded = equipment.filter(e => e.modernization_needed).length;
  const outOfService = equipment.filter(e => e.status === 'out_of_service').length;
  const avgAge = equipment.length > 0
    ? Math.round(equipment.reduce((sum, e) => sum + (e.age_years || 0), 0) / equipment.length)
    : 0;

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-gray-900">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Elevators', value: equipment.length, color: 'text-white', bg: 'bg-gray-800 border-gray-700' },
            { label: 'High Risk', value: highRisk, color: 'text-red-400', bg: 'bg-red-900/10 border-red-700/30' },
            { label: 'Need Modernization', value: modernizationNeeded, color: 'text-amber-400', bg: 'bg-amber-900/10 border-amber-700/30' },
            { label: 'Avg Age', value: avgAge + ' yrs', color: 'text-blue-400', bg: 'bg-blue-900/10 border-blue-700/30' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-5 border ${s.bg}`}>
              <p className="text-gray-400 text-sm mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, customer, manufacturer, serial..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none">
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="maintenance">In Maintenance</option>
            <option value="out_of_service">Out of Service</option>
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none">
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>

        {/* Equipment List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading equipment registry...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <ArrowUpDown className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No equipment registered yet</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">Add elevators to track their full lifecycle and maintenance history</p>
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
              Add First Elevator
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(equip => {
              const sc = statusConfig[equip.status] || statusConfig.operational;
              const risk = getRiskColor(equip.risk_score || 0);
              const daysUntilInspection = equip.next_inspection_date
                ? Math.ceil((new Date(equip.next_inspection_date) - new Date()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div key={equip.id} onClick={() => setShowDetail(equip)}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-purple-600/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center border border-gray-600">
                          <ArrowUpDown className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${sc.dot}`}></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-semibold">{equip.elevator_identifier}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sc.color}`}>{sc.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${risk.bg} ${risk.color}`}>{risk.label}</span>
                          {equip.modernization_needed && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-orange-900/20 text-orange-400 border-orange-700/30">
                              Needs Modernization
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                          {equip.customer_name && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{equip.customer_name}</span>}
                          {equip.manufacturer && <span>{equip.manufacturer}{equip.model ? ' ' + equip.model : ''}</span>}
                          {equip.age_years !== null && equip.age_years !== undefined && (
                            <span className={equip.age_years >= 20 ? 'text-red-400' : equip.age_years >= 10 ? 'text-amber-400' : 'text-green-400'}>
                              {equip.age_years} years old
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          {equip.total_services > 0 && <span>{equip.total_services} service records</span>}
                          {equip.total_maintenance_cost > 0 && <span>${parseFloat(equip.total_maintenance_cost).toLocaleString()} total maintenance</span>}
                          {daysUntilInspection !== null && (
                            <span className={daysUntilInspection <= 30 ? 'text-amber-400' : ''}>
                              Inspection: {daysUntilInspection <= 0 ? 'Overdue' : 'in ' + daysUntilInspection + ' days'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${risk.color}`}>{equip.risk_score || 0}</p>
                        <p className="text-gray-500 text-xs">risk score</p>
                      </div>
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
              <h2 className="text-xl font-bold text-white">Add Elevator</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Customer *</label>
                  <select value={form.customer_id} onChange={e => f('customer_id')(e.target.value)} className={inputCls}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Elevator ID *</label>
                  <input value={form.elevator_identifier} onChange={e => f('elevator_identifier')(e.target.value)}
                    placeholder="e.g. ELV-001, North Tower" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Manufacturer</label>
                  <input value={form.manufacturer} onChange={e => f('manufacturer')(e.target.value)}
                    placeholder="Otis, Schindler, KONE, ThyssenKrupp..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Model</label>
                  <input value={form.model} onChange={e => f('model')(e.target.value)}
                    placeholder="Model number" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Serial Number</label>
                  <input value={form.serial_number} onChange={e => f('serial_number')(e.target.value)}
                    placeholder="Serial #" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Install Date</label>
                  <input type="date" value={form.install_date} onChange={e => f('install_date')(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Capacity (lbs)</label>
                  <input type="number" value={form.capacity_lbs} onChange={e => f('capacity_lbs')(e.target.value)}
                    placeholder="2500" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Floors Served</label>
                  <input type="number" value={form.floors_served} onChange={e => f('floors_served')(e.target.value)}
                    placeholder="10" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={e => f('status')(e.target.value)} className={inputCls}>
                    <option value="operational">Operational</option>
                    <option value="maintenance">In Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>TDLR Certificate #</label>
                  <input value={form.tdlr_certificate_number} onChange={e => f('tdlr_certificate_number')(e.target.value)}
                    placeholder="Certificate number" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Last Inspection</label>
                  <input type="date" value={form.last_inspection_date} onChange={e => f('last_inspection_date')(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Next Inspection Due</label>
                  <input type="date" value={form.next_inspection_date} onChange={e => f('next_inspection_date')(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.modernization_needed}
                      onChange={e => f('modernization_needed')(e.target.checked)}
                      className="w-4 h-4 accent-purple-600" />
                    <span className="text-gray-300 text-sm">Modernization needed</span>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Notes</label>
                  <textarea value={form.notes} onChange={e => f('notes')(e.target.value)}
                    placeholder="Any additional notes..." rows={3}
                    className={inputCls + " resize-none"} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={createEquipment} disabled={saving || !form.customer_id || !form.elevator_identifier}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {saving ? 'Adding...' : 'Add Elevator'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white">{showDetail.elevator_identifier}</h2>
                <p className="text-gray-400 text-sm">{showDetail.customer_name}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Manufacturer', value: showDetail.manufacturer || 'N/A' },
                  { label: 'Model', value: showDetail.model || 'N/A' },
                  { label: 'Serial Number', value: showDetail.serial_number || 'N/A' },
                  { label: 'Age', value: showDetail.age_years ? showDetail.age_years + ' years' : 'N/A' },
                  { label: 'Capacity', value: showDetail.capacity_lbs ? showDetail.capacity_lbs.toLocaleString() + ' lbs' : 'N/A' },
                  { label: 'Floors', value: showDetail.floors_served || 'N/A' },
                  { label: 'TDLR Certificate', value: showDetail.tdlr_certificate_number || 'N/A' },
                  { label: 'Total Services', value: showDetail.total_services || 0 },
                  { label: 'Total Maintenance Cost', value: showDetail.total_maintenance_cost ? '$' + parseFloat(showDetail.total_maintenance_cost).toLocaleString() : '$0' },
                  { label: 'Risk Score', value: (showDetail.risk_score || 0) + '/100' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                    <p className="text-white text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {showDetail.notes && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-gray-300 text-sm bg-gray-700/30 rounded-lg p-3">{showDetail.notes}</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Quick Actions</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => updateEquipment(showDetail.id, { modernization_needed: !showDetail.modernization_needed })}
                    className={`px-3 py-2 rounded-lg text-xs border transition-colors ${showDetail.modernization_needed ? 'bg-orange-900/30 text-orange-400 border-orange-700/30' : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'}`}>
                    {showDetail.modernization_needed ? '✓ Modernization Flagged' : 'Flag for Modernization'}
                  </button>
                  <button onClick={() => updateEquipment(showDetail.id, { status: showDetail.status === 'operational' ? 'out_of_service' : 'operational' })}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 rounded-lg text-xs transition-colors">
                    Toggle Status
                  </button>
                  <Link to="/internal/work-orders"
                    className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-700/30 rounded-lg text-xs transition-colors">
                    Create Work Order
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentRegistry;
