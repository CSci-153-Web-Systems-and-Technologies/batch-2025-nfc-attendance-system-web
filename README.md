# NFCentry

An automated attendance tracking system using NFC technology and QR codes for seamless event check-ins.

![Next.js](https://img.shields.io/badge/Next.js-15.5.7-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/CSci-153-Web-Systems-and-Technologies/batch-2025-nfc-attendance-system-web)

## Features

- **Multi-Method Attendance** — NFC tags, QR codes, or manual entry
- **Real-Time Updates** — Live attendance tracking via Supabase Realtime
- **Organization Management** — Create organizations, manage members, handle join requests
- **Event Scheduling** — Attendance windows, locations with map preview, file attachments
- **Unified Tag System** — Single tag ID works with both NFC and QR scanning
- **Role-Based Access** — Owner, Admin, Attendance Taker, Member roles
- **Dark Mode** — Full theme support with persistence

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| NFC/QR | Web NFC API, html5-qrcode, qrcode |
| Maps | Leaflet, React Leaflet |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- [Supabase](https://supabase.com) account

### Installation

```bash
# Clone the repository
git clone https://github.com/CSci-153-Web-Systems-and-Technologies/batch-2025-nfc-attendance-system-web.git
cd batch-2025-nfc-attendance-system-web

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` with your Supabase credentials:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Get these from: Supabase Dashboard → Settings → API

### Database Setup

Run the SQL migrations in Supabase SQL Editor:

```sql
-- Complete database structure
documents/CURRENT_DATABASE_STRUCTURE.sql

-- Enable real-time for attendance (optional)
documents/migrations/enable_attendance_realtime.sql
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Role Hierarchy

| Role | Permissions |
|------|------------|
| **Owner** | Full control, manage all settings and members |
| **Admin** | Manage events, attendance, members (except Owner) |
| **Attendance Taker** | Mark attendance for events |
| **Member** | View events, attend events |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, sign-up, password reset
│   ├── (authenticated)/  # Protected routes (dashboard, orgs, events)
│   └── api/              # API routes
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── events/           # Event & attendance components
│   ├── organizations/    # Organization components
│   └── user/             # User profile & tag components
├── lib/                  # Utilities, Supabase clients
└── types/                # TypeScript definitions
```

## Documentation

Detailed documentation is available in the [`documents/`](./documents/) folder:

- [Database Structure](./documents/CURRENT_DATABASE_STRUCTURE.sql)
- [User System](./documents/USER_DOCUMENTATION.md)
- [Organizations](./documents/ORGANIZATION_DOCUMENTATION.md)
- [Events](./documents/EVENT_DOCUMENTATION.md)
- [Attendance](./documents/ATTENDANCE_DOCUMENTATION.md)
- [Tag Management](./documents/TAG_MANAGEMENT_DOCUMENTATION.md)

## Known Limitations

- **NFC requires Android Chrome 89+** — iOS does not support Web NFC API
- **Tag cooldown: 14 days** — Security measure to prevent rapid rotation
- **Geolocation optional** — Requires user permission

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Developed as part of CSci-153 Web Systems and Technologies course.

## Acknowledgments

- [Supabase](https://supabase.com) — Backend infrastructure
- [Next.js](https://nextjs.org) — React framework
- [shadcn/ui](https://ui.shadcn.com) — UI components
- [Tailwind CSS](https://tailwindcss.com) — Styling

---

**Built with Next.js, React, TypeScript, and Supabase**
