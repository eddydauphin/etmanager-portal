// src/lib/AuthContext.jsx
// E&T Manager - Fixed AuthContext with proper profile loading

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from database
  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Profile fetch error:', error);
        return null;
      }
      
      console.log('Profile loaded:', data?.email, data?.role);
      return data;
    } catch (err) {
      console.error('Profile fetch exception:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Safety timeout - force loading to false after 8 seconds
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.log('Auth timeout - forcing load complete');
        setLoading(false);
      }
    }, 8000);

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
          const profileData = await fetchProfile(session.user.id);
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
        const profileData = await fetchProfile(session.user.id);
        if (profileData && mounted) {
          setProfile(profileData);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Refresh profile on token refresh
        setUser(session.user);
        if (!profile) {
          const profileData = await fetchProfile(session.user.id);
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
      
      // Load profile after sign in
      if (data.user) {
        setUser(data.user);
        const profileData = await fetchProfile(data.user.id);
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
    } catch (err) {
      console.error('Sign out error:', err);
      // Force clear state even if API fails
      setUser(null);
      setProfile(null);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
