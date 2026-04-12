import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, Clock, Home, LogOut, CheckCircle, AlertCircle, ArrowUpDown, ChevronRight, Wrench, Zap, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const PRIORITY_OPTIONS = [
  {
    value: 'low',
    label: 'Routine',
    icon: Info,
    color: 'border-gray-600 bg-gray-700/30',
    activeColor: 'border-blue-500 bg-blue-900/20',
    iconColor: 'text-blue-400',
    description: 'Scheduled maintenance or minor cosmetic issues',
    response: 'Within 3 business days',
  },
  {
    value: 'medium',
    label: 'Standard',
    icon: Wrench,
    color: 'border-gray-600 bg-gray-700/30',
    activeColor: 'border-amber-500 bg-amber-900/20',
    iconColor: 'text-amber-400',
    description: 'Non-urgent issues affecting comfort or efficiency',
    response: 'Within 24 hours',
  },
  {
    value: 'high',
    label: 'Urgent',
    icon: AlertTriangle,
    color: 'border-gray-600 bg-gray-700/30',
    activeColor: 'border-orange-500 bg-orange-900/20',
    iconColor: 'text-orange-400',
    description: 'Significant issues affecting normal operation',
    response: 'Within 4 hours',
  },
  {
    value: 'emergency',
    label: 'Emergency',
    icon: Zap,
    color: 'border-gray-600 bg-gray-700/30',
    activeColor: 'border-red-500 bg-red-900/20',
    iconColor: 'text-red-400',
    description: 'Elevator non-functional or safety hazard',
    response: 'Within 1 hour',
  },
];

const COMMON_ISSUES = [
  'Unusual noise during operation',
  'Door not opening or closing properly',
  'Elevator stopping between floors',
  'Slow door response time',
  'Rough or jerky movement',
  'Display panel not working',
  'Lighting issue inside cab',
  'Emergency phone not working',
  'Overheating or unusual smell',
  'Annual inspection due',
];

const ServiceRequest = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [elevators, setElevators] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    elevator_id: searchParams.get('elevator') || '',
    priority: 'medium',
    title: '',
    description: '',
  });

  useEffect(() => {
    api.getElevators()
      .then(data => setElevators(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.elevator_id || !form.title || !form.description) {
      setError('Please select an elevator, provide a title, and describe the issue.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.createTicket({
        elevator_id: parseInt(form.elevator_id),
        title: form.title,
        description: form.description,
        priority: form.priority,
        reported_by: user?.name || user?.email,
        status: 'open',
      });
      setTicketNumber(result.ticket_number || 'SR-' + Date.now().toString().slice(-4));
      setSubmitted(true);
    } catch(err) {
      setError('Failed to submit your request. Please try again or call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-700/30">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Request Submitted</h2>
        {ticketNumber && (
          <div className="bg-gray-700/50 rounded-lg px-4 py-2 inline-block mb-4">
            <p className="text-gray-400 text-xs mb-0.5">Ticket Number</p>
            <p className="text-white font-mono font-bold text-lg">{ticketNumber}</p>
          </div>
        )}
        <p className="text-gray-400 text-sm mb-2">Your service request has been received and assigned to our team.</p>
        <p className="text-gray-500 text-sm mb-8">You will receive confirmation shortly. Please reference your ticket number for any follow-up.</p>
        <div className="space-y-3">
          <Link to="/customer/dashboard"
            className="w-full block py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
            Back to Dashboard
          </Link>
          <Link to="/customer/elevators"
            className="w-full block py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors">
            View My Elevators
          </Link>
        </div>
      </div>
    </div>
  );

  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === form.priority);

  return (
    <div className="min-h-screen bg-gray-900">
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
            <button onClick={logout}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Emergency Banner */}
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-900/40 rounded-xl flex items-center justify-center flex-shrink-0 border border-red-700/40">
              <Phone className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-0.5">Passenger Trapped or Immediate Safety Hazard?</h3>
              <p className="text-gray-400 text-sm">Call our 24/7 emergency dispatch line immediately — do not submit a form.</p>
            </div>
            <a href={`tel:${(elevators[0] && '9729747005') || '9729747005'}`}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 flex-shrink-0 transition-colors">
              <Phone className="w-4 h-4" />972-974-7005
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">

          {/* Step 1 — Select Elevator */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">1</div>
              <h2 className="text-white font-semibold text-lg">Select Elevator</h2>
            </div>
            {elevators.length === 0 ? (
              <p className="text-gray-400 text-sm">No elevators registered. Contact your service provider.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {elevators.map(e => (
                  <button key={e.id} onClick={() => f('elevator_id')(String(e.id))}
                    className={`p-4 rounded-xl border text-left transition-all ${String(form.elevator_id) === String(e.id) ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${String(form.elevator_id) === String(e.id) ? 'bg-blue-600' : 'bg-gray-600'}`}>
                        <ArrowUpDown className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{e.elevator_identifier || 'Elevator #' + e.id}</p>
                        {e.manufacturer && <p className="text-gray-400 text-xs">{e.manufacturer}{e.model ? ' · ' + e.model : ''}</p>}
                      </div>
                      {String(form.elevator_id) === String(e.id) && <CheckCircle className="w-4 h-4 text-blue-400 ml-auto" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2 — Priority */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">2</div>
              <h2 className="text-white font-semibold text-lg">Priority Level</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PRIORITY_OPTIONS.map(p => {
                const Icon = p.icon;
                const isActive = form.priority === p.value;
                return (
                  <button key={p.value} onClick={() => f('priority')(p.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${isActive ? p.activeColor : p.color} hover:border-gray-500`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${isActive ? p.iconColor : 'text-gray-400'}`} />
                      <span className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>{p.label}</span>
                      {isActive && <CheckCircle className="w-3.5 h-3.5 text-blue-400 ml-auto" />}
                    </div>
                    <p className="text-gray-400 text-xs mb-2">{p.description}</p>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <p className="text-gray-500 text-xs">{p.response}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3 — Issue Details */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">3</div>
              <h2 className="text-white font-semibold text-lg">Describe the Issue</h2>
            </div>

            {/* Common Issues */}
            <div className="mb-5">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">Common Issues — tap to select</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_ISSUES.map(issue => (
                  <button key={issue} onClick={() => f('title')(issue)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${form.title === issue ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                    {issue}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Issue Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => f('title')(e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Detailed Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => f('description')(e.target.value)}
                  placeholder="Please describe when the issue occurs, how long it has been happening, and any other relevant details that will help our technicians diagnose the problem quickly..."
                  rows={5}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Response Time Info */}
          {selectedPriority && (
            <div className="bg-blue-900/10 border border-blue-700/30 rounded-xl p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-blue-300 text-sm font-medium">Expected Response Time</p>
                <p className="text-blue-400 text-sm">{selectedPriority.response} for {selectedPriority.label.toLowerCase()} priority requests</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Link to="/customer/dashboard"
              className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors">
              Cancel
            </Link>
            <button onClick={handleSubmit}
              disabled={submitting || !form.elevator_id || !form.title || !form.description}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Service Request
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequest;
