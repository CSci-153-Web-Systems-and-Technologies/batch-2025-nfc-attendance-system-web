# NFCentry - NFC Attendance System

An automated attendance tracking system that utilizes NFC technology and QR codes to streamline event check-ins directly from a mobile browser. Built with Next.js 15, React 19, Supabase, and TypeScript.

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## 🎯 Project Overview

NFCentry is a comprehensive attendance management system that enables organizations to track event attendance using NFC tags, QR codes, or manual entry. Each attendee receives a unified tag identifier that works with both NFC and QR code scanning, providing flexibility across different devices and scenarios.

The system features role-based access control, real-time attendance updates, geolocation tracking, attendance windows, and a complete tag management system with rotation cooldowns and two-phase commit protection.

---

## ✨ Key Features

### 🔐 Authentication & User Management
- **Complete Authentication Flow** - Email/password sign-up, login, email confirmation
- **Password Management** - Forgot password, password reset, update password
- **Profile Management** - Complete profile setup with name, email, user type (Student/Faculty)
- **Multi-Provider Support** - Ready for OAuth providers (Google, GitHub, Azure, Facebook)
- **Profile Completion Flow** - Mandatory profile completion after first sign-up

### 👥 Organization Management
- **Create Organizations** - Users can create and manage multiple organizations
- **Organization Tags** - Short unique identifiers (e.g., "FOC" for Faculty of Computing)
- **Join Request System** - Request-based workflow for joining organizations
- **Approval Workflow** - Owners/Admins can approve or reject join requests
- **Organization Discovery** - Search and browse available organizations
- **Member Management** - View, manage, and update member roles

### 🎭 Role-Based Access Control
Four hierarchical roles with specific permissions:
- **Owner** - Full control, can manage all members and settings
- **Admin** - Can manage events, attendance, and members (except Owner)
- **Attendance Taker** - Can mark attendance for events
- **Member** - Basic access, can view events and attend

### 📅 Event Management
- **Create & Manage Events** - Schedule events with name, date, location, description
- **Attendance Windows** - Define when attendance can be marked (event_start to event_end)
- **Reminder-Only Events** - Create events without attendance tracking
- **Event Details** - Rich information including venue, description (max 2000 chars)
- **Event Validation** - Name length (3-200 chars), location (max 500 chars)
- **Organization-Scoped** - Events belong to organizations

### 📊 Attendance Tracking
- **Multiple Scan Methods**:
  - **NFC Scanning** - Tap NFC tags on Android Chrome (Web NFC API)
  - **QR Code Scanning** - Camera-based scanning (cross-platform)
  - **Manual Entry** - Fallback for technical issues
- **Real-Time Updates** - See attendance as people check in (Supabase Realtime)
- **Geolocation Tracking** - Optional GPS coordinates for verification
- **Attendance Statistics** - Rates, scan method breakdowns, attendee lists
- **Attendance Notes** - Optional notes up to 1000 characters
- **Duplicate Prevention** - One attendance per user per event

### 🏷️ Unified Tag System
- **Single Tag ID** - One identifier for both NFC and QR codes
- **Tag Rotation** - 14-day cooldown between tag writes
- **Two-Phase Commit** - Prevents database/NFC desynchronization:
  1. Prepare tag (pending state)
  2. Write to NFC/generate QR
  3. Confirm success (activate) or expire (rollback)
- **Tag History** - Complete audit trail of all tag writes
- **QR Code Generation** - Automatic QR code creation for each tag
- **NFC Tag Writing** - Direct Web NFC API integration (Android Chrome)

### 📎 File Upload System
- **Event Attachments** - Upload documents and images to events
- **Featured Images** - Event posters displayed prominently (recommended 16:9, 1200x675px)
- **Multiple File Types** - Support for PDF, Word (.doc/.docx), JPG, PNG
- **File Limits** - Max 10 files per event, 20MB per file
- **Attendee-Only Access** - Files visible only to users who attended the event
- **File Management** - Add/delete files anytime during event editing
- **Individual Validation** - Per-file error messages for type/size violations
- **Automatic Cleanup** - Files deleted 3 days after event ends (grace period)
- **Admin Control** - Organization owners/admins can trigger manual cleanup via API
- **Storage Integration** - Files stored in Supabase Storage with RLS policies

