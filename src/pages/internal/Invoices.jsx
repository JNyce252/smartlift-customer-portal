import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, DollarSign, Plus, X, CheckCircle, Clock, AlertTriangle, Search, FileText, Send, Download } from 'lucide-react';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { exportInvoicesCSV } from '../../utils/csvExport';
// already from '../../utils/pdfGenerator';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-900/30 text-amber-400 border-amber-700/30', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-900/30 text-blue-400 border-blue-700/30', icon: Send },
  paid: { label: 'Paid', color: 'bg-green-900/30 text-green-400 border-green-700/30', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-900/30 text-red-400 border-red-700/30', icon: AlertTriangle },
};

const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-500";
const labelCls = "block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5";

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [lineItems, setLineItems] = useState([{ description: '', qty: 1, rate: 0 }]);
  const [form, setForm] = useState({
    customer_id: '', service_ticket_id: '', notes: '',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  const fetchData = async () => {
    try {
      const [inv, cust, wo] = await Promise.all([
        fetch(BASE_URL + '/invoices', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/customers', { headers }).then(r => r.json()),
        fetch(BASE_URL + '/work-orders', { headers }).then(r => r.json()),
      ]);
      setInvoices(Array.isArray(inv) ? inv : []);
      setCustomers(Array.isArray(cust) ? cust : []);
      setWorkOrders(Array.isArray(wo) ? wo.filter(w => w.status === 'completed') : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const addLineItem = () => setLineItems(prev => [...prev, { description: '', qty: 1, rate: 0 }]);
  const removeLineItem = (i) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const updateLineItem = (i, key, val) => setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.rate || 0) * parseFloat(item.qty || 1)), 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;

  const createInvoice = async () => {
    if (!form.customer_id) return;
    setSaving(true);
    try {
      const res = await fetch(BASE_URL + '/invoices', {
        method: 'POST', headers,
        body: JSON.stringify({ ...form, line_items: lineItems })
      });
      const data = await res.json();
      setInvoices(prev => [data, ...prev]);
      setShowCreate(false);
      setForm({ customer_id: '', service_ticket_id: '', notes: '', due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] });
      setLineItems([{ description: '', qty: 1, rate: 0 }]);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      const paid_date = status === 'paid' ? new Date().toISOString().split('T')[0] : undefined;
      await fetch(BASE_URL + '/invoices/' + id, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status, paid_date })
      });
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status, paid_date } : i));
      if (showDetail?.id === id) setShowDetail(prev => ({ ...prev, status }));
    } catch(e) {}
  };

  const generateFromWorkOrder = async (workOrderId) => {
    try {
      const res = await fetch(BASE_URL + '/invoices/generate', {
        method: 'POST', headers,
        body: JSON.stringify({ work_order_id: workOrderId })
      });
      const data = await res.json();
      setInvoices(prev => [data, ...prev]);
      alert('Invoice ' + data.invoice_number + ' generated successfully');
    } catch(e) { console.error(e); }
  };

  const filtered = invoices
    .filter(i => filterStatus === 'all' || i.status === filterStatus)
    .filter(i => !search || i.invoice_number?.toLowerCase().includes(search.toLowerCase()) || i.customer_name?.toLowerCase().includes(search.toLowerCase()));

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-gray-900">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: '$' + totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 }), color: 'text-green-400', bg: 'bg-green-900/10 border-green-700/30' },
            { label: 'Outstanding', value: '$' + totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 0 }), color: 'text-amber-400', bg: 'bg-amber-900/10 border-amber-700/30' },
            { label: 'Overdue', value: overdueCount, color: 'text-red-400', bg: 'bg-red-900/10 border-red-700/30' },
            { label: 'Total Invoices', value: invoices.length, color: 'text-white', bg: 'bg-gray-800 border-gray-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-5 border ${s.bg}`}>
              <p className="text-gray-400 text-sm mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Generate from Work Orders */}
        {workOrders.length > 0 && (
          <div className="bg-purple-900/10 border border-purple-700/30 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold">Generate from Completed Work Orders</h3>
                <p className="text-gray-400 text-sm">{workOrders.length} completed work order{workOrders.length !== 1 ? 's' : ''} ready to invoice</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {workOrders.slice(0, 5).map(wo => (
                <button key={wo.id} onClick={() => generateFromWorkOrder(wo.id)}
                  className="px-3 py-1.5 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border border-purple-700/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  {wo.ticket_number} — {wo.customer_name || 'Customer'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'sent', 'paid', 'overdue'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${filterStatus === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No invoices yet</p>
            <p className="text-gray-500 text-sm mt-1 mb-4">Create your first invoice or generate one from a completed work order</p>
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inv => {
              const sc = statusConfig[inv.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <div key={inv.id} onClick={() => setShowDetail(inv)}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-purple-600/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-gray-700 rounded-xl flex items-center justify-center border border-gray-600 flex-shrink-0">
                        <FileText className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <span className="text-white font-semibold">{inv.invoice_number || 'Invoice #' + inv.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" />{sc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                          {inv.customer_name && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{inv.customer_name}</span>}
                          {inv.due_date && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Due {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                          {inv.paid_date && <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Paid {new Date(inv.paid_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold text-xl">${parseFloat(inv.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-gray-500 text-xs">incl. tax</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">New Invoice</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Customer *</label>
                  <select value={form.customer_id} onChange={e => f('customer_id')(e.target.value)} className={inputCls}>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => f('due_date')(e.target.value)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Related Work Order (optional)</label>
                  <select value={form.service_ticket_id} onChange={e => f('service_ticket_id')(e.target.value)} className={inputCls}>
                    <option value="">None</option>
                    {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.ticket_number} — {wo.title}</option>)}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={labelCls}>Line Items</label>
                  <button onClick={addLineItem} className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-gray-500 text-xs px-1 mb-1">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-right">Rate</div>
                    <div className="col-span-1"></div>
                  </div>
                  {lineItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)}
                        placeholder="Service description" className={inputCls + " col-span-6"} />
                      <input type="number" value={item.qty} onChange={e => updateLineItem(i, 'qty', e.target.value)}
                        className={inputCls + " col-span-2 text-center"} min="1" />
                      <input type="number" value={item.rate} onChange={e => updateLineItem(i, 'rate', e.target.value)}
                        placeholder="0.00" className={inputCls + " col-span-3"} />
                      <button onClick={() => removeLineItem(i)} disabled={lineItems.length === 1}
                        className="col-span-1 flex items-center justify-center text-red-400 hover:text-red-300 disabled:opacity-30">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 bg-gray-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax (8.25%)</span>
                    <span className="text-white">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-gray-600 pt-2">
                    <span className="text-white">Total</span>
                    <span className="text-green-400 text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Notes</label>
                <textarea value={form.notes} onChange={e => f('notes')(e.target.value)}
                  placeholder="Payment terms, thank you message, etc..." rows={3}
                  className={inputCls + " resize-none"} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={createInvoice} disabled={saving || !form.customer_id}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white">{showDetail.invoice_number}</h2>
                <p className="text-gray-400 text-sm">{showDetail.customer_name}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${(statusConfig[showDetail.status] || statusConfig.pending).color}`}>
                  {(statusConfig[showDetail.status] || statusConfig.pending).label}
                </span>
                <p className="text-gray-400 text-sm">Due: {showDetail.due_date ? new Date(showDetail.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}</p>
              </div>

              {/* Line Items */}
              {showDetail.line_items && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">Line Items</p>
                  <div className="space-y-2">
                    {(typeof showDetail.line_items === 'string' ? JSON.parse(showDetail.line_items) : showDetail.line_items).map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                        <div>
                          <p className="text-white text-sm">{item.description}</p>
                          <p className="text-gray-400 text-xs">Qty: {item.qty} × ${parseFloat(item.rate || 0).toFixed(2)}</p>
                        </div>
                        <p className="text-white font-medium">${(parseFloat(item.qty || 1) * parseFloat(item.rate || 0)).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-gray-700/30 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="text-white">${parseFloat(showDetail.amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Tax (8.25%)</span><span className="text-white">${parseFloat(showDetail.tax || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold border-t border-gray-600 pt-2"><span className="text-white">Total</span><span className="text-green-400">${parseFloat(showDetail.total || 0).toFixed(2)}</span></div>
                  </div>
                </div>
              )}

              {showDetail.notes && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-gray-300 text-sm bg-gray-700/30 rounded-lg p-3">{showDetail.notes}</p>
                </div>
              )}

              {/* Actions */}
              {showDetail.status !== 'paid' && (
                <div className="flex gap-2 flex-wrap">
                  {showDetail.status === 'pending' && (
                    <button onClick={() => updateStatus(showDetail.id, 'sent')}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" />Mark as Sent
                    </button>
                  )}
                  <button onClick={() => updateStatus(showDetail.id, 'paid')}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />Mark as Paid
                  </button>
                  {showDetail.status !== 'overdue' && (
                    <button onClick={() => updateStatus(showDetail.id, 'overdue')}
                      className="px-4 py-2.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700/30 rounded-lg text-sm">
                      Mark Overdue
                    </button>
                  )}
                </div>
              )}
              {showDetail.status === 'paid' && (
                <div className="flex items-center gap-2 text-green-400 bg-green-900/10 border border-green-700/30 rounded-lg p-3">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Paid on {showDetail.paid_date ? new Date(showDetail.paid_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                </div>
              )}
              <button onClick={() => generateInvoicePDF(showDetail)}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                <Download className="w-4 h-4" />Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
