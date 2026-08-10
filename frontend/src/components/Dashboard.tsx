import React, { useState } from 'react';
import { Award, MessageSquare, TrendingUp, Calendar, Zap, PieChart, Target, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api';

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

interface PracticeLog {
  id: number;
  user_input: string;
  ai_feedback: string;
  improved_version: string;
  created_at: string;
}

interface SentenceChunk {
  id: number;
  phrase: string;
  meaning: string;
  example: string;
  category: string;
}

interface DashboardProps {
  stats: { success: boolean; data: StatsData } | undefined;
  loadingStats: boolean;
  hoveredDataPoint: ChartDataItem | null;
  setHoveredDataPoint: (point: ChartDataItem | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats: initialStats,
  loadingStats: initialLoading,
  hoveredDataPoint,
  setHoveredDataPoint,
}) => {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [generatedChallenge, setGeneratedChallenge] = useState<string>('');
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  
  // Get activeUser ID from localStorage
  const savedUser = localStorage.getItem('fluency_user');
  const userId = savedUser ? JSON.parse(savedUser).id : null;

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load cached daily challenge from localStorage on mount
  React.useEffect(() => {
    const dateStr = getTodayDateString();
    const cached = localStorage.getItem(`fluency_daily_challenge_v2_${dateStr}`);
    if (cached) {
      setGeneratedChallenge(cached);
    }
  }, []);

  // Query specific range stats data
  const { data: stats, isLoading } = useQuery<{ success: boolean; data: StatsData }>({
    queryKey: ['stats', userId, range],
    queryFn: () => apiFetch(`/stats?userId=${userId}&range=${range}`).then(res => res.json()),
    enabled: !!userId,
    initialData: range === '7d' ? initialStats : undefined
  });

  // Query all sentence chunks to analyze category distribution
  const { data: chunksData } = useQuery<{ success: boolean; data: SentenceChunk[] }>({
    queryKey: ['chunks', userId],
    queryFn: () => apiFetch(`/chunks?userId=${userId}`).then(res => res.json()),
    enabled: !!userId,
  });

  // Query all practice logs to analyze previous mistakes
  const { data: logsData } = useQuery<{ success: boolean; data: PracticeLog[] }>({
    queryKey: ['logs', userId],
    queryFn: () => apiFetch(`/logs?userId=${userId}`).then(res => res.json()),
    enabled: !!userId,
  });

  const chartHeight = 160;
  const chartWidth = 500;
  const chartData = stats?.data?.chartData || [];
  const loading = isLoading || initialLoading;

  // Generate personalized daily challenge using previous diary entries & mistakes via AI
  const handleGenerateDailyChallenge = async () => {
    setIsGeneratingChallenge(true);
    setGeneratedChallenge('');

    try {
      const logs = Array.isArray(logsData?.data) ? logsData.data : [];
      // Extract latest 5 entries with corrections to feed into context
      const mistakesContext = logs
        .filter(l => l.ai_feedback && !l.ai_feedback.includes("grammatically correct"))
        .slice(0, 5)
        .map(l => `- Original: "${l.user_input}"\n  Correction: "${l.improved_version}"\n  Feedback: "${l.ai_feedback}"`)
        .join('\n');

      const response = await apiFetch('/analyze/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mistakesContext,
          targetLanguage: savedUser ? JSON.parse(savedUser).target_language || 'English' : 'English'
        })
      });

      const resData = await response.json();
      const dateStr = getTodayDateString();
      if (resData.success) {
        const challengeText = resData.data.challenge;
        setGeneratedChallenge(challengeText);
        localStorage.setItem(`fluency_daily_challenge_v2_${dateStr}`, challengeText);
      } else {
        const fallbackText = "Challenge: Write a sentence describing what you did yesterday at work using past tense correctly.";
        setGeneratedChallenge(fallbackText);
        localStorage.setItem(`fluency_daily_challenge_v2_${dateStr}`, fallbackText);
      }
    } catch (err) {
      const fallbackText = "Challenge: Write a sentence describing what you did yesterday at work using past tense correctly.";
      setGeneratedChallenge(fallbackText);
      const dateStr = getTodayDateString();
      localStorage.setItem(`fluency_daily_challenge_v2_${dateStr}`, fallbackText);
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  // Calculate consistency streaks — langsung dari semua logs (bukan chartData 7/30d,
  // yang memotong streak panjang). created_at DB = CURRENT_TIMESTAMP (UTC), jadi
  // perbandingan pakai toISOString UTC — konsisten lintas timezone user.
  const calculateStreak = (): number => {
    const logs = logsData?.data || [];
    if (!logs.length) return 0;

    const activeDays = new Set(logs.map(l => String(l.created_at).slice(0, 10))); // "2026-08-10"

    let streak = 0;
    const now = new Date();
    for (let offset = 0; offset < 366; offset++) {
      const day = new Date(now.getTime() - offset * 86400000);
      const dayKey = day.toISOString().slice(0, 10);
      if (activeDays.has(dayKey)) {
        streak++;
        continue;
      }
      if (offset === 0) continue; // hari ini belum latihan → grace, streak tidak putus
      break;
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  // Determine Badge Levels
  const getBadgeInfo = (streak: number) => {
    if (streak >= 7) {
      return { title: 'Elite Scholar 🏆', desc: 'Maintained a consistent 7+ day study streak! Master-class commitment.', color: '#4ade80' };
    }
    if (streak >= 5) {
      return { title: 'Dedicated Learner ⭐', desc: '5+ day active streak. You are building active muscle reflex!', color: '#60a5fa' };
    }
    if (streak >= 3) {
      return { title: 'Rising Star 🚀', desc: '3+ day streak. Great start, keep the momentum going!', color: '#c084fc' };
    }
    return { title: 'Starter Practitioner 🌱', desc: 'Complete 3 days of consecutive practice to unlock your first badge.', color: '#a1a1aa' };
  };

  const badge = getBadgeInfo(currentStreak);

  // Group and calculate chunks count per category
  const calculateCategoryStats = () => {
    const chunks = chunksData?.data || [];
    const counts: { [key: string]: number } = {};
    
    chunks.forEach(c => {
      const cat = c.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const total = chunks.length;
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  };

  const categoryStats = calculateCategoryStats();

  // Group and analyze logs to extract grammar mistake density and categories
  const calculateMistakeStats = () => {
    const logs = logsData?.data || [];
    const counts: { [key: string]: number } = {
      'Tenses & Aspects': 0,
      'Prepositions': 0,
      'Subject-Verb Agreement': 0,
      'Articles & Pronouns': 0,
      'Vocabulary & Collocation': 0,
    };
    
    let total = 0;
    logs.forEach(log => {
      const feedback = (log.ai_feedback || '').toLowerCase();
      // If AI feedback is non-empty and corrected
      if (feedback && !feedback.includes('grammatically correct') && !feedback.includes('perfect')) {
        total++;
        if (feedback.includes('tense') || feedback.includes('past') || feedback.includes('present') || feedback.includes('future') || feedback.includes('perfect')) {
          counts['Tenses & Aspects'] += 1;
        } else if (feedback.includes('preposition') || feedback.includes('in ') || feedback.includes('on ') || feedback.includes('at ')) {
          counts['Prepositions'] += 1;
        } else if (feedback.includes('agreement') || feedback.includes('subject-verb') || feedback.includes('singular') || feedback.includes('plural')) {
          counts['Subject-Verb Agreement'] += 1;
        } else if (feedback.includes('article') || feedback.includes('pronoun') || feedback.includes('the ') || feedback.includes('a ')) {
          counts['Articles & Pronouns'] += 1;
        } else {
          counts['Vocabulary & Collocation'] += 1;
        }
      }
    });

    return { counts, total };
  };

  const mistakeStats = calculateMistakeStats();

  return (
    <section className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#f4f4f5]">Analytics Dashboard</h1>
          <p className="text-sm text-[#a1a1aa]">
            Track your consistency, progress metrics, and grammar optimization growth.
          </p>
        </div>

        {/* Range Selector Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setRange('7d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              range === '7d' 
                ? 'bg-[#22c55e] text-[#09090b]' 
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            7 Days
          </button>
          <button
            onClick={() => setRange('30d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              range === '30d' 
                ? 'bg-[#22c55e] text-[#09090b]' 
                : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            30 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel text-center py-16 text-sm text-[#a1a1aa] rounded-2xl">
          Crunching statistical metrics, please wait...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Stats Row Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel flex items-center gap-4 rounded-xl p-4 bg-[#18181b]/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22c55e]/15 text-[#22c55e]">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">Avg Fluency</span>
                <h3 className="text-xl font-extrabold text-white">{stats?.data?.averageFluencyScore || 0}%</h3>
              </div>
            </div>

            <div className="glass-panel flex items-center gap-4 rounded-xl p-4 bg-[#18181b]/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">Total Practices</span>
                <h3 className="text-xl font-extrabold text-white">{stats?.data?.weeklyGrowth?.thisWeek || 0} sentences</h3>
              </div>
            </div>

            <div className="glass-panel flex items-center gap-4 rounded-xl p-4 bg-[#18181b]/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">{range === '30d' ? '30d Growth' : 'Weekly Growth'}</span>
                <h3 className="text-xl font-extrabold text-white">
                  {stats?.data?.weeklyGrowth?.growthPercentage && stats.data.weeklyGrowth.growthPercentage >= 0 ? '+' : ''}
                  {stats?.data?.weeklyGrowth?.growthPercentage || 0}%
                </h3>
              </div>
            </div>
          </div>

          {/* AI Personalized Daily Challenge Panel (New Feature) */}
          <div className="glass-panel rounded-2xl p-5 border border-[#27272a] space-y-4 bg-[#18181b]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4.5 w-4.5 text-[#22c55e]" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">AI Personalized Daily Challenge</h4>
              </div>
              <button
                onClick={handleGenerateDailyChallenge}
                disabled={isGeneratingChallenge}
                className="flex items-center gap-1.5 text-[10px] text-[#22c55e] hover:text-[#4ade80] transition-colors border border-[#22c55e]/25 bg-[#22c55e]/5 px-2.5 py-1.5 rounded-lg cursor-pointer font-bold uppercase tracking-wider disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isGeneratingChallenge ? 'animate-spin' : ''}`} />
                {generatedChallenge ? 'Regenerate' : 'Generate Challenge'}
              </button>
            </div>

            {isGeneratingChallenge && (
              <div className="text-xs text-[#a1a1aa] italic animate-pulse">
                Analyzing your history, weak grammatical areas, and standup patterns to build a challenge...
              </div>
            )}

            {generatedChallenge && !isGeneratingChallenge && (
              <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214] space-y-2">
                <p className="text-xs text-[#d4d4d8] leading-relaxed italic">
                  "{generatedChallenge}"
                </p>
                <div className="text-[9px] text-[#a1a1aa] uppercase font-bold tracking-widest pt-2 border-t border-[#27272a]/50">
                  Focus Area: Correcting your recent mistake patterns
                </div>
              </div>
            )}

            {!generatedChallenge && !isGeneratingChallenge && (
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Click generate to let AI analyze your previous practice log errors and recommend a customized scenario prompt to improve your weak areas.
              </p>
            )}
          </div>

          {/* Achievement Badge Section */}
          <div className="glass-panel rounded-2xl p-5 border border-l-4 flex items-center gap-5 bg-[#18181b]/30" style={{ borderLeftColor: badge.color }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-white flex-shrink-0">
              <Zap className="h-6 w-6" style={{ color: badge.color }} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{badge.title}</h4>
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white font-mono">
                  {currentStreak} Days Streak
                </span>
              </div>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">{badge.desc}</p>
            </div>
          </div>

          {/* Grammar Mistake Heatmap Section */}
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#27272a]/60 pb-3">
              <Target className="h-4.5 w-4.5 text-[#22c55e]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Grammar Mistake Analyzer & Heatmap</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Category Breakdown (Progress bars) */}
              <div className="md:col-span-6 space-y-3.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">Correction Distribution</span>
                {mistakeStats.total > 0 ? (
                  Object.entries(mistakeStats.counts).map(([cat, count]) => {
                    const percentage = Math.round((count / mistakeStats.total) * 100);
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#e4e4e7] font-semibold">{cat}</span>
                          <span className="text-[#a1a1aa] font-mono">{count} mistakes ({percentage}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#121214] rounded-full overflow-hidden border border-[#27272a]">
                          <div 
                            className="h-full rounded-full bg-red-500/80" 
                            style={{ width: `${percentage}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#a1a1aa] italic">No corrected mistakes found yet. Excellent fluency control!</p>
                )}
              </div>

              {/* Mistake Density Grid Mockup */}
              <div className="md:col-span-6 space-y-3.5 bg-[#121214]/40 border border-[#27272a] rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">Mistake Intensity Grid</span>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#a1a1aa] font-mono">
                    <span>Less</span>
                    <span className="h-2 w-2 rounded-sm bg-[#18181b]" />
                    <span className="h-2 w-2 rounded-sm bg-red-500/20" />
                    <span className="h-2 w-2 rounded-sm bg-red-500/50" />
                    <span className="h-2 w-2 rounded-sm bg-red-500" />
                    <span>More</span>
                  </div>
                </div>

                {/* 5x7 Contribution-like grid mock */}
                <div className="flex gap-2.5">
                  <div className="grid grid-rows-7 gap-1 text-[8px] text-[#52525b] uppercase font-bold pr-1 pt-1 justify-items-end">
                    <span>Mon</span>
                    <span />
                    <span>Wed</span>
                    <span />
                    <span>Fri</span>
                    <span />
                    <span>Sun</span>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-5 gap-1.5">
                    {/* Render a grid mapping values of mistake count dynamically from logsData */}
                    {Array.from({ length: 35 }).map((_, idx) => {
                      const row = Math.floor(idx / 5);
                      const col = idx % 5;
                      
                      // Calculate the date represented by this cell
                      const today = new Date();
                      const currentDay = today.getDay();
                      const dayToSubtract = currentDay === 0 ? 6 : currentDay - 1; // days since Monday
                      
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - dayToSubtract);
                      startOfWeek.setHours(0,0,0,0);
                      
                      const weeksAgo = 4 - col;
                      const cellDate = new Date(startOfWeek);
                      cellDate.setDate(startOfWeek.getDate() - (weeksAgo * 7) + row);
                      
                      const dateString = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
                      
                      // Filter logs for this specific cell date
                      const logs = Array.isArray(logsData?.data) ? logsData.data : [];
                      const mistakesForDay = logs.filter(log => {
                        const dbDate = new Date(log.created_at);
                        const dbDateString = `${dbDate.getFullYear()}-${String(dbDate.getMonth() + 1).padStart(2, '0')}-${String(dbDate.getDate()).padStart(2, '0')}`;
                        if (dbDateString !== dateString) return false;
                        
                        const feedback = log.ai_feedback || '';
                        return feedback.trim() && 
                               !feedback.includes("Your sentence is grammatically correct") && 
                               !feedback.includes("Sentence analyzed");
                      }).length;

                      // Map mistake counts to visual HSL red intensity levels
                      let levelClass = 'bg-[#18181b]';
                      if (mistakesForDay === 1) {
                        levelClass = 'bg-red-500/20 hover:ring-1 hover:ring-red-500/40';
                      } else if (mistakesForDay === 2) {
                        levelClass = 'bg-red-500/50 hover:ring-1 hover:ring-red-500/70';
                      } else if (mistakesForDay >= 3) {
                        levelClass = 'bg-red-500 hover:ring-1 hover:ring-red-400';
                      }

                      // Format readable date for native tooltip title
                      const formattedDate = cellDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });

                      return (
                        <div 
                          key={idx} 
                          title={`${formattedDate}: ${mistakesForDay} grammar correction${mistakesForDay !== 1 ? 's' : ''}`}
                          className={`h-4.5 w-full rounded-sm ${levelClass} transition-all cursor-pointer`}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="text-[9px] text-[#a1a1aa] text-center pt-2 border-t border-[#27272a]/60">
                  Heatmap records the frequency of corrected sentence errors made over past 5 weeks.
                </div>
              </div>
            </div>
          </div>

          {/* Category Distribution Analysis Section (Bar Chart) */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#27272a]/60 pb-3">
              <PieChart className="h-4.5 w-4.5" style={{ color: badge.color }} />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Vocabulary Distribution by Category</h3>
            </div>
            
            {categoryStats.length > 0 ? (
              <div className="space-y-4">
                {categoryStats.map((cat, idx) => {
                  const colors = ['#22c55e', '#60a5fa', '#c084fc', '#fb923c', '#f43f5e'];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#f4f4f5]">{cat.name}</span>
                        <span className="text-[#a1a1aa] font-mono">{cat.count} phrases ({cat.percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-[#121214] rounded-full overflow-hidden border border-[#27272a]">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out" 
                          style={{ 
                            width: `${cat.percentage}%`, 
                            backgroundColor: barColor 
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-[#52525b]">
                No vocabulary categories found. Add new sentence chunks to populate the chart.
              </div>
            )}
          </div>

          {/* SVG Custom Charts Box */}
          <div className="glass-panel rounded-2xl p-6 space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">{range === '30d' ? 'Monthly Progress Analytics' : 'Weekly Progress Analytics'}</h3>
                <p className="text-[11px] text-[#a1a1aa]">Hover on points/bars for exact daily scores</p>
              </div>
              {hoveredDataPoint && (
                <div className="flex items-center gap-4 text-xs bg-[#121214] border border-[#27272a] px-3 py-1.5 rounded-lg">
                  <span style={{ color: '#22c55e' }}>Score: {hoveredDataPoint.fluencyScore}%</span>
                  <span className="text-[#a1a1aa]">Count: {hoveredDataPoint.count} phrases</span>
                </div>
              )}
            </div>

            {chartData.length > 0 ? (
              <div className="flex flex-col gap-8">
                {/* 1. Fluency Progress Line Graph */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Fluency Growth Curve</span>
                  <div className="relative w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                      {[0, 25, 50, 75, 100].map((val) => {
                        const yPos = chartHeight - (val / 100) * (chartHeight - 40) - 20;
                        return (
                          <g key={val}>
                            <line x1="40" y1={yPos} x2={chartWidth} y2={yPos} stroke="#27272a" strokeWidth="0.5" strokeDasharray="4 4" />
                            <text x="10" y={yPos + 4} fill="#52525b" fontSize="9" fontWeight="500">{val}%</text>
                          </g>
                        );
                      })}

                      {(() => {
                        const points = chartData.map((d, i) => {
                          const x = 50 + i * ((chartWidth - 80) / (chartData.length - 1));
                          const y = chartHeight - (d.fluencyScore / 100) * (chartHeight - 40) - 20;
                          return { x, y };
                        });
                        
                        const pathD = points.reduce((acc, p, i) => 
                          i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
                        , '');

                        const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`;

                        const shouldShowLabel = (index: number) => {
                          if (range === '7d') return true;
                          return index % 5 === 0 || index === chartData.length - 1;
                        };

                        return (
                          <g>
                            <path d={areaD} fill="url(#emerald-gradient)" opacity="0.1" />
                            <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
                            
                            {points.map((p, i) => (
                              <g key={i}>
                                <circle 
                                  cx={p.x} 
                                  cy={p.y} 
                                  r={range === '30d' ? "2.5" : "4"} 
                                  fill="#09090b" 
                                  stroke="#22c55e" 
                                  strokeWidth="2" 
                                  className="cursor-pointer transition-all duration-250 hover:r-6"
                                  onMouseEnter={() => setHoveredDataPoint(chartData[i])}
                                  onMouseLeave={() => setHoveredDataPoint(null)}
                                />
                                {shouldShowLabel(i) && (
                                  <text x={p.x} y={chartHeight - 2} fill="#52525b" fontSize="8" textAnchor="middle">
                                    {new Date(chartData[i].date).getDate()}
                                  </text>
                                )}
                              </g>
                            ))}
                          </g>
                        );
                      })()}

                      <defs>
                        <linearGradient id="emerald-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>

                {/* 2. Submissions Bar Graph */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Daily Activity Frequency</span>
                  <div className="relative w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight - 20}`} className="w-full h-auto overflow-visible">
                      {(() => {
                        const maxCount = Math.max(...chartData.map(d => d.count), 4);
                        return chartData.map((d, i) => {
                          const x = 40 + i * ((chartWidth - 80) / (chartData.length - 1)) + 10;
                          const barHeight = (d.count / maxCount) * (chartHeight - 60);
                          const y = (chartHeight - 40) - barHeight;
                          const barWidth = range === '30d' ? 6 : 24;

                          const shouldShowLabel = (index: number) => {
                            if (range === '7d') return true;
                            return index % 5 === 0 || index === chartData.length - 1;
                          };

                          return (
                            <g key={i}>
                              <rect x={x - barWidth/2} y={0} width={barWidth} height={chartHeight - 40} fill="#121214" rx="1.5" />
                              <rect 
                                x={x - barWidth/2} 
                                y={y} 
                                width={barWidth} 
                                height={barHeight} 
                                fill="#22c55e" 
                                opacity="0.85"
                                rx="1.5"
                                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                                onMouseEnter={() => setHoveredDataPoint(d)}
                                onMouseLeave={() => setHoveredDataPoint(null)}
                              />
                              {d.count > 0 && range === '7d' && (
                                <text x={x} y={y - 6} fill="#a1a1aa" fontSize="9" textAnchor="middle" fontWeight="bold">
                                  {d.count}
                                </text>
                              )}
                              {shouldShowLabel(i) && (
                                <text x={x} y={chartHeight - 25} fill="#52525b" fontSize="8" textAnchor="middle">
                                  {range === '30d' 
                                    ? new Date(d.date).getDate()
                                    : new Date(d.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
                                </text>
                              )}
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-[#52525b]">
                No training data logged for this period.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
