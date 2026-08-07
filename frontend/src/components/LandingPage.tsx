import React from "react";
import {
  BookOpen,
  Sparkles,
  Volume2,
  Mic,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Award,
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-hidden relative">
      {/* Premium Gradient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#22c55e]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Header Branding */}
      <header className="max-w-[1200px] mx-auto px-6 py-6 flex items-center justify-between border-b border-[#27272a]/40">
        <div className="flex items-center gap-2.5 text-white font-extrabold text-lg tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c55e] to-[#15803d] text-[#09090b]">
            <BookOpen className="h-5 w-5" />
          </div>
          <span>SwaraLingo</span>
        </div>
        <button
          onClick={onGetStarted}
          className="border border-[#27272a] hover:border-white text-xs uppercase font-bold tracking-wider px-5 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-xs font-semibold text-[#4ade80]">
            <Sparkles className="h-3 w-3" />
            Next-Gen AI Language Coach
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Master English for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-emerald-500">
              IT Professionals
            </span>
          </h1>
          <p className="text-sm md:text-base text-[#a1a1aa] leading-relaxed max-w-xl">
            Transform your broken English sentences into natural,
            professional-level corporate phrases. Specially designed for
            software engineers, developers, and tech leads answering standups.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={onGetStarted}
              className="premium-btn-hover bg-[#22c55e] hover:bg-[#4ade80] text-black text-sm font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Start Practicing Free
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={onGetStarted}
              className="border border-[#27272a] hover:border-white text-sm font-semibold px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Explore Features
            </button>
          </div>
        </div>

        {/* Floating Mockup Preview Panel */}
        <div className="lg:col-span-5 relative flex justify-center">
          <div className="glass-panel w-full max-w-[400px] rounded-2xl p-6 border border-[#27272a] space-y-6 shadow-2xl relative z-10 bg-[#09090b]/40 backdrop-blur-xl">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">
                Speaking Evaluation
              </span>
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                You Spoke:
              </span>
              <div className="rounded-xl border border-[#27272a] bg-[#121214]/80 p-3.5 text-xs italic text-[#71717a] flex items-center justify-between">
                <span>"i am working on login feature yesterday"</span>
                <Mic className="h-4 w-4 text-[#71717a] flex-shrink-0" />
              </div>
            </div>

            <div className="space-y-1 border-t border-[#27272a]/60 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#22c55e]">
                  AI Polished Version:
                </span>
                <span className="flex items-center gap-1 text-[8px] border border-[#22c55e]/20 bg-[#22c55e]/5 text-[#22c55e] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                  <Volume2 className="h-2.5 w-2.5" />
                  TTS Audio
                </span>
              </div>
              <p className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 p-3.5 text-xs font-semibold text-[#4ade80]">
                "Yesterday, I worked on the login feature."
              </p>
            </div>

            <div className="p-3 bg-[#121214] rounded-xl border border-[#27272a] text-[10px] text-[#a1a1aa] leading-relaxed">
              <span className="font-bold text-[#22c55e] block mb-1">
                Coach Note:
              </span>
              Use the past tense 'worked' instead of 'am working' when
              referencing 'yesterday'.
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px] z-0" />
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-[1200px] mx-auto px-6 py-20 border-t border-[#27272a]/40 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <div className="h-10 w-10 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e]">
            <Mic className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Voice Input (STT)
          </h3>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Practice speaking naturally. Dictate your thoughts directly using
            the built-in microphone converter.
          </p>
        </div>

        <div className="space-y-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Volume2 className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Pronunciation Guide (TTS)
          </h3>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Listen to native pronunciations. Choose from multiple male/female
            accents to build your auditory muscle memory.
          </p>
        </div>

        <div className="space-y-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Streaks & Gamification
          </h3>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Stay highly motivated. Track your daily consistency streak, unlock
            academic badges, and solve AI personalized challenges.
          </p>
        </div>
      </section>

      {/* Footer Branding */}
      <footer className="border-t border-[#27272a]/40 py-8 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717a]">
          <span>
            &copy; {new Date().getFullYear()} SwaraLingo. All rights reserved
          </span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
