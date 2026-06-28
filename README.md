# SQL Query Generator

An intelligent AI-powered SQL assistant that converts natural language descriptions into optimized SQL queries, powered by **Groq's ultra-fast LLM inference** (Llama 3.3 70B). Includes Role-Based Access Control (RBAC) for secure multi-user environments.

## Features

- **Natural Language → SQL** — Describe what you need in plain English
- **Multiple Alternatives** — Get 2–3 query approaches for each request
- **Live Database Execution** — Connect to MySQL or PostgreSQL and run queries directly
- **Clause Breakdown** — Understand every part of the query in simple terms
- **Impact Analysis** — Estimate rows affected, risk level, warnings
- **Syntax Validation** — Detect errors and get optimization suggestions
- **Schema Awareness** — Auto-detect schema from live connections or add custom tables
- **Role-Based Access Control** — Three roles (viewer, editor, admin) with server-side permission enforcement
- **Admin Panel** — Manage users, assign roles, configure table access
- **Query History** — All queries saved locally for quick re-use
- **MySQL & PostgreSQL** — Switch database dialect in one click
- **Export** — Copy or download queries as `.sql` files

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **LLM**: Groq API (Llama 3.3 70B Versatile)
- **Authentication**: NextAuth.js (JWT strategy, HTTP-only cookies)
- **Database (RBAC)**: SQLite via better-sqlite3
- **State**: Zustand (with localStorage persistence)
- **SQL Parsing**: node-sql-parser (server-side permission engine)
- **Deployment**: Vercel or any Node.js hosting

## Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- A [Groq API key](https://console.groq.com) (free tier available)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd sql-query-generator
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required — get from https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# Required — secret for signing JWTs
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your_random_secret_here

# Required for production — your app's URL
NEXTAUTH_URL=http://localhost:3000
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Log in

Default admin credentials (created automatically on first run):

- **Email:** `admin@admin.com`
- **Password:** `admin1234`

> Change the admin password immediately after first login by creating a new admin user in the Admin Panel, then demoting or deleting the default account.

## Roles and Permissions

| Capability | Viewer | Editor | Admin |
|-----------|--------|--------|-------|
| Generate queries | ✓ | ✓ | ✓ |
| View explanations/impact | ✓ | ✓ | ✓ |
| Connect to database | ✗ | ✓ | ✓ |
| Execute SELECT (allowed tables) | ✗ | ✓ | ✓ |
| Execute SELECT (all tables) | ✗ | ✗ | ✓ |
| Execute INSERT/UPDATE/DELETE | ✗ | ✗ | ✓ |
| View all schema tables | ✗ | ✗ | ✓ |
| Access Admin Panel | ✗ | ✗ | ✓ |
| Manage users/roles | ✗ | ✗ | ✓ |

