import { Search, Building2, MapPin, TrendingUp, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LeadSearch() {
  const leads = [
    { id: 1, company: 'Tech Tower LLC', location: 'San Francisco, CA', elevators: 8, potential: 'high', score: 92 },
    { id: 2, company: 'Downtown Plaza', location: 'New York, NY', elevators: 12, potential: 'high', score: 88 },
    { id: 3, company: 'Riverside Offices', location: 'Austin, TX', elevators: 6, potential: 'medium', score: 75 },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Lead Search</h1>
        <p className="mt-2 text-gray-400">AI-powered prospect discovery and intelligence</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company name, location, or industry..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Leads Grid */}
      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Building2 className="h-6 w-6 text-purple-500" />
                  <h3 className="text-xl font-semibold text-white">{lead.company}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    lead.potential === 'high' ? 'bg-green-500/10 text-green-500' :
                    'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {lead.potential} potential
                  </span>
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-400 mb-4">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {lead.location}
                  </div>
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-1" />
                    {lead.elevators} elevators
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm text-gray-400">Lead Score:</span>
                    <span className="ml-2 text-lg font-semibold text-white">{lead.score}</span>
                  </div>
                </div>
              </div>

              <Link
                to={`/internal/prospect/${lead.id}`}
                className="flex items-center bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
