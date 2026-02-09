import { Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function ServiceRequests() {
  const requests = [
    { id: 1, elevator: 'Elevator #3', issue: 'Door not closing properly', status: 'in_progress', created: '2024-02-05', priority: 'high' },
    { id: 2, elevator: 'Elevator #7', issue: 'Unusual noise during operation', status: 'pending', created: '2024-02-04', priority: 'medium' },
    { id: 3, elevator: 'Elevator #2', issue: 'Interior light replacement', status: 'completed', created: '2024-02-01', priority: 'low' },
  ]

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Service Requests</h1>
          <p className="mt-2 text-gray-400">Submit and track service requests for your elevators</p>
        </div>
        <button className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
          <Plus className="h-5 w-5 mr-2" />
          New Request
        </button>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <div key={request.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{request.elevator}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    request.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                    request.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-green-500/10 text-green-500'
                  }`}>
                    {request.priority} priority
                  </span>
                </div>
                <p className="text-gray-400 mb-4">{request.issue}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>Created: {request.created}</span>
                </div>
              </div>
              <div className="flex items-center">
                {request.status === 'completed' && <CheckCircle className="h-6 w-6 text-green-500" />}
                {request.status === 'in_progress' && <Clock className="h-6 w-6 text-blue-500" />}
                {request.status === 'pending' && <AlertCircle className="h-6 w-6 text-yellow-500" />}
                <span className="ml-2 text-sm text-gray-400 capitalize">{request.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
