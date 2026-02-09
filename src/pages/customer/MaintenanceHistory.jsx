import { Calendar, Wrench, FileText } from 'lucide-react'

export default function MaintenanceHistory() {
  const history = [
    { id: 1, elevator: 'Elevator #1', service: 'Routine Inspection', date: '2024-02-01', technician: 'John Smith', notes: 'All systems operational' },
    { id: 2, elevator: 'Elevator #3', service: 'Cable Replacement', date: '2024-01-28', technician: 'Sarah Johnson', notes: 'Replaced worn cables' },
    { id: 3, elevator: 'Elevator #5', service: 'Motor Maintenance', date: '2024-01-25', technician: 'Mike Davis', notes: 'Lubrication and adjustment' },
    { id: 4, elevator: 'Elevator #2', service: 'Safety Test', date: '2024-01-20', technician: 'John Smith', notes: 'Passed all safety checks' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Maintenance History</h1>
        <p className="mt-2 text-gray-400">View complete maintenance records for all elevators</p>
      </div>

      <div className="space-y-4">
        {history.map((record) => (
          <div key={record.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500/10 p-3 rounded-lg">
                  <Wrench className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{record.elevator}</h3>
                  <p className="text-blue-400">{record.service}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-white transition-colors">
                <FileText className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Date</p>
                <div className="flex items-center text-white">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {record.date}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Technician</p>
                <p className="text-white">{record.technician}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Notes</p>
                <p className="text-white">{record.notes}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
