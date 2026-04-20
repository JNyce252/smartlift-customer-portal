import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Search, Users, BarChart2, MapPin,
  ClipboardList, FileText, Building2, Settings, LogOut,
  Shield, Zap, ChevronDown, ChevronRight
} from 'lucide-react';

const NAV_CONFIG = {
  owner: [
    { label: 'Dashboard',         path: '/internal/dashboard',   icon: LayoutDashboard },
    { label: 'Building Registry', path: '/internal/tdlr',        icon: Shield },
    { label: 'Lead Search',       path: '/internal/leads',       icon: Search },
    { label: 'Pipeline',          path: '/internal/pipeline',    icon: Zap },
    { label: 'Customers',         path: '/internal/customers',   icon: Users },
    { label: 'Work Orders',       path: '/internal/work-orders', icon: ClipboardList },
    { label: 'Route Optimizer',   path: '/internal/routes',      icon: MapPin },
    { label: 'Proposals',         path: '/internal/proposals',   icon: FileText },
    { label: 'Analytics',         path: '/internal/analytics',   icon: BarChart2 },
    { label: 'Team',              path: '/internal/team',        icon: Building2 },
    { label: 'Company Profile',   path: '/internal/profile',     icon: Settings },
  ],
  sales: [
    { label: 'Dashboard',         path: '/internal/dashboard',   icon: LayoutDashboard },
    { label: 'Building Registry', path: '/internal/tdlr',        icon: Shield },
    { label: 'Lead Search',       path: '/internal/leads',       icon: Search },
    { label: 'Pipeline',          path: '/internal/pipeline',    icon: Zap },
    { label: 'Customers',         path: '/internal/customers',   icon: Users },
    { label: 'Work Orders',       path: '/internal/work-orders', icon: ClipboardList },
    { label: 'Proposals',         path: '/internal/proposals',   icon: FileText },
    { label: 'Analytics',         path: '/internal/analytics',   icon: BarChart2 },
  ],
  technician: [
    { label: 'My Work Orders',    path: '/internal/work-orders', icon: ClipboardList },
    { label: 'Route Optimizer',   path: '/internal/routes',      icon: MapPin },
    { label: 'Customers',         path: '/internal/customers',   icon: Users },
  ],
  staff: [
    { label: 'Dashboard',         path: '/internal/dashboard',   icon: LayoutDashboard },
    { label: 'Customers',         path: '/internal/customers',   icon: Users },
    { label: 'Work Orders',       path: '/internal/work-orders', icon: ClipboardList },
  ],
};

const ROLE_LABELS = {
  owner:      'Owner',
  sales:      'Sales & Office',
  technician: 'Technician',
  staff:      'Staff',
};

const RoleNav = () => {
  const { logout, userRole, displayName } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = NAV_CONFIG[userRole] || NAV_CONFIG.staff;
  const roleLabel = ROLE_LABELS[userRole] || 'Staff';

  const roleColor = {
    owner:      { bg: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: 'rgba(124,58,237,0.3)' },
    sales:      { bg: 'rgba(29,78,216,0.15)',  color: '#93c5fd', border: 'rgba(29,78,216,0.3)' },
    technician: { bg: 'rgba(180,83,9,0.15)',   color: '#fbbf24', border: 'rgba(180,83,9,0.3)'  },
    staff:      { bg: 'rgba(107,114,128,0.15)',color: '#9ca3af', border: 'rgba(107,114,128,0.3)'},
  }[userRole] || { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)' };

  return (
    <aside style={{
      width: collapsed ? '64px' : '220px',
      minHeight: '100vh',
      background: '#0f0a1e',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
    }}>

      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={16} color="#fff" />
          </div>
          {!collapsed && (
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              Smarterlift
            </span>
          )}
        </div>
      </div>

      {/* User info */}
      {!collapsed && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </p>
          <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '100px', border: '1px solid', display: 'inline-block', background: roleColor.bg, color: roleColor.color, borderColor: roleColor.border }}>
            {roleLabel}
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {navItems.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path || location.pathname.startsWith(path + '/');
          return (
            <Link key={path} to={path}
              title={collapsed ? label : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: `1px solid ${active ? 'rgba(124,58,237,0.3)' : 'transparent'}`,
                color: active ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                textDecoration: 'none', fontSize: '13px', fontWeight: active ? '600' : '400',
                transition: 'all 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap', overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '10px', padding: '9px 12px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '13px', marginBottom: '2px' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronDown size={16} />{!collapsed && <span>Collapse</span>}</>}
        </button>
        <button
          onClick={logout}
          title={collapsed ? 'Sign Out' : ''}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: '10px', padding: '9px 12px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '13px' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default RoleNav;
