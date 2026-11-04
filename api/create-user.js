// Vercel Serverless Function: create a portal user with the Supabase admin API.
// File: api/create-user.js
//
// Creating users from the browser with supabase.auth.signUp() replaces the
// caller's session with the new user's one and logs the admin out. This
// endpoint creates the auth user and its profile server-side with the
// service role key, so the caller's session is never touched.
//
// Required env vars (Vercel project settings, NOT VITE_-prefixed):
//   VITE_SUPABASE_URL           - project URL (already set, shared with the client)
//   SUPABASE_SERVICE_ROLE_KEY   - service role key, server-side only

import { createClient } from '@supabase/supabase-js';

const CREATOR_ROLES = ['super_admin', 'client_admin', 'site_admin', 'team_lead'];
const VALID_ROLES = ['super_admin', 'client_admin', 'site_admin', 'team_lead', 'trainee'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server' });
  }

  // 1. Identify the caller from their access token
  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: callerAuth, error: callerError } = await admin.auth.getUser(accessToken);
  if (callerError || !callerAuth?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { data: caller, error: callerProfileError } = await admin
    .from('profiles')
    .select('id, role, client_id')
    .eq('id', callerAuth.user.id)
    .single();

  if (callerProfileError || !caller) {
    return res.status(403).json({ error: 'Caller profile not found' });
  }

  if (!CREATOR_ROLES.includes(caller.role)) {
    return res.status(403).json({ error: 'You are not allowed to create users' });
  }

  // 2. Validate the request
  const {
    email,
    full_name,
    role,
    client_id,
    reports_to_id,
    employee_number,
    department,
    line,
    hire_date,
    site,
    capabilities,
    password
  } = req.body || {};

  if (!email || !full_name || !role) {
    return res.status(400).json({ error: 'email, full_name and role are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role: ${role}` });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'A temporary password of at least 8 characters is required' });
  }

  const targetClientId = role === 'super_admin' ? null : (client_id || null);
  if (role !== 'super_admin' && !targetClientId) {
    return res.status(400).json({ error: 'client_id is required for this role' });
  }

  // 3. Scope rules: nobody below super_admin may create outside their own client
  if (caller.role !== 'super_admin') {
    if (role === 'super_admin') {
      return res.status(403).json({ error: 'Only a super admin can create super admins' });
    }
    if (targetClientId !== caller.client_id) {
      return res.status(403).json({ error: 'You can only create users in your own client' });
    }
    if (caller.role === 'team_lead' && role !== 'trainee') {
      return res.status(403).json({ error: 'Team leads can only create trainees' });
    }
  }

  // 4. Create the auth user (email pre-confirmed, caller session untouched)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name }
  });

  if (createError) {
    const msg = createError.message || 'Failed to create user';
    const status = /already|exists|registered/i.test(msg) ? 409 : 400;
    return res.status(status).json({
      error: status === 409 ? 'A user with this email already exists' : msg
    });
  }

  const userId = created.user.id;

  // 5. Write the profile. Upsert so this works with or without an
  //    on_auth_user_created trigger that pre-creates the row.
  const profile = {
    id: userId,
    email,
    full_name,
    role,
    client_id: targetClientId,
    reports_to_id: role === 'trainee'
      ? (caller.role === 'team_lead' ? caller.id : (reports_to_id || null))
      : null,
    employee_number: employee_number || null,
    department: department || null,
    line: line || null,
    hire_date: hire_date || null,
    site: site || null,
    capabilities: capabilities || null,
    must_change_password: true,
    is_active: true
  };

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(profile, { onConflict: 'id' });

  if (profileError) {
    // Roll back the auth user so a retry does not hit "already exists"
    await admin.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: `Profile creation failed: ${profileError.message}` });
  }

  // 6. Log the credentials for the admin's records (best effort)
  await admin.from('email_log').insert({
    recipient_email: email,
    subject: 'New User Account Created',
    body: `Account created for ${full_name}\nEmail: ${email}\nTemporary Password: ${password}\nUser must change password on first login.`,
    status: 'logged',
    sent_at: new Date().toISOString(),
    created_by: caller.id
  });

  return res.status(200).json({ id: userId, email, full_name });
}
