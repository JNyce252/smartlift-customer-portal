#!/bin/bash

echo "Creating all missing files..."

# AuthContext
cat > src/context/AuthContext.jsx << 'EOF'
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const userData = await authService.login(email, password);
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, userType, additionalData) => {
    try {
      setError(null);
      setLoading(true);
      const userData = await authService.register(email, password, userType, additionalData);
      setUser(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const value = {
    user, loading, error, login, register, logout,
    isAuthenticated: !!user,
    isCompanyUser: user?.role === 'company',
    isCustomer: user?.role === 'customer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
EOF

# authService
cat > src/services/authService.js << 'EOF'
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const AUTH_STORAGE_KEY = 'smartlift_auth';
const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
};
const userPool = new CognitoUserPool(poolData);

class AuthService {
  async login(email, password) {
    return new Promise((resolve, reject) => {
      const authenticationData = { Username: email, Password: password };
      const authenticationDetails = new AuthenticationDetails(authenticationData);
      const userData = { Username: email, Pool: userPool };
      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          const payload = result.getIdToken().payload;
          const groups = payload['cognito:groups'] || [];
          let role = groups.includes('CompanyUsers') ? 'company' : 'customer';
          const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || email.split('@')[0],
            role, groups,
            token: result.getAccessToken().getJwtToken(),
            idToken: result.getIdToken().getJwtToken(),
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          resolve(user);
        },
        onFailure: (err) => reject(new Error(err.message || 'Login failed')),
        newPasswordRequired: () => reject(new Error('Password change required')),
      });
    });
  }

  async register(email, password, userType, additionalData = {}) {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: additionalData.name || '' }),
      ];
      userPool.signUp(email, password, attributeList, null, (err) => {
        if (err) {
          reject(new Error(err.message));
          return;
        }
        this.login(email, password).then(resolve).catch(reject);
      });
    });
  }

  async logout() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  async getCurrentUser() {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) { resolve(null); return; }
      cognitoUser.getSession((err, session) => {
        if (err || !session.isValid()) { resolve(null); return; }
        cognitoUser.getUserAttributes((err) => {
          if (err) { resolve(null); return; }
          const payload = session.getIdToken().payload;
          const groups = payload['cognito:groups'] || [];
          let role = groups.includes('CompanyUsers') ? 'company' : 'customer';
          const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            role, groups,
            token: session.getAccessToken().getJwtToken(),
            idToken: session.getIdToken().getJwtToken(),
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          resolve(user);
        });
      });
    });
  }

  getToken() {
    const userStr = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr)?.token;
  }
}

export const authService = new AuthService();
EOF

# PrivateRoute
cat > src/components/common/PrivateRoute.jsx << 'EOF'
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><LoadingSpinner size="large" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    const redirectPath = user?.role === 'company' ? '/internal/dashboard' : '/customer/dashboard';
    return <Navigate to={redirectPath} replace />;
  }
  return children;
};

export default PrivateRoute;
EOF

# LoadingSpinner
cat > src/components/common/LoadingSpinner.jsx << 'EOF'
import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = '' }) => {
  const sizeClasses = { small: 'w-6 h-6 border-2', medium: 'w-10 h-10 border-3', large: 'w-16 h-16 border-4' };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`} />
      {text && <p className="text-gray-400 text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
EOF

# Login
cat > src/pages/auth/Login.jsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
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
      navigate(userData.role === 'company' ? '/internal/dashboard' : '/customer/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (type) => {
    const creds = {
      company: { email: 'company@smartlift.com', password: 'SmartLift2025!' },
      customer: { email: 'customer@example.com', password: 'SmartLift2025!' },
    };
    setFormData(creds[type]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-12 h-12 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">SmartLift</h1>
          </div>
          <p className="text-gray-400">Intelligent Elevator Service Management</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} required
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input type="password" name="password" value={formData.password} onChange={handleChange} required
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800 text-gray-400">Demo Quick Access</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => quickLogin('company')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg">Company Login</button>
              <button onClick={() => quickLogin('customer')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg">Customer Login</button>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">Sign up</Link></p>
          </div>
        </div>
        <p className="mt-8 text-center text-gray-500 text-sm">© 2025 SmartLift UI. All rights reserved.</p>
      </div>
    </div>
  );
};

export default Login;
EOF

echo "✅ All files created!"
