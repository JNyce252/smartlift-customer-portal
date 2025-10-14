import { 
  Zap, Search, Building2, TrendingUp, Database, Settings, 
  Home, Plus, Filter, MapPin, Phone, Mail, Calendar,  // MapPin is here
  DollarSign, Users, Clock, CheckCircle, XCircle,
  AlertCircle, ChevronRight, Edit, Trash2, Save, X
} from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hotels, setHotels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  // Sample data - replace with API calls to your Lambda functions
  const sampleHotels = [
    {
      id: 1,
      name: 'Grand Plaza Hotel',
      city: 'Dallas',
      state: 'TX',
      floors: 15,
      elevators: 4,
      reputation_score: 4.2,
      urgency: 'high',
      issues: ['slow_service', 'breakdowns'],
      mentions: 12
    },
    {
      id: 2,
      name: 'Skyline Tower Hotel',
      city: 'Houston',
      state: 'TX',
      floors: 22,
      elevators: 6,
      reputation_score: 6.8,
      urgency: 'medium',
      issues: ['maintenance', 'noise'],
      mentions: 8
    },
    {
      id: 3,
      name: 'Harbor View Inn',
      city: 'Austin',
      state: 'TX',
      floors: 8,
      elevators: 2,
      reputation_score: 8.5,
      urgency: 'low',
      issues: [],
      mentions: 3
    },
    {
      id: 4,
      name: 'Metropolitan Suites',
      city: 'San Antonio',
      state: 'TX',
      floors: 18,
      elevators: 5,
      reputation_score: 3.8,
      urgency: 'critical',
      issues: ['breakdowns', 'reliability', 'slow_service'],
      mentions: 18
    },
    {
      id: 5,
      name: 'Downtown Business Hotel',
      city: 'Fort Worth',
      state: 'TX',
      floors: 12,
      elevators: 3,
      reputation_score: 5.5,
      urgency: 'medium',
      issues: ['slow_service'],
      mentions: 6
    }
  ];

  useEffect(() => {
    // Simulate loading data
    setHotels(sampleHotels);
  }, []);

  // Chart data
  const opportunityData = [
    { name: 'Critical', value: 1, color: '#EF4444' },
    { name: 'High', value: 1, color: '#F59E0B' },
    { name: 'Medium', value: 2, color: '#3B82F6' },
    { name: 'Low', value: 1, color: '#10B981' }
  ];

  const issueData = [
    { issue: 'Breakdowns', count: 2 },
    { issue: 'Slow Service', count: 3 },
    { issue: 'Maintenance', count: 1 },
    { issue: 'Noise', count: 1 },
    { issue: 'Reliability', count: 1 }
  ];

  const trendData = [
    { month: 'Jan', opportunities: 12 },
    { month: 'Feb', opportunities: 19 },
    { month: 'Mar', opportunities: 15 },
    { month: 'Apr', opportunities: 25 },
    { month: 'May', opportunities: 22 },
    { month: 'Jun', opportunities: 30 }
  ];

  // Filter hotels
  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch = hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hotel.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = urgencyFilter === 'all' || hotel.urgency === urgencyFilter;
    return matchesSearch && matchesUrgency;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">SmartLift UI</h1>
                <p className="text-sm text-gray-400">Elevator Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-600/30 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">Live</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-gray-800/50 p-2 rounded-lg">
          <NavTab 
            icon={<Home className="w-5 h-5" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <NavTab 
            icon={<Building2 className="w-5 h-5" />} 
            label="Hotels" 
            active={activeTab === 'hotels'}
            onClick={() => setActiveTab('hotels')}
          />
          <NavTab 
            icon={<TrendingUp className="w-5 h-5" />} 
            label="Opportunities" 
            active={activeTab === 'opportunities'}
            onClick={() => setActiveTab('opportunities')}
          />
          <NavTab 
            icon={<Database className="w-5 h-5" />} 
            label="Data Models" 
            active={activeTab === 'data'}
            onClick={() => setActiveTab('data')}
          />
          <NavTab 
            icon={<Settings className="w-5 h-5" />} 
            label="About" 
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
          />
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Hotels" value="247" change="+12%" color="blue" />
              <StatCard title="Active Opportunities" value="45" change="+8%" color="green" />
              <StatCard title="Critical Urgency" value="12" change="-3%" color="red" />
              <StatCard title="Avg Reputation" value="6.8" change="+0.5" color="purple" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Opportunities by Urgency */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Opportunities by Urgency</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={opportunityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {opportunityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Common Issues */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Common Issues</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={issueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="issue" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Trend Chart */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 lg:col-span-2">
                <h3 className="text-xl font-semibold text-white mb-4">Opportunity Trend (6 Months)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                    <Legend />
                    <Line type="monotone" dataKey="opportunities" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Opportunities */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">High Priority Opportunities</h3>
              <div className="space-y-3">
                {hotels.filter(h => h.urgency === 'critical' || h.urgency === 'high').map(hotel => (
                  <OpportunityCard key={hotel.id} hotel={hotel} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hotels Tab */}
        {activeTab === 'hotels' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search hotels by name or city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Urgency</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Hotels Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hotel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Floors/Elevators</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Reputation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Urgency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredHotels.map(hotel => (
                      <tr key={hotel.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{hotel.name}</div>
                          <div className="text-sm text-gray-400">{hotel.mentions} elevator mentions</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {hotel.city}, {hotel.state}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {hotel.floors} floors / {hotel.elevators} elevators
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`text-sm font-medium ${
                              hotel.reputation_score >= 7 ? 'text-green-400' :
                              hotel.reputation_score >= 5 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {hotel.reputation_score}/10
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <UrgencyBadge urgency={hotel.urgency} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {hotel.issues.length > 0 ? hotel.issues.join(', ') : 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities Tab */}
        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Service Opportunities</h2>
              <p className="text-gray-400 mb-6">Prioritized list of hotels with elevator service needs</p>
              
              <div className="space-y-4">
                {hotels
                  .sort((a, b) => {
                    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
                  })
                  .map(hotel => (
                    <div key={hotel.id} className="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{hotel.name}</h3>
                          <p className="text-gray-400">{hotel.city}, {hotel.state}</p>
                        </div>
                        <UrgencyBadge urgency={hotel.urgency} />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">Building</p>
                          <p className="text-white font-medium">{hotel.floors} floors</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Elevators</p>
                          <p className="text-white font-medium">{hotel.elevators} units</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Reputation Score</p>
                          <p className={`font-medium ${
                            hotel.reputation_score >= 7 ? 'text-green-400' :
                            hotel.reputation_score >= 5 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {hotel.reputation_score}/10
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Review Mentions</p>
                          <p className="text-white font-medium">{hotel.mentions}</p>
                        </div>
                      </div>

                      {hotel.issues.length > 0 && (
                        <div className="mb-4">
                          <p className="text-gray-400 text-sm mb-2">Identified Issues:</p>
                          <div className="flex flex-wrap gap-2">
                            {hotel.issues.map((issue, idx) => (
                              <span key={idx} className="px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-sm border border-red-600/30">
                                {issue.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                          View Details
                        </button>
                        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                          Export Report
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Models Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Database Schema</h2>
              
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">Hotels Table</h3>
                  <div className="space-y-2 text-sm">
                    <SchemaRow field="id" type="SERIAL PRIMARY KEY" />
                    <SchemaRow field="name" type="VARCHAR(255)" />
                    <SchemaRow field="city" type="VARCHAR(100)" />
                    <SchemaRow field="state" type="VARCHAR(50)" />
                    <SchemaRow field="google_place_id" type="VARCHAR(255) UNIQUE" />
                    <SchemaRow field="rating" type="DECIMAL(2,1)" />
                    <SchemaRow field="total_reviews" type="INTEGER" />
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-400 mb-3">Elevator Intelligence Table</h3>
                  <div className="space-y-2 text-sm">
                    <SchemaRow field="id" type="SERIAL PRIMARY KEY" />
                    <SchemaRow field="hotel_id" type="INTEGER REFERENCES hotels(id)" />
                    <SchemaRow field="estimated_floors" type="INTEGER" />
                    <SchemaRow field="estimated_elevators" type="INTEGER" />
                    <SchemaRow field="reputation_score" type="DECIMAL(3,1)" />
                    <SchemaRow field="common_issues" type="JSONB" />
                    <SchemaRow field="service_urgency" type="VARCHAR(20)" />
                    <SchemaRow field="analysis_date" type="TIMESTAMP" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">About SmartLift UI</h2>
              <p className="text-gray-300 mb-6">
                AWS-powered platform for analyzing hotel reviews, identifying elevator service opportunities, 
                and generating qualified leads for elevator service companies.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {['AWS Lambda', 'Aurora Serverless', 'Google Places API', 'AWS Comprehend', 'React', 'Python'].map(tech => (
                      <span key={tech} className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm border border-blue-600/30">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">Core Features</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-gray-300">
                      <span className="text-green-400">✓</span>
                      <span>Hotel data scraping and enrichment</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-300">
                      <span className="text-green-400">✓</span>
                      <span>Elevator-specific review analysis</span>
                    </li>
                    <li className="flex items-start gap-2 text-gray-300">
                      <span className="text-green-400">✓</span>
                      <span>AI-powered opportunity identification</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
const NavTab = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
      active
        ? 'bg-blue-600 text-white shadow-lg'
        : 'text-gray-400 hover:text-white hover:bg-gray-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const StatCard = ({ title, value, change, color }) => {
  const colors = {
    blue: 'from-blue-600 to-blue-700',
    green: 'from-green-600 to-green-700',
    red: 'from-red-600 to-red-700',
    purple: 'from-purple-600 to-purple-700'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-lg p-6 border border-gray-700`}>
      <p className="text-white/80 text-sm mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-white">{value}</p>
        <span className={`text-sm font-medium ${change.startsWith('+') ? 'text-green-300' : 'text-red-300'}`}>
          {change}
        </span>
      </div>
    </div>
  );
};

const UrgencyBadge = ({ urgency }) => {
  const styles = {
    critical: 'bg-red-600/20 text-red-400 border-red-600/30',
    high: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
    medium: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    low: 'bg-green-600/20 text-green-400 border-green-600/30'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[urgency]}`}>
      {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
    </span>
  );
};

const OpportunityCard = ({ hotel }) => (
  <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
    <div className="flex-1">
      <h4 className="text-white font-semibold">{hotel.name}</h4>
      <p className="text-gray-400 text-sm">{hotel.city}, {hotel.state} • {hotel.mentions} mentions</p>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-gray-400 text-sm">Reputation</p>
        <p className={`font-semibold ${
          hotel.reputation_score >= 7 ? 'text-green-400' :
          hotel.reputation_score >= 5 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {hotel.reputation_score}/10
        </p>
      </div>
      <UrgencyBadge urgency={hotel.urgency} />
      <ChevronRight className="text-gray-400" />
    </div>
  </div>
);

const SchemaRow = ({ field, type }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-800">
    <span className="text-blue-400 font-mono">{field}</span>
    <span className="text-gray-400 font-mono text-xs">{type}</span>
  </div>
);

export default App;
