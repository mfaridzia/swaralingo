import { BookOpen, ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  type: 'privacy' | 'terms';
  onBack: () => void;
}

export function LegalPage({ type, onBack }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <header className="max-w-[800px] mx-auto px-6 py-6 flex items-center gap-4 border-b border-[#27272a]/40">
        <button
          onClick={onBack}
          className="p-2 rounded-lg border border-[#27272a] hover:border-white text-[#a1a1aa] hover:text-white transition-colors cursor-pointer bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5 text-white font-extrabold text-lg tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c55e] to-[#15803d] text-[#09090b]">
            <BookOpen className="h-5 w-5" />
          </div>
          <span>SwaraLingo</span>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-6 py-12 space-y-8">
        {type === 'privacy' ? (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight">Privacy Policy</h1>
              <p className="text-xs text-[#a1a1aa]">Last updated: August 2026</p>
            </div>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">1. Information We Collect</h2>
              <p>
                SwaraLingo collects the following information to provide and improve our services:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#a1a1aa]">
                <li><strong className="text-[#d4d4d8]">Account Information:</strong> Your name, email address, and hashed password when you register.</li>
                <li><strong className="text-[#d4d4d8]">Practice Data:</strong> Diary entries, vocabulary chunks, journal reflections, and audio recordings you create within the app.</li>
                <li><strong className="text-[#d4d4d8]">AI Processing Data:</strong> Sentences and audio recordings sent to Google Gemini API and Cloudflare Workers AI for grammar analysis, pronunciation evaluation, and transcription.</li>
                <li><strong className="text-[#d4d4d8]">Push Notification Tokens:</strong> Browser push subscription data if you enable daily reminder notifications.</li>
                <li><strong className="text-[#d4d4d8]">Analytics:</strong> Anonymous usage metrics via Cloudflare Web Analytics (no cookies, no personal tracking).</li>
              </ul>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">2. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2 text-[#a1a1aa]">
                <li>To provide English grammar corrections and pronunciation feedback</li>
                <li>To generate personalized daily challenges and journal reflections</li>
                <li>To track your learning progress (streaks, scores, fluency trends)</li>
                <li>To send browser push notifications for daily practice reminders (with your consent)</li>
                <li>To improve the quality of our AI coaching algorithms</li>
              </ul>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">3. Data Storage & Security</h2>
              <p>
                Your data is stored on Turso Cloud (Libsql) and Cloudflare R2 (audio files). All database access is authenticated and encrypted in transit via TLS. Passwords are hashed using PBKDF2 with SHA-256 and 100,000 iterations. Audio recordings are stored securely in Cloudflare R2 object storage.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">4. Third-Party Services</h2>
              <p>
                We use the following third-party services to provide core functionality:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#a1a1aa]">
                <li><strong className="text-[#d4d4d8]">Google Gemini API:</strong> Grammar analysis, journal coaching, interview simulation, and pronunciation evaluation. Review Google's <a href="https://ai.google.dev/gemini-api/terms" className="text-[#22c55e] hover:underline" target="_blank">API Terms</a>.</li>
                <li><strong className="text-[#d4d4d8]">Cloudflare Workers AI (Whisper):</strong> Audio transcription. Review Cloudflare's <a href="https://www.cloudflare.com/cloudflare-workers-ai-terms/" className="text-[#22c55e] hover:underline" target="_blank">Workers AI Terms</a>.</li>
                <li><strong className="text-[#d4d4d8]">Cloudflare Web Analytics:</strong> Anonymous usage metrics (no cookies).</li>
              </ul>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">5. Your Rights</h2>
              <p>
                You may request deletion of your account and all associated data at any time by contacting us. Audio recordings can be deleted individually through the app interface. You can disable push notifications or reminders in the Settings panel.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">6. Contact</h2>
              <p>
                For privacy-related inquiries, contact us at <a href="mailto:muhfaridzia@gmail.com" className="text-[#22c55e] hover:underline">muhfaridzia@gmail.com</a>.
              </p>
            </section>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight">Terms of Service</h1>
              <p className="text-xs text-[#a1a1aa]">Last updated: August 2026</p>
            </div>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">1. Acceptance of Terms</h2>
              <p>
                By accessing or using SwaraLingo ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. SwaraLingo is provided by an independent developer as a free language learning tool for IT professionals.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">2. Description of Service</h2>
              <p>
                SwaraLingo is an AI-powered English learning application designed for Indonesian IT professionals. Features include grammar correction via Google Gemini API, speech-to-text (STT), text-to-speech (TTS), vocabulary flashcards with spaced repetition, AI interview simulation, AI journaling, and progress analytics.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration. We reserve the right to suspend accounts that violate these terms or engage in abuse of the AI services.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2 text-[#a1a1aa]">
                <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
                <li>Attempt to abuse, exploit, or reverse-engineer the AI APIs (Gemini, Whisper) beyond normal usage patterns</li>
                <li>Submit content that is illegal, harmful, or violates the terms of third-party AI providers</li>
                <li>Attempt to gain unauthorized access to other users' accounts or data</li>
                <li>Use automated scripts or bots to access the Service without prior written permission</li>
              </ul>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">5. AI-Generated Content</h2>
              <p>
                Grammar corrections, journal reflections, interview responses, and other AI-generated content are provided by Google Gemini API and Cloudflare Workers AI. While we strive for accuracy, AI outputs may contain errors. Do not rely on AI feedback as the sole source of language learning — it is a practice tool, not a certified language course.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">6. Service Availability</h2>
              <p>
                SwaraLingo is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, third-party API outages (Gemini, Cloudflare), or other factors beyond our control.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">7. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, SwaraLingo and its developer shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to data loss, service interruptions, or inaccuracies in AI-generated content.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the updated terms. Material changes will be communicated via the application.
              </p>
            </section>

            <section className="space-y-4 text-sm text-[#d4d4d8] leading-relaxed">
              <h2 className="text-base font-bold text-white">9. Contact</h2>
              <p>
                For questions about these Terms, contact us at <a href="mailto:muhfaridzia@gmail.com" className="text-[#22c55e] hover:underline">muhfaridzia@gmail.com</a>.
              </p>
            </section>
          </>
        )}

        {/* Back to Home */}
        <div className="pt-8 border-t border-[#27272a]/40">
          <button
            onClick={onBack}
            className="text-sm text-[#22c55e] hover:text-[#4ade80] transition-colors cursor-pointer bg-transparent"
          >
            ← Back to SwaraLingo
          </button>
        </div>
      </main>

      <footer className="border-t border-[#27272a]/40 py-8 mt-12">
        <div className="max-w-[800px] mx-auto px-6 text-center text-xs text-[#71717a]">
          &copy; {new Date().getFullYear()} SwaraLingo. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
