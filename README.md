# 🎙️ SwaraLingo

> **AI-Powered Active Speaking & Language Learning Practice Web App**

SwaraLingo is an interactive web platform designed to help developers and tech professionals practice their active speaking skills in foreign languages. It provides real-time AI-driven analysis, feedback, and coaching.

---

## 📌 Core Features

1. **Active Practice Diary (AI Coach):**
   * Write or record your voice directly using the browser's built-in **Speech Recognition API**.
   * Receive instant grammar, vocabulary, and sentence structure feedback from **Gemini AI**, along with a natural/polished version of your input.
   * Listen to the natural version using **Text-to-Speech (TTS)** with accent and gender selection.

2. **Saved Records & Audio Playback:**
   * Save your practice history to the database (stored securely as base64-encoded audio).
   * Play back your original voice recordings and download them as local `.webm` files.

3. **Interactive Shadowing Mode:**
   * Improve your pronunciation by mimicking native sentences. The AI compares your transcription match rate with the natural version.

4. **IT Interview Simulator:**
   * Simulate real-world technical interviews with an AI Recruiter. The AI asks dynamic questions, rates your suitability, evaluates grammar, and scores your answers.

5. **AI Journaling & Reflection Coach:**
   * Write daily journals in your target language. The AI automatically detects your mood/emotional tone (*Sentiment Analysis*) and provides warm, motivating reflections.

6. **Grammar Mistake Heatmap & Stats:**
   * Visually track your grammar errors (e.g., preposiions, tenses, subject-verb agreements) using progress charts and a 5-week history heatmap.

7. **Spaced Repetition Flashcards:**
   * Save new phrases to your Chunks Bank and review them using a **Spaced Repetition System (SRS)** with difficulty ratings (Easy, Medium, Hard).

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
* **Local Development:** Offline-first local SQLite database using native `bun:sqlite`.
* **Production:** Serverless cloud SQLite database using **Turso** (`@libsql/client`) via HTTP/WebSockets.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
Make sure you have [Bun](https://bun.sh) installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/mfaridzia/swaralingo.git
cd swaralingo
```

### 2. Setup Environment Variables
Create a `.env` file in the `/backend` folder:
```env
PORT=3000
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_CLIENT_ID=your-google-client-id-here
CORS_ORIGIN=http://localhost:5173
```

### 3. Run the Application
Run these commands in your project root directory:
* **Start the Backend:**
  ```bash
  cd backend
  bun install
  bun run dev
  ```
* **Start the Frontend:**
  ```bash
  cd frontend
  bun install
  bun run dev
  ```
Open **`http://localhost:5173`** in your browser.

---

## ☁️ Deployment Architecture (Zero-Cost Production Stack)

This app is designed to run seamlessly on modern serverless platforms for free:

* **Frontend:** Hosted on **Vercel** or **Cloudflare Pages** (static React file deployment).
* **Backend:** Hosted on **Cloudflare Workers** (configured using the `wrangler.toml` file in `/backend`).
* **Database:** Hosted on **Turso** (Cloud SQLite database with a generous free tier).

*To switch to production mode, configure the `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables on Cloudflare Workers.*

---

## 📄 License
[MIT License](LICENSE) - Free to use and modify for personal and commercial projects!
