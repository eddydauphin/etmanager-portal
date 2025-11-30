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

// Client helpers
export async function getAllClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

// Trainee helpers
export async function getTrainees(clientId) {
  let query = supabase
    .from('trainees')
    .select('*, clients:client_id(id, name, code)')
    .eq('is_active', true)
    .order('last_name');
  
  // If clientId provided, filter by it
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  
  const { data, error } = await query;
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
  let query = supabase
    .from('trainees')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  
  const { count } = await query;
  
  return {
    traineeCount: count || 0,
    onTrack: 0,
    totalGaps: 0,
    criticalGaps: 0,
    onTrackPercentage: 0
  };
}

// Competency helpers
export async function getTraineeWithCompetencies(traineeId) {
  // Get trainee with their competency assignments
  const { data: trainee, error: traineeError } = await supabase
    .from('trainees')
    .select('*')
    .eq('id', traineeId)
    .single();
  
  if (traineeError) throw traineeError;
  
  // Get competency assignments for this trainee
  const { data: competencies, error: compError } = await supabase
    .from('trainee_competencies')
    .select('*, competency:competencies(*)')
    .eq('trainee_id', traineeId);
  
  if (compError) throw compError;
  
  return {
    ...trainee,
    competencies: competencies || []
  };
}

// Development plan helpers
export async function getDevelopmentPlans(clientId) {
  let query = supabase
    .from('development_plans')
    .select('*, trainee:trainees(id, first_name, last_name)')
    .order('created_at', { ascending: false });
  
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  
  const { data, error } = await query;
  if (error) {
    // Table might not exist yet - return empty array
    console.warn('getDevelopmentPlans error:', error.message);
    return [];
  }
  return data || [];
}

// Training record helpers
export async function getTrainingRecords(clientId) {
  let query = supabase
    .from('training_records')
    .select('*, trainee:trainees(id, first_name, last_name), material:training_materials(id, title)')
    .order('completed_at', { ascending: false });
  
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  
  const { data, error } = await query;
  if (error) {
    // Table might not exist yet - return empty array
    console.warn('getTrainingRecords error:', error.message);
    return [];
  }
  return data || [];
}

export default supabase;
