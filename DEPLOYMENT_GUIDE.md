# 🚀 Deploying E&T Manager to www.foodekconsulting.com/trainer

This guide shows how to add the E&T Manager portal to your existing Foodek Consulting website.

## Final URLs

| URL | Purpose |
|-----|---------|
| `www.foodekconsulting.com` | Your existing website (unchanged) |
| `www.foodekconsulting.com/trainer` | E&T Manager Portal |
| `www.foodekconsulting.com/trainer/login` | Login page |
| `www.foodekconsulting.com/trainer/dashboard` | User dashboard |

---

## Option 1: Static Build + Upload to Hosting

### Step 1: Build the Portal

```bash
cd web_portal
npm install
npm run build
```

This creates a `dist/` folder with all static files.

### Step 2: Upload to Your Server

Upload the contents of `dist/` to:
```
/public_html/trainer/
```
or wherever your website files are hosted.

### Step 3: Configure Server Routing

**For Apache (.htaccess in /trainer folder):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /trainer/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /trainer/index.html [L]
</IfModule>
```

**For Nginx (add to your server block):**
```nginx
location /trainer {
    alias /var/www/html/trainer;
    try_files $uri $uri/ /trainer/index.html;
}
```

---

## Option 2: Vercel (Recommended for Ease)

### Step 1: Deploy to Vercel

1. Push `web_portal/` to a GitHub repo
2. Connect to Vercel
3. Set build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Step 2: Configure Your Domain

In your DNS settings, add a CNAME record:
```
trainer.foodekconsulting.com → cname.vercel-dns.com
```

Or if you want it at `/trainer`:
- Configure reverse proxy in your main hosting to forward `/trainer/*` to your Vercel deployment

---

## Option 3: Subdomain Alternative

If subdirectory is complex with your hosting, consider:

```
trainer.foodekconsulting.com → E&T Manager Portal
```

Just update these files:
- `vite.config.js`: Change `base: '/trainer/'` to `base: '/'`
- `App.jsx`: Change `basename="/trainer"` to `basename="/"`

Then deploy to Vercel and add DNS CNAME record.

---

## Adding Link from Main Website

Add a link/button on www.foodekconsulting.com to access the trainer portal:

```html
<a href="/trainer" class="btn">E&T Manager Login</a>
```

Or in your navigation:
```html
<nav>
  <a href="/services">Services</a>
  <a href="/about">About</a>
  <a href="/trainer">Client Portal</a>  <!-- NEW -->
</nav>
```

---

## Testing Checklist

After deployment:

- [ ] Visit `www.foodekconsulting.com/trainer` → See login page
- [ ] Login with your credentials → Redirected to dashboard
- [ ] Check all navigation links work
- [ ] Test on mobile device
- [ ] Verify your main website still works normally

---

## Troubleshooting

### Blank page at /trainer
- Check that all files uploaded correctly
- Verify .htaccess or nginx config is correct
- Check browser console for errors

### 404 on page refresh
- The SPA routing config is missing
- Add the .htaccess or nginx rules above

### Can't login
- Verify Supabase environment variables are set
- Check Supabase project is running
- Verify user exists in Supabase Auth

### Styles look broken
- Check that `base: '/trainer/'` is set in vite.config.js
- Rebuild and re-upload

---

## Quick Commands Reference

```bash
# Development
cd web_portal
npm run dev                    # Start dev server at localhost:3000

# Production build
npm run build                  # Creates dist/ folder

# Preview production build locally
npm run preview               # Test the built version
```

---

## Need Help?

Contact: support@foodekconsulting.com
