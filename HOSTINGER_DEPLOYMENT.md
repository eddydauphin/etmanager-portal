# 🚀 E&T Manager - Hostinger Deployment Guide

**Deploying to:** `www.foodekconsulting.com/trainer`  
**Hosting:** Hostinger (hPanel)

---

## Prerequisites

Before starting:
- [ ] Supabase project created and configured (see SUPABASE_SETUP.md)
- [ ] Node.js installed on your local computer
- [ ] Access to Hostinger hPanel

---

## Step 1: Build the Portal Locally

On your computer:

```bash
# Navigate to web portal folder
cd web_portal

# Install dependencies
npm install

# Create .env file with your Supabase credentials
# Copy from .env.example and fill in your values

# Build for production
npm run build
```

This creates a `dist/` folder containing:
```
dist/
├── index.html
├── assets/
│   ├── index-xxxxx.js
│   └── index-xxxxx.css
└── ...
```

---

## Step 2: Upload to Hostinger

### Method A: File Manager (Easiest)

1. **Login to Hostinger hPanel**
   - Go to hpanel.hostinger.com
   - Select your foodekconsulting.com hosting

2. **Open File Manager**
   - Click "File Manager" in the dashboard
   - Navigate to `public_html/`

3. **Create trainer folder**
   - Click "New Folder"
   - Name it: `trainer`
   - Click inside the `trainer` folder

4. **Upload files**
   - Click "Upload" button (top right)
   - Select ALL files from your local `dist/` folder
   - Wait for upload to complete

5. **Verify structure**
   ```
   public_html/
   ├── (your existing website files)
   └── trainer/
       ├── index.html
       └── assets/
           ├── index-xxxxx.js
           └── index-xxxxx.css
   ```

### Method B: FTP Upload

1. **Get FTP credentials** from hPanel → Files → FTP Accounts
2. **Connect** using FileZilla or similar
3. **Navigate** to `/public_html/`
4. **Create** `trainer` folder
5. **Upload** contents of `dist/` into `trainer/`

---

## Step 3: Configure .htaccess for SPA Routing

This is **critical** - without it, page refreshes will show 404 errors.

### Create .htaccess in trainer folder:

1. In File Manager, navigate to `public_html/trainer/`
2. Click "New File"
3. Name it: `.htaccess`
4. Click on the file → Edit
5. Paste this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /trainer/
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

6. Save the file

---

## Step 4: Test the Deployment

### Basic Tests:

| Test | URL | Expected |
|------|-----|----------|
| Login page | `www.foodekconsulting.com/trainer` | See login form |
| Direct dashboard URL | `www.foodekconsulting.com/trainer/dashboard` | Redirects to login (if not logged in) |
| Page refresh | Refresh on any page | Should NOT show 404 |
| Main site | `www.foodekconsulting.com` | Your existing site works |

### If Something's Wrong:

**Blank page?**
- Check browser console (F12) for errors
- Verify all files uploaded correctly
- Check .htaccess exists and has correct content

**404 on refresh?**
- .htaccess not working
- Try clearing Hostinger cache: hPanel → Advanced → Cache Manager → Purge All

**Login not working?**
- Check .env values were used during build
- Rebuild with correct Supabase credentials

---

## Step 5: Add Link to Your Main Website

Edit your main website to add a link to the trainer portal.

### Option 1: Navigation Menu
Add to your website's navigation:
```html
<a href="/trainer">Client Portal</a>
```

### Option 2: Dedicated Button
```html
<a href="/trainer" class="btn btn-primary">
  Access E&T Manager
</a>
```

### Option 3: Footer Link
```html
<div class="footer-links">
  <a href="/trainer">Client Login</a>
</div>
```

---

## Step 6: SSL Certificate (HTTPS)

Hostinger usually auto-configures SSL. Verify it's working:

1. Go to hPanel → Security → SSL
2. Ensure SSL is active for foodekconsulting.com
3. Test: Visit `https://www.foodekconsulting.com/trainer`

If not working, click "Install SSL" in hPanel.

---

## Updating the Portal

When you make changes and need to redeploy:

```bash
# 1. Make changes locally
# 2. Rebuild
npm run build

# 3. In Hostinger File Manager:
#    - Delete contents of public_html/trainer/ (except .htaccess)
#    - Upload new dist/ contents
#    - Clear cache in hPanel if needed
```

**Tip:** Keep the `.htaccess` file - don't delete it during updates!

---

## Troubleshooting

### "403 Forbidden" Error
- Check file permissions: Files should be 644, folders 755
- In File Manager, right-click → Permissions → Set to 644/755

### "500 Internal Server Error"
- Check .htaccess syntax
- Try removing .htaccess temporarily to test

### Assets Not Loading (CSS/JS)
- Check files exist in `trainer/assets/`
- Verify base path is `/trainer/` in the build

### Cache Issues
- hPanel → Advanced → Cache Manager → Purge All
- Also clear your browser cache

### Supabase Connection Failed
- Verify .env had correct values BEFORE running `npm run build`
- Rebuild if you changed .env values

---

## Quick Reference

| Task | Location |
|------|----------|
| File Manager | hPanel → Files → File Manager |
| FTP Credentials | hPanel → Files → FTP Accounts |
| SSL Certificate | hPanel → Security → SSL |
| Clear Cache | hPanel → Advanced → Cache Manager |
| Error Logs | hPanel → Advanced → Error Logs |
| PHP Version | hPanel → Advanced → PHP Configuration |

---

## Support

**Hostinger Support:** Available 24/7 via live chat in hPanel

**Foodek Consulting:** support@foodekconsulting.com

---

## Checklist

- [ ] Built portal locally with `npm run build`
- [ ] Created `trainer` folder in `public_html`
- [ ] Uploaded all files from `dist/` folder
- [ ] Created `.htaccess` with routing rules
- [ ] Tested login page loads
- [ ] Tested page refresh doesn't 404
- [ ] Verified main website still works
- [ ] Added link from main site to `/trainer`
- [ ] SSL working on trainer path
