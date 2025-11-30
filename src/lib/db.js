// Direct fetch helper for Supabase REST API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function dbFetch(endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' ? 'return=representation' : (options.method === 'PATCH' || options.method === 'DELETE' ? 'return=minimal' : undefined),
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  
  if (options.method === 'DELETE' || (options.method === 'PATCH' && response.status === 204)) {
    return null;
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Helper functions
export async function getClients() {
  return dbFetch('clients?select=*&order=name.asc');
}

export async function getProfiles(clientId = null) {
  let url = 'profiles?select=*&order=full_name.asc';
  if (clientId) url += `&client_id=eq.${clientId}`;
  return dbFetch(url);
}

export async function getNetworks(clientId = null) {
  let url = 'expert_networks?select=*&is_active=eq.true&order=name.asc';
  if (clientId) url += `&client_id=eq.${clientId}`;
  return dbFetch(url);
}

export async function getNetworkMembers(networkId) {
  return dbFetch(`expert_network_members?select=*,user:profiles(*)&network_id=eq.${networkId}`);
}

export async function getActionPlans(networkId) {
  return dbFetch(`network_action_plans?select=*&network_id=eq.${networkId}&order=due_date.asc`);
}