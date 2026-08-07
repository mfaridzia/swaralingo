import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BookOpen, 
  HelpCircle, 
  Smile, 
  TrendingUp, 
  RefreshCw, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  FileText, 
  SmilePlus, 
  Heart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiFetch } from '../api';

interface JournalEntry {
  id: number;
  user_id: number;
  prompt: string | null;
  content: string;
  mood: string;
  ai_reflection: string;
  created_at: string;
}

export const JournalCoach: React.FC = () => {
  const queryClient = useQueryClient();
  const [isPromptedMode, setIsPromptedMode] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState("What was a technical block you overcame today, and how did you resolve it?");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [journalContent, setJournalContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

  // Get active user ID
  const savedUser = localStorage.getItem('fluency_user');
  const userId = savedUser ? JSON.parse(savedUser).id : null;

  // Fetch journal prompt on mount
  useEffect(() => {
    fetchPrompt();
  }, []);

  // Update word counter
  useEffect(() => {
    const words = journalContent.trim() ? journalContent.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [journalContent]);

  // Fetch journal entries history
  const { data: entriesData, isLoading: loadingEntries } = useQuery<{ success: boolean; data: JournalEntry[] }>({
    queryKey: ['journals', userId],
    queryFn: () => apiFetch(`/journals?userId=${userId}`).then(res => res.json()),
    enabled: !!userId,
  });

  const entries = entriesData?.data || [];

  const fetchPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const savedUser = localStorage.getItem('fluency_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      const targetLanguage = user?.target_language || 'English';

      const res = await apiFetch(`/journals/prompt?targetLanguage=${encodeURIComponent(targetLanguage)}`);
      const data = await res.json();
      if (data.success && data.prompt) {
        setCurrentPrompt(data.prompt);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const submitJournalMutation = useMutation({
    mutationFn: (newEntry: { userId: number; prompt: string | null; content: string; targetLanguage: string }) => {
      return apiFetch('/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      }).then(res => res.json());
    },
    onSuccess: (resData) => {
      if (resData.success) {
        queryClient.invalidateQueries({ queryKey: ['journals', userId] });
        setJournalContent("");
      } else {
        alert(resData.error || "Failed to save journal entry.");
      }
    }
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (journalContent.trim().length < 5) {
      alert("Please write a longer entry before submitting.");
      return;
    }

    const savedUser = localStorage.getItem('fluency_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    const targetLanguage = user?.target_language || 'English';

    submitJournalMutation.mutate({
      userId,
      prompt: isPromptedMode ? currentPrompt : null,
      content: journalContent,
      targetLanguage
    });
  };

  const getMoodColor = (mood: string) => {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('stressed') || moodLower.includes('anxious')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (moodLower.includes('tired') || moodLower.includes('exhausted')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (moodLower.includes('proud') || moodLower.includes('inspired') || moodLower.includes('optimistic')) return 'bg-emerald-500/20 text-[#4ade80] border-emerald-500/30';
    if (moodLower.includes('happy')) return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
    return 'bg-[#27272a]/60 text-[#a1a1aa] border-[#27272a]';
  };

  const getMoodEmoji = (mood: string) => {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('stressed')) return '😰';
    if (moodLower.includes('anxious')) return '😟';
    if (moodLower.includes('tired')) return '🥱';
    if (moodLower.includes('exhausted')) return '😩';
    if (moodLower.includes('proud')) return '😎';
    if (moodLower.includes('inspired')) return '💡';
    if (moodLower.includes('optimistic')) return '🌟';
    if (moodLower.includes('happy')) return '😊';
    return '😐';
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272a]/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#4ade80]">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white uppercase">AI Journaling & Reflection</h1>
          </div>
          <p className="text-xs text-[#a1a1aa]">Write down your day and let AI analyze your mood and give warm reflections in English.</p>
        </div>

        {/* Mode Toggler buttons */}
        <div className="flex items-center bg-[#121214] p-1 rounded-xl border border-[#27272a] self-start md:self-auto">
          <button
            onClick={() => setIsPromptedMode(true)}
            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
              isPromptedMode 
                ? 'bg-emerald-500 text-black shadow-lg font-black' 
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            AI Prompted
          </button>
          <button
            onClick={() => setIsPromptedMode(false)}
            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
              !isPromptedMode 
                ? 'bg-emerald-500 text-black shadow-lg font-black' 
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Free Write
          </button>
        </div>
      </div>

      {/* Main Journal Entry Input Card */}
      <div className="glass-panel p-6 rounded-2xl border border-[#27272a]/60 space-y-5">
        {isPromptedMode && (
          <div className="bg-[#121214]/60 border border-[#27272a] rounded-xl p-4.5 space-y-2.5 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-500 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI Reflective Prompt
              </span>
              <button
                onClick={fetchPrompt}
                disabled={loadingPrompt}
                className="p-1 hover:bg-[#27272a] text-[#a1a1aa] hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 border-none bg-transparent"
                title="Get another prompt"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingPrompt ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-white leading-relaxed font-semibold italic pr-6">
              "{currentPrompt}"
            </p>
            <div className="absolute top-[-20px] right-[-20px] w-20 h-20 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-extrabold tracking-wider text-[#a1a1aa] flex justify-between">
              <span>Your Journal Entry</span>
              <span className="font-mono text-[#71717a] font-normal">{wordCount} words</span>
            </label>
            <textarea
              value={journalContent}
              onChange={(e) => setJournalContent(e.target.value)}
              placeholder="Reflect on your day here... Write a few paragraphs. Be honest, express your feelings or code challenges."
              rows={8}
              className="w-full rounded-xl border border-[#27272a] bg-[#121214]/80 p-4 text-xs text-white placeholder-[#52525b] focus:border-[#4ade80] focus:ring-1 focus:ring-[#4ade80] focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-[#52525b] italic">
              *Requires at least 5 characters. More details yield better AI reflection.
            </span>
            <button
              type="submit"
              disabled={submitJournalMutation.isPending || journalContent.trim().length < 5}
              className="premium-btn-hover bg-[#22c55e] hover:bg-[#4ade80] disabled:bg-[#27272a] disabled:text-[#52525b] disabled:opacity-50 text-black text-[10px] uppercase font-bold tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              {submitJournalMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Analyzing Mood...
                </>
              ) : (
                <>
                  <SmilePlus className="h-3.5 w-3.5" />
                  Submit Entry & Reflected Coach
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Latest Saved AI Reflection Highlight */}
      {submitJournalMutation.data?.success && (
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#121214]/60 to-emerald-500/5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
            <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-500 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Latest Reflection Result
            </span>
            <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getMoodColor(submitJournalMutation.data.data.mood)}`}>
              Mood: {getMoodEmoji(submitJournalMutation.data.data.mood)} {submitJournalMutation.data.data.mood}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-extrabold tracking-wider text-[#a1a1aa] block">AI Coach Response:</span>
            <p className="text-xs text-white leading-relaxed font-semibold italic">
              "{submitJournalMutation.data.data.ai_reflection}"
            </p>
          </div>
        </div>
      )}

      {/* Journal History Section */}
      <div className="space-y-4">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-white flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-[#a1a1aa]" />
          Journal History & Mood Timeline
        </h3>

        {loadingEntries ? (
          <div className="glass-panel p-8 rounded-2xl border border-[#27272a]/60 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[#4ade80]" />
            <span className="text-xs text-[#a1a1aa]">Loading journal entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl border border-[#27272a]/60 text-center space-y-2.5">
            <Heart className="h-8 w-8 text-[#52525b] mx-auto" />
            <h4 className="text-xs font-bold text-white uppercase">Your Journal is Empty</h4>
            <p className="text-[11px] text-[#a1a1aa] max-w-sm mx-auto leading-relaxed">
              Start writing your first entry above. AI will analyze your daily mood and build your reflection history here.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {entries.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              const formattedDate = new Date(entry.created_at).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={entry.id}
                  className="glass-panel rounded-2xl border border-[#27272a]/60 overflow-hidden transition-all duration-200"
                >
                  {/* Collapsible Header */}
                  <div 
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#121214]/40 select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-[#121214] border border-[#27272a] flex items-center justify-center text-xs">
                        {getMoodEmoji(entry.mood)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate max-w-xs md:max-w-md">
                          {entry.content.slice(0, 70)}...
                        </p>
                        <span className="text-[9px] text-[#71717a]">{formattedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${getMoodColor(entry.mood)}`}>
                        {entry.mood}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-[#52525b]" /> : <ChevronDown className="h-4 w-4 text-[#52525b]" />}
                    </div>
                  </div>

                  {/* Collapsible Body */}
                  {isExpanded && (
                    <div className="p-4 border-t border-[#27272a]/60 bg-[#121214]/30 space-y-4 text-xs">
                      {entry.prompt && (
                        <div className="bg-[#121214]/50 border border-[#27272a] p-3 rounded-lg">
                          <span className="text-[8px] uppercase font-extrabold tracking-wider text-emerald-500 block mb-1">
                            Prompted Topic:
                          </span>
                          <p className="text-white italic">"{entry.prompt}"</p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <span className="text-[8px] uppercase font-extrabold tracking-wider text-[#a1a1aa] block">
                          Your Reflection:
                        </span>
                        <p className="text-white leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                      </div>

                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1">
                        <span className="text-[8px] uppercase font-extrabold tracking-wider text-emerald-500 block">
                          AI Coach Reflection:
                        </span>
                        <p className="text-white leading-relaxed italic">"{entry.ai_reflection}"</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
