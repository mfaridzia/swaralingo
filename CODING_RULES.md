# Universal Coding Rules & Guardrails

## 0. Automatic Subagent & Skill Routing
AI Assistant harus secara otomatis me-launch Subagent yang sesuai dari `.agents/agents/` untuk tugas kompleks dan menerapkan prosedur yang relevan dari `.agents/skills/` berdasarkan niat (intent) dari prompt pengguna tanpa perlu dipanggil secara eksplisit.

## 1. Environment Variables & Secret Validation
Dilarang mengakses `process.env` atau `import.meta.env` secara mentah. Semua environment variables WAJIB di-validate menggunakan Zod Schema di `src/env.ts` saat startup time.

## 2. Scratchpad Isolation Guardrail
Dilarang mencoba-coba library baru atau menulis script debugging eksperimental langsung di dalam `src/`. Semua eksperimen WAJIB dilakukan di folder `scratch/` terlebih dahulu sebelum di-refactor ke codebase utama.

## 3. Type-Safety First
- TypeScript wajib digunakan di Frontend dan Backend (`strict: true`).
- Dilarang keras menggunakan type `any`. Gunakan `unknown` dengan Type Guard / Zod jika tipe data belum pasti.
- Semua API Request & Response Body WAJIB di-validate menggunakan **Zod**.

## 4. Backend Rules (Hono.js / Next.js API + Drizzle ORM)
- Format response API WAJIB konsisten:
  ```ts
  type ApiResponse<T> = 
    | { success: true; data: T; error: null }
    | { success: false; data: null; error: { code: string; message: string } };
  ```
- Pembacaan & Penulisan Database WAJIB melalui Drizzle ORM (`db.select()`, `db.insert()`).

## 5. Frontend Rules & Accessibility
- Fetching data WAJIB menggunakan TanStack Query atau Server Actions. Dilarang `useEffect` untuk fetching data.
- Elemen interaktif WAJIB accessible (ARIA labels, focus states).

## 6. Mandatory Automated Testing Rule (Unit, Integration & E2E)
- Setiap pembuatan **fitur baru**, **perubahan logika (refactor)**, atau **penambahan endpoint/komponen** WAJIB disertai pembuatan atau pembaruan test terkait.
- **Backend**: Buat/update unit & integration test di `backend/src/test/` menggunakan Vitest (`bun test`). Pastikan logika route, middleware (auth/csrf/rate-limit), database query, dan mock API eksternal teruji.
- **Frontend**: Buat/update unit & component test di `frontend/src/test/` menggunakan Vitest + JSDOM (`bun run test`) untuk helper, algoritma bisnis, dan state interceptor.
- **End-to-End (E2E)**: Untuk alur user journey yang kritis (auth, form submission, navigasi), buat/update test Playwright di `frontend/e2e/` (`bun run test:e2e`).
- AI Assistant WAJIB menjalankan suite test (`bun test`, `bun run test`, `bun run test:e2e`) dan memastikan **100% Pass (hijau)** sebelum menyatakan tugas selesai.

## 7. Memory Auto-Update Rule
Di akhir setiap sesi penyelesaian tugas, AI WAJIB memperbarui file `MEMORY.md` dengan status progress terbaru, keputusan arsitektur (ADR) baru, dan daftar next steps.

