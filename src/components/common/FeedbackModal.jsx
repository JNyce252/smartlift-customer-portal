// FeedbackModal — single-purpose dialog for submitting feedback to the platform.
//
// Used in both the management portal (UserMenu) and the customer portal (Support page).
// Sends to POST /me/feedback which persists to platform_feedback and emails Jeremy.
// Captures page_url automatically. Caller controls open/close via `open` + `onClose`.

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Lightbulb, AlertTriangle, HelpCircle, Send, Check } from 'lucide-react';
import { api } from '../../services/api';

const TYPES = [
  { value: 'feature_request', label: 'Feature request', icon: Lightbulb,     desc: 'Something you wish the product did' },
  { value: 'system_issue',    label: 'Bug / issue',     icon: AlertTriangle, desc: 'Something is broken or behaving wrong' },
  { value: 'question',        label: 'Question',        icon: HelpCircle,    desc: 'You\'re not sure how something works' },
  { value: 'feedback',        label: 'General feedback', icon: MessageSquare, desc: 'Anything else on your mind' },
];

const FeedbackModal = ({ open, onClose, defaultType = 'feedback' }) => {
  const [type, setType] = useState(defaultType);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Reset whenever the modal is reopened — never leak state from a prior session.
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setSubject('');
      setBody('');
      setPriority('medium');
      setSent(false);
      setError(null);
    }
  }, [open, defaultType]);

  if (!open) return null;

  const submit = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please add both a subject and a description.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitFeedback({ type, subject: subject.trim(), body: body.trim(), priority });
      setSent(true);
      // Auto-close after a beat so user sees the confirmation.
      setTimeout(() => { onClose && onClose(); }, 1500);
    } catch (e) {
      setError(e.message || 'Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <h2 className="text-white font-semibold">Send feedback</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-emerald-900/40 border border-emerald-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-white font-medium mb-1">Got it — thanks.</p>
            <p className="text-gray-400 text-sm">Jeremy will see this immediately.</p>
          </div>
        ) : (
          <div className="p-5">
            {/* Type selector — radio cards */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {TYPES.map(t => {
                const Icon = t.icon;
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`text-left p-2.5 rounded-lg border transition-colors ${
                      active ? 'bg-purple-900/30 border-purple-700/60' : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-purple-300' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-200'}`}>{t.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-tight">{t.desc}</p>
                  </button>
                );
              })}
            </div>

            <label className="block text-xs text-gray-400 mb-3">
              Subject
              <input
                value={subject}
                onChange={e => setSubject(e.target.value.slice(0, 200))}
                placeholder="One-line summary"
                className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-purple-500"
                autoFocus
              />
            </label>

            <label className="block text-xs text-gray-400 mb-3">
              Description
              <textarea
                value={body}
                onChange={e => setBody(e.target.value.slice(0, 8000))}
                rows={5}
                placeholder={
                  type === 'system_issue'
                    ? 'What did you do? What happened? What did you expect?'
                    : type === 'feature_request'
                    ? 'What problem would this solve? Who benefits?'
                    : 'Tell us more…'
                }
                className="mt-1 w-full bg-gray-950 border border-gray-700 text-gray-200 text-sm px-3 py-2 rounded focus:outline-none focus:border-purple-500 resize-y"
              />
              <span className="text-[10px] text-gray-600 float-right mt-1">{body.length} / 8000</span>
            </label>

            <label className="block text-xs text-gray-400 mb-4">
              Priority
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2 rounded focus:outline-none focus:border-purple-500"
              >
                <option value="low">Low — nice to have</option>
                <option value="medium">Medium — standard</option>
                <option value="high">High — affects my work</option>
                <option value="urgent">Urgent — blocking me</option>
              </select>
            </label>

            {error && (
              <div className="mb-3 bg-red-900/20 border border-red-700/40 rounded-lg p-2.5 text-red-300 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || !subject.trim() || !body.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
