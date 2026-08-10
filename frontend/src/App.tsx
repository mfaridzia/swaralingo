import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

// Import refactored reusable components
import { Navbar } from './components/Navbar';
import { SyncBanner } from './offline/indicator';
import { PracticeDiary } from './components/PracticeDiary';
import { SentenceChunks } from './components/SentenceChunks';
import { Dashboard } from './components/Dashboard';
import { SavedRecords } from './components/SavedRecords';
import { Auth } from './components/Auth';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { InterviewSimulator } from './components/InterviewSimulator';
import { JournalCoach } from './components/JournalCoach';
import type { UserProfile } from './components/Auth';

import { apiFetch, clearAuth } from './api';

interface PracticeLog {
  id: number;
  user_input: string;
  ai_feedback: string;
  improved_version: string;
  audio_base64?: string | null;
  audio_key?: string | null;
  created_at: string;
}

interface SentenceChunk {
  id: number;
  phrase: string;
  meaning: string;
  example: string;
  category: string;
}

interface ChartDataItem {
  date: string;
  count: number;
  fluencyScore: number;
}

interface StatsData {
  weeklyGrowth: {
    thisWeek: number;
    lastWeek: number;
    growthPercentage: number;
  };
  averageFluencyScore: number;
  chartData: ChartDataItem[];
}

// Framer Motion Page Transition config wrappers
const pageTransitionVariants: any = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -15, transition: { duration: 0.25 } }
};

function AnimatedRouteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

