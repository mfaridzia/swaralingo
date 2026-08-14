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
- **ADR-059**: Perbaikan bug offline-first sync & interceptor. Memodifikasi `enqueueMutation` untuk menggunakan/mengekstrak client UUID yang ada saat update/delete (bukan selalu generate baru) serta mengimplementasikan penghapusan Dexie lokal pada operasi delete. Memperbarui `apiFetch` menggunakan skema Network-First with Local-Fallback untuk GET (hanya melayani dari Dexie ketika offline, serta meng-update Dexie saat online berhasil) dan mengekstrak `clientId` target dari request body, query params, atau URL path segmen pada interception update/delete.
- **ADR-060**: Implementasi Web Push Notifications untuk Daily Reminder. Menambahkan tabel `push_subscriptions` di database, membuat endpoint `/subscribe` & `/unsubscribe`, serta mengonfigurasi Cloudflare Workers `scheduled` cron trigger. Menambahkan script push handler `sw-push.js` ke precache Workbox menggunakan `workbox.importScripts`. Memperbarui menu Settings di frontend untuk meminta izin notifikasi, melakukan subskripsi push via VAPID key, mengonversi waktu lokal alarm ke format UTC, dan menyimpan subskripsi aktif secara dinamis.
- **ADR-061**: Otomatisasi Migrasi Database Produksi via Middleware. Menambahkan middleware auto-migration di `backend/src/index.ts` yang mengeksekusi `initDB()` secara otomatis sekali pada request pertama saat container Worker booting di production. Cara ini aman dari deploy-time validation Cloudflare dan menghilangkan kebutuhan memanggil `/api/init-db` secara manual saat ada pembaruan schema.
- **ADR-062**: Normalisasi format tanggal `created_at` ke standar ISO 8601 UTC di backend route GET logs, chunks, dan journals untuk mengatasi bug pergeseran tanggal dan ketidakkonsistenan pengurutan (sorting) di browser client.
- **ADR-063**: Mengimplementasikan pengurutan (sorting) DESC berbasis client-side pada daftar diary logs dan chunks menggunakan parsing numerik `new Date().getTime()` untuk menjamin urutan data terbaru selalu di atas secara konsisten.
- **ADR-064**: Membuat sistem global Toast Notification melayang berbasis custom event (`showToast`) untuk memberikan feedback visual sukses/gagal instan saat menyimpan diary, kosa kata chunks, jurnal, dan pengaturan reminder.
- **ADR-065**: Menambahkan domain `https://cloudflareinsights.com` ke direktif `connect-src` CSP pada `index.html` untuk memulihkan warning pemblokiran Cloudflare Web Analytics telemetry.
- **ADR-066**: Mengimplementasikan limitasi data (pagination) bertahap berbasis parameter query `limit` pada backend, dan menambahkan tombol "Load More" di frontend untuk Diary, Chunks, dan Journal History guna menghemat performa browser dan kuota bandwidth data.
- **ADR-067**: [Remove Offline-First, Replace with Network Resilience + PWA Enhancements](docs/adr/0067-remove-offline-first-network-resilience.md) — menghapus seluruh modul offline-first (Dexie.js, sync engine, merge/retry/backfill) karena bug arsitektural fatal dan ketidakcocokan fundamental dengan aplikasi yang bergantung pada AI server-side. Menggantinya dengan network resilience (TanStack Query retry + localStorage draft auto-save) dan PWA UX enhancements (InstallPrompt A2HS + UpdateBanner new-version notification). Supersedes ADR-058 dan ADR-059.
- **ADR-068**: Optimasi performa login & dashboard loading. Root cause: 4 round trips sequential (auth → logs → chunks → stats), stats query `SELECT *` ambil semua kolom termasuk audio_base64, multiple `.filter()` pass di array. Fix: (1) `getInitialDashboardData()` helper pre-fetch logs (10) + chunks (10) paralel dan return di response auth — eliminasi 2 round trip; (2) stats query hanya SELECT kolom scoring (created_at, user_input, ai_feedback); (3) single-pass Map-based date indexing gantikan multiple `.filter()`; (4) frontend pre-populate TanStack Query cache via `setQueryData` dari response login — dashboard langsung render tanpa loading spinner. Backend deploy: wrangler 4.120.1 dengan `--config` absolute path karena root `wrangler.jsonc` override `backend/wrangler.toml`.
- **ADR-069**: Optimasi inisialisasi database cold boot di production. Root cause: middleware auto-migration mengeksekusi `initDB()` secara sinkron yang memblokir request pertama (TTFB) hingga 20 detik untuk menjalankan ~34 query migrasi sequential ke Turso. Fix: mengubah eksekusi `initDB()` menjadi non-blocking asynchronous di background menggunakan `c.executionCtx.waitUntil` untuk platform Cloudflare Workers, sehingga request pertama direspon instan tanpa hambatan migrasi.

