// AdminLayout — shared chrome for the platform admin console.
// Renders a sticky top nav with three tabs (Dashboard / Tenants / Activity)
// plus a Sign Out button. The auth guard lives in <PrivateRoute requiredRole="super_admin">.

import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShieldCheck, BarChart3, Building2, Activity, LogOut, Sparkles, Wrench, MessageSquare, Rocket } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Order matters — keep Dashboard first (the founder lands here), then funnel
// (Demos), then ops queues (Tickets, Feedback) before deeper drill-downs.
const navTabs = [
  { to: '/admin/dashboard',         label: 'Dashboard',  icon: BarChart3 },
  { to: '/admin/demo-requests',     label: 'Demos',      icon: Rocket },
  { to: '/admin/service-requests',  label: 'Tickets',    icon: Wrench },
  { to: '/admin/feedback',          label: 'Feedback',   icon: MessageSquare },
  { to: '/admin/tenants',           label: 'Tenants',    icon: Building2 },
  { to: '/admin/activity',          label: 'Activity',   icon: Activity },
];

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold flex items-center gap-1.5">
                  Smarterlift Admin
                  <Sparkles className="w-3 h-3 text-purple-400" />
                </div>
                <div className="text-[11px] text-gray-500">Platform owner console</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navTabs.map(t => {
                const Icon = t.icon;
                return (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    className={({ isActive }) =>
                      'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ' +
                      (isActive ? 'bg-purple-900/40 text-purple-200 border border-purple-700/40' : 'text-gray-400 hover:text-white hover:bg-gray-800')
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />{t.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-gray-500">{user?.email}</span>
              <button onClick={logout} className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5">
                <LogOut className="w-4 h-4" />Sign Out
              </button>
            </div>
          </div>

          {/* Mobile nav (below 768px) */}
          <nav className="md:hidden flex items-center gap-1 -mb-px overflow-x-auto pb-1">
            {navTabs.map(t => {
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) =>
                    'px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors flex-shrink-0 ' +
                    (isActive ? 'bg-purple-900/40 text-purple-200' : 'text-gray-500 hover:text-white')
                  }
                >
                  <Icon className="w-3 h-3" />{t.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
