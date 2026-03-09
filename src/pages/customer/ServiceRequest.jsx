import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Camera, Clock, Home, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const ServiceRequest = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [elevators, setElevators] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    elevator_id: '',
    priority: 'medium',
    title: '',
    description: '',
  });

  useEffect(() => {
    api.getElevators().then(setElevators).catch(console.error);
  }, []);

  const priorities = [
    { value: 'low', label: 'Low', color: 'green', description: 'Routine maintenance or minor issues' },
    { value: 'medium', label: 'Medium', color: 'amber', description: 'Non-urgent issues affecting service' },
    { value: 'high', label: 'High', color: 'orange', description: 'Significant issues requiring prompt attention' },
    { value: 'critical', label: 'Critical', color: 'red', description: 'Safety hazard or elevator not functioning' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.elevator_id || !formData.title || !formData.description) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createTicket({
        ...formData,
        elevator_id: parseInt(formData.elevator_id),
        reported_by: user?.name || user?.email,
        status: 'open',
      });
      setSubmitted(true);
      setTimeout(() => navigate('/customer/dashboard'), 3000);
    } catch (err) {
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">Request Submitted!</h2>
        <p className="text-gray-400 mb-6">Your service request has been received. Redirecting to dashboard...</p>
        <Link to="/customer/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Back to Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/customer/dashboard"><Home className="w-8 h-8 text-blue-400" /></Link>
              <div>
                <h1 className="text-xl font-bold text-white">Request Service</h1>
                <p className="text-xs text-gray-400">{user?.name}</p>
              </div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Request Service</h2>
          <p className="text-gray-400">Submit a service request for your elevators</p>
        </div>

        <div className="bg-red-600/20 border-2 border-red-500 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 rounded-full p-3"><Phone className="w-6 h-6 text-white" /></div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Emergency? Call Immediately</h3>
              <p className="text-red-200 mb-3">For trapped passengers or safety hazards, call our 24/7 emergency line:</p>
              <a href="tel:5559111548" className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
                <Phone className="w-5 h-5" />(555) 911-LIFT
              </a>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" /><p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Select Elevator *</label>
            <select required value={formData.elevator_id}
              onChange={(e) => setFormData({...formData, elevator_id: e.target.value})}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
              <option value="">Choose an elevator...</option>
              {elevators.map((e) => (
                <option key={e.id} value={e.id}>{e.elevator_identifier}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Priority Level *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {priorities.map((priority) => (
                <button key={priority.value} type="button"
                  onClick={() => setFormData({...formData, priority: priority.value})}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.priority === priority.value ? 'border-blue-500 bg-blue-500/20' : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                  }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-4 h-4 rounded-full ${
                      priority.value === 'low' ? 'bg-green-500' :
                      priority.value === 'medium' ? 'bg-amber-500' :
                      priority.value === 'high' ? 'bg-orange-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-white font-bold">{priority.label}</span>
                  </div>
                  <p className="text-sm text-gray-400">{priority.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Issue Title *</label>
            <input type="text" required value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Unusual noise when doors close"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Detailed Description *</label>
            <textarea required rows={6} value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the issue in detail..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div className="mb-8">
            <label className="block text-white font-semibold mb-3">Upload Photos (Optional)</label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <Camera className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">Click to upload photos</p>
              <p className="text-sm text-gray-400">Help our technicians diagnose faster</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={submitting}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold text-lg rounded-lg transition-colors">
              {submitting ? 'Submitting...' : 'Submit Service Request'}
            </button>
            <Link to="/customer/dashboard" className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
              Cancel
            </Link>
          </div>
        </form>

        <div className="mt-6 bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-blue-300 font-semibold mb-1">Response Times</p>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Critical: Within 1 hour</li>
                <li>• High: Within 4 hours</li>
                <li>• Medium: Within 24 hours</li>
                <li>• Low: Within 3 business days</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequest;
