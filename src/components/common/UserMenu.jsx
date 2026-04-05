import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, LogOut, AlertTriangle, CheckCircle, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const UserMenu = ({ companyName }) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState('support');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSent, setSupportSent] = useState(false);

  useEffect(() => {
    const handleClick = () => setUserMenuOpen(false);
    if (userMenuOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [userMenuOpen]);

  const submitSupport = async () => {
    if (!supportMessage.trim()) return;
    setSupportSubmitting(true);
    try {
      await fetch('https://aup3wz6azh.execute-api.us-east-1.amazonaws.com/prod/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user?.name || 'Customer',
          email: user?.email,
          type: supportType,
          message: `[${supportType.toUpperCase()}] From: ${user?.name} (${user?.email})\n\n${supportMessage}`,
          subject: `Smarterlift ${supportType === 'support' ? 'Support Request' : supportType === 'feature' ? 'Feature Request' : supportType === 'billing' ? 'Billing Question' : 'Feedback'} — ${user?.name}`
        })
      });
      setSupportSent(true);
    } catch {
      setSupportSent(true);
    }
    setSupportSubmitting(false);
  };

  return (
    <>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-3 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-white leading-tight">{user?.name || 'Staff'}</p>
            <p className="text-xs text-gray-400 leading-tight">{companyName || user?.email}</p>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 top-14 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-white font-medium text-sm">{user?.name || 'Staff'}</p>
              <p className="text-gray-400 text-xs">{user?.email}</p>
            </div>
            <div className="py-1">
              <Link to="/internal/profile" onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm">
                <Settings className="w-4 h-4" />Company Profile
              </Link>
              <button onClick={() => { setShowSupportModal(true); setUserMenuOpen(false); setSupportSent(false); setSupportMessage(''); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm">
                <AlertTriangle className="w-4 h-4" />Support & Feedback
              </button>
              <div className="border-t border-gray-700 mt-1 pt-1">
                <button onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors text-sm">
                  <LogOut className="w-4 h-4" />Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowSupportModal(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Support & Feedback</h2>
                <p className="text-gray-400 text-sm mt-0.5">Our team responds within 24 hours</p>
              </div>
              <button onClick={() => setShowSupportModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {supportSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Message Received</h3>
                <p className="text-gray-400 text-sm">Our customer success team will follow up with you within 24 hours.</p>
                <button onClick={() => setShowSupportModal(false)} className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">Close</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { value: 'support', label: '🛠 Technical Support', sub: "Something isn't working" },
                    { value: 'feature', label: '💡 Feature Request', sub: 'Suggest an improvement' },
                    { value: 'billing', label: '💳 Billing Question', sub: 'Account or payment inquiry' },
                    { value: 'other', label: '💬 General Feedback', sub: 'Share your thoughts' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setSupportType(opt.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${supportType === opt.value ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}`}>
                      <p className="text-white text-sm font-medium">{opt.label}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{opt.sub}</p>
                    </button>
                  ))}
                </div>
                <textarea
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                  placeholder={
                    supportType === 'support' ? 'Describe the issue — what happened and what you expected...' :
                    supportType === 'feature' ? 'Describe the feature and how it would help your workflow...' :
                    supportType === 'billing' ? 'Describe your billing question or concern...' :
                    'Share your feedback or thoughts...'
                  }
                  rows={5}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 resize-none mb-4"
                />
                <button onClick={submitSupport}
                  disabled={!supportMessage.trim() || supportSubmitting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium text-sm">
                  {supportSubmitting ? 'Sending...' : 'Submit'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UserMenu;
