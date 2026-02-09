import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Building2, Wrench, History, CreditCard, Bell, User } from 'lucide-react'

export default function CustomerLayout() {
  const location = useLocation()
  
  const navigation = [
    { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard },
    { name: 'Elevators', href: '/customer/elevators', icon: Building2 },
    { name: 'Service Requests', href: '/customer/service-requests', icon: Wrench },
    { name: 'Maintenance History', href: '/customer/maintenance', icon: History },
    { name: 'Billing', href: '/customer/billing', icon: CreditCard },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-xl font-bold text-white">SmartLift</span>
              <span className="ml-2 text-sm text-gray-400">Customer Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-300 hover:text-white">
                <Bell className="h-6 w-6" />
              </button>
              <button className="text-gray-300 hover:text-white">
                <User className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-800 min-h-screen border-r border-gray-700">
          <nav className="mt-5 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          <div className="mt-8 px-4">
            <Link
              to="/internal/leads"
              className="block text-center py-2 px-4 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Switch to Internal Portal
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
