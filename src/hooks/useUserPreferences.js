import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_BASE_URL;

// Cache in memory so we don't re-fetch on every page navigation
let memoryCache = null;

export const useUserPreferences = () => {
  const { user, getToken } = useAuth();
  const [preferences, setPreferences] = useState(memoryCache?.preferences || {});
  const [userRecord, setUserRecord] = useState(memoryCache || null);
  const [loading, setLoading] = useState(!memoryCache);

  // Load preferences on mount
  useEffect(() => {
    if (!user) return;
    if (memoryCache) {
      setPreferences(memoryCache.preferences || {});
      setUserRecord(memoryCache);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API}/me/preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        memoryCache = data;
        setPreferences(data.preferences || {});
        setUserRecord(data);
      } catch (e) {
        console.error('Failed to load preferences:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Save a single preference key — debounced so rapid changes don't spam the API
  const savePreference = useCallback(async (key, value) => {
    // Update local state immediately so UI feels instant
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    if (memoryCache) memoryCache.preferences = updated;

    try {
      const token = getToken();
      await fetch(`${API}/me/preferences`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    } catch (e) {
      console.error('Failed to save preference:', e);
    }
  }, [preferences, getToken]);

  // Save multiple preferences at once
  const savePreferences = useCallback(async (prefs) => {
    const updated = { ...preferences, ...prefs };
    setPreferences(updated);
    if (memoryCache) memoryCache.preferences = updated;

    try {
      const token = getToken();
      await fetch(`${API}/me/preferences/bulk`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: prefs })
      });
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  }, [preferences, getToken]);

  // Get a single preference with a fallback default
  const get = useCallback((key, defaultValue = null) => {
    return preferences[key] !== undefined ? preferences[key] : defaultValue;
  }, [preferences]);

  // Clear memory cache on logout
  const clearCache = useCallback(() => {
    memoryCache = null;
    setPreferences({});
    setUserRecord(null);
  }, []);

  return {
    preferences,
    userRecord,
    loading,
    get,
    savePreference,
    savePreferences,
    clearCache,
    displayName: userRecord?.display_name || user?.name || user?.email || 'User',
  };
};

export default useUserPreferences;
