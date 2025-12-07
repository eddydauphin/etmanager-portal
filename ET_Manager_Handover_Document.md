# ET Manager - Complete Handover Document
## Competency & Training Management System
### Foodek Consulting

**Document Version:** 1.0  
**Date:** December 7, 2025  
**Project URL:** https://etmanager-portal.vercel.app

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [User Roles & Access](#4-user-roles--access)
5. [Completed Features](#5-completed-features)
6. [Pending Features](#6-pending-features)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [File Structure](#9-file-structure)
10. [Environment Variables](#10-environment-variables)
11. [Deployment Guide](#11-deployment-guide)
12. [Known Issues & Solutions](#12-known-issues--solutions)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Project Overview

ET Manager is a comprehensive competency and training management system designed for manufacturing clients. It enables organizations to:

- Define and manage competency frameworks
- Assign competencies to employees with target levels
- Create AI-generated or uploaded training modules
- Track employee progress through training
- Assess and validate competency levels
- Generate reports on organizational capabilities

### Business Value
- Streamlines competency management across multiple clients
- Reduces training content creation time with AI generation
- Provides visibility into workforce capabilities
- Supports multi-language training delivery
- Enables self-paced learning with audio narration

---

## 2. Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| React Router | Navigation |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | Database (PostgreSQL) |
| Supabase Auth | Authentication |
| Supabase Storage | File storage (logos) |
| Vercel | Hosting & serverless functions |

### AI Services
| Service | Purpose |
|---------|---------|
| Anthropic Claude API | Training content generation, PDF processing |
| ElevenLabs API | Audio narration (text-to-speech) |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│                    Hosted on Vercel                          │
├─────────────────────────────────────────────────────────────┤
│  Pages:                                                      │
│  - Login, Dashboard, Clients, Users                         │
│  - Competencies, Profiles, Training Modules                 │
│  - My Progress, My Plan, My Training (Trainee Portal)       │
│  - Company Settings (Branding)                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   VERCEL SERVERLESS APIs                     │
├─────────────────────────────────────────────────────────────┤
│  /api/generate-training.js  - AI slide & quiz generation    │
│  /api/generate-audio.js     - ElevenLabs text-to-speech     │
│  /api/process-presentation.js - PDF upload processing       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database    │  Auth Service  │  Storage         │
│  - clients              │  - Users       │  - client-logos  │
│  - profiles             │  - Sessions    │                  │
│  - competencies         │                │                  │
│  - training_modules     │                │                  │
│  - user_competencies    │                │                  │
│  - user_training        │                │                  │
│  - module_slides        │                │                  │
│  - module_questions     │                │                  │
│  - quiz_attempts        │                │                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. User Roles & Access

### Super Admin
- Full system access
- Manage all clients
- Manage all users across clients
- Create/edit competencies for any client
- Create/publish training modules
- View all reports
- Access: All menu items

### Client Admin
- Manage users within their client only
- View/manage competencies for their client
- Create training modules for their client
- View reports for their client
- Configure company branding (logo, colors)
- Access: Dashboard, Team, Expert Network, Competencies, Profiles, Training, Reports, Branding, Settings

### Trainee
- View assigned competencies and progress
- Complete assigned training modules
- Take quizzes
- View personal development plan
- Access: My Progress, My Plan, My Training, Settings

---

## 5. Completed Features

### ✅ Authentication & User Management
- Email/password login
- Force password change on first login
- Role-based access control (super_admin, client_admin, trainee)
- User CRUD operations
- Profile management

### ✅ Client Management
- Create/edit/delete clients
- Client codes and locations
- Multi-client architecture
- Client-specific data isolation

### ✅ Competency Framework
- Competency categories with color coding
- 5-level competency scale with descriptions
- Competency assignment to users
- Target level setting
- Gap analysis (current vs target)
- Spider chart visualization

### ✅ Competency Profiles
- Pre-defined role templates (e.g., "Process Operator", "Quality Technician")
- One-click profile application to users
- Profile competency mapping with target levels

### ✅ Training Module Management
- **Two creation methods:**
  1. **AI Generation** - Enter title, competency, level → AI creates slides + quiz
  2. **PDF Upload** - Upload PDF → AI extracts content → Creates slides + quiz
- Multi-client module creation (create once, deploy to multiple clients)
- Multi-language support (English, French, Spanish, Estonian)
- Slide editor with key points and audio scripts
- Quiz editor with multiple choice questions
- Module approval workflow (draft → content_approved → published)

### ✅ Training Delivery (Trainee Portal)
- **My Progress** - Overall competency dashboard with spider chart
- **My Plan** - Development plan with upcoming deadlines
- **My Training** - Training modules with:
  - Slide viewer with navigation
  - Audio narration (ElevenLabs TTS)
  - Play/pause controls
  - Audio caching
  - Quiz with instant feedback
  - Pass/fail tracking
  - Attempt limits

### ✅ Automatic Training Assignment
- Training modules auto-assigned based on user's assigned competencies
- Links through `competency_modules` junction table
- No manual assignment needed

### ✅ Client Branding
- Logo upload (Supabase Storage)
- Primary, secondary, accent colors
- Font family selection
- Live preview
- Applied to training viewer

### ✅ Expert Network
- Expert profiles per client
- Expertise areas and contact info

### ✅ Audio Narration
- ElevenLabs integration
- Multi-language voices:
  - English: Sarah (American)
  - French: Lily
  - Spanish: Alice
  - Estonian: Falls back to English
- Audio caching to prevent re-generation

---

## 6. Pending Features

### ⏳ Priority 1 - High Value

#### Completion Certificates
- Generate PDF certificates when trainee passes
- Include: trainee name, module title, date, score, client logo
- Suggested: Use Templated.io or jsPDF
- Store certificate URL in `user_training` table

#### Training Analytics Dashboard
- Completion rates by module
- Average scores
- Time to completion
- Failed attempts tracking
- Overdue training alerts
- Export to Excel/PDF

#### Delete Cascade for Clients
- Currently: Cannot delete clients with related records
- Fix: Add ON DELETE CASCADE to foreign keys
- SQL provided in Known Issues section

### ⏳ Priority 2 - Nice to Have

#### Email Notifications
- Training assigned notification
- Deadline reminders (3 days before, overdue)
- Completion confirmation
- Suggested: Supabase Edge Functions + Resend/SendGrid

#### Admin Functions
- Reset user's failed attempts
- Extend training deadlines
- Bulk user import (CSV)
- Bulk competency assignment

#### Training Enhancements
- Training expiry/recertification (retake after X months)
- Video embedding in slides
- Interactive content (drag & drop, matching)
- SCORM package export

#### Reporting Enhancements
- Competency gap analysis by department
- Training ROI metrics
- Custom report builder
- Scheduled report emails

### ⏳ Priority 3 - Future Roadmap

#### Mobile App
- React Native version
- Offline training capability
- Push notifications

#### Assessment Module
- Practical assessments (not just quiz)
- Assessor assignment
- Evidence upload
- Assessment scheduling

#### Integration Options
- SSO (SAML, OAuth)
- HRIS integration
- LMS integration (xAPI/SCORM)

---

## 7. Database Schema

### Core Tables

```sql
-- CLIENTS
clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  code VARCHAR(10),
  location TEXT,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) DEFAULT '#1E40AF',
  accent_color VARCHAR(7) DEFAULT '#10B981',
  font_family VARCHAR(100) DEFAULT 'Inter',
  created_at TIMESTAMPTZ
)

-- PROFILES (Users)
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('super_admin', 'client_admin', 'trainee')),
  client_id UUID REFERENCES clients,
  department TEXT,
  job_title TEXT,
  must_change_password BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)

-- COMPETENCY CATEGORIES
competency_categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  color VARCHAR(7),
  client_id UUID REFERENCES clients,
  created_at TIMESTAMPTZ
)

-- COMPETENCIES
competencies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES competency_categories,
  client_id UUID REFERENCES clients,
  level_1_description TEXT,
  level_2_description TEXT,
  level_3_description TEXT,
  level_4_description TEXT,
  level_5_description TEXT,
  created_at TIMESTAMPTZ
)

-- USER COMPETENCIES (Assignments)
user_competencies (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  competency_id UUID REFERENCES competencies,
  current_level INTEGER DEFAULT 0,
  target_level INTEGER DEFAULT 3,
  status TEXT DEFAULT 'not_started',
  assigned_by UUID REFERENCES profiles,
  assigned_at TIMESTAMPTZ,
  achieved_at TIMESTAMPTZ
)

-- TRAINING MODULES
training_modules (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients,
  pass_score INTEGER DEFAULT 80,
  max_attempts INTEGER DEFAULT 3,
  has_audio BOOLEAN DEFAULT true,
  audio_language VARCHAR(5) DEFAULT 'en',
  content_type TEXT DEFAULT 'generated', -- 'generated' or 'uploaded'
  original_file_name TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'content_approved', 'published'
  created_by UUID REFERENCES profiles,
  content_approved_by UUID,
  content_approved_at TIMESTAMPTZ,
  quiz_approved_by UUID,
  quiz_approved_at TIMESTAMPTZ,
  published_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)

-- COMPETENCY-MODULE LINK
competency_modules (
  id UUID PRIMARY KEY,
  module_id UUID REFERENCES training_modules ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies,
  target_level INTEGER DEFAULT 3
)

-- MODULE SLIDES
module_slides (
  id UUID PRIMARY KEY,
  module_id UUID REFERENCES training_modules ON DELETE CASCADE,
  slide_number INTEGER,
  title TEXT,
  content JSONB, -- {key_points: [...]}
  audio_script TEXT,
  created_at TIMESTAMPTZ
)

-- MODULE QUESTIONS
module_questions (
  id UUID PRIMARY KEY,
  module_id UUID REFERENCES training_modules ON DELETE CASCADE,
  question_number INTEGER,
  question_text TEXT,
  options JSONB, -- ["A) ...", "B) ...", ...]
  correct_answer VARCHAR(1),
  points INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ
)

-- USER TRAINING (Progress)
user_training (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  module_id UUID REFERENCES training_modules,
  user_competency_id UUID REFERENCES user_competencies,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  attempts_count INTEGER DEFAULT 0,
  best_score INTEGER,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  assigned_by UUID REFERENCES profiles,
  assigned_at TIMESTAMPTZ
)

-- QUIZ ATTEMPTS
quiz_attempts (
  id UUID PRIMARY KEY,
  user_training_id UUID REFERENCES user_training,
  user_id UUID REFERENCES profiles,
  module_id UUID REFERENCES training_modules,
  score INTEGER,
  passed BOOLEAN,
  answers JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)

-- COMPETENCY PROFILES (Templates)
competency_profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients,
  created_at TIMESTAMPTZ
)

-- PROFILE COMPETENCIES
profile_competencies (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES competency_profiles ON DELETE CASCADE,
  competency_id UUID REFERENCES competencies,
  target_level INTEGER DEFAULT 3
)

-- EXPERT NETWORKS
expert_networks (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients,
  name TEXT,
  expertise TEXT,
  contact_info TEXT,
  created_at TIMESTAMPTZ
)
```

### Storage Buckets

```
client-logos (public)
  - Stores client logo images
  - Path format: {client_id}_logo_{timestamp}.{ext}
```

---

## 8. API Endpoints

### Vercel Serverless Functions

#### `/api/generate-training`
**Purpose:** AI-generate training slides and quiz questions

**Method:** POST

**Request Body:**
```json
{
  "type": "slides" | "quiz",
  "title": "Module Title",
  "competency": { "name": "...", "level_X_description": "..." },
  "targetLevel": 3,
  "levelDescriptions": { "1": "...", "2": "...", ... },
  "language": "English"
}
```

**Response:**
```json
{
  "slides": [
    {
      "slide_number": 1,
      "title": "...",
      "key_points": ["...", "..."],
      "audio_script": "..."
    }
  ]
}
// OR
{
  "questions": [
    {
      "question_text": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "points": 1
    }
  ]
}
```

#### `/api/generate-audio`
**Purpose:** Generate audio narration using ElevenLabs

**Method:** POST

**Request Body:**
```json
{
  "text": "Narration script text...",
  "language": "en" | "fr" | "es" | "et"
}
```

**Response:**
```json
{
  "audio": "base64_encoded_mp3_data"
}
```

#### `/api/process-presentation`
**Purpose:** Process uploaded PDF and extract training content

**Method:** POST

**Request Body:**
```json
{
  "fileContent": "base64_encoded_pdf",
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "title": "Module Title",
  "competency": { "name": "..." },
  "targetLevel": 3,
  "language": "English"
}
```

**Response:**
```json
{
  "slides": [...],
  "questions": [...]
}
```

**Limits:**
- Max file size: 4MB (Vercel Hobby plan limit)
- PDF only (PPTX/DOCX must be converted)
- Processing timeout: 60 seconds

---

## 9. File Structure

```
web_portal/
├── api/
│   ├── generate-training.js    # AI content generation
│   ├── generate-audio.js       # ElevenLabs TTS
│   └── process-presentation.js # PDF upload processing
│
├── src/
│   ├── components/
│   │   └── shared/
│   │       └── Layout.jsx      # Main layout with sidebar
│   │
│   ├── lib/
│   │   ├── AuthContext.jsx     # Auth provider
│   │   ├── supabase.js         # Supabase client
│   │   └── db.js               # Database fetch helper
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── ChangePasswordPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ClientsPage.jsx
│   │   ├── UsersPage.jsx
│   │   ├── ExpertNetworkPage.jsx
│   │   ├── CompetenciesPage.jsx
│   │   ├── CompetencyProfilesPage.jsx
│   │   ├── TrainingModulesPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── CompanySettingsPage.jsx  # Client branding
│   │   ├── MyProgressPage.jsx       # Trainee portal
│   │   ├── MyPlanPage.jsx           # Trainee portal
│   │   └── MyTrainingPage.jsx       # Trainee portal
│   │
│   ├── App.jsx                 # Routes
│   ├── main.jsx                # Entry point
│   └── index.css               # Tailwind imports
│
├── public/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── vercel.json
└── .env                        # Local environment variables
```

---

## 10. Environment Variables

### Vercel Environment Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `CLAUDE_API_KEY` | Anthropic API key | console.anthropic.com |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | elevenlabs.io dashboard |

### Local Development (.env)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## 11. Deployment Guide

### Initial Setup

1. **Supabase Project**
   ```
   - Create project at supabase.com
   - Run all migration SQL scripts
   - Create storage bucket: client-logos (public)
   - Disable RLS on tables (currently disabled for simplicity)
   ```

2. **Vercel Project**
   ```bash
   - Connect GitHub repository
   - Set environment variables
   - Deploy
   ```

### Deploying Updates

```bash
cd C:\Users\eddyr\Desktop\etmanager\foodek_trainer\web_portal
git add .
git commit -m "Description of changes"
git push
```

Vercel auto-deploys on push to main branch.

### Database Migrations

Run SQL scripts in Supabase SQL Editor in order:
1. Core tables
2. Training tables
3. RLS policies (if re-enabling)
4. Branding columns (`migration_client_branding.sql`)
5. Storage setup (`storage_setup.sql`)

---

## 12. Known Issues & Solutions

### Issue: Cannot Delete Client
**Error:** "violates foreign key constraint"

**Solution:** Add CASCADE delete to foreign keys:
```sql
-- Run in Supabase SQL Editor
ALTER TABLE expert_networks DROP CONSTRAINT IF EXISTS expert_networks_client_id_fkey;
ALTER TABLE expert_networks ADD CONSTRAINT expert_networks_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_client_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE competencies DROP CONSTRAINT IF EXISTS competencies_client_id_fkey;
ALTER TABLE competencies ADD CONSTRAINT competencies_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE competency_categories DROP CONSTRAINT IF EXISTS competency_categories_client_id_fkey;
ALTER TABLE competency_categories ADD CONSTRAINT competency_categories_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE training_modules DROP CONSTRAINT IF EXISTS training_modules_client_id_fkey;
ALTER TABLE training_modules ADD CONSTRAINT training_modules_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
```

### Issue: Upload "Request Entity Too Large"
**Cause:** Vercel Hobby plan has 4.5MB payload limit

**Solution:** 
- Keep files under 4MB
- Convert large PPTX/DOCX to PDF
- Compress PDFs before upload

### Issue: Audio Not Playing
**Check:**
1. Slide has `audio_script` content
2. ElevenLabs API key is set in Vercel
3. Browser allows audio playback

### Issue: Training Not Appearing for Trainee
**Check:**
1. Training module status is "published"
2. Trainee has the competency assigned
3. Module is linked to competency via `competency_modules`

---

## 13. Future Enhancements

### Short Term (1-3 months)
- [ ] Completion certificates with PDF generation
- [ ] Training analytics dashboard
- [ ] Email notifications for assignments
- [ ] Cascade delete for clients
- [ ] Bulk user import

### Medium Term (3-6 months)
- [ ] Video content in slides
- [ ] Training expiry/recertification
- [ ] Advanced reporting with exports
- [ ] Mobile-responsive improvements
- [ ] Assessment scheduling

### Long Term (6-12 months)
- [ ] Mobile app (React Native)
- [ ] Offline training capability
- [ ] SSO integration
- [ ] SCORM/xAPI compliance
- [ ] Multi-tenant white-labeling

---

## Support & Contact

**Developer:** Claude AI (via Anthropic)  
**Project Owner:** Eddy - Foodek Consulting  
**Repository:** GitHub (private)  
**Hosting:** Vercel  
**Database:** Supabase

---

*Document generated: December 7, 2025*