### 🎨 User Interface
- **Modern Design** - Built with Tailwind CSS 4 and shadcn/ui components
- **Dark Mode** - Full dark/light theme support with persistence
- **Responsive Layout** - Mobile-first design, works on all screen sizes
- **Sidebar Navigation** - Intuitive navigation with organization switcher
- **Theme Toggle** - User preference saved in cookies (1-year persistence)
- **Loading States** - Skeleton loaders and loading indicators
- **Error Handling** - User-friendly error messages and validation

### 🔒 Security & Privacy
- **Row-Level Security (RLS)** - PostgreSQL RLS policies on all tables
- **Role-Based Permissions** - Granular access control per organization
- **Authentication Required** - Protected routes with middleware
- **CSRF Protection** - Secure form handling
- **SQL Injection Prevention** - Parameterized queries via Supabase
- **Tag Validation** - Ensures tag uniqueness and format
- **Cooldown Enforcement** - Prevents tag abuse and rapid rotation

---

## 🚀 Technology Stack

### Frontend
- **Framework:** Next.js 15.5.4 (App Router)
- **UI Library:** React 19.1.0
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 with PostCSS
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React (v0.545.0)
- **Theme Management:** next-themes (v0.4.6)
- **Date Handling:** date-fns (v4.1.0), dayjs (v1.11.19), react-day-picker (v9.11.1)

### Backend & Database
- **Backend:** Supabase
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth (@supabase/supabase-js v2.74.0)
- **SSR Support:** @supabase/ssr (v0.7.0)
- **Real-time:** Supabase Realtime (for live attendance updates)

### NFC & QR Code
- **NFC:** Web NFC API (browser native)
- **QR Generation:** qrcode (v1.5.4)
- **QR Scanning:** html5-qrcode (v2.3.8)

### Development Tools
- **Package Manager:** npm
- **Code Quality:** TypeScript strict mode
- **Styling:** Tailwind CSS with custom animations (tw-animate-css)
- **Utilities:** clsx, tailwind-merge, class-variance-authority

---

## 📊 Database Schema

The system uses PostgreSQL with the following main tables:

### Core Tables
- **`users`** - User profiles with unified tag_id, email, name, user_type
- **`organizations`** - Organization entities with name, tag, description
- **`organization_members`** - Membership relationships with roles
- **`events`** - Event details with attendance windows
- **`event_attendance`** - Attendance records with scan method, geolocation

### Tag Management Tables
- **`user_tag_writes`** - History of all tag generations (for cooldown)
- **`user_tag_pending`** - Pending tags awaiting NFC write confirmation

### Join Request Tables
- **`organization_join_requests`** - Pending join requests with status

For detailed schema information, see:
- [Database Structure](./documents/CURRENT_DATABASE_STRUCTURE.sql)
- [User Documentation](./documents/USER_DOCUMENTATION.md)
- [Organization Documentation](./documents/ORGANIZATION_DOCUMENTATION.md)
- [Event Documentation](./documents/EVENT_DOCUMENTATION.md)
- [Attendance Documentation](./documents/ATTENDANCE_DOCUMENTATION.md)
- [Tag Management Documentation](./documents/TAG_MANAGEMENT_DOCUMENTATION.md)

---

## 📋 Prerequisites

