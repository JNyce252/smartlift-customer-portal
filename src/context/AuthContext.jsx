import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};


// Decode role directly from Cognito idToken — no API call needed
const getRoleFromToken = (idToken) => {
  try {
    if (!idToken || typeof idToken !== 'string' || !idToken.includes('.')) return 'staff';
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    const groups = payload['cognito:groups'] || [];
    const g = Array.isArray(groups) ? groups : String(groups).split(',').map(s => s.trim());
    if (g.includes('Owners')) return 'owner';
    if (g.includes('Technicians')) return 'technician';
    if (g.includes('SalesOffice')) return 'sales';
    if (g.includes('CompanyUsers')) return 'staff';
    if (g.includes('Customers')) return 'customer';
    return 'staff';
  } catch { return 'staff'; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        // Re-fetch profile on every page refresh — preferences/displayName may change.
        // Always send the idToken (carries cognito:groups + email — used by the
        // Lambda's getCompanyId/getUserRole). The access token does not.
        const profile = await fetch(
          process.env.REACT_APP_API_BASE_URL + '/me',
          { headers: { Authorization: 'Bearer ' + (currentUser.idToken || currentUser.token) } }
        ).then(r => r.ok ? r.json() : null).catch(() => null);
        // Decode role directly from stored idToken
        const roleFromToken = getRoleFromToken(currentUser.idToken || currentUser.token);
        setUser({
          ...currentUser,
          role: roleFromToken,
          displayName: profile?.display_name || currentUser.name || currentUser.email,
          preferences: profile?.preferences || {},
          dbProfile: profile || null,
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (idToken) => {
    try {
      const res = await fetch(
        process.env.REACT_APP_API_BASE_URL + '/me',
        { headers: { Authorization: 'Bearer ' + idToken } }
      );
      if (res.ok) {
        const profile = await res.json();
        return profile;
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
    return null;
  };

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const userData = await authService.login(email, password);
      // Fetch role and preferences from /me
      // Decode role directly from idToken — fast and reliable
      const roleFromToken = getRoleFromToken(userData.idToken || userData.token);
      // Also fetch preferences from /me — send ID token so Lambda can decode groups/email.
      const profile = await fetchUserProfile(userData.idToken || userData.token);
      const enriched = {
        ...userData,
        role: roleFromToken,
        displayName: profile?.display_name || userData.name || email,
        preferences: profile?.preferences || {},
        dbProfile: profile || null,
      };
      setUser(enriched);
      return enriched;
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

  const getToken = () => authService.getToken();
  // getIdToken returns the ID token which contains cognito:groups for role detection.
  // Single source of truth lives in authService — do not re-read localStorage here.
  const getIdToken = () => authService.getIdToken();

  const value = {
    user, loading, error, login, register, logout, getToken, getIdToken,
    isAuthenticated: !!user,
    isCompanyUser: ['owner','technician','sales','staff'].includes(user?.role),
    isCustomer: user?.role === 'customer',
    // Role helpers — use these throughout the app
    isOwner: user?.role === 'owner',
    isTechnician: user?.role === 'technician',
    isSales: user?.role === 'sales',
    userRole: user?.role || 'staff',
    displayName: user?.displayName || user?.name || user?.email || 'User',
    preferences: user?.preferences || {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
