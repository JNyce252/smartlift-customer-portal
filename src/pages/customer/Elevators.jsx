import { Building2, AlertCircle, CheckCircle } from 'lucide-react'

export default function Elevators() {
  const elevators = [
    { id: 1, name: 'Elevator #1', location: 'North Tower, Floors 1-20', status: 'operational', lastService: '2024-01-15' },
    { id: 2, name: 'Elevator #2', location: 'North Tower, Floors 1-20', status: 'operational', lastService: '2024-01-18' },
    { id: 3, name: 'Elevator #3', location: 'South Tower, Floors 1-15', status: 'operational', lastService: '2024-01-20' },
    { id: 4, name: 'Elevator #4', location: 'South Tower, Floors 1-15', status: 'maintenance', lastService: '2024-01-10' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Elevators</h1>
        <p className="mt-2 text-gray-400">Manage and monitor all elevator systems</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {elevators.map((elevator) => (
          <div key={elevator.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{elevator.name}</h3>
                  <p className="text-sm text-gray-400">{elevator.location}</p>
                </div>
              </div>
              {elevator.status === 'operational' ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${
                  elevator.status === 'operational' ? 'text-green-500' : 'text-yellow-500'
                }`}>
                  {elevator.status === 'operational' ? 'Operational' : 'Under Maintenance'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Last Service:</span>
                <span className="text-white">{elevator.lastService}</span>
              </div>
            </div>
            
            <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
