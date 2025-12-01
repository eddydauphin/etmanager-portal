// src/lib/db.js
// Direct fetch helper for Supabase REST API
// Use this instead of supabase.from() for database queries

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Direct fetch to Supabase REST API
 * @param {string} endpoint - API endpoint (e.g., 'profiles?select=*')
 * @param {object} options - Fetch options (method, body, headers)
 * @returns {Promise<any>} - JSON response
 * 
 * @example
 * // GET all clients
 * const clients = await dbFetch('clients?select=*&order=name.asc');
 * 
 * // GET with filter
 * const admins = await dbFetch('profiles?select=*&role=eq.super_admin');
 * 
 * // POST (create)
 * await dbFetch('clients', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'New Client', code: 'NC' })
 * });
 * 
 * // PATCH (update)
 * await dbFetch('clients?id=eq.123', {
 *   method: 'PATCH',
 *   body: JSON.stringify({ name: 'Updated Name' })
 * });
 * 
 * // DELETE
 * await dbFetch('clients?id=eq.123', { method: 'DELETE' });
 */
export async function dbFetch(endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' ? 'return=representation' : 
                (options.method === 'PATCH' || options.method === 'DELETE') ? 'return=minimal' : undefined,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  
  // DELETE and some PATCH responses don't have body
  if (options.method === 'DELETE' || (options.method === 'PATCH' && response.status === 204)) {
    return null;
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ============================================
// Helper functions for common operations
// ============================================

/**
 * Get all clients
 */
export async function getClients() {
  return dbFetch('clients?select=*&order=name.asc');
}

/**
 * Get profiles/users with client name included
 * @param {string|null} clientId - Filter by client (optional)
 * 
 * Returns: { ..., clients: { name: "Client Name" } }
 * Access client name with: user.clients?.name
 */
export async function getProfiles(clientId = null) {
  let url = 'profiles?select=*,clients(name)&order=full_name.asc';
  if (clientId) url += `&client_id=eq.${clientId}`;
  return dbFetch(url);
}

/**
 * Get expert networks with client name included
 * @param {string|null} clientId - Filter by client (optional)
 * 
 * Returns: { ..., clients: { name: "Client Name" } }
 * Access client name with: network.clients?.name
 */
export async function getNetworks(clientId = null) {
  let url = 'expert_networks?select=*,clients(name)&is_active=eq.true&order=name.asc';
  if (clientId) url += `&client_id=eq.${clientId}`;
  return dbFetch(url);
}

/**
 * Get network members with user profile included
 * @param {string} networkId - Network ID
 * 
 * Returns: { ..., profiles: { full_name, email } }
 * Access user name with: member.profiles?.full_name
 */
export async function getNetworkMembers(networkId) {
  return dbFetch(`expert_network_members?select=*,profiles(full_name,email)&network_id=eq.${networkId}`);
}

/**
 * Get action plans for a network with assigned user included
 * @param {string} networkId - Network ID
 * 
 * Returns: { ..., profiles: { full_name } }
 * Access assigned user with: action.profiles?.full_name
 */
export async function getActionPlans(networkId) {
  return dbFetch(`network_action_plans?select=*,profiles:assigned_to(full_name)&network_id=eq.${networkId}&order=due_date.asc`);
}

export default dbFetch;
