# 🎙️ SwaraLingo

> **AI-Powered Active Speaking & Language Learning Practice Web App**

SwaraLingo adalah platform web interaktif yang dirancang untuk membantu developer dan profesional teknologi melatih kemampuan berbicara (*active speaking*) bahasa asing secara mandiri, terarah, dan dianalisis langsung oleh AI secara real-time.

---

## 📌 Core Features

1. **Active Practice Diary (AI Coach):**
   * Tulis atau rekam suaramu langsung melalui integrasi browser **Speech Recognition API**.
   * Dapatkan umpan balik instan tata bahasa, kosa kata, dan versi kalimat yang lebih natural (*Polished Version*) dari **Gemini AI**.
   * Dengar pelafalan natural menggunakan **Text-to-Speech (TTS)** dengan pilihan aksen/gender suara.

2. **Saved Records & Audio Waveform:**
   * Simpan riwayat latihan bersuaramu ke database (tersimpan dalam enkripsi base64).
   * Putar kembali rekaman suara asli dan unduh sebagai file `.webm` lokal.

3. **Interactive Shadowing Mode:**
   * Latih pelafalanmu dengan meniru suara kalimat aslinya. AI akan membandingkan kesamaan teks transkrip suaramu dengan versi natural.

4. **IT Interview Simulator:**
   * Lakukan simulasi wawancara kerja teknis dengan AI Recruiter. AI akan memberikan pertanyaan interaktif, menilai kecocokan jawabanmu, memberikan feedback tata bahasa, dan skor kelayakan.

5. **AI Journaling & Reflection Coach:**
   * Tulis jurnal harian dalam target bahasa pilihanmu. AI akan menganalisis emosi/mood kamu secara otomatis (*Sentiment Analysis*) dan memberikan refleksi motivasional yang hangat.

6. **Grammar Mistake Heatmap & Stats:**
   * Lacak jenis-jenis kesalahan tata bahasa kamu (seperti preposisi, tenses, subjek-predikat) secara visual dengan grafik progress dan heatmap tren mingguan.

7. **Spaced Repetition Flashcards:**
   * Simpan kosa kata baru ke Chunks Bank dan pelajari kembali menggunakan metode kartu pengulangan berkala (*Spaced Repetition System*) berdasarkan tingkat kesulitan (Easy, Medium, Hard).

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React (Vite)
* **Styling:** Tailwind CSS v4 (Sleek Dark Mode, Emerald Accents, Glassmorphism)
* **Animation:** Framer Motion (Fluid Page Transitions)
* **State & Query:** `@tanstack/react-query` & `react-router-dom`

### **Backend**
* **Framework:** Hono.js (Stateless, Ultra-Fast REST API)
* **Runtime:** Bun
* **AI Engine:** Google Gemini AI SDK (`gemini-3.5-flash`)

### **Database (Multi-Env Setup)**
* **Lokal Dev:** Serverless offline local SQLite database menggunakan native `bun:sqlite`.
* **Produksi:** Cloud serverless SQLite menggunakan **Turso** (`@libsql/client`) melalui HTTP/WebSockets.

---

## 🚀 Quick Start (Menjalankan secara Lokal)

### Prerequisites
Pastikan kamu sudah menginstal [Bun](https://bun.sh) di komputermu.

### 1. Clone Project
```bash
git clone https://github.com/mfaridzia/swaralingo.git
cd swaralingo
```

### 2. Setup Environment Variables
Buat file `.env` di folder `/backend` dan isi:
```env
PORT=3000
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_CLIENT_ID=your-google-client-id-here
CORS_ORIGIN=http://localhost:5173
```

### 3. Jalankan Aplikasi
Jalankan perintah ini di root folder proyek:
* **Jalankan Backend:**
  ```bash
  cd backend
  bun install
  bun run dev
  ```
* **Jalankan Frontend:**
  ```bash
  cd frontend
  bun install
  bun run dev
  ```
Buka **`http://localhost:5173`** di browsermu.

---

## ☁️ Deployment Architecture (Rp 0 Production Stack)

Aplikasi ini dirancang modular agar dapat dideploy gratis ke serverless platform modern:

* **Frontend:** Di-deploy ke **Vercel** / **Cloudflare Pages** (Menyajikan file statis React).
* **Backend:** Di-deploy ke **Cloudflare Workers** (Menggunakan konfigurasi `wrangler.toml` yang tersedia di folder `/backend`).
* **Database:** Di-host di **Turso** (SQLite cloud dengan persistent volume gratis).

*Untuk beralih ke mode produksi, cukup isi variabel `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` pada environment variables Cloudflare Workers.*

---

## 📄 License
[MIT License](LICENSE) - Bebas digunakan dan dimodifikasi!
