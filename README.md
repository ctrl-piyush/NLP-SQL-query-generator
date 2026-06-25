# SQL Query Generator

An intelligent AI-powered SQL assistant that converts natural language descriptions into optimized SQL queries, powered by **Groq's ultra-fast LLM inference** (Llama 3.3 70B).

## Features

- **Natural Language → SQL** — Describe what you need in plain English
- **Multiple Alternatives** — Get 2–3 query approaches for each request
- **Clause Breakdown** — Understand every part of the query in simple terms
- **Impact Analysis** — Estimate rows affected, risk level, warnings
- **Syntax Validation** — Detect errors and get optimization suggestions
- **Schema Awareness** — Add your custom tables for accurate results
- **Query History** — All queries saved locally for quick re-use
- **MySQL & PostgreSQL** — Switch database dialect in one click
- **Export** — Copy or download queries as `.sql` files

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **LLM**: Groq API (Llama 3.3 70B Versatile)
- **State**: Zustand (with localStorage persistence)
- **Syntax Highlighting**: react-syntax-highlighter
- **Deployment**: Vercel-ready

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd sql-query-generator
npm install
```

### 2. Get a Groq API key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for free
3. Create an API key

### 3. Set environment variable

```bash
cp .env.example .env.local
# Edit .env.local and add your key:
# GROQ_API_KEY=your_groq_api_key_here
```

### 4. Run

```bash
npm run dev
# Open http://localhost:3000
```

## Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repository
3. Add environment variable: `GROQ_API_KEY = your_key`
4. Click Deploy

Or via CLI:

```bash
npm i -g vercel
vercel
# Follow prompts, add GROQ_API_KEY when asked
```

## Project Structure

```
sql-query-generator/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   # Main query generation endpoint
│   │   ├── explain/route.ts    # Explain a SQL query
│   │   ├── validate/route.ts   # Validate & optimize SQL
│   │   └── history/route.ts    # History schema docs
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # Main application page
├── components/
│   ├── QueryInput.tsx          # Natural language input form
│   ├── ResultsPanel.tsx        # Tabbed results container
│   ├── QueryAlternatives.tsx   # Query options selector
│   ├── ExplanationPanel.tsx    # Clause-by-clause explanation
│   ├── ImpactPanel.tsx         # Risk & impact analysis
│   ├── ValidationPanel.tsx     # Syntax validation results
│   ├── SchemaViewer.tsx        # Table schema display
│   ├── SchemaEditor.tsx        # Custom schema input modal
│   ├── HistorySidebar.tsx      # Query history sidebar
│   ├── SqlCodeBlock.tsx        # Syntax-highlighted code
│   ├── Badge.tsx               # Reusable badge component
│   ├── LoadingSkeleton.tsx     # Loading state
│   └── ErrorDisplay.tsx        # Error messages
├── lib/
│   ├── groq.ts                 # Groq client & API helpers
│   ├── queryGenerator.ts       # Core LLM prompt logic
│   ├── store.ts                # Zustand state management
│   └── utils.ts                # Utility functions
├── types/
│   └── index.ts                # TypeScript types
├── .env.example
├── vercel.json
└── README.md
```

## API Endpoints

### POST `/api/generate`
Generate SQL queries from natural language.

**Request:**
```json
{
  "userInput": "Show all employees with salary > 50000",
  "databaseType": "mysql",
  "customTables": []
}
```

**Response:** Full `GeneratedQueryResult` with alternatives, explanation, impact, validation.

### POST `/api/explain`
Explain an existing SQL query.

```json
{ "sql": "SELECT * FROM users WHERE active = 1", "databaseType": "mysql" }
```

### POST `/api/validate`
Validate and optimize a SQL query.

```json
{ "sql": "SELECT * FROM users", "databaseType": "postgresql" }
```

## Example Queries

- `Show all employees whose salary is greater than ₹50,000`
- `Find the top 5 students with highest CGPA`
- `List all orders placed in the last 30 days with customer names`
- `Find customers who have never placed an order`
- `Count the number of employees in each department`
- `Increase salary of all IT employees by 10%`
- `Delete all products with stock less than 5`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Your Groq API key from console.groq.com |

## License

MIT
