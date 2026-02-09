import { useParams } from 'react-router-dom'
import { Building2, MapPin, Users, DollarSign, TrendingUp, Mail, Phone } from 'lucide-react'

export default function ProspectIntelligence() {
  const { id } = useParams()

  const prospect = {
    company: 'Tech Tower LLC',
    location: 'San Francisco, CA',
    elevators: 8,
    score: 92,
    revenue: '$2.5M',
    employees: 450,
    contact: {
      name: 'John Manager',
      email: 'john@techtower.com',
      phone: '(555) 123-4567'
    },
    insights: [
      'Current contract expires in 3 months',
      'Recent complaints about service quality',
      'Budget increased by 15% this year',
      'Looking for modern monitoring solutions'
    ]
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{prospect.company}</h1>
        <p className="mt-2 text-gray-400">AI-Generated Prospect Intelligence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Info Card */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Company Overview</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-400">Location</p>
                <p className="text-white font-medium">{prospect.location}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Building2 className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-400">Elevators</p>
                <p className="text-white font-medium">{prospect.elevators}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-400">Est. Annual Revenue</p>
                <p className="text-white font-medium">{prospect.revenue}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-400">Employees</p>
                <p className="text-white font-medium">{prospect.employees}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Score Card */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Lead Score</h3>
            <TrendingUp className="h-5 w-5 text-purple-200" />
          </div>
          <p className="text-5xl font-bold text-white mb-2">{prospect.score}</p>
          <p className="text-purple-100">High conversion potential</p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Key Contact</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-gray-400" />
            <span className="text-white">{prospect.contact.name}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <span className="text-white">{prospect.contact.email}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <span className="text-white">{prospect.contact.phone}</span>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">AI-Generated Insights</h2>
        <ul className="space-y-3">
          {prospect.insights.map((insight, index) => (
            <li key={index} className="flex items-start">
              <span className="flex-shrink-0 h-2 w-2 bg-purple-500 rounded-full mt-2 mr-3"></span>
              <span className="text-gray-300">{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
