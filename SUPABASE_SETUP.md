# 🚀 E&T Manager - Supabase Setup Guide

This guide walks you through setting up Supabase for the E&T Manager portal.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create account)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `etmanager` (or your preference)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to Estonia (e.g., Frankfurt)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize

## Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the ENTIRE contents of `database/supabase_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is correct!

### Verify Tables Created

Go to **Table Editor** (left sidebar). You should see:
- ✅ profiles
- ✅ clients
- ✅ trainees
- ✅ competencies
- ✅ trainee_competencies
- ✅ assessments
- ✅ development_plans
- ✅ training_materials
- ✅ training_records
- ✅ email_log
- ✅ activity_log

## Step 3: Create Your Super Admin Account

### 3a. Enable Email Auth
1. Go to **Authentication** > **Providers**
2. Ensure **Email** is enabled
3. Disable "Confirm email" for now (we'll enable later)

### 3b. Create Your User
1. Go to **Authentication** > **Users**
2. Click **"Add user"** > **"Create new user"**
3. Fill in:
   - **Email**: `eddy.dauphin@foodekconsulting.com`
   - **Password**: Your chosen password
   - **Auto Confirm User**: ✅ Check this
4. Click **"Create user"**
5. Copy the **User UID** shown (looks like: `a1b2c3d4-e5f6-...`)

### 3c. Create Your Profile (Super Admin)
1. Go to **SQL Editor**
2. Run this query (replace YOUR_USER_ID with the UID you copied):

```sql
INSERT INTO public.profiles (id, email, full_name, role, must_change_password)
VALUES (
    'YOUR_USER_ID_HERE',
    'eddy.dauphin@foodekconsulting.com',
    'Eddy Dauphin',
    'super_admin',
    false
);
```

## Step 4: Get API Keys

1. Go to **Settings** (gear icon) > **API**
2. Copy these values:

| Setting | Where to Find | Use |
|---------|---------------|-----|
| **Project URL** | Under "Project URL" | `VITE_SUPABASE_URL` |
| **anon/public key** | Under "Project API keys" | `VITE_SUPABASE_ANON_KEY` |

⚠️ **Keep your `service_role` key SECRET** - never expose in frontend code!

## Step 5: Configure Web Portal

1. Navigate to the web portal folder:
```bash
cd web_portal
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Edit `.env` with your values:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 6: Test the Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open http://localhost:3000
4. Login with your credentials
5. You should see the Super Admin dashboard!

---

## 🏢 Adding Your First Client

### Via SQL (Quick)

```sql
-- Create a client
INSERT INTO public.clients (name, code, contact_email, is_active)
VALUES ('Nordic Milk', 'NORDIC', 'admin@nordicmilk.ee', true);
```

### Creating a Client Admin

1. **Create auth user** (Authentication > Users > Add user)
   - Email: `admin@nordicmilk.ee`
   - Password: Temporary password (they'll change it)
   
2. **Create profile**:
```sql
INSERT INTO public.profiles (id, email, full_name, role, client_id, must_change_password)
VALUES (
    'CLIENT_ADMIN_USER_ID',
    'admin@nordicmilk.ee',
    'Per Johansson',
    'client_admin',
    (SELECT id FROM public.clients WHERE code = 'NORDIC'),
    true  -- Force password change on first login
);
```

---

## 📧 Email Setup (Optional but Recommended)

Supabase can send emails for:
- Password resets
- Email confirmations
- Magic links

### Option A: Use Supabase Default (Limited)
- 3 emails/hour limit
- Good for testing only

### Option B: Custom SMTP (Recommended)
1. Go to **Settings** > **Authentication** > **SMTP Settings**
2. Enable "Custom SMTP"
3. Fill in your SMTP details (e.g., from your email provider)

### Option C: Use Resend/SendGrid
1. Sign up at [resend.com](https://resend.com) (free tier available)
2. Get API key
3. Configure in Supabase SMTP settings

---

## 🔒 Security Checklist

Before going live:

- [ ] Enable email confirmation (Authentication > Settings)
- [ ] Set strong database password
- [ ] Review RLS policies are working (test with different user roles)
- [ ] Enable 2FA for your Supabase account
- [ ] Set up proper SMTP for emails
- [ ] Configure custom domain (optional)

---

## 🐛 Troubleshooting

### "Invalid login credentials"
- Check email/password are correct
- Verify user exists in Authentication > Users
- Check profile exists in profiles table

### "permission denied for table..."
- RLS policies may not be set up correctly
- Re-run the schema SQL
- Check the user has correct role in profiles table

### Can't see any data
- Make sure you're logged in
- Check browser console for errors
- Verify client_id is set correctly for client admins

### Profile not loading
- Check profiles table has entry for your auth user ID
- Verify the ID matches exactly (UUIDs are case-sensitive)

---

## 📞 Need Help?

Contact Foodek Consulting:
- Email: support@foodekconsulting.com
- Website: foodekconsulting.com

---

## Quick Reference: Supabase Dashboard Locations

| What | Where |
|------|-------|
| Tables | Table Editor |
| Users | Authentication > Users |
| API Keys | Settings > API |
| SQL Queries | SQL Editor |
| Logs | Logs (left sidebar) |
| Storage | Storage |
| Edge Functions | Edge Functions |
