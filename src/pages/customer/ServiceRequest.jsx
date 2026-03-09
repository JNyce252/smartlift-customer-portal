import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, AlertCircle, Phone, Camera, MapPin, Clock } from 'lucide-react';

const ServiceRequest = () => {
  const [formData, setFormData] = useState({
    elevator: '',
    priority: 'medium',
    title: '',
    description: '',
    photos: [],
  });
  const [isEmergency, setIsEmergency] = useState(false);

  const elevators = [
    'Main Tower - Elevator 1',
    'Main Tower - Elevator 2',
    'South Wing - Elevator 1',
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'green', description: 'Routine maintenance or minor issues' },
    { value: 'medium', label: 'Medium', color: 'amber', description: 'Non-urgent issues affecting service' },
    { value: 'high', label: 'High', color: 'orange', description: 'Significant issues requiring prompt attention' },
    { value: 'critical', label: 'Critical', color: 'red', description: 'Safety hazard or elevator not functioning' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Service request submitted! (This would connect to your backend)');
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, photos: [...formData.photos, ...files] });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/customer/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">← Back to Dashboard</Link>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Request Service</h1>
          <p className="text-gray-400">Submit a service request for your elevators</p>
        </div>

        {/* Emergency Alert */}
        {!isEmergency ? (
          <div className="bg-red-600/20 border-2 border-red-500 rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="bg-red-600 rounded-full p-3">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Emergency? Call Immediately</h3>
                  <p className="text-red-200 mb-4">For immediate assistance with trapped passengers or safety hazards, call our 24/7 emergency line:</p>
                  <a href="tel:5559111548" className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
                    <Phone className="w-5 h-5" />
                    (555) 911-LIFT
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Service Request Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          {/* Elevator Selection */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Select Elevator *</label>
            <select 
              required
              value={formData.elevator}
              onChange={(e) => setFormData({...formData, elevator: e.target.value})}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500">
              <option value="">Choose an elevator...</option>
              {elevators.map((elevator, idx) => (
                <option key={idx} value={elevator}>{elevator}</option>
              ))}
            </select>
          </div>

          {/* Priority Selection */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Priority Level *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {priorities.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setFormData({...formData, priority: priority.value})}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    formData.priority === priority.value
                      ? `border-${priority.color}-500 bg-${priority.color}-500/20`
                      : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                  }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-4 h-4 rounded-full bg-${priority.color}-500`}></div>
                    <span className="text-white font-bold">{priority.label}</span>
                  </div>
                  <p className="text-sm text-gray-400">{priority.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Issue Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Unusual noise when doors close"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Detailed Description *</label>
            <textarea
              required
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the issue in detail. Include when it started, how often it occurs, and any other relevant information..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Photo Upload */}
          <div className="mb-8">
            <label className="block text-white font-semibold mb-3">Upload Photos (Optional)</label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Camera className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-white font-semibold mb-2">Click to upload photos or videos</p>
                <p className="text-sm text-gray-400">Take photos of the issue to help our technicians diagnose faster</p>
              </label>
              {formData.photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-green-400">{formData.photos.length} file(s) selected</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg transition-colors">
              Submit Service Request
            </button>
            <Link
              to="/customer/dashboard"
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors">
              Cancel
            </Link>
          </div>
        </form>

        {/* Help Text */}
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
