import { UserCog, CheckCircle, Clock, MapPin } from 'lucide-react'

export default function TeamManagement() {
  const technicians = [
    { 
      id: 1, 
      name: 'John Smith', 
      status: 'active', 
      location: 'Downtown Area',
      currentJob: 'Maintenance at Tech Tower',
      jobsToday: 5,
      completedToday: 2,
      rating: 4.9
    },
    { 
      id: 2, 
      name: 'Sarah Johnson', 
      status: 'active', 
      location: 'Harbor District',
      currentJob: 'Emergency repair at City Center',
      jobsToday: 4,
      completedToday: 1,
      rating: 4.8
    },
    { 
      id: 3, 
      name: 'Mike Davis', 
      status: 'available', 
      location: 'West Side',
      currentJob: null,
      jobsToday: 3,
      completedToday: 3,
      rating: 4.7
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Team Management</h1>
        <p className="mt-2 text-gray-400">Monitor and assign jobs to your technician team</p>
      </div>

      {/* Team Overview Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Technicians</p>
              <p className="mt-2 text-3xl font-semibold text-white">2</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Jobs in Progress</p>
              <p className="mt-2 text-3xl font-semibold text-white">3</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Completed Today</p>
              <p className="mt-2 text-3xl font-semibold text-white">6</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Technician Cards */}
      <div className="space-y-6">
        {technicians.map((tech) => (
          <div key={tech.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-500/10 p-3 rounded-lg">
                  <UserCog className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{tech.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">{tech.location}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tech.status === 'active' ? 'bg-green-500/10 text-green-500' :
                  'bg-gray-600 text-gray-300'
                }`}>
                  {tech.status}
                </span>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Rating</p>
                  <p className="text-white font-medium">{tech.rating} ⭐</p>
                </div>
              </div>
            </div>

            {tech.currentJob && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-400 mb-1">Current Job</p>
                <p className="text-white font-medium">{tech.currentJob}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div>
                  <p className="text-sm text-gray-400">Jobs Today</p>
                  <p className="text-white font-medium">{tech.jobsToday}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-green-500 font-medium">{tech.completedToday}</p>
                </div>
              </div>
              <button className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors">
                Assign Job
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
