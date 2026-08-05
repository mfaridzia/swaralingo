# 🚀 Universal AI-Native Fullstack Boilerplate

> **Enterprise-Grade Architecture Blueprint for Google Antigravity & Claude Code CLI**

![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Hono.js](https://img.shields.io/badge/Hono.js-Ultra_Fast-orange.svg)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-100%25_Type_Safe-green.svg)
![Google Antigravity](https://img.shields.io/badge/Google_Antigravity-Compatible-4285F4.svg)
![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-D97706.svg)

Boilerplate ini dirancang khusus untuk mempermudah pembuatan aplikasi web fullstack modern di era **AI-Native Software Engineering**. Kompatibel 100% secara universal untuk **Google Antigravity CLI** (`agy`) dan **Claude Code CLI** (`claude`).

---

## 📌 Features & Tech Stack

### 🎨 Tech Stack Summary
- **Frontend**: React 18+ (Vite + TanStack Router & Query) ATAU Next.js 14+ App Router.
- **Backend API**: Hono.js (Stateless, Ultra-Fast REST/RPC).
- **ORM & Database**: Drizzle ORM dengan SQLite (Turso) atau PostgreSQL (Neon/Supabase).
- **Validation**: Zod (100% Type-Safe dari API Request hingga Environment Variables).
- **Testing**: Vitest (Unit/Integration) & Playwright (E2E).
- **Observability**: Sentry Error Tracking & Structured JSON Logging.

### 🧠 Dual-Engine AI Architecture (`.agents/` & `.claude/`)
- **12 Master Subagents**: UI/UX Designer, Code Reviewer, PM, Architect, Backend, Frontend, Fullstack, DB Specialist, QA/Security, SEO, A11y, DevOps.
- **11 Universal Skills**: Production-grade procedures with YAML Frontmatter.
- **Auto-Managed Memory (`MEMORY.md`)**: Anti-amnesia AI engine yang melacak progress & ADR secara otomatis.
- **Scratchpad Isolation (`scratch/`)**: Folder terisolasi untuk eksperimen kode AI tanpa mengotori `src/`.

---

## 📂 Directory Blueprint

```text
my-project/
├── .agents/                           # 🚀 Google Antigravity CLI Native Directory
│   ├── agents/                        # 12 Subagent Roles (.agents/agents/<name>.md)
│   └── skills/                        # 11 Skills Procedures (.agents/skills/<folder>/SKILL.md)
├── .claude/                           # 🚀 Claude Code CLI Native Directory
│   ├── agents -> ../.agents/agents    # Symlink to Antigravity agents
│   └── skills -> ../.agents/skills    # Symlink to Antigravity skills
├── AGENTS.md                          # Antigravity Root Instructions
├── CLAUDE.md                          # Claude Code Root Instructions
├── ARCHITECTURE.md                    # System Architecture Specification
├── STACK.md                           # Tech Stack Specifications & Selection Rules
├── CODING_RULES.md                    # Universal Coding Rules & Guardrails
├── WORKFLOW.md                        # Git Commit & Dev Workflow
├── MEMORY.md                          # Shared Active Knowledge Bank (Auto-Managed)
├── .gitignore                         # Production Git Ignore Rules
└── scratch/                           # 🧪 Isolated Sandbox for AI Experiments (Git-Ignored)
```

---

## 🚀 Quick Start (Cara Pakai untuk Proyek Baru)

### 1. Clone atau Copy Boilerplate Ini
```bash
git clone https://github.com/mfaridzia/ai-fullstack-boilerplate.git my-new-app
cd my-new-app
```

### 2. Mulai Koding Bersama AI CLI Pilihan Kamu
Jalankan CLI pilihan kamu:
- **Google Antigravity**:
  ```bash
  agy
  ```
- **Claude Code**:
  ```bash
  claude
  ```

### 3. Berikan Prompt Fitur Pertama Kamu
Contoh prompt:
> *"Tolong buatkan MVP SaaS Dashboard untuk Manajemen Tugas beserta autentikasi JWT dan DB schema Drizzle."*

AI akan secara otomatis membaca arsitektur, me-launch subagent yang sesuai, mengeksekusi skill baku, dan memperbarui progress di `MEMORY.md`!

---

## 🤖 Tim 12 Master Subagents

| Subagent | Description |
| :--- | :--- |
| `01-ui-ux-designer` | Merancang palet warna HSL, Tailwind Glassmorphism, Google Fonts, & micro-animations. |
| `02-code-reviewer` | Meninjau type-safety, memory leaks, silent errors, & refactoring. |
| `03-product-manager` | Menerjemahkan user request menjadi User Stories & Acceptance Criteria. |
| `04-systems-architect` | Mendesain DB Schema Drizzle, API Contracts, & System Architecture. |
| `05-backend-engineer` | Mengimplementasikan Hono.js routes, Zod validation, & Drizzle queries. |
| `06-frontend-engineer` | Mengimplementasikan React components, TanStack Router/Query, & Tailwind. |
| `07-fullstack-engineer` | Menghubungkan Backend & Frontend via Hono RPC Client. |
| `08-database-specialist` | Mengelola Drizzle Kit migrations, indexing, & SQL optimization. |
| `09-qa-security-auditor` | Audit keamanan OWASP Top 10, Vitest unit test, & Playwright E2E. |
| `10-seo-specialist` | Optimasi Meta Tags, OpenGraph, Canonical Links, & JSON-LD. |
| `11-a11y-specialist` | Memastikan kepatuhan WCAG 2.1 AA, ARIA attributes, & keyboard navigation. |
| `12-devops-engineer` | Multi-stage Dockerfile, GitHub Actions CI/CD, & Vercel/Fly.io deployment. |

---

## 🛑 Git Strategy (Inclusions vs Exclusions)

- **✅ Di-commit ke GitHub**: `.agents/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`, `CODING_RULES.md`, `ARCHITECTURE.md`, `STACK.md`, `MEMORY.md`.
- **❌ Dilarang Commit (`.gitignore`)**: `.env` (Secrets), `scratch/` (Temporary experiments), `node_modules/`, `dist/`.

---

## 📄 License

MIT License. Free to use for personal & commercial projects!
