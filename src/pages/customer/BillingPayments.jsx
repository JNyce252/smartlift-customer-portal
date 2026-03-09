import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut, AlertCircle, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const BillingPayments = () => {
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getInvoices().then(setInvoices).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total || 0), 0);

  const statusConfig = {
    paid: 'text-green-400 bg-green-500/20 border-green-500/30',
    pending: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    overdue: 'text-red-400 bg-red-500/20 border-red-500/30',
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/customer/dashboard"><Home className="w-8 h-8 text-blue-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Billing & Payments</h1>
                <p className="text-xs text-gray-400">{user?.name}</p>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Billing & Payments</h2>
          <p className="text-gray-400">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" /><p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-600/20 rounded-lg p-3"><DollarSign className="w-6 h-6 text-amber-400" /></div>
              <p className="text-gray-400">Outstanding Balance</p>
            </div>
            <p className="text-4xl font-bold text-white">${totalOutstanding.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-600/20 rounded-lg p-3"><CheckCircle className="w-6 h-6 text-green-400" /></div>
              <p className="text-gray-400">Total Paid</p>
            </div>
            <p className="text-4xl font-bold text-white">${totalPaid.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{invoice.invoice_number}</h3>
                  <p className="text-sm text-gray-400">{invoice.customer_name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[invoice.status] || statusConfig.pending}`}>
                  {invoice.status?.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="text-white">${parseFloat(invoice.amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tax</p>
                  <p className="text-white">${parseFloat(invoice.tax || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-white font-bold">${parseFloat(invoice.total || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Due Date</p>
                  <p className="text-white">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              {invoice.status !== 'paid' && (
                <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" /> Pay Now
                </button>
              )}
              {invoice.status === 'paid' && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" /> Paid {invoice.paid_date ? `on ${new Date(invoice.paid_date).toLocaleDateString()}` : ''}
                </div>
              )}
            </div>
          ))}
          {invoices.length === 0 && !loading && (
            <div className="text-center py-16">
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-xl">No invoices found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingPayments;
