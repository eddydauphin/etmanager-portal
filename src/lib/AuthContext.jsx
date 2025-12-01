// src/lib/AuthContext.jsx
// E&T Manager - AuthContext with direct fetch for profile
// FIXED: Uses session access_token for RLS compatibility

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Direct fetch profile using REST API with user's access token
async function fetchProfileDirect(userId, accessToken) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  try {
    console.log('Fetching profile for:', userId);
    
    const response = await fetch(
      `${url}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${accessToken}`,  // Use session token, not anon key
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Profile fetch failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      console.log('Profile loaded:', data[0].email, data[0].role);
      return data[0];
    }
    
    console.log('No profile found');
    return null;
  } catch (err) {
    console.error('Profile fetch error:', err);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    // Safety timeout - force loading to false after 5 seconds
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.log('Auth timeout - forcing load complete');
        setLoading(false);
      }
    }, 5000);

    async function init() {
      try {
        console.log('1. Starting auth check...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
        }
        
        console.log('2. Session result:', session?.user?.email);
        
        if (session?.user && mounted) {
          setUser(session.user);
          setAccessToken(session.access_token);
          const profileData = await fetchProfileDirect(session.user.id, session.access_token);
          if (profileData && mounted) {
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        if (mounted) {
          console.log('3. Done loading');
          setLoading(false);
        }
      }
    }

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setAccessToken(session.access_token);
        const profileData = await fetchProfileDirect(session.user.id, session.access_token);
        if (profileData && mounted) {
          setProfile(profileData);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setAccessToken(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
        setAccessToken(session.access_token);
        if (!profile) {
          const profileData = await fetchProfileDirect(session.user.id, session.access_token);
          if (profileData && mounted) {
            setProfile(profileData);
          }
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setLoading(false);
        throw error;
      }
      
      if (data.user && data.session) {
        setUser(data.user);
        setAccessToken(data.session.access_token);
        const profileData = await fetchProfileDirect(data.user.id, data.session.access_token);
        if (profileData) {
          setProfile(profileData);
        }
      }
      
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setAccessToken(null);
      // Redirect to login page
      window.location.href = '/login';
    } catch (err) {
      console.error('Sign out error:', err);
      // Force clear state even if API fails
      setUser(null);
      setProfile(null);
      setAccessToken(null);
      window.location.href = '/login';
    }
  }

  // Helper properties
  const isSuperAdmin = profile?.role === 'super_admin';
  const isClientAdmin = profile?.role === 'client_admin';
  const isTrainee = profile?.role === 'trainee';
  const clientId = profile?.client_id || null;

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    role: profile?.role || null,
    isSuperAdmin,
    isClientAdmin,
    isTrainee,
    clientId,
    clientName: null,
    accessToken,  // Expose token for other components
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