> DDL operations (CREATE, DROP, ALTER) are blocked for all roles.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Your Groq API key from [console.groq.com](https://console.groq.com) |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production | Your app's canonical URL (e.g., `https://your-app.vercel.app`) |
| `RBAC_DB_PATH` | No | Path to SQLite database file. Defaults to `./data/rbac.db` |

## Deploy to Vercel

### Option 1: Vercel Dashboard

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repository
3. Add environment variables in the Vercel dashboard:
   - `GROQ_API_KEY` = your Groq API key
   - `NEXTAUTH_SECRET` = your generated secret
   - `NEXTAUTH_URL` = your Vercel deployment URL (e.g., `https://sql-query-gen.vercel.app`)
4. Click **Deploy**

> **Important:** Vercel's serverless functions use ephemeral filesystems. The SQLite database (`data/rbac.db`) will reset between cold starts. For production use with persistent users, consider migrating RBAC storage to a hosted database (Turso, PlanetScale, or Neon).

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel

# Follow the prompts, then set env vars:
vercel env add GROQ_API_KEY
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL

# Redeploy with env vars
vercel --prod
```

## Deploy to a VPS (Persistent SQLite)

For persistent user data, deploy to a VPS where the filesystem is stable:

### 1. Set up the server

```bash
# On your server (Ubuntu/Debian example)
sudo apt update
sudo apt install -y nodejs npm

# Clone and install
git clone <your-repo-url>
cd sql-query-generator
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
nano .env
# Fill in GROQ_API_KEY, NEXTAUTH_SECRET, NEXTAUTH_URL
```

### 3. Build and run

```bash
npm run build
npm start
# App runs on port 3000 by default
```

### 4. Use a process manager (recommended)

```bash
npm i -g pm2
pm2 start npm --name "sql-query-gen" -- start
pm2 save
pm2 startup  # auto-start on reboot
```

### 5. Reverse proxy with Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then add SSL with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Deploy with Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t sql-query-gen .
docker run -d -p 3000:3000 \
  -e GROQ_API_KEY=your_key \
  -e NEXTAUTH_SECRET=your_secret \
  -e NEXTAUTH_URL=https://your-domain.com \
  -v sql-data:/app/data \
  sql-query-gen
```

The `-v sql-data:/app/data` mounts a volume so the SQLite database persists across container restarts.

## Project Structure

```
sql-query-generator/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth API handlers
│   │   ├── admin/users/route.ts         # Admin user management
│   │   ├── connect/route.ts             # Database connection + schema
│   │   ├── execute/route.ts             # SQL execution with permission checks
│   │   ├── generate/route.ts            # AI query generation
│   │   ├── explain/route.ts             # Query explanation
│   │   ├── validate/route.ts            # Query validation
│   │   └── history/route.ts             # History schema docs
│   ├── admin/page.tsx                   # Admin panel (user management)
│   ├── login/page.tsx                   # Login page
│   ├── layout.tsx                       # Root layout with SessionProvider
│   └── page.tsx                         # Main application page
├── components/
│   ├── RoleBadge.tsx                    # Role display + admin link + logout
│   ├── SessionProviderWrapper.tsx       # NextAuth session wrapper
│   ├── QueryInput.tsx                   # Natural language input
│   ├── QueryAlternatives.tsx            # Query options with execute buttons
│   ├── SchemaViewer.tsx                 # Filtered schema display
│   ├── ConnectionModal.tsx              # Database connection form
│   └── ...                              # Other UI components
├── lib/
│   ├── auth.ts                          # NextAuth configuration
│   ├── permissions.ts                   # Permission Engine (pure functions)
│   ├── clientPermissions.ts             # Client-side permission helpers
│   ├── rbac/
│   │   ├── db.ts                        # SQLite initialization
│   │   └── userStore.ts                 # User CRUD + auth helpers
│   ├── groq.ts                          # Groq client
│   ├── queryGenerator.ts                # LLM prompt logic
│   ├── store.ts                         # Zustand state
│   └── utils.ts                         # Utilities
├── types/
│   ├── index.ts                         # App types
│   ├── rbac.ts                          # RBAC types
│   └── next-auth.d.ts                   # NextAuth type extensions
├── middleware.ts                         # Auth middleware (protects all routes)
├── data/                                 # SQLite database (auto-created)
├── .env.example
├── vercel.json
└── package.json
```

## API Endpoints

All API endpoints require authentication (return 401 if no session).

### POST `/api/generate`
Generate SQL queries from natural language. Schema is filtered based on user's allowed tables.

### POST `/api/execute`
Execute SQL queries. Enforces role-based permission checks (viewer blocked, editor SELECT-only on allowed tables, admin full DML access).

### POST `/api/connect`
Test database connectivity and fetch schema. Blocked for viewer role.

### POST `/api/explain`
Explain an existing SQL query clause-by-clause.

### POST `/api/validate`
Validate and optimize a SQL query.

### GET `/api/admin/users`
List all users (admin only).

### POST `/api/admin/users`
Create a new user (admin only).

### PATCH `/api/admin/users/[id]`
Update user role or allowed tables (admin only).

## Security Notes

- All routes are protected by NextAuth.js middleware — unauthenticated users are redirected to `/login`
- Passwords are hashed with bcrypt (cost factor 10)
- Session tokens are HTTP-only secure cookies (24-hour expiry)
- Permission enforcement happens server-side regardless of client UI state
- Account lockout after 5 failed login attempts (15-minute cooldown)
- Database credentials are never stored server-side — supplied per-request from the browser
- DDL operations (CREATE, DROP, ALTER) are blocked for all roles as a safety measure

## License

MIT