## 🎨 Design System & UI Updates

- Migrasi 100% dari Vanilla CSS ke Tailwind CSS v4.
- Setup custom HSL tokens, glassmorphism, dan micro-animations sesuai panduan `.agents/skills/skill-ui-system/SKILL.md`.
- **UI Spacing Fix:** Menambahkan gap vertikal (`gap-y-4`) dan horizontal (`sm:gap-x-6`) pada form input `SentenceChunks.tsx` agar label _Meaning (Bahasa)_ tidak menempel ketat/menabrak kolom _English Phrase_ di atasnya pada tampilan mobile responsive.
- **UI Spacing Fix (Navbar Collision):** Menyingkat nama-nama menu navigasi utama di desktop (Diary, Chunks, Stats, Interview, Journal) dan menyembunyikan tombol "Profile Settings" serta tombol "Logout" ke dalam satu Dropdown Menu melayang yang bersih di bawah kartu avatar user, membebaskan lebih dari 300px ruang horizontal secara estetik.
- **Toast Notifications UI**: Implementasi toast notification melayang dengan transisi `.animate-slide-up` dan styling dynamic HSL border (emerald untuk sukses, red untuk error, blue untuk info).

## 📊 New Features Implemented (Sesi Ini)

1. **Remove Offline-First** — Hapus seluruh modul Dexie.js, sync engine, merge/retry/backfill (~2055 lines deleted).
2. **Network Resilience** — TanStack Query retry defaults (exponential backoff), localStorage draft auto-save (debounced 2s), networkMode: 'always'.
3. **PWA UX Enhancements** — InstallPrompt (beforeinstallprompt A2HS banner), UpdateBanner (useRegisterSW new-version notification + hourly update checks).
4. **Workbox Runtime Caching** — StaleWhileRevalidate untuk JS/CSS, CacheFirst untuk static assets.
5. **Login Performance Optimization** — Dashboard data (logs + chunks) di-batch dalam response auth, TanStack Query cache pre-populated dari login, stats query dioptimasi (column selection + single-pass Map indexing). Login + dashboard load turun dari 4 round trips ke 1.
6. **Database Migration Performance Optimization** — Menggunakan `c.executionCtx.waitUntil` untuk memindahkan verifikasi & migrasi database `initDB()` ke background task di Cloudflare Workers. Cold start request sekarang langsung direspon instan tanpa latency overhead dari ~34 SQL roundtrips ke Turso.
7. **Landing Page Expansion** — 9 fitur cards (dari 3), mencakup AI Interview, Journaling, Chunks Bank, Progress Dashboard.
8. **Privacy Policy & Terms of Service** — Halaman legal lengkap dengan routing `/privacy` dan `/terms`.
9. **Contact Email Update** — `admin@swaralingo.dev` → `muhfaridzia@gmail.com`.
10. **Auth UX Cleanup** — Hapus badge "Secured Client-Side Hashing (SHA-256)" yang membingungkan user.

## 🐛 Known Issues & Technical Debts

- Stale service worker dari production build/deploy sebelumnya mungkin masih registered di browser — unregister manual via DevTools > Application > Service Workers.
- `client_uuid` columns dan unique indexes masih ada di database (logs, chunks, journals) — harmless, cleanup next migration cycle.
- Safari ITP tidak dukung Partitioned cookie (CHIPS) — solusi final: host FE + API di same domain.

## 🔮 Future Backlog (Real-Time SSE & WebSockets)

1. **AI Speech/Text Streaming (SSE - Server-Sent Events)**:
   - Stream AI recruiter Evelyn's questions and feedback word-by-word in real-time in the AI Interview Simulator.
   - Stream AI Journaling Coach reflections word-by-word in real-time in the Journal Coach. *(Currently in progress: Use Case 1)*
2. **Live Pronunciation Feedback (WebSockets)**:
   - Stream microphone audio chunks in real-time to the server for live CC subtitle generation and instant word-by-word pronunciation confidence scoring in Shadowing Mode.
3. **AI Interviewer Evelyn "Real-time Interruption" (WebSockets)**:
   - Implement real-time voice call simulation with immediate sound interruption detection using WebSockets.
4. **Multiplayer "Speaking Duel" Peer Practice (WebSockets)**:
   - Real-time matchmaking and pairing of Indonesian speakers to perform collaborative job interview or daily-life roleplay with background AI scoring.
