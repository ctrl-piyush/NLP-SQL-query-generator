# SQL Query Generator

An AI-powered SQL assistant that converts natural language to optimized SQL queries. Built with **Next.js 14**, **Groq LLM** (Llama 3.3 70B), and **Role-Based Access Control**.

🔗 **Live Demo:** [Your Vercel URL here]

## Features

- **Natural Language → SQL** — Describe what you need in plain English
- **Multiple Alternatives** — Get 2–3 query approaches ranked by complexity
- **Live Database Execution** — Connect to MySQL/PostgreSQL and run queries directly
- **Query Explanations** — Clause-by-clause breakdown in simple terms
- **Impact Analysis** — Risk level, rows affected, warnings
- **Schema Auto-Detection** — Fetches table structure from live connections
- **Role-Based Access Control** — Viewer, Editor, Admin roles with server-side enforcement
- **Demo Mode** — Pre-configured database for instant exploration
- **MySQL & PostgreSQL** — Switch dialect in one click

## Quick Demo

Visit the live app and click **"Quick Demo — Try It Now"** on the login page. This signs you in with a demo account and gives you access to a sample database.

**Demo credentials:** `demo@demo.com` / `demo1234` (editor role — can execute SELECT queries)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| AI/LLM | Groq API (Llama 3.3 70B Versatile) |
| Auth | NextAuth.js (JWT, HTTP-only cookies) |
| RBAC Store | SQLite (better-sqlite3) |
| SQL Parsing | node-sql-parser |
| State | Zustand (localStorage persistence) |
| Deployment | Vercel |

## Roles & Permissions

| Capability | Viewer | Editor | Admin |
|-----------|--------|--------|-------|
| Generate queries | ✓ | ✓ | ✓ |
| View explanations | ✓ | ✓ | ✓ |
| Connect to database | ✗ | ✓ | ✓ |
| Execute SELECT | ✗ | ✓ | ✓ |
| Execute INSERT/UPDATE/DELETE | ✗ | ✗ | ✓ |
| Access Admin Panel | ✗ | ✗ | ✓ |
| Manage users | ✗ | ✗ | ✓ |

DDL operations (CREATE, DROP, ALTER) are blocked for all roles.

## Local Setup

### Prerequisites

- Node.js 18+
- [Groq API key](https://console.groq.com) (free)

### Install & Run

```bash
git clone https://github.com/ctrl-piyush/NLP-SQL-query-generator.git
cd NLP-SQL-query-generator
npm install
cp .env.example .env
# Edit .env — add GROQ_API_KEY and NEXTAUTH_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Accounts

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@admin.com | admin1234 | admin |
| Demo | demo@demo.com | demo1234 | editor |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key from [console.groq.com](https://console.groq.com) |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production | App URL (e.g., `https://your-app.vercel.app`) |
| `DEMO_DB_HOST` | No | Demo database host (for "Try Demo DB" feature) |
| `DEMO_DB_PORT` | No | Demo database port |
| `DEMO_DB_USER` | No | Demo database username |
| `DEMO_DB_PASSWORD` | No | Demo database password |
| `DEMO_DB_NAME` | No | Demo database name |

## Deploy to Vercel

1. Push to GitHub
2. Import in [vercel.com](https://vercel.com) → New Project
3. Add environment variables (GROQ_API_KEY, NEXTAUTH_SECRET, NEXTAUTH_URL, DEMO_DB_*)
4. Deploy

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handlers
│   │   ├── admin/users/         # User management (admin only)
│   │   ├── connect/             # Database connection
│   │   ├── connect-demo/        # Demo database connection
│   │   ├── execute/             # SQL execution + permissions
│   │   ├── generate/            # AI query generation
│   │   ├── explain/             # Query explanations
│   │   └── validate/            # Query validation
│   ├── admin/                   # Admin panel page
│   ├── login/                   # Login page
│   └── page.tsx                 # Main app
├── components/                  # React components
├── lib/
│   ├── auth.ts                  # NextAuth config
│   ├── permissions.ts           # Permission Engine
│   ├── clientPermissions.ts     # Client-side permission helpers
│   ├── rbac/                    # SQLite user store
│   ├── groq.ts                  # Groq API client
│   └── queryGenerator.ts        # LLM prompt logic
├── types/                       # TypeScript types
├── middleware.ts                # Auth middleware
└── __tests__/rbac/              # Permission & auth tests
```

## Security

- All routes protected by NextAuth middleware
- Passwords hashed with bcrypt (cost 10)
- HTTP-only secure session cookies (24h expiry)
- Server-side permission enforcement (pure-function Permission Engine)
- Account lockout after 5 failed attempts (15 min)
- Database credentials never stored server-side
- Demo database restricted to SELECT only

## License

MIT
