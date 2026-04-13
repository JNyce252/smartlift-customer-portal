import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Wrench, AlertCircle, Calendar, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';

const typeConfig = {
  emergency: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30', dot: 'bg-red-400' },
  service_request: { icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-700/30', dot: 'bg-blue-400' },
  maintenance: { icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-700/30', dot: 'bg-amber-400' },
  invoice: { icon: FileText, color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30', dot: 'bg-green-400' },
  default: { icon: Bell, color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-700/30', dot: 'bg-purple-400' },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('smartlift_token')
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(BASE_URL + '/notifications', { headers });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch(e) {}
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch(BASE_URL + '/notifications/read-all', { method: 'PATCH', headers });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch(e) {}
  };

  const markRead = async (id) => {
    try {
      await fetch(BASE_URL + '/notifications/' + id + '/read', { method: 'PATCH', headers });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch(e) {}
  };

  const handleClick = async (notif) => {
    if (!notif.read) await markRead(notif.id);
    setOpen(false);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: 8, borderRadius: 8,
          color: open ? '#A78BFA' : '#9CA3AF',
          transition: 'color 0.2s'
        }}>
        <Bell size={20} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: unread > 9 ? 18 : 16, height: unread > 9 ? 18 : 16,
            borderRadius: '50%', background: '#EF4444',
            color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #1F2937'
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 8,
          width: 380, maxHeight: 520,
          background: '#111827', border: '1px solid #374151',
          borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 1000, overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #1F2937',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#0F172A'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} color="#A78BFA" />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Notifications</span>
              {unread > 0 && (
                <span style={{
                  padding: '2px 8px', borderRadius: 100,
                  background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)',
                  color: '#A78BFA', fontSize: 11, fontWeight: 700
                }}>{unread} new</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6B7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <CheckCheck size={14} />Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280'
              }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Bell size={32} color="#374151" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>No notifications yet</p>
                <p style={{ color: '#4B5563', fontSize: 12, marginTop: 4 }}>New service requests will appear here</p>
              </div>
            ) : (
              notifications.map(notif => {
                const config = typeConfig[notif.type] || typeConfig.default;
                const Icon = config.icon;
                return (
                  <div key={notif.id}
                    onClick={() => handleClick(notif)}
                    style={{
                      padding: '14px 20px', cursor: 'pointer',
                      borderBottom: '1px solid #1F2937',
                      background: notif.read ? 'transparent' : 'rgba(167,139,250,0.04)',
                      transition: 'background 0.2s',
                      display: 'flex', gap: 12, alignItems: 'flex-start'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1F2937'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(167,139,250,0.04)'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: notif.type === 'emergency' ? 'rgba(239,68,68,0.15)' :
                                  notif.type === 'service_request' ? 'rgba(59,130,246,0.15)' :
                                  notif.type === 'maintenance' ? 'rgba(251,191,36,0.15)' :
                                  'rgba(167,139,250,0.15)',
                      border: `1px solid ${notif.type === 'emergency' ? 'rgba(239,68,68,0.3)' :
                               notif.type === 'service_request' ? 'rgba(59,130,246,0.3)' :
                               notif.type === 'maintenance' ? 'rgba(251,191,36,0.3)' :
                               'rgba(167,139,250,0.3)'}`
                    }}>
                      <Icon size={16} color={
                        notif.type === 'emergency' ? '#F87171' :
                        notif.type === 'service_request' ? '#60A5FA' :
                        notif.type === 'maintenance' ? '#FCD34D' : '#A78BFA'
                      } />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{
                          color: notif.read ? '#D1D5DB' : '#fff',
                          fontSize: 13, fontWeight: notif.read ? 400 : 600,
                          margin: 0, lineHeight: 1.4
                        }}>{notif.title}</p>
                        {!notif.read && (
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#A78BFA', flexShrink: 0, marginTop: 4 }} />
                        )}
                      </div>
                      {notif.message && (
                        <p style={{ color: '#6B7280', fontSize: 12, margin: '3px 0 0', lineHeight: 1.4 }}>
                          {notif.message}
                        </p>
                      )}
                      <p style={{ color: '#4B5563', fontSize: 11, margin: '4px 0 0' }}>
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    {notif.link && <ChevronRight size={14} color="#4B5563" style={{ flexShrink: 0, marginTop: 4 }} />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #1F2937', background: '#0F172A', textAlign: 'center' }}>
              <button
                onClick={() => { setOpen(false); navigate('/internal/work-orders'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A78BFA', fontSize: 13, fontWeight: 600 }}>
                View All Work Orders →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
