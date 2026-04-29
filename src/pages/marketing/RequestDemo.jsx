// RequestDemo — public marketing page at /demo. No auth required.
//
// Submits to POST /demo-requests which persists to platform DB + emails Jeremy.
// Lean form (name/email/company/phone + free-text). Honeypot field is hidden via
// CSS — bots fill every field they see, so any non-empty value silently
// short-circuits server-side.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Check, ShieldCheck, Zap, Building2 } from 'lucide-react';
import { api } from '../../services/api';

const RequestDemo = () => {
  const [form, setForm] = useState({
    name: '', email: '', company: '', phone: '', message: '',
    website_url: '', // honeypot — should always stay empty for real users
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please add your name and email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('That email doesn\'t look right.');
      return;
    }
    setSubmitting(true);
    try {
      await api.submitDemoRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        website_url: form.website_url, // honeypot passes through
      });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please email us at nyceguy@thegoldensignature.com.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 text-gray-100">
      {/* Sparse top bar */}
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Smarterlift</span>
        </Link>
        <Link to="/login" className="text-sm text-gray-400 hover:text-white">Already a customer? Sign in</Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pb-20 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          {/* Left column — pitch */}
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-1.5 bg-purple-900/30 border border-purple-700/40 rounded-full px-3 py-1 text-xs text-purple-200 mb-4">
              <Sparkles className="w-3 h-3" />
              <span>For elevator service companies</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              See Smarterlift in action.
            </h1>
            <p className="text-gray-300 text-base leading-relaxed mb-6">
              We'll walk you through the whole platform — lead-gen, AI-scored prospects, your customer portal, route optimization. Tell us a little about your business and we'll set up a 20-minute call this week.
            </p>

            <ul className="space-y-3 text-sm text-gray-300 mb-8">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>14-day free trial — full access, no credit card</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Built for Texas elevator service companies</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>White-glove onboarding from the founder</span>
              </li>
            </ul>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />SOC 2-aligned</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />24h response</span>
            </div>
          </div>

          {/* Right column — form */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              {sent ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-emerald-900/40 border border-emerald-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">We got it.</h2>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
                    Jeremy will personally reach out within 24 hours to set up your demo. In the meantime, feel free to reply to the confirmation email with anything else.
                  </p>
                  <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm">← Back to home</Link>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    Request a demo
                  </h2>
                  <p className="text-gray-500 text-sm mb-6">Takes about 30 seconds.</p>

                  {/* Honeypot — visually hidden field bots will fill. Real users
                      tabbing through the form won't see it because of position
                      offscreen. The aria-hidden + tabindex=-1 keep screen readers
                      and keyboard users from hitting it. */}
                  <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
                    <label>
                      Don't fill this in
                      <input
                        type="text"
                        name="website_url"
                        value={form.website_url}
                        onChange={update('website_url')}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <label className="block">
                      <span className="text-xs text-gray-400">Your name *</span>
                      <input
                        value={form.name}
                        onChange={update('name')}
                        placeholder="Jane Smith"
                        autoComplete="name"
                        className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-400">Work email *</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={update('email')}
                        placeholder="jane@elevatorco.com"
                        autoComplete="email"
                        className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <label className="block">
                      <span className="text-xs text-gray-400">Company</span>
                      <input
                        value={form.company}
                        onChange={update('company')}
                        placeholder="Acme Elevator Services"
                        autoComplete="organization"
                        className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-400">Phone</span>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={update('phone')}
                        placeholder="(214) 555-0100"
                        autoComplete="tel"
                        className="mt-1 w-full bg-gray-950 border border-gray-700 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-purple-500"
                      />
                    </label>
                  </div>

                  <label className="block mb-4">
                    <span className="text-xs text-gray-400">Tell us about your business <span className="text-gray-600">(optional)</span></span>
                    <textarea
                      value={form.message}
                      onChange={update('message')}
                      rows={4}
                      placeholder="How many elevators do you service? What cities? Any specific pain points you're hoping Smarterlift solves?"
                      className="mt-1 w-full bg-gray-950 border border-gray-700 text-gray-200 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-purple-500 resize-y"
                    />
                  </label>

                  {error && (
                    <div className="mb-3 bg-red-900/20 border border-red-700/40 rounded-lg p-3 text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {submitting ? 'Sending…' : <>Request demo <ArrowRight className="w-4 h-4" /></>}
                  </button>

                  <p className="text-[11px] text-gray-600 text-center mt-3">
                    By submitting, you agree to be contacted by The Golden Signature about Smarterlift.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-900 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 flex items-center justify-between text-xs text-gray-600">
          <span>© 2026 The Golden Signature LLC</span>
          <a href="https://thegoldensignature.com" target="_blank" rel="noreferrer" className="hover:text-gray-400">thegoldensignature.com</a>
        </div>
      </footer>
    </div>
  );
};

export default RequestDemo;
