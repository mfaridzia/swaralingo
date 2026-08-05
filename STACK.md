# Tech Stack Specifications & Selection Rules

- **Language**: TypeScript v5+ (Strict Mode Enabled)
- **Runtime Selection Rules**:
  - Default: **Bun** untuk local dev & proyek baru (fastest DX, `bun test`).
  - Fallback: **Node.js LTS** untuk deployment Vercel / AWS Lambda / Legacy C++ bindings.
- **Architecture Pattern**:
  - **Decoupled**: Vite + React 18+ + TanStack Router + Hono.js
  - **Unified Monolith**: Next.js 14+ App Router + Hono API (`app/api/[[...route]]/route.ts`)
- **State & Data Fetching**: TanStack Query v5
- **Styling**: Tailwind CSS v3 / v4
- **ORM**: Drizzle ORM
- **Database**: SQLite (Better-SQLite3/Turso) OR PostgreSQL (Neon/Supabase)
- **Validation**: Zod
- **Testing**: Vitest (Unit/Integration) & Playwright (E2E)
- **Monitoring & Observability**: Sentry / Highlight.io & Structured JSON Logging
