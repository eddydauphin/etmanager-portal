// src/lib/AuthContext.jsx
// E&T Manager - Updated AuthContext with clientId, clientName, role helpers
// Date: November 30, 2025
// Fixed: Loading state properly managed in onAuthStateChange

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [clientName, setClientName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Fetch user profile from profiles table
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
  };

  // Fetch client name from clients table
  const fetchClientName = async (clientId) => {
    if (!clientId) return null;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();

      if (error) {
        console.error('Error fetching client:', error);
        return null;
      }

      return data?.name || null;
    } catch (err) {
      console.error('Exception fetching client:', err);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          setUser(session.user);
          
          const profileData = await fetchProfile(session.user.id);
          if (!isMounted) return;
          
          setProfile(profileData);
          setMustChangePassword(profileData?.must_change_password || false);
          
          // Fetch client name if user has a client_id
          if (profileData?.client_id) {
            const name = await fetchClientName(profileData.client_id);
            if (isMounted) setClientName(name);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (!isMounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          setLoading(true); // Set loading while we fetch profile
          setUser(session.user);
          
          try {
            const profileData = await fetchProfile(session.user.id);
            if (!isMounted) return;
            
            setProfile(profileData);
            setMustChangePassword(profileData?.must_change_password || false);
            
            // Fetch client name
            if (profileData?.client_id) {
              const name = await fetchClientName(profileData.client_id);
              if (isMounted) setClientName(name);
            } else {
              setClientName(null);
            }
          } catch (error) {
            console.error('Error fetching profile after sign in:', error);
          } finally {
            if (isMounted) setLoading(false); // IMPORTANT: Set loading false when done
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setClientName(null);
          setMustChangePassword(false);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed, no need to reload profile
          console.log('Token refreshed');
        } else if (event === 'INITIAL_SESSION') {
          // Initial session is handled by initAuth above
          // But if we get here and loading is still true, set it to false
          if (isMounted && !session) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setClientName(null);
      setMustChangePassword(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (user?.id) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      setMustChangePassword(profileData?.must_change_password || false);
      
      if (profileData?.client_id) {
        const name = await fetchClientName(profileData.client_id);
        setClientName(name);
      } else {
        setClientName(null);
      }
    }
  };

  // Compute role helpers
  const isSuperAdmin = profile?.role === 'super_admin';
  const isClientAdmin = profile?.role === 'client_admin';
  const isTrainee = profile?.role === 'trainee';
  const clientId = profile?.client_id || null;

  const value = {
    // User and profile data
    user,
    profile,
    
    // Loading state
    loading,
    
    // Password change requirement
    mustChangePassword,
    setMustChangePassword,
    
    // Client information
    clientId,
    clientName,
    
    // Role helpers (computed from profile)
    isSuperAdmin,
    isClientAdmin,
    isTrainee,
    
    // Functions
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
