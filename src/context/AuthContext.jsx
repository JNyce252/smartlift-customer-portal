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
      if (currentUser) {
        // Re-fetch role on every page refresh — token may have new groups
        const profile = await fetch(
          import.meta.env.VITE_API_BASE_URL + '/me',
          { headers: { Authorization: 'Bearer ' + currentUser.token } }
        ).then(r => r.ok ? r.json() : null).catch(() => null);
        setUser({
          ...currentUser,
          role: profile?.role || currentUser.role || 'staff',
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

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch(
        import.meta.env.VITE_API_BASE_URL + '/me',
        { headers: { Authorization: 'Bearer ' + token } }
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
      const profile = await fetchUserProfile(userData.token);
      const enriched = {
        ...userData,
        role: profile?.role || userData.role || 'staff',
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

  const value = {
    user, loading, error, login, register, logout, getToken,
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
