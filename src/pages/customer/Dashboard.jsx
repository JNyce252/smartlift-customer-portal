import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

export default function CustomerDashboard() {
  const stats = [
    { name: 'Total Elevators', value: '12', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Active Service Requests', value: '3', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { name: 'Scheduled Maintenance', value: '5', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    { name: 'Issues Requiring Attention', value: '1', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ]

  const recentActivity = [
    { id: 1, elevator: 'Elevator #3', action: 'Maintenance completed', time: '2 hours ago', status: 'completed' },
    { id: 2, elevator: 'Elevator #7', action: 'Service request submitted', time: '5 hours ago', status: 'pending' },
    { id: 3, elevator: 'Elevator #1', action: 'Inspection scheduled', time: '1 day ago', status: 'scheduled' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-gray-400">Welcome back! Here's an overview of your elevator systems.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.name}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="px-6 py-4 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-white font-medium">{activity.elevator}</p>
                  <p className="text-sm text-gray-400">{activity.action}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-400">{activity.time}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                    activity.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
