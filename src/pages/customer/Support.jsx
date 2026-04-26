import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, Phone, Mail, MessageSquare, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Clock, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authHeaders, authService } from '../../services/authService';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const FAQS = [
  {
    q: 'How do I submit an emergency service request?',
    a: 'For emergencies, call our direct line immediately. You can also submit an emergency request through the Service Request page — select "Emergency" as the priority and our team will be notified immediately.',
  },
  {
    q: 'How often should my elevators be serviced?',
    a: 'Texas state law requires elevator inspections at least annually. We recommend quarterly preventive maintenance to keep your elevators running reliably and avoid costly emergency repairs.',
  },
  {
    q: 'What is a CAT 1 and CAT 5 test?',
    a: 'CAT 1 (Category 1) is an annual safety test required by Texas TDLR. CAT 5 (Category 5) is a full-load safety test required every 5 years. Both are required by law for most elevator types.',
  },
  {
    q: 'How do I view my service history?',
    a: 'Visit the Service History page from your dashboard. You can view all maintenance records, filter by elevator, and see upcoming scheduled services.',
  },
  {
    q: 'What happens after I submit a service request?',
    a: 'You will receive a confirmation with a ticket number immediately. Our team will contact you within 2 hours for non-emergency requests, and within 30 minutes for emergency requests.',
  },
  {
    q: 'How do I add or update my building information?',
    a: 'Contact your service representative directly. They can update your account information, add new elevators, or modify your service agreement.',
  },
];

const Support = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({});
  const [openFaq, setOpenFaq] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ subject: '', category: 'general', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // headers built per fetch via authHeaders() — see authService.js

  useEffect(() => {
    fetch(BASE_URL + '/profile', { headers: authHeaders() }).then(r => r.json()).then(d => setProfile(d || {})).catch(() => {});
    fetch(BASE_URL + '/tickets', { headers: authHeaders() }).then(r => r.json()).then(d => setTickets(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {});
  }, []);

  const submitRequest = async () => {
    if (!form.subject || !form.message) return;
    setSending(true);
    try {
      await fetch(BASE_URL + '/tickets', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          title: form.subject,
          description: form.message,
          priority: 'medium',
          category: form.category,
          source: 'customer_support'
        })
      });
      setSent(true);
      setForm({ subject: '', category: 'general', message: '' });
    } catch(e) { console.error(e); }
    finally { setSending(false); }
  };

  const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500";

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Support</h1>
                <p className="text-xs text-gray-400">Smarterlift Customer Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/customer/dashboard"
                className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" />Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Emergency Banner */}
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-900/40 rounded-lg flex items-center justify-center border border-red-700/40">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Elevator Emergency?</p>
                <p className="text-red-300 text-sm">Call us immediately — 24/7 emergency response</p>
              </div>
            </div>
            {profile.phone ? (
              <a href={'tel:' + profile.phone.replace(/\D/g, '')}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors flex-shrink-0">
                <Phone className="w-4 h-4" />{profile.phone}
              </a>
            ) : (
              <Link to="/customer/service-request"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors">
                <AlertCircle className="w-4 h-4" />Submit Emergency Request
              </Link>
            )}
          </div>
        </div>

        {/* Contact Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Phone,
              title: 'Call Us',
              sub: 'Mon–Fri 8am–6pm CT',
              value: profile.phone || 'Contact your service rep',
              action: profile.phone ? () => window.location.href = 'tel:' + profile.phone.replace(/\D/g, '') : null,
              color: 'text-green-400',
              bg: 'bg-green-900/10 border-green-700/30',
            },
            {
              icon: Mail,
              title: 'Email Us',
              sub: 'Response within 24 hours',
              value: profile.email || 'derald@swcabs.com',
              action: () => window.location.href = 'mailto:' + (profile.email || 'derald@swcabs.com'),
              color: 'text-blue-400',
              bg: 'bg-blue-900/10 border-blue-700/30',
            },
            {
              icon: MessageSquare,
              title: 'Submit Ticket',
              sub: 'Track your request online',
              value: 'Use the form below',
              action: null,
              color: 'text-purple-400',
              bg: 'bg-purple-900/10 border-purple-700/30',
            },
          ].map(({ icon: Icon, title, sub, value, action, color, bg }) => (
            <button key={title} onClick={action || undefined}
              className={`p-5 rounded-xl border text-left transition-all ${bg} ${action ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}>
              <Icon className={`w-6 h-6 ${color} mb-3`} />
              <p className="text-white font-semibold mb-1">{title}</p>
              <p className="text-gray-500 text-xs mb-2">{sub}</p>
              <p className={`text-sm font-medium ${color}`}>{value}</p>
            </button>
          ))}
        </div>

        {/* Submit Support Ticket */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-white font-bold text-lg mb-5">Submit a Support Request</h2>
          {sent ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-white font-semibold text-lg">Request Submitted</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">We will be in touch within 24 hours</p>
              <button onClick={() => setSent(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                Submit Another Request
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5">Subject *</label>
                  <input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))}
                    placeholder="Brief description of your issue" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} className={inputCls}>
                    <option value="general">General Inquiry</option>
                    <option value="billing">Billing Question</option>
                    <option value="technical">Technical Issue</option>
                    <option value="scheduling">Scheduling</option>
                    <option value="complaint">Complaint</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-gray-400 text-xs font-medium uppercase tracking-wide mb-1.5">Message *</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))}
                    placeholder="Describe your issue or question in detail..." rows={5}
                    className={inputCls + " resize-none"} />
                </div>
              </div>
              <button onClick={submitRequest} disabled={sending || !form.subject || !form.message}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                <Send className="w-4 h-4" />
                {sending ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          )}
        </div>

        {/* Recent Tickets */}
        {tickets.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-white font-bold text-lg mb-5">Recent Requests</h2>
            <div className="space-y-3">
              {tickets.map(t => {
                const statusConfig = {
                  open: { color: 'text-amber-400 bg-amber-900/20 border-amber-700/30', icon: Clock },
                  in_progress: { color: 'text-blue-400 bg-blue-900/20 border-blue-700/30', icon: Clock },
                  completed: { color: 'text-green-400 bg-green-900/20 border-green-700/30', icon: CheckCircle },
                };
                const sc = statusConfig[t.status] || statusConfig.open;
                const StatusIcon = sc.icon;
                return (
                  <div key={t.id} className="flex items-center gap-4 p-3 bg-gray-700/40 rounded-xl border border-gray-600">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{t.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{t.ticket_number} · {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 flex-shrink-0 ${sc.color}`}>
                      <StatusIcon className="w-3 h-3" />{t.status?.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-white font-bold text-lg mb-5">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-700 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/50 transition-colors">
                  <span className="text-white font-medium text-sm pr-4">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 border-t border-gray-700 bg-gray-700/20">
                    <p className="text-gray-300 text-sm leading-relaxed pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Support;
