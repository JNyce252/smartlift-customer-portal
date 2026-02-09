import { TrendingUp, DollarSign, Users, Wrench } from 'lucide-react'

export default function Analytics() {
  const stats = [
    { name: 'Monthly Revenue', value: '$127,500', change: '+12.5%', icon: DollarSign, positive: true },
    { name: 'Active Customers', value: '48', change: '+8', icon: Users, positive: true },
    { name: 'Service Calls', value: '156', change: '-5%', icon: Wrench, positive: true },
    { name: 'Customer Satisfaction', value: '94%', change: '+2%', icon: TrendingUp, positive: true },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
        <p className="mt-2 text-gray-400">Track performance metrics and business insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-500/10 p-3 rounded-lg">
                  <Icon className="h-6 w-6 text-purple-500" />
                </div>
                <span className={`text-sm font-medium ${
                  stat.positive ? 'text-green-500' : 'text-red-500'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-gray-400">{stat.name}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Revenue Trend</h2>
        <div className="h-64 flex items-center justify-center bg-gray-700/50 rounded-lg">
          <p className="text-gray-400">Chart visualization would go here</p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Top Performing Technicians</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">John Smith</span>
              <span className="text-white font-medium">98% satisfaction</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Sarah Johnson</span>
              <span className="text-white font-medium">96% satisfaction</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Mike Davis</span>
              <span className="text-white font-medium">95% satisfaction</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Service Response Times</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Emergency</span>
              <span className="text-green-500 font-medium">avg. 45 min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Priority</span>
              <span className="text-green-500 font-medium">avg. 2.5 hours</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Standard</span>
              <span className="text-green-500 font-medium">avg. 8 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
