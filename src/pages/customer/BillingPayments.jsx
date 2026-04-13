import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, LogOut, AlertCircle, DollarSign, CheckCircle, Clock, FileText, Download, ChevronRight, CreditCard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const statusConfig = {
  paid: { label: 'Paid', color: 'text-green-400 bg-green-900/20 border-green-700/30', icon: CheckCircle },
  pending: { label: 'Pending', color: 'text-amber-400 bg-amber-900/20 border-amber-700/30', icon: Clock },
  overdue: { label: 'Overdue', color: 'text-red-400 bg-red-900/20 border-red-700/30', icon: AlertCircle },
  sent: { label: 'Sent', color: 'text-blue-400 bg-blue-900/20 border-blue-700/30', icon: Clock },
};

const BillingPayments = () => {
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const headers = {
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  useEffect(() => {
    fetch(BASE_URL + '/invoices', { headers })
      .then(r => r.json())
      .then(data => setInvoices(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalOutstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const totalPaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');

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
                <h1 className="text-lg font-bold text-white">Billing & Payments</h1>
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

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Overdue alert */}
        {overdueInvoices.length > 0 && (
          <div className="mb-6 bg-red-900/20 border border-red-700/50 rounded-xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold">Overdue Payment</p>
                <p className="text-red-300 text-sm">{overdueInvoices.length} invoice{overdueInvoices.length > 1 ? 's' : ''} past due — please contact your service provider</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Outstanding Balance', value: '$' + totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), color: totalOutstanding > 0 ? 'text-amber-400' : 'text-green-400', bg: totalOutstanding > 0 ? 'bg-amber-900/10 border-amber-700/30' : 'bg-gray-800 border-gray-700', icon: DollarSign },
            { label: 'Total Paid', value: '$' + totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), color: 'text-green-400', bg: 'bg-green-900/10 border-green-700/30', icon: CheckCircle },
            { label: 'Total Invoices', value: invoices.length, color: 'text-white', bg: 'bg-gray-800 border-gray-700', icon: FileText },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className={`rounded-xl p-5 border ${bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Invoice list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg font-medium">No invoices yet</p>
            <p className="text-gray-500 text-sm mt-1">Invoices will appear here after service is completed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(invoice => {
              const sc = statusConfig[invoice.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              const isExpanded = expandedId === invoice.id;
              const lineItems = typeof invoice.line_items === 'string'
                ? JSON.parse(invoice.line_items || '[]')
                : (invoice.line_items || []);

              return (
                <div key={invoice.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                    className="p-5 cursor-pointer hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center border border-gray-600 flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-white font-semibold">{invoice.invoice_number || 'Invoice #' + invoice.id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${sc.color}`}>
                              <StatusIcon className="w-3 h-3" />{sc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                            {invoice.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Due {new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {invoice.paid_date && (
                              <span className="text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Paid {new Date(invoice.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-white font-bold text-lg">${parseFloat(invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-gray-500 text-xs">incl. tax</p>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-700 p-5 bg-gray-700/20">
                      {/* Line items */}
                      {lineItems.length > 0 && (
                        <div className="mb-4">
                          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">Line Items</p>
                          <div className="space-y-2">
                            {lineItems.map((item, i) => (
                              <div key={i} className="flex items-center justify-between bg-gray-700/40 rounded-lg p-3">
                                <div>
                                  <p className="text-white text-sm">{item.description}</p>
                                  <p className="text-gray-400 text-xs">Qty: {item.qty} × ${parseFloat(item.rate || 0).toFixed(2)}</p>
                                </div>
                                <p className="text-white text-sm font-medium">
                                  ${(parseFloat(item.qty || 1) * parseFloat(item.rate || 0)).toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 space-y-1 pt-3 border-t border-gray-600">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Subtotal</span>
                              <span className="text-white">${parseFloat(invoice.amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Tax (8.25%)</span>
                              <span className="text-white">${parseFloat(invoice.tax || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold pt-1 border-t border-gray-600">
                              <span className="text-white">Total</span>
                              <span className="text-green-400">${parseFloat(invoice.total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {invoice.notes && (
                        <p className="text-gray-400 text-sm bg-gray-700/30 rounded-lg p-3 mb-4">{invoice.notes}</p>
                      )}

                      {/* Pay Now button — Stripe ready */}
                      {invoice.status !== 'paid' && (
                        <div className="bg-blue-900/10 border border-blue-700/30 rounded-xl p-4 text-center">
                          <CreditCard className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                          <p className="text-white font-semibold mb-1">Ready to pay online?</p>
                          <p className="text-gray-400 text-sm mb-3">Contact your service provider for a secure payment link</p>
                          <a href={`mailto:derald@swcabs.com?subject=Payment for Invoice ${invoice.invoice_number}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                            <DollarSign className="w-4 h-4" />Request Payment Link
                          </a>
                        </div>
                      )}

                      {invoice.status === 'paid' && (
                        <div className="flex items-center gap-2 text-green-400 bg-green-900/10 border border-green-700/30 rounded-lg p-3">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            Paid {invoice.paid_date ? 'on ' + new Date(invoice.paid_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                          </span>
                        </div>
                      )}
                    </div>
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

export default BillingPayments;
