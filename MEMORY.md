# Project Active Knowledge Bank (Memory)

> 🤖 CATATAN UNTUK AI: File ini dikelola secara OTOMATIS oleh AI. Update file ini di akhir setiap sesi penyelesaian fitur.

## 🧠 Current Project State

- **Status**: Production Stack Ready (Cloudflare Workers + Turso Cloud DB + Vercel deployed)
- **Database**: Turso Cloud (Libsql) in Production, native SQLite (`bun:sqlite`) in Local Dev.
- **Backend API Port**: http://localhost:3000 (Local Hono.js) / https://swaralingo-api.muhfaridzia.workers.dev (Production)
- **Vite Dev Port**: http://localhost:5173 (React + Tailwind CSS v4)
- **Active Integrations**: Gemini API (`gemini-3.5-flash-lite` model via Google AI Studio API key)

## 📐 Architecture Decision Records (ADR)

- **ADR-001**: Menggunakan Hono.js dibanding Express karena Type-Safety RPC & performa Edge.
- **ADR-002**: Menggunakan `bun:sqlite` untuk performa query yang instan tanpa binding C++ eksternal.
- **ADR-003**: Menggunakan Tailwind CSS v4 untuk efisiensi styling premium responsive.
- **ADR-004**: Integrasi Google Generative AI SDK (API Key mandatory, dinonaktifkannya local rules engine fallback).
- **ADR-005**: Memecah file monolithic React `App.tsx` menjadi sub-komponen terpisah di bawah `src/components/` untuk performa rendering dan maintainability yang lebih baik.
- **ADR-006**: Menggunakan password hashing native Bun (`Bun.password.hash`) pada SQLite db, serta query-parameter-based user isolation pada endpoint GET/POST logs, chunks, dan stats untuk pemisahan data multi-user yang ringan dan aman.
- **ADR-007**: Implementasi CORS restrict domain dan in-memory Rate Limiting middleware pada endpoint Auth untuk perlindungan dari serangan Brute-Force (OWASP standard).
- **ADR-008**: Implementasi client-side hashing SHA-256 menggunakan Web Crypto API pada password sebelum ditransmisikan ke jaringan HTTP untuk meminimalkan risiko pencurian data/sadap jaringan (MitM).
- **ADR-009**: Mengintegrasikan `react-router-dom` untuk sistem navigasi satu halaman (SPA) berbasis URL guna mengamankan persistensi state tab navigasi agar tidak ter-reset saat browser di-refresh.
- **ADR-010**: Menambahkan sanitizer markdown wrapper (`\`\`\`json`) dan instruksi skema yang lebih ketat pada prompt Gemini untuk menjamin hasil response selalu parseable JSON.
- **ADR-011**: Memodifikasi parser logika backend untuk mendeteksi string "Your sentence is grammatically correct" sebagai tanda lulus evaluasi sempurna (100% score) tanpa penalti kata.
- **ADR-012**: Mengintegrasikan library `jspdf` di frontend untuk meng-generate file ekspor PDF/CSV lokal secara dinamis dari database tanpa memerlukan server-side generation.
- **ADR-013**: Menambahkan fitur filter pencarian real-time (case-insensitive search query) di sisi frontend untuk riwayat logs dan chunks.
- **ADR-014**: Mengintegrasikan `framer-motion` di frontend untuk animasi transisi halaman yang fluid (fade-in-slide) pada route rendering.
- **ADR-015**: Memperbarui endpoint statistik `/api/stats` untuk mendukung parameter penyaringan rentang waktu (7d / 30d) untuk dashboard visualisasi performa bulanan.
- **ADR-016**: Mengintegrasikan native browser Web Speech API (`SpeechSynthesis`) di frontend untuk pelafalan audio text-to-speech (TTS) kalimat bahasa Inggris.
- **ADR-017**: Mengintegrasikan Web Notification API di frontend untuk pemicuan push notifikasi ucapan selamat/pengingat harian secara lokal.
- **ADR-018**: Mengintegrasikan Web Speech Recognition API (`SpeechRecognition`) di frontend untuk input suara microphone perekam teks (STT) real-time yang cepat dan gratis.
- **ADR-019**: Mengimplementasikan algoritma penghitung rantai keaktifan beruntun (Streak) dan sistem pencapaian lencana otomatis (Achievements Badges) berdasarkan data tren performa latihan.
- **ADR-020**: Mengimplementasikan penjadwalan alarm reminder (daily clock scheduler) berbasis One-Shot setTimeout yang hemat baterai dengan CPU 0% idle state.
- **ADR-021**: Menambahkan dukungan drop-down klasifikasi kategori kustom (IT, Email, Presentasi, dll.) pada Sentence Chunks.
- **ADR-022**: Mengimplementasikan grafik distribusi bar-progress horizontal untuk melihat persebaran kategori bank kosa kata di dashboard.
- **ADR-023**: Menambahkan panel pemilihan suara pengisi suara aksen/gender (TTS Voice Selection) pada coach panel.
- **ADR-024**: Mengimplementasikan penjanaan tantangan latihan harian dinamis (AI Personalized Daily Challenge) yang dirancang khusus berdasarkan pola kesalahan tata bahasa (grammar error) user di riwayat diary sebelumnya.
- **ADR-025**: Membuat layout dan sistem routing Landing Page promosi interaktif sebelum login untuk menarik minat pengguna baru.
- **ADR-026**: Menambahkan fitur unduhan & pemutaran rekaman suara asli (.webm audio file) di Saved Records dengan penyimpanan data audio Base64 di database SQLite.
- **ADR-027**: Mengintegrasikan mode latihan bayangan (Interactive Shadowing Mode) di PracticeDiary.tsx untuk mencocokkan kemiripan lafal audio user dengan Natural Version.
- **ADR-028**: Membuat modul Grammar Mistake Heatmap di Dashboard.tsx untuk melacak pengelompokan jenis error (tenses, preposisi, dll.) dan frekuensi kesalahan 5 mingguan.
- **ADR-029**: Mengimplementasikan Interactive IT Interview Simulator dengan dialog chat AI rekruter, skor kelayakan, dan saran respons profesional.
- **ADR-030**: Menambahkan detektor jeda suara (Vocal Filler Detector) di PracticeDiary.tsx untuk mendeteksi kata-kata pengisi (um, like, dll.) saat berbicara.
- **ADR-031**: Mengintegrasikan algoritma flashcard cerdas (Spaced Repetition Review Deck) di SentenceChunks.tsx dengan rating kesulitan (Easy, Medium, Hard).
- **ADR-032**: Mengintegrasikan algoritma transkripsi ulang rekaman jika user ingin membandingkan hasil lafal audio lamanya.
- **ADR-033**: Mengimplementasikan endpoint transkripsi audio (/api/transcribe) berbasis Gemini Multimodal API di backend untuk mentranskrip ulang file rekaman log lama secara on-demand.
- **ADR-034**: Mengimplementasikan database-backed analysis caching di SQLite (`analysis_cache`) untuk menghemat panggilan API tata bahasa yang identik.
- **ADR-035**: Menerapkan caching berbasis `localStorage` frontend untuk tantangan harian agar konsistensi status terjaga saat refresh.
- **ADR-036**: Melakukan refaktorisasi arsitektur backend menjadi modular (memisahkan config, middleware rate limiter, dan router terpisah per modul) serta mengeliminasi semua dummy credentials ke `.env`.
- **ADR-037**: Melakukan rebranding nama aplikasi di seluruh antarmuka web, notifikasi browser, ekspor dokumen PDF, dan meta title dari FluencyLab.io menjadi SwaraLingo.
- **ADR-038**: Melakukan rebranding nama aplikasi dari FluencyLab.io menjadi SwaraLingo.
- **ADR-039**: Mengimplementasikan modul AI Journaling & Reflection Coach.
- **ADR-040**: Menghapus rute redirect sirkular `/dashboard` dan `key={location.pathname}` pada tag Routes di App.tsx untuk mengeliminasi bug blank screen saat transi-halaman di React Router v6.
- **ADR-041**: Mengimplementasikan wrapper database asinkron dinamis pada database.ts berbasis `NODE_ENV`. Menggunakan `bun:sqlite` untuk pengembangan lokal yang cepat/offline, dan `@libsql/client` (Turso) di lingkungan produksi untuk mempermudah migrasi serverless (Cloudflare Workers).
- **ADR-042**: Integrasi Hono `contextStorage` middleware di backend untuk melacak request context secara global, mempermudah inisialisasi dinamis Turso client, Gemini API, dan OAuth2Client menggunakan rahasia (secrets) di Cloudflare Workers.
- **ADR-043**: Mengalihkan inisialisasi tabel database `initDB()` di mode produksi ke endpoint manual `GET /api/init-db` untuk mencegah crash validasi script saat deployment Cloudflare Workers.
- **ADR-044**: Migrasi enkripsi password dari `Bun.password` ke native Web Crypto API (PBKDF2 dengan SHA-256 dan 100.000 iterasi) untuk menjamin kompatibilitas runtime penuh antara Bun (lokal) dan Cloudflare Workers (produksi).
- **ADR-045**: Migrasi model Gemini di backend dari `gemini-3.5-flash` ke `gemini-3.5-flash-lite` untuk memperluas batas rate limit harian dari 20 request per hari menjadi 500 request per hari secara gratis di Free Tier.
- **ADR-046**: Konfigurasi rewrite routing di `vercel.json` (`source: "/(.*)" -> "/index.html"`) untuk mengatasi error 404 pada saat hard-refresh di routing SPA React Router.
- **ADR-047**: Mengintegrasikan Cloudflare Web Analytics tracking script dan konfigurasi `[observability]` logs di `wrangler.toml` untuk pengumpulan metrik performa serta penelusuran logs secara persisten.
- **ADR-048**: Transkripsi audio via **Cloudflare Workers AI Whisper** (`@cf/openai/whisper-large-v3-turbo`, binding `[ai] AI`) sebagai jalur utama — gratis, kuota lepas dari Gemini. Fallback otomatis ke Gemini `gemini-3.5-flash-lite` saat binding AI tidak tersedia (local `bun dev`) atau Whisper gagal. Format webm/wav/mp3/ogg/flac/m4a didukung, max 25MB.
- **ADR-049**: Fix `wrangler dev` crash ("No such module bun:sqlite") dengan deteksi runtime `isBunRuntime` (`process.versions.bun`) di config.ts — pengganti gate `NODE_ENV === 'production'` yang tidak reliable di wrangler dev (known bug cloudflare/workers-sdk#7886). Seleksi DB (bun:sqlite vs Turso), storage (filesystem vs R2), dan initDB otomatis kini berbasis runtime. `node:fs` di audioStorage.ts di-dynamic-import karena tidak didukung workerd (node:path OK).
- **ADR-050**: Menutup **IDOR (CVSS 9.8 Critical)** — semua endpoint sebelumnya menerima `userId` dari body/query client tanpa otentikasi (siapa pun bisa baca/tulis data user lain + takeover via update-profile). Fix: session JWT HMAC-SHA256 via Web Crypto (zero-dep, kompatibel Bun & workerd) di `middleware/auth.ts` + `requireAuth` middleware. login/register/google return `token`; semua route (logs, chunks, journals, stats, audio, analyze, transcribe, seed, update-profile) ambil identitas dari `c.get('authUserId')`, userId client diabaikan. Frontend: `api.ts` helper `apiFetch` (Bearer header + auto-logout 401), token di localStorage `fluency_token`, playback audio via blob URL (`<audio>` browser tak bisa kirim header). Secret `JWT_SECRET` wajib di Cloudflare (fallback hanya local dev). Catatan: deploy harus `--config wrangler.toml` eksplisit — ada `wrangler.jsonc` root (eksperimen user, worker "learn-english") yang bisa salah dijadikan target deploy wrangler.
- **ADR-051**: Migrasi session dari localStorage ke **HttpOnly cookie** (`swaralingo_session`; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=7d) — menutup eksfiltrasi token via XSS. `requireAuth` baca cookie (Bearer tetap didukung untuk API client). Wajib `csrfProtect` middleware: state-changing request dari browser harus Origin di allowlist (403 selain itu) karena SameSite=None + FE/API cross-site (vercel.app → workers.dev). CORS `credentials: true`, `POST /auth/logout` hapus cookie. Frontend: `apiFetch` pakai `credentials: 'include'`, `fluency_token` dihapus, playback audio tetap via blob URL.
- **ADR-052**: Fix AI Personalized Daily Challenge menampilkan teks instruksi mentah — root cause: reuse `POST /api/analyze` yang system prompt-nya memaksa format grammar-correction `{improved,feedback}`, jadi Gemini meng-echo instruksi sebagai "improved". Fix: endpoint dedicated `POST /api/analyze/challenge` (system prompt sendiri, output `{challenge}`, skip analysis_cache karena konteks per-user). Cache key localStorage bump ke `fluency_daily_challenge_v2_<date>` untuk invalidate data rusak.
- **ADR-053**: Cache AI Reflective Prompt JournalCoach di localStorage (`fluency_journal_prompt_<userId>`) — sebelumnya `GET /journals/prompt` (call Gemini) ditembak tiap mount/refresh halaman. Sekarang prompt dipakai ulang sampai user submit jurnal; setelah submit, cache dibuang + generate satu prompt baru. Zero backend hit saat refresh.
- **ADR-054**: Fix login bounce ke landing page — Chrome/Edge/Firefox blokir third-party cookie non-partitioned (rollout 2025), jadi cookie `SameSite=None` cross-site (vercel.app → workers.dev) dibuang browser → tiap request 401 → `apiFetch` redirect ke `/`. Fix: atribut **`Partitioned`** (CHIPS) di cookie set & clear — cookie terkirim pada top-level site vercel.app. CSRF origin check tetap aktif. **Catatan**: Safari ITP tidak dukung Partitioned — user Safari tetap kena blokir; solusi final = same-site hosting (FE + API satu domain). Plus: validasi password min-6 hanya di register (login tak boleh tolak password valid), Google button copy `signin_with`/`signup_with` sesuai mode.
- **ADR-055**: Fix login gagal (password salah) tetap diredirect ke landing — `apiFetch` treat semua 401 sebagai session-expired + redirect, padahal backend `/auth/login` pakai 401 untuk credentials invalid. Fix: opsi `skipAuthRedirect` di `apiFetch`, dipakai endpoint auth (login/register/google) agar error server ("Invalid email or password", "Email already registered", "This account uses Google Sign-In") ditampilkan di form, bukan bounce.
- **ADR-056**: Fix streak badge — `calculateStreak` sebelumnya derive dari `chartData` (window 7/30d) → streak panjang terpotong di ukuran window; plus perbandingan tanggal browser lokal (WIB) vs `created_at` UTC (`CURRENT_TIMESTAMP`) → latihan 00:00–06:59 WIB dihitung hari kemarin, streak putus diam-diam. Fix: streak dihitung langsung dari semua logs, day key UTC (`toISOString().slice(0,10)`), grace hari ini tetap. Badge threshold 3/5/7 (Starter/Rising/Dedicated/Elite) bekerja reaktif dari streak.
- **ADR-057**: Fix audio tidak tersimpan dari Shadowing Mode — shadowing hanya pakai SpeechRecognition (transcript + score, ADR-027), tak pernah menghasilkan blob audio → log tersimpan tanpa audio. Fix: MediaRecorder paralel saat shadowing aktif (refs `shadowRecorderRef`/`shadowChunksRef`), hasil blob webm masuk state `audioBlob` yang sama dengan rekaman utama → ter-upload ke R2 + muncul di Saved Records. Stop otomatis di `onend`/`onerror` SpeechRecognition dan toggle manual.
- **ADR-058**: [Offline-First PWA Architecture](docs/adr/0058-offline-first-pwa.md) — arsitektur offline-first dengan Dexie.js (IndexedDB), vite-plugin-pwa (service worker + manifest), client-push sync protocol (`POST /api/sync` + idempotency key), last-write-wins conflict resolution. Offline mode opt-in via Settings toggle, progressive hydration per-page, audio blob di tabel terpisah, apiFetch interceptor untuk read-through cache + write queue. Vitest (fake-indexeddb) + Playwright E2E testing.

## 🎨 Design System & UI Updates

- Migrasi 100% dari Vanilla CSS ke Tailwind CSS v4.
- Setup custom HSL tokens, glassmorphism, dan micro-animations sesuai panduan `.agents/skills/skill-ui-system/SKILL.md`.
- **UI Spacing Fix:** Menambahkan gap vertikal (`gap-y-4`) dan horizontal (`sm:gap-x-6`) pada form input `SentenceChunks.tsx` agar label _Meaning (Bahasa)_ tidak menempel ketat/menabrak kolom _English Phrase_ di atasnya pada tampilan mobile responsive.
- **UI Spacing Fix (Navbar Collision):** Menyingkat nama-nama menu navigasi utama di desktop (Diary, Chunks, Stats, Interview, Journal) dan menyembunyikan tombol "Profile Settings" serta tombol "Logout" ke dalam satu Dropdown Menu melayang yang bersih di bawah kartu avatar user, membebaskan lebih dari 300px ruang horizontal secara estetik.

## 📊 New Features Implemented (Sesi Ini)

1. **Offline-First PWA — Full Vertical Slice** (Phases 0-6 complete):
   - **Phase 0**: Test infrastructure (vitest, fake-indexeddb, jsdom, Playwright config)
   - **Phase 1**: Backend migrations (`updated_at`, `client_uuid`, `deleted_at`) + `POST /api/sync` endpoint (LWW, idempotency, soft delete)
   - **Phase 2**: Frontend Dexie schema (5 tables) + sync engine (coalesce, retry, triggers, backfill, store) + 20 unit tests
   - **Phase 3**: `apiFetch` interceptor (read-through GET, write-queue POST/PUT/DELETE, write-through cache, online-only bypass)
   - **Phase 4**: PWA shell (vite-plugin-pwa, CSP headers, manifest, SW generation via Workbox)
   - **Phase 5**: UI indicators (`SyncBanner` + `SyncDot`) + Settings offline toggle + storage meter + clear data
   - **Phase 6**: QuotaExceededError handling, bundle audit (1,028KB / 320KB gzip), E2E test file created

   See [ADR-058](docs/adr/0058-offline-first-pwa.md) for full design. New files under `frontend/src/offline/`:
   - `db/dexie.ts` — Dexie.js schema (logs, chunks, journals, audioBlobs, pendingSync)
   - `sync/merge.ts` — coalesce mutations + merge server response
   - `sync/retry.ts` — exponential backoff (1s → 60s cap, 10 max retries)
   - `sync/engine.ts` — syncNow(), enqueueMutation(), enqueueAudio(), QuotaExceededError guards
   - `sync/triggers.ts` — online/visibility/interval triggers (StrictMode-safe)
   - `store.ts` — reactive offline store (localStorage + subscribe)
   - `backfill.ts` — bulk backfill from server → Dexie
   - `indicator.tsx` — SyncBanner (offline/pending/synced) + SyncDot (per-item status)

2. **App Icon:** New SwaraLingo PWA icon (`frontend/public/icon.svg`) — sound wave motif in emerald gradient on dark background, ready for maskable icon generation via vite-plugin-pwa.

## 🐛 Known Issues & Technical Debts

- Safari Partitioned cookie workaround (CHIPS not supported by Safari ITP) — host FE + API on same domain.

## 📋 Backlog (Slice 2+)

| # | Item | Effort | Dependencies |
|---|---|---|---|
| 1 | **Chunks (SRS) offline** — schema & pendingSync table sudah siap; perlu route-map entries di `POST /api/sync` + interceptor write-queue untuk tabel `chunks` | S | Slice 1 |
| 2 | **Journals offline** — sama seperti chunks, schema siap, perlu route-map + interceptor | S | Slice 1 |
| 3 | **Offline audio playback** — blob URL dari Dexie `audioBlobs` untuk putar rekaman saat offline | M | Slice 1 |
| 4 | **Multi-device conflict UI** — tampilkan konflik ke user (saat ini server version menang otomatis via LWW) | M | Slice 1 |
| 5 | **Background Sync API** — `navigator.sync.register()` agar sync jalan meski tab tertutup | L | Slice 1, PWA terinstall |
| 6 | **Safari same-domain hosting** — atasi CHIPS Partitioned cookie tidak didukung Safari; FE + API satu domain | M | Infra |
| 7 | **Offline Gemini** — WebLLM atau model on-device untuk grammar check offline (riset dulu) | XL | Riset |

## 🎯 Next Immediate Steps
- [x] ~~**Vertical slice: offline diary flow**~~ — Dexie schema + `apiFetch` interceptor + `POST /api/sync` endpoint + UI sync indicator. ✅ Complete (Phases 0-6).
- [x] ~~**vite-plugin-pwa setup**~~ — service worker + manifest + CSP headers. App installable. ✅ Complete.
- [x] ~~**Playwright E2E**~~ — 4 test: offline diary→sync, toggle-off regression, Settings panel, diary+audio→sync. All passing. ✅
- [ ] Deploy backend: `GET /api/init-db` on production Workers URL → `wrangler deploy`.
- [ ] Merge PR `feature/offline-first-pwa-slice-1` → `main`.
