import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, client:clients(*)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

export async function markPasswordChanged(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', userId);
  if (error) throw error;
  return data;
}

export async function getAllClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

export async function getTrainees(clientId) {
  const { data, error } = await supabase
    .from('trainees')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('last_name');
  if (error) throw error;
  return data;
}

export async function createTrainee(traineeData) {
  const { data, error } = await supabase
    .from('trainees')
    .insert(traineeData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTeamStats(clientId) {
  const { count } = await supabase
    .from('trainees')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('is_active', true);
  
  return {
    traineeCount: count || 0,
    onTrack: 0,
    totalGaps: 0,
    criticalGaps: 0,
    onTrackPercentage: 0
  };
}

export default supabase;