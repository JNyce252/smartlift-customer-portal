import { DollarSign, Download, CreditCard } from 'lucide-react'

export default function Billing() {
  const invoices = [
    { id: 1, number: 'INV-2024-001', date: '2024-02-01', amount: 2500, status: 'paid' },
    { id: 2, number: 'INV-2024-002', date: '2024-01-01', amount: 2500, status: 'paid' },
    { id: 3, number: 'INV-2023-012', date: '2023-12-01', amount: 2500, status: 'paid' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Billing & Payments</h1>
        <p className="mt-2 text-gray-400">Manage your invoices and payment methods</p>
      </div>

      {/* Current Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 mb-2">Current Balance</p>
            <p className="text-4xl font-bold text-white">$0.00</p>
            <p className="text-blue-100 mt-2">All invoices paid</p>
          </div>
          <DollarSign className="h-16 w-16 text-blue-200" />
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Payment Method</h2>
          <button className="text-blue-500 hover:text-blue-400 text-sm">
            Update
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-700 p-3 rounded-lg">
            <CreditCard className="h-6 w-6 text-gray-300" />
          </div>
          <div>
            <p className="text-white font-medium">Visa ending in 4242</p>
            <p className="text-sm text-gray-400">Expires 12/2025</p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Invoice History</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="px-6 py-4 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-white font-medium">{invoice.number}</p>
                  <p className="text-sm text-gray-400">{invoice.date}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-white font-semibold">${invoice.amount.toFixed(2)}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                    {invoice.status}
                  </span>
                  <button className="text-blue-500 hover:text-blue-400 p-2">
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
