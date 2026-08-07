# Project Active Knowledge Bank (Memory)

> 🤖 CATATAN UNTUK AI: File ini dikelola secara OTOMATIS oleh AI. Update file ini di akhir setiap sesi penyelesaian fitur.

## 🧠 Current Project State

- **Status**: Active Sprint Complete (All goals & Next steps finalized successfully)
- **Database**: Native SQLite (`bun:sqlite`)
- **Backend API Port**: http://localhost:3000 (Hono.js)
- **Vite Dev Port**: http://localhost:5173 (React + Tailwind CSS v4)
- **Active Integrations**: Gemini API (`gemini-3.5-flash` model via Google AI Studio API key)

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
- **ADR-032**: Mengimplementasikan endpoint transkripsi audio (/api/transcribe) berbasis Gemini Multimodal API di backend untuk mentranskrip ulang file rekaman log lama secara on-demand.
- **ADR-033**: Mengimplementasikan database-backed analysis caching di SQLite (`analysis_cache`) untuk menghemat panggilan API tata bahasa yang identik.
- **ADR-034**: Menerapkan caching berbasis `localStorage` frontend untuk tantangan harian agar konsistensi status terjaga saat refresh.
- **ADR-035**: Melakukan refaktorisasi arsitektur backend menjadi modular (memisahkan config, middleware rate limiter, dan router terpisah per modul) serta mengeliminasi semua dummy credentials ke `.env`.
- **ADR-036**: Melakukan rebranding nama aplikasi di seluruh antarmuka web, notifikasi browser, ekspor dokumen PDF, dan meta title dari FluencyLab.io menjadi SwaraLingo.
- **ADR-037**: Mengimplementasikan modul AI Journaling & Reflection Coach (skema tabel SQLite, endpoint analisis mood/sentiment otomatis via Gemini, dan antarmuka jurnaling multi-paragraf interaktif).
- **ADR-038**: Menghapus rute redirect sirkular `/dashboard` dan `key={location.pathname}` pada tag Routes di App.tsx untuk mengeliminasi bug blank screen saat transi-halaman di React Router v6.
- **ADR-039**: Mengimplementasikan wrapper database asinkron dinamis pada database.ts berbasis `NODE_ENV`. Menggunakan `bun:sqlite` untuk pengembangan lokal yang cepat/offline, dan `@libsql/client` (Turso) di lingkungan produksi untuk mempermudah migrasi serverless (Cloudflare Workers).
- **ADR-040**: Memindahkan penyimpanan audio rekaman dari Base64-in-SQLite ke Cloudflare R2 (object key `audio/{userId}/{uuid}.webm`). Menambahkan abstraksi `audioStorage.ts` (R2 untuk produksi, filesystem `backend/audio/` untuk dev lokal), endpoint baru `POST/GET/DELETE /api/audio`, kolom `audio_key` di `practice_logs` (kolom `audio_base64` dipertahankan untuk log legacy — GET /logs mengembalikan base64 hanya via CASE WHEN audio_key IS NULL), dan perbaikan route mismatch transcribe (kini ter-wire di `/api/transcribe` + alias `/api/analyze/transcribe`).
- **ADR-041**: Frontend menyimpan rekaman sebagai Blob (tanpa konversi base64) dan meng-upload binary mentah ke `POST /api/audio` sebelum menyimpan log (upload-then-save, dengan pembersihan orphan best-effort jika save gagal).

## 🎨 Design System & UI Updates

- Migrasi 100% dari Vanilla CSS ke Tailwind CSS v4.
- Setup custom HSL tokens, glassmorphism, dan micro-animations sesuai panduan `.agents/skills/skill-ui-system/SKILL.md`.
- **UI Spacing Fix:** Menambahkan gap vertikal (`gap-y-4`) dan horizontal (`sm:gap-x-6`) pada form input `SentenceChunks.tsx` agar label _Meaning (Bahasa)_ tidak menempel ketat/menabrak kolom _English Phrase_ di atasnya pada tampilan mobile responsive.
- **UI Spacing Fix (Navbar Collision):** Menyingkat nama-nama menu navigasi utama di desktop (Diary, Chunks, Stats, Interview, Journal) dan menyembunyikan tombol "Profile Settings" serta tombol "Logout" ke dalam satu Dropdown Menu melayang yang bersih di bawah kartu avatar user, membebaskan lebih dari 300px ruang horizontal secara estetik.

## 📊 New Features Implemented (Sesi Ini)

1. **Interactive Product Landing Page (Baru):**
   - Menambahkan komponen [`LandingPage.tsx`](file:///Users/muhfaridzia/Documents/personal/learn-english/frontend/src/components/LandingPage.tsx) dengan visualisasi mockup floating card bertema dark-tech emerald premium, detail core features, dan tombol pemicu interaktif.
   - Mengatur router agar merender landing page pada URL root `/` sebelum otentikasi user aktif.
2. **AI Personalized Daily Challenge:**
   - Menambahkan panel target latihan harian di Dashboard.
3. **Vocabulary Distribution Chart:**
   - Menambahkan diagram batang horizontal dinamis di Dashboard.
4. **TTS Voice Selector Customization:**
   - Menambahkan tombol **Voice Settings** di pojok kanan atas modul AI Coach.
5. **Daily Alarm Scheduler (One-Shot):**
   - Menjadwalkan pengingat jam belajar harian menggunakan setTimeout hemat daya.
6. **Microphone Voice Recording Input (Speech-to-Text):**
   - Menambahkan tombol mic STT dengan penutupan otomatis pengetikan manual keyboard saat mic aktif mendengarkan suara.
7. **Achievements & Consistency Streaks:**
   - Menghitung rantai hari aktif latihan secara beruntun (_consecutive active days_) di Dashboard.
8. **Fluid Page Transition Animation:**
   - Animasi geser memudar (_fade-in-slide-up_) saat berpindah halaman rute.

## 🐛 Known Issues & Technical Debts

- None.

## 🎯 Next Immediate Steps
- [x] Menambahkan fitur download rekaman suara dalam format audio file wav/mp3 di Saved Records (ADR-026).
- [x] Integrasi otentikasi pihak ketiga (Google Sign-In) (ADR-025).
- [x] Latihan meniru lafal AI (Interactive Shadowing Mode) (ADR-027).
- [x] Analisis tren error tata bahasa (Grammar Mistake Heatmap) (ADR-028).
- [x] Simulasi interview rekruter teknologi (Interactive IT Interview Simulator) (ADR-029).
- [x] Deteksi kata jeda tidak perlu (Vocal Filler Detector) (ADR-030).
- [x] Pengulang hafalan spaced repetition (Spaced Repetition Flashcards Review Deck) (ADR-031).
- [ ] Menambahkan visualisasi waveform audio (waveform visualization) sederhana saat user memutar rekaman suara.
- [x] Integrasi fitur transkripsi ulang rekaman jika user ingin membandingkan hasil lafal audio lamanya (ADR-032).
- [x] Caching Grammar Correction (SQLite analysis_cache) & Rate Limiting (6 calls/min) (ADR-033).
- [x] Caching AI Daily Challenge (localStorage harian) (ADR-034).
- [x] Modularisasi arsitektur backend & pembersihan dummy credentials ke `.env` (ADR-035).
- [x] Rebranding nama aplikasi dari FluencyLab.io menjadi SwaraLingo (ADR-036).
- [x] Implementasi modul AI Journaling & Reflection Coach (ADR-037).
