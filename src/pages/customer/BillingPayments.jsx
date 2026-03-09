import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, Download, CreditCard, CheckCircle, Clock, 
  AlertCircle, Calendar, Filter, Receipt, TrendingUp 
} from 'lucide-react';

const BillingPayments = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const invoices = [
    {
      id: 'INV-2024-12-001',
      date: '2024-12-15',
      dueDate: '2025-01-14',
      amount: 450.00,
      status: 'paid',
      paidDate: '2024-12-20',
      description: 'Routine Maintenance - Main Tower Elevator 1',
      services: ['Quarterly maintenance', 'Safety inspection', 'Door sensor replacement'],
    },
    {
      id: 'INV-2024-12-002',
      date: '2024-12-10',
      dueDate: '2025-01-09',
      amount: 1250.00,
      status: 'paid',
      paidDate: '2024-12-15',
      description: 'Emergency Repair - Main Tower Elevator 2',
      services: ['Door motor replacement', 'Emergency service call', 'Parts & labor'],
    },
    {
      id: 'INV-2024-11-003',
      date: '2024-11-20',
      dueDate: '2024-12-20',
      amount: 550.00,
      status: 'paid',
      paidDate: '2024-11-25',
      description: 'Annual Safety Inspection - South Wing Elevator 1',
      services: ['Annual inspection', 'Load testing', 'Certificate renewal'],
    },
    {
      id: 'INV-2025-01-004',
      date: '2025-01-05',
      dueDate: '2025-02-04',
      amount: 875.00,
      status: 'pending',
      description: 'Modernization Consultation & Assessment',
      services: ['Engineering assessment', 'Modernization plan', 'Cost analysis'],
    },
  ];

  const paymentMethods = [
    { id: 1, type: 'Visa', last4: '4242', expiry: '12/2026', isDefault: true },
    { id: 2, type: 'Mastercard', last4: '8888', expiry: '09/2025', isDefault: false },
  ];

  const getStatusBadge = (status) => {
    const badges = {
      paid: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Paid' },
      pending: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock, label: 'Pending' },
      overdue: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle, label: 'Overdue' },
    };
    return badges[status] || badges.pending;
  };

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/customer/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Dashboard</Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Payments</h1>
          <p className="text-gray-400">View invoices and manage payment methods</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <DollarSign className="w-8 h-8 text-green-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Paid</p>
            <p className="text-3xl font-bold text-white">${totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Clock className="w-8 h-8 text-amber-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Pending</p>
            <p className="text-3xl font-bold text-white">${totalPending.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Receipt className="w-8 h-8 text-blue-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Total Invoices</p>
            <p className="text-3xl font-bold text-white">{invoices.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
            <p className="text-gray-400 text-sm mb-1">Avg Monthly</p>
            <p className="text-3xl font-bold text-white">$758</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-blue-400" />
                  <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
                    <option value="all">All Invoices</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" />
                  Export All
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {invoices.map((invoice) => {
                const statusBadge = getStatusBadge(invoice.status);
                return (
                  <div key={invoice.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{invoice.id}</h3>
                          <p className="text-gray-400 text-sm">{invoice.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${statusBadge.color}`}>
                          <statusBadge.icon className="w-4 h-4" />
                          {statusBadge.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Invoice Date</p>
                          <p className="text-white">{new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Due Date</p>
                          <p className="text-white">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="bg-gray-900 rounded-lg p-4 mb-4">
                        <p className="text-xs text-gray-500 mb-2">Services</p>
                        <ul className="space-y-1">
                          {invoice.services.map((service, idx) => (
                            <li key={idx} className="text-sm text-gray-300">• {service}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <div>
                          <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                          <p className="text-3xl font-bold text-white">${invoice.amount.toFixed(2)}</p>
                          {invoice.paidDate && (
                            <p className="text-xs text-green-400 mt-1">Paid on {new Date(invoice.paidDate).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-colors">
                            <Download className="w-4 h-4" />
                            PDF
                          </button>
                          {invoice.status === 'pending' && (
                            <button onClick={() => { setSelectedInvoice(invoice); setShowPaymentModal(true); }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                              Pay Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Payment Methods</h3>
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>

              <div className="space-y-4 mb-6">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-blue-400" />
                        <div>
                          <p className="text-white font-semibold">{method.type} •••• {method.last4}</p>
                          <p className="text-gray-400 text-sm">Expires {method.expiry}</p>
                        </div>
                      </div>
                      {method.isDefault && (
                        <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-medium rounded border border-blue-600/30">Default</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors">Edit</button>
                      <button className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors">Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">+ Add Payment Method</button>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-lg p-6 border border-green-500/30">
              <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Enable Auto-Pay</h3>
              <p className="text-green-200 text-sm mb-4">Never miss a payment. Invoices are automatically paid when due.</p>
              <button className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">Set Up Auto-Pay</button>
            </div>
          </div>
        </div>

        {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Pay Invoice</h2>
              <p className="text-gray-400 mb-6">Invoice: {selectedInvoice.id}<br/>Amount: ${selectedInvoice.amount.toFixed(2)}</p>
              <div className="space-y-4 mb-6">
                <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Pay with Visa •••• 4242</button>
                <button className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">Pay with Another Card</button>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="w-full py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPayments;
