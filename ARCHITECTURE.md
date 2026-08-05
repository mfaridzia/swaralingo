# System Architecture Specification

## 1. High-Level Overview
Proyek ini menggunakan salah satu dari dua pola arsitektur:
- **Pola A (Decoupled)**: Frontend React (Vite + TanStack Router) + Backend Hono.js API Server.
- **Pola B (Next.js Unified)**: Next.js App Router (FE Components + Hono API Route / Server Actions).

## 2. Data Flow Architecture
`Client Request` -> `Zod Input Validator` -> `Route Handler / Server Action` -> `Drizzle ORM Query` -> `Database` -> `Structured Response`.

## 3. Communication Contract
Frontend dan Backend berbagi tipe data Zod Schema & Hono RPC Type Client.
Dilarang keras mengubah API Contract di backend tanpa mengupdate tipe data di frontend.
