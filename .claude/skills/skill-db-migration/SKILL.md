---
name: skill-db-migration
description: "Prosedur migrasi database schema menggunakan Drizzle ORM & Drizzle Kit."
---

# Skill Procedure: Database Schema Migration

1. Edit file schema di `src/db/schema.ts`.
2. Jalankan `npx drizzle-kit generate` untuk membuat file SQL migration.
3. Periksa file `.sql` di folder `drizzle/`.
4. Jalankan `npx drizzle-kit migrate` untuk menerapkan ke database development.
