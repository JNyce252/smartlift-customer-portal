import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import FeedbackModal from './FeedbackModal';

// Top-right user menu for the management portal. The "Send feedback" entry
// opens the platform-tracked feedback modal (POST /me/feedback) which both
// stores in platform_feedback and emails Jeremy via SES — same flow used by
// the customer portal Support page so all feedback lands in /admin/feedback.
const UserMenu = ({ companyName }) => {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const handleClick = () => setUserMenuOpen(false);
    if (userMenuOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [userMenuOpen]);

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
              <button onClick={() => { setFeedbackOpen(true); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm">
                <MessageSquare className="w-4 h-4" />Send feedback
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

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
};

export default UserMenu;
