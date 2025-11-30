// src/lib/AuthContext.jsx
// E&T Manager - ORIGINAL WORKING VERSION from Nov 29
// This version was confirmed working - Dashboard, Clients, Users all loaded

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
        
        console.log('2. Session result:', session?.user?.email, error);
        
        if (session?.user && mounted) {
          setUser(session.user);
          
          console.log('3. Loading profile for:', session.user.id);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          console.log('4. Profile result:', data, error);
          
          if (data && mounted) {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        if (mounted) {
          console.log('5. Done loading');
          setLoading(false);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Load profile after sign in
    if (data.user) {
      setUser(data.user);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (profileData) setProfile(profileData);
    }
    
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  // Add the helper properties that TraineesPage needs
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
    // Added for TraineesPage
    isSuperAdmin,
    isClientAdmin,
    isTrainee,
    clientId,
    clientName: null, // We'll fetch this in the page if needed
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
