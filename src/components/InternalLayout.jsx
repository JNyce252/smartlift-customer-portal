import { Outlet, Link, useLocation } from 'react-router-dom'
import { Search, Users, TrendingUp, Route, UserCog, Building2, Bell, User } from 'lucide-react'

export default function InternalLayout() {
  const location = useLocation()
  
  const navigation = [
    { name: 'Lead Search', href: '/internal/leads', icon: Search },
    { name: 'Customer Management', href: '/internal/customers', icon: Users },
    { name: 'Analytics', href: '/internal/analytics', icon: TrendingUp },
    { name: 'Route Optimization', href: '/internal/routes', icon: Route },
    { name: 'Team Management', href: '/internal/team', icon: UserCog },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-purple-500" />
              <span className="ml-2 text-xl font-bold text-white">SmartLift</span>
              <span className="ml-2 text-sm text-gray-400">Internal Portal</span>
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
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-purple-500' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          <div className="mt-8 px-4">
            <Link
              to="/customer/dashboard"
              className="block text-center py-2 px-4 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Switch to Customer Portal
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