Before you begin, ensure you have the following:

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Git**
- **Supabase Account** (free tier available at [supabase.com](https://supabase.com))
- **For NFC Features:**
  - Android smartphone with NFC capability
  - Google Chrome browser (version 89+)
  - iOS devices do NOT support Web NFC API

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/CSci-153-Web-Systems-and-Technologies/batch-2025-nfc-attendance-system-web.git
cd batch-2025-nfc-attendance-system-web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Get these values from Supabase:**
1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select an existing one
3. Navigate to **Settings** → **API**
4. Copy the **Project URL** and **anon/public key**

### 4. Database Setup

Run the SQL migration files in your Supabase SQL Editor **in this order**:

#### Option A: Complete Setup (Recommended)
Use the comprehensive database structure:
```sql
-- Run this file in Supabase SQL Editor
documents/CURRENT_DATABASE_STRUCTURE.sql
```

#### Option B: Step-by-Step Setup
1. **User System:**
   ```sql
   documents/migrations/attendance_system_migration.sql
   ```

2. **Tag Management:**
   ```sql
   -- Adds tag_id, user_tag_writes, user_tag_pending tables
   documents/migrations/tag_confirmation_migration.sql
   ```

3. **Attendance Windows:**
   ```sql
   -- Adds event_start and event_end columns
   documents/migrations/event_attendance_window_migration.sql
   ```

### 5. Enable Row-Level Security (RLS)

The migration files include RLS policies, but verify they're enabled:

1. Go to Supabase Dashboard → **Database** → **Tables**
2. For each table, ensure **RLS is enabled**
3. Check that policies are created under the **Policies** tab

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. First-Time Setup

1. **Create an account** - Sign up with email
2. **Verify email** - Check inbox for confirmation link
3. **Complete profile** - Add name and select user type (Student/Faculty)
4. **Create or join organization** - Start managing events

---

## 🎮 Usage Guide

### For Users

#### Creating Your Profile
1. Sign up with email and password
2. Verify your email address
3. Complete your profile (name, user type)
4. Generate your tag ID (NFC/QR code)

#### Getting Your Tag
**Option 1: NFC Tag (Android Only)**
1. Go to User Profile
2. Click "Program New Tag"
3. Tap your blank NFC card when prompted
4. Tag is written and activated

**Option 2: QR Code (All Devices)**
1. Go to User Profile
2. Your QR code is automatically generated
3. Save or print your QR code
4. Present it during attendance taking

**Tag Rotation:** Tags can only be regenerated every 14 days for security.

#### Joining Organizations
1. Navigate to **Organizations** → **Search**
2. Browse available organizations
3. Click **Request to Join**
4. Wait for Owner/Admin approval
5. Once approved, you'll see the organization in your list

### For Organization Owners/Admins

#### Creating an Organization
1. Go to **Organizations** → **Create**
2. Enter organization name, tag (e.g., "FOC"), and description
3. Click **Create Organization**
4. You're automatically set as Owner

#### Managing Join Requests
1. Go to your organization
2. Click **Requests** tab
3. Review pending requests
4. Approve or reject each request

#### Managing Members
1. Go to **Members** tab
2. View all organization members
3. Update roles (Member → Attendance Taker → Admin)
4. Note: You cannot modify Owner role or your own role

#### Creating Events
1. Select your organization
2. Click **Events** → **Create Event**
3. Fill in event details:
   - Event name (3-200 chars)
   - Date and time
   - Location (optional, max 500 chars)
   - Description (optional, max 2000 chars)
4. Set attendance window (optional):
   - **Event Start** - When attendance opens
   - **Event End** - When attendance closes
   - Leave empty for reminder-only events
5. Click **Create Event**

### For Attendance Takers

#### Marking Attendance
1. Navigate to the event
2. Click **Take Attendance**
3. Choose scanning method:

**NFC Scanning (Android Chrome):**
1. Click **Scan NFC**
2. Ask attendee to tap their NFC tag
3. Attendance is automatically marked
4. See real-time confirmation

**QR Code Scanning:**
1. Click **Scan QR Code**
2. Allow camera access
3. Point camera at attendee's QR code
4. Attendance is automatically marked

**Manual Entry:**
1. Click **Manual Entry**
2. Search for attendee by name/email
3. Select attendee
4. Click **Mark Attendance**

#### Viewing Attendance
- See real-time attendance list
- View statistics (attendance rate, total attendees)
- Check scan method breakdown
- Export attendance data (if implemented)

---

## 📁 Project Structure

```
batch-2025-nfc-attendance-system-web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Authentication pages
│   │   │   ├── login/
│   │   │   ├── sign-up/
│   │   │   ├── forgot-password/
│   │   │   ├── update-password/
│   │   │   └── confirm/
│   │   ├── (authenticated)/          # Protected routes
│   │   │   ├── dashboard/            # User dashboard
│   │   │   ├── organizations/        # Organization management
│   │   │   ├── events/               # Event management
│   │   │   ├── user/                 # User profile & settings
│   │   │   └── complete-profile/     # Profile completion
│   │   └── api/                      # API routes
│   │       ├── user/                 # User APIs
│   │       ├── organization/         # Organization APIs
│   │       ├── membership/           # Membership APIs
│   │       ├── event/                # Event APIs
│   │       ├── attendance/           # Attendance APIs
│   │       └── theme/                # Theme preference API
│   │
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── events/                   # Event-related components
│   │   │   ├── attendance-scanner.tsx
│   │   │   ├── create-event-form.tsx
│   │   │   └── attendance-list.tsx
│   │   ├── organizations/            # Organization components
│   │   └── user/                     # User components
│   │       └── tag-writer.tsx        # NFC tag writing
│   │
│   ├── lib/                          # Utility libraries
│   │   ├── client.ts                 # Supabase client
│   │   ├── server.ts                 # Supabase server
│   │   ├── middleware.ts             # Auth middleware
│   │   ├── authorization.ts          # Permission checks
│   │   ├── theme.ts                  # Theme server utils
│   │   ├── theme-client.ts           # Theme client utils
│   │   ├── constants.ts              # App constants
│   │   └── services/                 # Service layer
│   │
│   ├── types/                        # TypeScript types
│   │   ├── user.ts
│   │   ├── organization.ts
│   │   ├── membership.ts
│   │   ├── event.ts
│   │   ├── attendance.ts
│   │   └── tag.ts
│   │
│   └── middleware.ts                 # Next.js middleware
│
├── documents/                        # Documentation
│   ├── USER_DOCUMENTATION.md
│   ├── ORGANIZATION_DOCUMENTATION.md
│   ├── MEMBERSHIP_DOCUMENTATION.md
│   ├── EVENT_DOCUMENTATION.md
│   ├── ATTENDANCE_DOCUMENTATION.md
│   ├── TAG_MANAGEMENT_DOCUMENTATION.md
│   ├── CURRENT_DATABASE_STRUCTURE.sql
│   └── migrations/                   # SQL migrations
│
├── public/                           # Static assets
├── supabase/                         # Supabase config (if using local dev)
├── .env.local                        # Environment variables (create this)
├── next.config.ts                    # Next.js configuration
├── tailwind.config.js                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
└── package.json                      # Dependencies
```

---

## 🔑 API Reference

### Authentication APIs
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/update-password` - Update password

### User APIs
- `GET /api/user/profile` - Get current user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/tag/prepare` - Prepare tag for writing (Phase 1)
- `POST /api/user/tag/confirm` - Confirm tag write success (Phase 2)
- `GET /api/user/tag/status` - Check tag rotation status

### Organization APIs
- `GET /api/organization` - List user's organizations
- `POST /api/organization` - Create new organization
- `GET /api/organization/[id]` - Get organization details
- `PUT /api/organization/[id]` - Update organization
- `DELETE /api/organization/[id]` - Delete organization
- `GET /api/organization/search` - Search organizations

### Membership APIs
- `POST /api/membership/request` - Request to join organization
- `GET /api/membership/requests/[org_id]` - Get pending requests
- `POST /api/membership/approve` - Approve join request
- `POST /api/membership/reject` - Reject join request
- `PUT /api/membership/role` - Update member role
- `DELETE /api/membership/[id]` - Remove member

### Event APIs
- `GET /api/event?organization_id=[id]` - List organization events
- `POST /api/event` - Create new event
- `GET /api/event/[id]` - Get event details
- `PUT /api/event/[id]` - Update event
- `DELETE /api/event/[id]` - Delete event

### Attendance APIs
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance?event_id=[id]` - Get event attendance
- `GET /api/attendance/stats?event_id=[id]` - Get attendance statistics

### Theme API
- `GET /api/theme` - Get current theme preference
- `POST /api/theme` - Set theme preference (light/dark)

For detailed API documentation, see the individual documentation files in the `documents/` folder.

---

## 🔒 Security Features

### Authentication & Authorization
- **Supabase Auth** - Industry-standard authentication
- **Email Verification** - Required for new accounts
- **Password Hashing** - Secure password storage (handled by Supabase)
- **JWT Tokens** - Stateless authentication
- **Session Management** - Secure cookie-based sessions

### Database Security
- **Row-Level Security (RLS)** - PostgreSQL RLS on all tables
- **Role-Based Access** - Granular permissions per organization
- **Foreign Key Constraints** - Referential integrity
- **Check Constraints** - Data validation at database level
- **Unique Constraints** - Prevent duplicate entries

### Tag Security
- **14-Day Cooldown** - Prevents rapid tag rotation
- **Two-Phase Commit** - Prevents database/NFC desync
- **Tag History** - Complete audit trail
- **Unique Tags** - Each tag_id is globally unique (UUID)
- **Pending Tag Expiration** - Auto-cleanup after 5 minutes

### Application Security
- **CSRF Protection** - Secure form handling
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - React's built-in escaping
- **Type Safety** - TypeScript throughout
- **Input Validation** - Client and server-side validation

---

## 🚧 Known Limitations

### NFC Support
- **Android Only** - Web NFC API only works on Android Chrome 89+
- **iOS Not Supported** - iOS does not support Web NFC API
- **Desktop Not Supported** - NFC writing requires mobile device
- **Fallback Available** - QR codes work on all platforms

### Browser Compatibility
- **Chrome/Edge** - Full support (recommended)
- **Safari** - Works but no NFC support
- **Firefox** - Works but limited Web NFC support

### Tag System
- **Cooldown Period** - 14 days between tag rotations (by design)
- **Lost Tags** - Users must wait for cooldown if tag is lost
- **No Tag Recovery** - Cannot retrieve old tag IDs

---

## 🐛 Troubleshooting

### NFC Not Working
**Problem:** "NFC is not supported on this device"
- **Solution:** Use Android device with Chrome 89+ browser
- **Fallback:** Use QR code instead

**Problem:** "NFC permission denied"
- **Solution:** Enable NFC in device settings
- **Solution:** Grant browser NFC permissions

### Authentication Issues
**Problem:** "Email confirmation required"
- **Solution:** Check email inbox/spam for confirmation link
- **Solution:** Resend confirmation email from login page

**Problem:** Cannot login after signup
- **Solution:** Verify email first
- **Solution:** Check credentials are correct

### Database Errors
**Problem:** "Permission denied" errors
- **Solution:** Ensure RLS policies are created
- **Solution:** Check user has correct role in organization

**Problem:** "Duplicate key error"
- **Solution:** Tag ID already exists (wait for cooldown)
- **Solution:** Email already registered (use different email)

### Tag Rotation Issues
**Problem:** "Cannot generate new tag yet"
- **Solution:** Wait for 14-day cooldown period
- **Solution:** Check tag status in user profile

**Problem:** "Tag write failed but database updated"
- **Solution:** This is prevented by two-phase commit
- **Solution:** Pending tag will expire in 5 minutes

---

## 📚 Documentation

Comprehensive documentation is available in the `documents/` folder:

### System Documentation
- **[CURRENT_DATABASE_STRUCTURE.sql](./documents/CURRENT_DATABASE_STRUCTURE.sql)** - Complete database schema
- **[USER_DOCUMENTATION.md](./documents/USER_DOCUMENTATION.md)** - User system details
- **[ORGANIZATION_DOCUMENTATION.md](./documents/ORGANIZATION_DOCUMENTATION.md)** - Organization features
- **[MEMBERSHIP_DOCUMENTATION.md](./documents/MEMBERSHIP_DOCUMENTATION.md)** - Membership system
- **[EVENT_DOCUMENTATION.md](./documents/EVENT_DOCUMENTATION.md)** - Event management
- **[ATTENDANCE_DOCUMENTATION.md](./documents/ATTENDANCE_DOCUMENTATION.md)** - Attendance tracking
- **[TAG_MANAGEMENT_DOCUMENTATION.md](./documents/TAG_MANAGEMENT_DOCUMENTATION.md)** - Tag system

### Implementation Guides
- **[DARK_MODE_IMPLEMENTATION.md](./DARK_MODE_IMPLEMENTATION.md)** - Dark mode setup
- **[TAG_CONFIRMATION_IMPLEMENTATION.md](./TAG_CONFIRMATION_IMPLEMENTATION.md)** - Two-phase commit
- **[TAG_ROTATION_STRICT_MODE.md](./TAG_ROTATION_STRICT_MODE.md)** - Tag rotation logic
- **[TAG_SYSTEM_EXPLANATION.md](./TAG_SYSTEM_EXPLANATION.md)** - Unified tag system
- **[THEME_INTEGRATION_GUIDE.md](./THEME_INTEGRATION_GUIDE.md)** - Theme implementation
- **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** - Testing guidelines

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Standards
- Use TypeScript for all new code
- Follow existing code style and conventions
- Add comments for complex logic
- Update documentation for new features
- Test your changes thoroughly

### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove)
- Reference issue numbers when applicable

---

## 📝 License

This project is developed as part of CSci-153 Web Systems and Technologies course.

**Repository:** [batch-2025-nfc-attendance-system-web](https://github.com/CSci-153-Web-Systems-and-Technologies/batch-2025-nfc-attendance-system-web)  
**Organization:** CSci-153-Web-Systems-and-Technologies

---

## 👥 Team

This project is being developed by students in the CSci-153 course.

---

## 🙏 Acknowledgments

- **[Supabase](https://supabase.com)** - Backend and database infrastructure
- **[Next.js](https://nextjs.org)** - React framework
- **[shadcn/ui](https://ui.shadcn.com)** - UI component library
- **[Tailwind CSS](https://tailwindcss.com)** - Styling framework
- **[Radix UI](https://www.radix-ui.com)** - Accessible component primitives
- **Web NFC API** - Browser-based NFC technology

---

## 📞 Support

For questions or issues:
1. Check the [documentation](./documents/)
2. Review [troubleshooting](#-troubleshooting) section
3. Open an issue on GitHub
4. Contact the development team

---

## 🗺️ Roadmap

### Completed Features ✅
- User authentication and profile management
- Organization creation and management
- Role-based access control
- Event creation with attendance windows
- Multi-method attendance tracking (NFC, QR, Manual)
- Event file upload system with attendee-only access
- Featured images for events (event posters)
- Automatic file cleanup (3-day grace period)

### Future Enhancements 🚀
- Analytics dashboard with charts
- Attendance reports (PDF/CSV export)
- Email notifications for events
- Calendar integration
- Mobile app (React Native)
- Advanced reporting and analytics
- Event templates
- Recurring events
- **File Upload Improvements**:
   - Magic byte validation for enhanced security
   - Organization-level storage quotas
   - Concurrent file edit conflict resolution
   - File version history
   - Bulk file operations
- Map preview on event detail pages

---

**Built with ❤️ using Next.js, React, TypeScript, and Supabase**
