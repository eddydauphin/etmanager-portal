# E&T Manager Web Portal

**Competency & Training Management System**  
*by Foodek Consulting*

**Live URL:** `www.foodekconsulting.com/trainer`

## 🎯 Overview

The E&T Manager Web Portal provides a modern, responsive interface for managing competency development and training across your organization. Built with React and Supabase for secure, real-time data management.

## 👥 User Roles

| Role | Access |
|------|--------|
| **Super Admin** (Eddy) | Full system access, manage all clients, users, and settings |
| **Client Admin** | Manage their organization's trainees, competencies, and training |
| **Trainee** | View personal progress, development plan, and training materials |

## 🏗️ Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router v6

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the schema from `database/supabase_schema.sql`
4. Copy your project URL and anon key from Settings > API

### 3. Configure Environment

```bash
cd web_portal
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
web_portal/
├── src/
│   ├── components/
│   │   ├── auth/           # Login, password change
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── admin/          # Super admin components
│   │   ├── trainee/        # Trainee components
│   │   └── shared/         # Layout, navigation
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── ChangePasswordPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TraineesPage.jsx
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.js     # Supabase client & helpers
│   │   └── AuthContext.jsx # Auth state management
│   └── styles/
│       └── index.css       # Tailwind + custom styles
├── database/
│   └── supabase_schema.sql # Database schema
├── .env.example
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🔐 Authentication Flow

1. User enters email/password on login page
2. Supabase validates credentials
3. If `must_change_password` is true, redirect to password change
4. After password change, redirect to role-appropriate dashboard

### Password Policy

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## 🛡️ Security Features

- **Row Level Security (RLS)**: Users only see data they're authorized to access
- **JWT Authentication**: Secure session management
- **Password hashing**: Handled by Supabase Auth
- **HTTPS**: Required in production

## 📊 Features by Role

### Super Admin
- Dashboard with all-client overview
- Client management (create, edit, deactivate)
- User management across all clients
- Global competency templates
- Cross-client reports

### Client Admin
- Team dashboard with competency overview
- Add/manage trainees
- Assign competencies and training
- Track team progress
- Generate department reports

### Trainee
- Personal competency matrix
- Development plan view
- Training materials access
- Progress tracking
- Certificate downloads

## 🎨 Customization

### Brand Colors

Edit `tailwind.config.js` to change the primary color scheme:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#3b82f6',  // Change this
        600: '#2563eb',
        // ...
      }
    }
  }
}
```

### Logo

Replace the logo in the Layout component or add an image file.

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Manual Build

```bash
npm run build
# Upload 'dist' folder to your hosting
```

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.jsx`
3. Add navigation link in `src/components/shared/Layout.jsx`

## 📞 Support

**Foodek Consulting**  
Email: support@foodekconsulting.com  
Website: foodekconsulting.com

---

© 2024 Foodek Consulting. All rights reserved.
