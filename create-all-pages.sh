#!/bin/bash

echo "📄 Creating Register page..."
cat > src/pages/auth/Register.jsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail, Lock, User, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [userType, setUserType] = useState('customer');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', companyName: '', phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const additionalData = { name: formData.name, companyName: formData.companyName, phone: formData.phone };
      await register(formData.email, formData.password, userType, additionalData);
      const redirectPath = userType === 'company' ? '/internal/dashboard' : '/customer/dashboard';
      navigate(redirectPath);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-12 h-12 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">SmartLift</h1>
          </div>
          <p className="text-gray-400">Create your account</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Sign Up</h2>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setUserType('customer')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${userType === 'customer' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              Customer
            </button>
            <button type="button" onClick={() => setUserType('company')}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${userType === 'company' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              Company
            </button>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="John Doe" required />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="you@example.com" required />
              </div>
            </div>
            {userType === 'customer' && (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Acme Hotel Group" required />
                </div>
              </div>
            )}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••" required />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-gray-500 text-sm">© 2025 SmartLift UI. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Register;
EOF

echo "📊 Creating Internal Dashboard..."
# Already created in previous output - copying from smartlift-ui folder

echo "📄 Creating placeholder pages..."
for page in LeadSearch ProspectDetails RouteOptimizer; do
cat > src/pages/internal/$page.jsx << EOF
import React from 'react';

const $page = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-2">$page</h2>
          <p className="text-gray-400">Coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default $page;
EOF
done

for page in ServiceRequest MaintenanceHistory BillingPayments; do
cat > src/pages/customer/$page.jsx << EOF
import React from 'react';

const $page = () => {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-2">$page</h2>
          <p className="text-gray-400">Coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default $page;
EOF
done

echo "✅ All pages created!"
