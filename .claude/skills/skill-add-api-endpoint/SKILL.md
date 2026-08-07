---
name: skill-add-api-endpoint
description: "Prosedur menambahkan endpoint API baru dengan Hono.js, Zod validation, dan Vitest unit test."
---

# Skill Procedure: Adding New Type-Safe API Endpoint

1. Buat Zod Schema validator di `src/schemas/[feature].ts`.
2. Buat Hono Route Handler di `src/routes/[feature].ts`.
3. Pasang middleware Zod Validator pada request: `zValidator('json', schema)`.
4. Daftarkan route di file server utama (`src/index.ts`).
5. Buat unit test sederhana di `tests/[feature].test.ts` menggunakan Vitest.
