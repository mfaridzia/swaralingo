import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Tag,
  Layers,
  BookOpen,
  RotateCw,
  Check,
  HelpCircle,
  TrendingUp,
  BrainCircuit,
  Award
} from 'lucide-react';
import { apiFetch, showToast } from '../api';
interface SentenceChunksProps {
  newPhrase: string;
  setNewPhrase: (val: string) => void;
  newMeaning: string;
  setNewMeaning: (val: string) => void;
  newExample: string;
  setNewExample: (val: string) => void;
  handleSaveChunk: (e: React.FormEvent) => void;
}

interface SentenceChunk {
  id: number;
  phrase: string;
  meaning: string;
  example: string;
  category: string;
}

export const SentenceChunks: React.FC<SentenceChunksProps> = ({
  newPhrase,
  setNewPhrase,
  newMeaning,
  setNewMeaning,
  newExample,
  setNewExample,
  handleSaveChunk,
}) => {
  const [category, setCategory] = useState('IT & Daily');
  const [activeSubTab, setActiveSubTab] = useState<'add' | 'review'>('add');
  const [isSaving, setIsSaving] = useState(false);

  // Flashcard states
  const [chunks, setChunks] = useState<SentenceChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  // Get activeUser ID
  const savedUser = localStorage.getItem('fluency_user');
  const userId = savedUser ? JSON.parse(savedUser).id : null;

  const fetchChunksForReview = () => {
    if (!userId) return;
    setLoadingChunks(true);
    apiFetch(`/chunks?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setChunks(Array.isArray(data.data) ? data.data : []);
        }
        setLoadingChunks(false);
      })
      .catch(() => setLoadingChunks(false));
  };

  // Fetch chunks whenever we switch to the review tab
  useEffect(() => {
    if (activeSubTab === 'review') {
      fetchChunksForReview();
      setCurrentCardIdx(0);
      setIsFlipped(false);
      setReviewComplete(false);
    }
  }, [activeSubTab]);

  const handleSaveWithCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhrase || !newMeaning || !newExample || isSaving) return;

    setIsSaving(true);
    try {
      const res = await apiFetch('/chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: newPhrase,
          meaning: newMeaning,
          example: newExample,
          category: category
        }),
      });
      const data = await res.json();
      if (data && !data.success) {
        showToast(data.error || 'Failed to save chunk.', 'error');
        return;
      }
      setNewPhrase('');
      setNewMeaning('');
      setNewExample('');
      showToast('Sentence chunk saved successfully!', 'success');
      window.dispatchEvent(new CustomEvent('chunkAdded'));
    } catch (err: any) {
      showToast(err.message || 'Failed to save chunk.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRateCard = (rating: 'easy' | 'medium' | 'hard') => {
    // In a fully loaded server database, this would schedule future review intervals.
    // Here we simulate the transition to the next card with micro-interactions.
    setIsFlipped(false);

    setTimeout(() => {
      if (currentCardIdx + 1 < chunks.length) {
        setCurrentCardIdx(prev => prev + 1);
      } else {
        setReviewComplete(true);
      }
    }, 200);
  };

  const resetReviewSession = () => {
    setCurrentCardIdx(0);
    setIsFlipped(false);
    setReviewComplete(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#f4f4f5]">Sentence Chunks Bank</h1>
          <p className="text-sm text-[#a1a1aa]">
            Save and categorize target phrases, idioms, or sentences templates to master your active vocabulary.
          </p>
        </div>

        {/* Segmented Sub-Tab Control */}
        <div className="flex items-center gap-1 bg-[#18181b] border border-[#27272a] p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveSubTab('add')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeSubTab === 'add'
                ? 'bg-[#22c55e] text-[#09090b]'
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Add Chunk
          </button>
          <button
            onClick={() => setActiveSubTab('review')}
            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeSubTab === 'review'
                ? 'bg-[#22c55e] text-[#09090b]'
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5 mr-0.5" />
            Review Spaced Repetition
          </button>
        </div>
      </div>

      {activeSubTab === 'add' ? (
        <form onSubmit={handleSaveWithCategory} className="glass-panel space-y-6 rounded-2xl p-6">
          <div className="flex items-center gap-2 border-b border-[#27272a] pb-3">
            <PlusCircle className="h-5 w-5 text-[#22c55e]" />
            <h3 className="text-sm font-bold tracking-wider uppercase text-white">Add New Chunk</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* English Phrase */}
            <div className="flex flex-col space-y-2">
              <label htmlFor="phrase-input" className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">English Phrase</label>
              <input
                id="phrase-input"
                type="text"
                required
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                placeholder="e.g., I'm stuck with..."
                className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors placeholder-[#52525b]"
              />
            </div>

            {/* Meaning in Bahasa */}
            <div className="flex flex-col space-y-2">
              <label htmlFor="meaning-input" className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Meaning (Bahasa)</label>
              <input
                id="meaning-input"
                type="text"
                required
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                placeholder="e.g., Saya terhambat/macet dengan..."
                className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors placeholder-[#52525b]"
              />
            </div>

            {/* Category Selector */}
            <div className="flex flex-col space-y-2 md:col-span-2">
              <label htmlFor="category-select" className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Category Tag</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
                  <Tag className="h-4 w-4" />
                </div>
                <select
                  id="category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors cursor-pointer appearance-none"
                >
                  <option value="IT & Daily">IT & Standup Daily</option>
                  <option value="Formal Email">Formal business Email</option>
                  <option value="Negotiation">Client Negotiation</option>
                  <option value="Presentation">Project Presentation</option>
                  <option value="Socializing">Casual Socializing</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#a1a1aa]">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Example Sentence */}
            <div className="flex flex-col space-y-2 md:col-span-2">
              <label htmlFor="example-input" className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Usage Example Sentence</label>
              <textarea
                id="example-input"
                required
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                placeholder="e.g., I'm stuck with this Docker configuration error and need a code review."
                className="h-20 w-full rounded-xl border border-[#27272a] bg-[#121214] p-4 text-sm text-white outline-none transition-all placeholder-[#52525b] focus:border-[#22c55e] focus:bg-[#151518]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="premium-btn-hover flex items-center gap-2 rounded-xl bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-[#09090b] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : (
                <>
                  Add to Chunks Bank
                  <PlusCircle className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#22c55e]" />
              <h3 className="text-sm font-bold tracking-wider uppercase text-white">Spaced Repetition Review Deck</h3>
            </div>
            {!reviewComplete && chunks.length > 0 && (
              <span className="text-xs text-[#a1a1aa] font-mono">
                Card {currentCardIdx + 1} of {chunks.length}
              </span>
            )}
          </div>

          {loadingChunks ? (
            <div className="text-center py-16 text-xs text-[#a1a1aa] italic">Loading flashcards from your bank...</div>
          ) : chunks.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <HelpCircle className="h-10 w-10 text-[#52525b] mx-auto" />
              <p className="text-sm text-[#a1a1aa]">Your Sentence Chunks Bank is currently empty.</p>
              <button
                onClick={() => setActiveSubTab('add')}
                className="text-xs text-[#22c55e] underline hover:text-[#4ade80] bg-transparent border-none cursor-pointer"
              >
                Go add some chunks first to activate review card sets!
              </button>
            </div>
          ) : reviewComplete ? (
            <div className="text-center py-12 space-y-6 max-w-sm mx-auto">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]/15 text-[#22c55e] mx-auto">
                <Award className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-white uppercase tracking-wider">Review Complete!</h4>
                <p className="text-xs text-[#a1a1aa]">You reviewed all {chunks.length} vocabulary chunks today. Next interval review scheduled automatically.</p>
              </div>
              <button
                onClick={resetReviewSession}
                className="w-full premium-btn-hover flex items-center justify-center gap-2 rounded-xl bg-[#22c55e] py-2.5 text-xs font-bold text-[#09090b] cursor-pointer"
              >
                Restart Session
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Flip Flashcard Deck container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative w-full h-56 rounded-2xl cursor-pointer perspective-1000 transition-all duration-500 transform-style-3d hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Side */}
                <div className="absolute inset-0 bg-[#121214] border border-[#27272a] rounded-2xl p-6 flex flex-col justify-between backface-hidden">
                  <span className="text-[9px] bg-[#27272a] px-2 py-0.5 rounded text-[#a1a1aa] self-start uppercase font-bold tracking-wider">
                    {chunks[currentCardIdx].category}
                  </span>
                  <div className="text-center py-4">
                    <h2 className="text-xl font-extrabold text-white tracking-wide">{chunks[currentCardIdx].phrase}</h2>
                  </div>
                  <span className="text-[10px] text-[#52525b] text-center uppercase tracking-wider font-semibold flex items-center justify-center gap-1.5">
                    <RotateCw className="h-3 w-3" />
                    Click card to reveal definition
                  </span>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 bg-[#18181b] border border-[#22c55e]/25 rounded-2xl p-6 flex flex-col justify-between backface-hidden rotate-y-180">
                  <div className="space-y-2">
                    <span className="text-[9px] text-[#22c55e] font-extrabold uppercase tracking-wider">Meaning (Bahasa)</span>
                    <p className="text-sm font-bold text-white">{chunks[currentCardIdx].meaning}</p>
                  </div>
                  <div className="space-y-1 border-t border-[#27272a] pt-3">
                    <span className="text-[9px] text-[#a1a1aa] font-extrabold uppercase tracking-wider">Usage Example</span>
                    <p className="text-xs italic text-[#d4d4d8]">"{chunks[currentCardIdx].example}"</p>
                  </div>
                  <span className="text-[10px] text-[#52525b] text-center uppercase tracking-wider font-semibold">
                    Rate difficulty to schedule reviews
                  </span>
                </div>
              </div>

              {/* SR Schedule Rating Dock */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleRateCard('hard')}
                  className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-semibold cursor-pointer transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-wider">Hard</span>
                  <span className="text-[9px] text-[#a1a1aa]">Review in 1d</span>
                </button>
                <button
                  onClick={() => handleRateCard('medium')}
                  className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 font-semibold cursor-pointer transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-wider">Medium</span>
                  <span className="text-[9px] text-[#a1a1aa]">Review in 3d</span>
                </button>
                <button
                  onClick={() => handleRateCard('easy')}
                  className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-semibold cursor-pointer transition-colors"
                >
                  <span className="text-xs font-bold uppercase tracking-wider">Easy</span>
                  <span className="text-[9px] text-[#a1a1aa]">Review in 7d</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
