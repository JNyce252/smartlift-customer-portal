import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight, Building2, TrendingUp, Shield, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STATS = [
  { value: '73,975', label: 'TX Elevators Tracked', icon: Building2 },
  { value: '14,230', label: 'Expired Certificates', icon: Shield },
  { value: '5,004', label: 'Expiring This Month', icon: TrendingUp },
];

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && user) {
      navigate(user.role === 'company' ? '/internal/dashboard' : '/customer/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(formData.email, formData.password);
      navigate(['owner','technician','sales','staff','company'].includes(userData.role) ? '/internal/dashboard' : '/customer/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#0a0a0f' }}>

      <div style={{ flex: '0 0 52%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0533 40%, #0d1f3c 100%)' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'linear-gradient(#7c3aed 1px, transparent 1px), linear-gradient(90deg, #7c3aed 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-40px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
              <Zap size={20} color="#fff" />
            </div>
            <span style={{ fontSize: '22px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px' }}>Smarterlift</span>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '100px', padding: '6px 14px', marginBottom: '28px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#a78bfa', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Live Building Registry</span>
          </div>

          <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#fff', lineHeight: '1.1', letterSpacing: '-1.5px', marginBottom: '20px' }}>
            Find your next<br />
            <span style={{ background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>elevator client</span><br />
            before they call.
          </h1>

          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', maxWidth: '380px', marginBottom: '48px' }}>
            AI-powered lead generation using real-time Texas compliance data. Know which buildings need service before anyone else does.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 18px', opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-20px)', transition: `opacity 0.5s ease ${i * 0.1 + 0.2}s, transform 0.5s ease ${i * 0.1 + 0.2}s` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color="#a78bfa" />
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>© 2026 The Golden Signature LLC · smarterlift.app</p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', background: '#0d0d14' }}>
        <div style={{ width: '100%', maxWidth: '400px', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s' }}>

          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px', marginBottom: '8px' }}>Welcome back</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Sign in to your Smarterlift account</p>
          </div>

          {error && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={16} color="#f87171" />
              <span style={{ fontSize: '13px', color: '#f87171' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="rgba(255,255,255,0.25)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@company.com"
                  style={{ width: '100%', padding: '12px 14px 12px 40px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="rgba(255,255,255,0.25)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 14px 12px 40px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: loading ? 'none' : '0 0 24px rgba(124,58,237,0.35)' }}>
              {loading ? (
                <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '28px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
            Not a customer yet?{' '}
            <a href="https://thegoldensignature.com" target="_blank" rel="noreferrer" style={{ color: '#a78bfa', fontWeight: '500', textDecoration: 'none' }}>Request a demo</a>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        input::placeholder { color: rgba(255,255,255,0.2); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
};

export default Login;
