import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create client for auth only
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Direct fetch helper for database queries
export async function dbQuery(table, options = {}) {
  const { select = '*', eq, order, limit } = options;
  
  let url = `${supabaseUrl}/rest/v1/${table}?select=${select}`;
  
  if (eq) {
    Object.entries(eq).forEach(([key, value]) => {
      url += `&${key}=eq.${value}`;
    });
  }
  
  if (order) {
    url += `&order=${order}`;
  }
  
  if (limit) {
    url += `&limit=${limit}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Query failed: ${response.status}`);
  }
  
  return response.json();
}

// Helper functions
export async function getAllClients() {
  return dbQuery('clients', { order: 'name.asc' });
}

export async function getUserProfile(userId) {
  const data = await dbQuery('profiles', { eq: { id: userId } });
  return data[0] || null;
}

export default supabase;