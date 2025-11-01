# NFCentry - NFC Attendance System

An automated attendance tracking system that utilizes NFC technology to streamline event check-ins directly from a mobile browser. Built with Next.js 15, React 19, Supabase, and TypeScript.

![Status](https://img.shields.io/badge/Status-Active%20Development-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🎯 Project Overview

NFCentry is an attendance management system that enables organizations to track event attendance using NFC tags. Each attendee is issued an NFC tag linked to their profile, and designated attendance takers can scan these tags using compatible smartphones to mark attendance in real-time.

### Key Features

- **🔐 Authentication System** - Complete user authentication with Supabase (sign up, login, password reset, email confirmation)
- **👥 User Profile Management** - User registration, profile completion, and NFC tag assignment
- **🏢 Organization Management** - Create and manage organizations with role-based access control
- **👤 Membership System** - Manage organization memberships with hierarchical roles
- **📅 Event Management** - Create, update, and manage events for organizations
- **📱 NFC Integration** - Ready for Web NFC API implementation (Android Chrome)
- **🎨 Modern UI** - Built with Tailwind CSS and shadcn/ui components
- **🔒 Security** - Row-level security (RLS) policies and role-based permissions

## 🚀 Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React

### Backend & Database
- **Backend:** Supabase
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **Real-time:** Supabase Realtime (ready for future features)

### Development Tools
- **Package Manager:** npm
- **Code Quality:** TypeScript strict mode
- **CSS Framework:** Tailwind CSS with custom configuration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Git**
- **Supabase Account** (for backend services)
- **Android smartphone with NFC and Chrome browser** (for NFC scanning - future feature)

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

Get these values from your Supabase project dashboard:
1. Go to [supabase.com](https://supabase.com)
2. Create a new project or select existing
3. Navigate to Settings > API
4. Copy the Project URL and anon/public key

### 4. Database Setup

Run the SQL setup scripts in your Supabase SQL Editor in this order:

1. **User Setup:** `documents/USER_BACKEND_SETUP.md`
2. **Organizations:** `documents/setup-organizations.sql`
3. **Memberships:** `documents/setup-membership.sql`
4. **Events:** `documents/setup-events.sql`

Or use the comprehensive structure:
```bash
# Use the complete database structure
documents/CURRENT_DATABASE_STRUCTURE.sql
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Authentication routes
│   │   │   ├── login/
│   │   │   ├── sign-up/
│   │   │   ├── forgot-password/
│   │   │   └── update-password/
│   │   ├── (authenticated)/          # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── organizations/
│   │   │   ├── user/
│   │   │   └── complete-profile/
│   │   └── api/                      # API routes
│   │       ├── user/
│   │       ├── organization/
│   │       ├── membership/
│   │       └── event/
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   └── organizations/
│   ├── lib/                          # Utility functions
│   │   ├── services/                 # Business logic layer
│   │   │   ├── user.service.ts
│   │   │   ├── organization.service.ts
│   │   │   ├── membership.service.ts
│   │   │   └── event.service.ts
│   │   ├── authorization.ts          # Permission helpers
│   │   ├── client.ts                 # Client-side Supabase
│   │   └── server.ts                 # Server-side Supabase
│   ├── types/                        # TypeScript definitions
│   │   ├── user.ts
│   │   ├── organization.ts
│   │   ├── membership.ts
│   │   └── event.ts
│   └── middleware.ts                 # Next.js middleware
├── documents/                        # Documentation
│   ├── *_BACKEND_SETUP.md           # Setup guides
│   ├── *_API_REFERENCE.md           # API documentation
│   └── *_FEATURE_SUMMARY.md         # Feature overviews
└── public/                          # Static assets
```

## 🔑 Features & Capabilities

### ✅ Implemented Features

#### 1. User Management
- User registration with email verification
- Login/logout functionality
- Password reset flow
- Profile completion (first name, last name, student ID, NFC tag)
- Profile viewing and editing
- User lookup by NFC tag ID

#### 2. Organization Management
- Create organizations
- View user's organizations
- Update organization details
- Delete organizations (owner only)
- Transfer ownership
- Role-based access control (Owner, Admin, Attendance Taker, Member)

#### 3. Membership System
- Add members to organizations
- Update member roles
- Remove members
- List organization members with user details
- Filter memberships by user, organization, or role
- Automatic owner assignment on organization creation

#### 4. Event Management
- Create events for organizations
- View event details
- Update event information
- Delete events
- Filter events by organization
- Filter events by date range
- Search events by name, description, or location
- Get upcoming/past events

### 🚧 In Development
- NFC tag scanning functionality
- Attendance recording system
- Real-time attendance tracking
- Attendance reports and analytics
- Geolocation-based attendance verification

## 🎭 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Owner** | Full control: manage organization, delete organization, manage members, manage events, take attendance, view attendance |
| **Admin** | Manage organization, manage members, manage events, take attendance, view attendance (cannot delete org or transfer ownership) |
| **Attendance Taker** | Take attendance, view attendance only |
| **Member** | View attendance only |

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level security policies
- **Role-Based Access Control** - Hierarchical permission system
- **Server-Side Authentication** - Secure API routes with middleware
- **Email Verification** - Required for account activation
- **Secure Password Reset** - Email-based password recovery
- **Foreign Key Constraints** - Data integrity enforcement
- **Cascade Deletes** - Proper cleanup of related data

## 📱 Device Compatibility

### Current Web App
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Android Chrome, etc.)
- ✅ Responsive design for all screen sizes

### NFC Scanning (Future Feature)
- ✅ Android devices with NFC + Chrome browser
- ❌ iOS devices (Web NFC API not supported by Safari)

## 📖 API Documentation

Comprehensive API documentation is available in the `/documents` folder:

- **User API:** `documents/USER_BACKEND_SETUP.md`
- **Organization API:** `documents/ORGANIZATION_API_REFERENCE.md`
- **Membership API:** `documents/MEMBERSHIP_API_REFERENCE.md`
- **Event API:** `documents/EVENTS_API_REFERENCE.md`

### Quick API Reference

```
Authentication:
POST   /api/user/sign-up
POST   /api/user/login

User Management:
GET    /api/user
GET    /api/user/[id]
PUT    /api/user/[id]
DELETE /api/user/[id]

Organizations:
GET    /api/organization
POST   /api/organization
GET    /api/organization/[id]
PUT    /api/organization/[id]
DELETE /api/organization/[id]

Memberships:
GET    /api/membership
POST   /api/membership
PUT    /api/membership/[id]
DELETE /api/membership/[id]

Events:
GET    /api/event
POST   /api/event
GET    /api/event/[id]
PUT    /api/event/[id]
DELETE /api/event/[id]
```

## 🧪 Testing

The database includes test data scripts:

```bash
# Test data for organizations and memberships
documents/test-data-membership.sql

# Test data for events
documents/test-data-events.sql
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/CSci-153-Web-Systems-and-Technologies/batch-2025-nfc-attendance-system-web)

The easiest way to deploy is using the [Vercel Platform](https://vercel.com):

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add environment variables (Supabase URL and keys)
4. Deploy!

## 📚 Additional Documentation

- **Project Proposal:** `ProjectProposal.md`
- **Setup Instructions:** `SETUP_INSTRUCTIONS_MEMBERSHIP.md`
- **Implementation Summaries:** `documents/*_IMPLEMENTATION_SUMMARY.md`
- **Quick Start Guides:** `documents/*_QUICK_START.md`
- **Database Structure:** `documents/CURRENT_DATABASE_STRUCTURE.sql`

## 🤝 Contributing

This is an academic project for CSci-153: Web Systems and Technologies.

### Development Workflow

1. Create a feature branch from `develop`
2. Make your changes
3. Test thoroughly
4. Submit a pull request to `develop`
5. After review, changes are merged to `main`

## 🐛 Known Issues & Limitations

- NFC scanning only works on Android devices with Chrome browser
- iOS devices cannot use Web NFC API (Safari limitation)
- Initial setup requires NFC hardware infrastructure
- System limited to proximity-based attendance

## 📝 License

This project is part of an academic assignment and is for educational purposes.

## 👨‍💻 Author

**Jabez Rafael Abella**  
CSci-153: Web Systems and Technologies  
Batch 2025

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for backend infrastructure
- shadcn for the beautiful UI components
- Radix UI for accessible primitives
- The open-source community

## 📞 Support

For questions or issues related to this project:

1. Check the documentation in the `/documents` folder
2. Review the API reference guides
3. Check existing GitHub issues
4. Create a new issue with detailed information

---

**Note:** This project is under active development. Features and documentation are continuously being updated.
