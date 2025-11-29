// ============================================================================
// E&T MANAGER - AUTHENTICATION CONTEXT
// Provides auth state and user profile throughout the app
// ============================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getUserProfile, markPasswordChanged, updatePassword } from './supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setMustChangePassword(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    try {
      const profileData = await getUserProfile(userId);
      setProfile(profileData);
      setMustChangePassword(profileData.must_change_password);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(newPassword) {
    try {
      await updatePassword(newPassword);
      await markPasswordChanged(user.id);
      setMustChangePassword(false);
      // Reload profile
      await loadProfile(user.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Role-based helpers
  const isSuperAdmin = profile?.role === 'super_admin';
  const isClientAdmin = profile?.role === 'client_admin';
  const isTrainee = profile?.role === 'trainee';
  const clientId = profile?.client_id;
  const clientName = profile?.client?.name;

  const value = {
    user,
    profile,
    loading,
    mustChangePassword,
    signIn,
    signOut,
    changePassword,
    loadProfile,
    // Role helpers
    isSuperAdmin,
    isClientAdmin,
    isTrainee,
    clientId,
    clientName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