function MainAppLayout({
  activeUser,
  handleLogin,
  handleLogout
}: {
  activeUser: UserProfile;
  handleLogin: (user: UserProfile) => void;
  handleLogout: () => void;
}) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<ChartDataItem | null>(null);

  // States
  const [userInput, setUserInput] = useState('');
  const [improvedVersion, setImprovedVersion] = useState('');
  const [apiErrorMsg, setApiErrorMsg] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [newPhrase, setNewPhrase] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');

  // Request browser notification permission on login/dashboard entry
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Listen to custom event dispatched by sub-component when chunk is added
  useEffect(() => {
    const handleRefetch = () => {
      queryClient.invalidateQueries({ queryKey: ['chunks', activeUser.id] });
      queryClient.invalidateQueries({ queryKey: ['stats', activeUser.id] });
    };

    window.addEventListener('chunkAdded', handleRefetch);
    return () => window.removeEventListener('chunkAdded', handleRefetch);
  }, [queryClient, activeUser.id]);

  // Determine active tab class visually in Navbar based on current URL path
  const getActiveTab = (): 'diary' | 'chunks' | 'stats' | 'settings' | 'simulator' => {
    if (location.pathname === '/dashboard/chunks') return 'chunks';
    if (location.pathname === '/dashboard/stats') return 'stats';
    if (location.pathname === '/dashboard/settings') return 'settings';
    if (location.pathname === '/dashboard/simulator') return 'simulator';
    return 'diary';
  };

  const activeTab = getActiveTab();

  // Queries
  const { data: logs, isLoading: loadingLogs } = useQuery<{ success: boolean; data: PracticeLog[] }>({
    queryKey: ['logs', activeUser.id],
    queryFn: () => apiFetch(`/logs?userId=${activeUser.id}`).then(res => res.json()),
    enabled: !!activeUser,
  });

  const { data: chunks, isLoading: loadingChunks } = useQuery<{ success: boolean; data: SentenceChunk[] }>({
    queryKey: ['chunks', activeUser.id],
    queryFn: () => apiFetch(`/chunks?userId=${activeUser.id}`).then(res => res.json()),
    enabled: !!activeUser,
  });

  const { data: stats, isLoading: loadingStats } = useQuery<{ success: boolean; data: StatsData }>({
    queryKey: ['stats', activeUser.id],
    queryFn: () => apiFetch(`/stats?userId=${activeUser.id}`).then(res => res.json()),
    enabled: !!activeUser,
  });

  // Mutations
  // Catatan: body POST harus camelCase — backend Zod (logs.ts) memvalidasi userInput/aiFeedback/improvedVersion/audioKey
  const saveLogMutation = useMutation({
    mutationFn: (newLog: { userInput: string; aiFeedback: string; improvedVersion: string; audioKey?: string | null }) =>
      apiFetch('/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      }).then(async res => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to save log');
        return json;
      }),
    onError: (err: any) => {
      setApiErrorMsg(err?.message || 'Failed to save log. Please try again.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs', activeUser.id] });
      queryClient.invalidateQueries({ queryKey: ['stats', activeUser.id] });
      setUserInput('');
      setImprovedVersion('');
      setAiFeedback('');

      // Trigger a local notification reminder when successfully practicing
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SwaraLingo Practice Saved!', {
          body: 'Great job staying consistent today! Keep practicing to build your active speaking reflexes.',
          icon: '/favicon.ico'
        });
      }
    }
  });

  const saveChunkMutation = useMutation({
    mutationFn: (newChunk: Omit<SentenceChunk, 'id'>) =>
      apiFetch('/chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChunk),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chunks', activeUser.id] });
      queryClient.invalidateQueries({ queryKey: ['stats', activeUser.id] });
      setNewPhrase('');
      setNewMeaning('');
      setNewExample('');
    }
  });

  const handleQuickImprove = async () => {
    if (!userInput.trim()) return;
    setIsGenerating(true);

    try {
      const response = await apiFetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: userInput,
          targetLanguage: activeUser.target_language || 'English'
        }),
      });
      const resData = await response.json();
      if (resData.success) {
        setImprovedVersion(resData.data.improved);
        setAiFeedback(resData.data.feedback);
      } else {
        setImprovedVersion("");
        setAiFeedback(`API Error: ${resData.error || "Failed to analyze."}`);
        setApiErrorMsg(resData.error || "Failed to analyze sentence.");
      }
    } catch (err: any) {
      setImprovedVersion("");
      setAiFeedback(`Connection Error: ${err.message || "Could not reach server."}`);
      setApiErrorMsg(err.message || "Could not reach server.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveLog = async (audioBlob?: Blob | null) => {
    if (!userInput || !improvedVersion || !aiFeedback) return;

    // Offline mode: queue locally instead of posting to server
    const offlineStore = (await import('./offline/store')).getOfflineStore();
    if (offlineStore.offlineModeEnabled && !navigator.onLine) {
      const { enqueueMutation, enqueueAudio } = await import('./offline/sync/engine');
      let audioBlobId: number | undefined;
      if (audioBlob) {
        audioBlobId = await enqueueAudio(audioBlob);
      }
      await enqueueMutation('logs', 'insert', {
        user_input: userInput,
        ai_feedback: aiFeedback,
        improved_version: improvedVersion,
        userId: activeUser?.id,
      }, audioBlobId);
      // Clear form (optimistic)
      setUserInput('');
      setImprovedVersion('');
      setAiFeedback('');
      return;
    }

    // Online path: existing behavior
    let audioKey: string | null = null;
    if (audioBlob) {
      try {
        const res = await apiFetch('/audio', { method: 'POST', body: audioBlob });
        const json = await res.json();
        if (json.success) audioKey = json.data.audioKey;
      } catch {
        // Best-effort: simpan log tanpa audio jika upload gagal
      }
    }
    saveLogMutation.mutate(
      { userInput, aiFeedback, improvedVersion, audioKey },
      {
        onError: () => {
          // Bersihkan orphan object R2 jika save log gagal
          if (audioKey) apiFetch(`/audio/${audioKey}`, { method: 'DELETE' }).catch(() => {});
        },
      }
    );
  };

  const handleSaveChunk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhrase || !newMeaning || !newExample) return;
    saveChunkMutation.mutate({
      phrase: newPhrase,
      meaning: newMeaning,
      example: newExample,
      category: 'IT & Daily'
    });
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <SyncBanner />
      <Navbar
        activeTab={activeTab}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        user={activeUser}
        onLogout={handleLogout}
      />

      <main className="mx-auto px-5 py-12 md:px-6 lg:px-0 max-w-[1200px] grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          {/* Framer motion page transition anim triggers */}
          <AnimatePresence mode="wait">
            <Routes>
              <Route index element={
                <PracticeDiary 
                  targetLanguage={activeUser.target_language || 'English'}
                  userInput={userInput}
                  setUserInput={setUserInput}
                  improvedVersion={improvedVersion}
                  aiFeedback={aiFeedback}
                  isGenerating={isGenerating}
                  handleQuickImprove={handleQuickImprove}
                  handleSaveLog={handleSaveLog}
                />
              } />

              <Route path="/chunks" element={
                <AnimatedRouteWrapper>
                  <SentenceChunks 
                    newPhrase={newPhrase}
                    setNewPhrase={setNewPhrase}
                    newMeaning={newMeaning}
                    setNewMeaning={setNewMeaning}
                    newExample={newExample}
                    setNewExample={setNewExample}
                    handleSaveChunk={handleSaveChunk}
                  />
                </AnimatedRouteWrapper>
              } />

              <Route path="/stats" element={
                <AnimatedRouteWrapper>
                  <Dashboard 
                    stats={stats}
                    loadingStats={loadingStats}
                    hoveredDataPoint={hoveredDataPoint}
                    setHoveredDataPoint={setHoveredDataPoint}
                  />
                </AnimatedRouteWrapper>
              } />

              <Route path="/settings" element={
                <AnimatedRouteWrapper>
                  <Settings 
                    user={activeUser}
                    onProfileUpdated={handleLogin}
                  />
                </AnimatedRouteWrapper>
              } />

              <Route path="/simulator" element={
                <AnimatedRouteWrapper>
                  <InterviewSimulator />
                </AnimatedRouteWrapper>
              } />

              <Route path="/journal" element={
                <AnimatedRouteWrapper>
                  <JournalCoach />
                </AnimatedRouteWrapper>
              } />

              {/* Redirect fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>

        <SavedRecords
          activeTab={activeTab}
          logs={logs}
          loadingLogs={loadingLogs}
          chunks={chunks}
          loadingChunks={loadingChunks}
          userId={activeUser.id}
        />
      </main>

      {/* Premium Error Modal Overlay */}
      {apiErrorMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/80 backdrop-blur-md p-4">
          <div className="glass-panel max-w-sm w-full rounded-2xl p-6 border border-red-500/20 space-y-6 shadow-2xl animate-scaleIn bg-[#09090b]/90">
            <div className="flex items-center gap-3 border-b border-red-500/10 pb-3 text-red-400">
              <ShieldAlert className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">AI Service Error</h3>
            </div>
            
            <p className="text-xs text-[#d4d4d8] leading-relaxed">
              {apiErrorMsg}
            </p>

            <button
              onClick={() => setApiErrorMsg(null)}
              className="w-full bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] hover:border-white text-xs font-bold uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer text-white"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WelcomeRoutes({
  activeUser,
  handleLogin,
  handleLogout
}: {
  activeUser: UserProfile | null;
  handleLogin: (user: UserProfile) => void;
  handleLogout: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Landing promo page root route before login */}
      <Route 
        path="/" 
        element={
          !activeUser 
            ? <LandingPage onGetStarted={() => navigate('/login')} /> 
            : <Navigate to="/dashboard" replace />
        } 
      />

      {/* Auth Screen */}
      <Route 
        path="/login" 
        element={!activeUser ? <Auth onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} 
      />


      
      <Route 
        path="/dashboard/*" 
        element={activeUser ? (
          <MainAppLayout activeUser={activeUser} handleLogin={handleLogin} handleLogout={handleLogout} />
        ) : (
          <Navigate to="/" replace />
        )} 
      />
      
      {/* Catch-all global redirect back to Landing/Dashboard */}
      <Route path="*" element={<Navigate to={activeUser ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}

export default function App() {
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Load session from localStorage; cookie HttpOnly terverifikasi server saat request pertama (401 → auto logout)
  useEffect(() => {
    const savedUser = localStorage.getItem('fluency_user');
    if (savedUser) {
      try {
        setActiveUser(JSON.parse(savedUser));
      } catch (e) {
        clearAuth();
      }
    }
    setInitializing(false);
  }, []);

  const handleLogin = (user: UserProfile) => {
    setActiveUser(user);
    localStorage.setItem('fluency_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setActiveUser(null);
    clearAuth();
    // Hapus session cookie server-side
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-sm text-[#a1a1aa]">
        Initializing user session...
      </div>
    );
  }

  return (
    <Router>
      <WelcomeRoutes activeUser={activeUser} handleLogin={handleLogin} handleLogout={handleLogout} />
    </Router>
  );
}
