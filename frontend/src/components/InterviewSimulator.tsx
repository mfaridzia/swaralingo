import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Send, 
  TrendingUp, 
  Volume2, 
  AlertCircle, 
  Play, 
  UserCheck, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'recruiter' | 'candidate';
  text: string;
  timestamp: string;
  audioUrl?: string;
  feedback?: {
    fluency: number;
    grammarScore: number;
    fillersCount: number;
    suggestions: string;
  };
}

export const InterviewSimulator: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState('Frontend Engineer (React)');
  const [selectedPhase, setSelectedPhase] = useState('Technical & System Design');
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [sessionTimer, setSessionTimer] = useState(0);
  const timerIntervalRef = useRef<any | null>(null);
  
  // Custom Speech recognition for simulating recruiter answers
  const [recognition, setRecognition] = useState<any>(null);

  const recruiterQuestions = [
    "Can you explain the difference between client-side rendering and server-side rendering in React, and when you would choose one over the other?",
    "How do you optimize state management in a large-scale React application to avoid unnecessary re-renders?",
    "Describe a challenging technical bug you encountered in a recent project. How did you diagnose it, and what steps did you take to resolve it?",
    "How do you design a robust caching strategy when working with REST APIs or GraphQL endpoints in a frontend application?",
    "If you were tasked with improving the Web Vitals and initial load time of a sluggish portal, what would be your step-by-step checklist?"
  ];

  // Initialize Speech Recognition on mount
  useEffect(() => {
    const BrowserWin = window as any;
    const SpeechRecognition = BrowserWin.SpeechRecognition || BrowserWin.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => setIsListening(true);
      rec.onerror = (e: any) => {
        console.error(e);
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setCurrentInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };
      setRecognition(rec);
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (interviewStarted) {
      timerIntervalRef.current = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setSessionTimer(0);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [interviewStarted]);

  const startInterview = () => {
    setInterviewStarted(true);
    setCurrentQuestionIdx(0);
    setSessionTimer(0);
    
    // Recruiter first welcome message
    const welcomeText = `Hello! I'm Evelyn, your AI Technical Recruiter today. I see you are interviewing for the ${selectedRole} position. Let's begin with our ${selectedPhase} review. First question: ${recruiterQuestions[0]}`;
    
    setMessages([
      {
        id: 'recruiter-welcome',
        sender: 'recruiter',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    speakRecruiter(welcomeText);
  };

  const speakRecruiter = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleVoiceRecording = () => {
    if (!recognition) {
      alert("Voice recognition is not supported in this browser. Try Chrome.");
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSendAnswer = () => {
    if (!currentInput.trim()) return;

    // Create Candidate Message
    const candidateMsgId = `candidate-${Date.now()}`;
    const cleanText = currentInput.trim();
    
    // Analyze vocal fillers in answer
    const fillers = ['um', 'uh', 'like', 'so', 'actually', 'basically', 'you know'];
    let fillerCount = 0;
    fillers.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = cleanText.match(regex);
      if (matches) fillerCount += matches.length;
    });

    // Score heuristics
    const wordCount = cleanText.split(/\s+/).length;
    const grammarScore = Math.min(100, Math.max(70, 95 - (fillerCount * 5)));
    const fluency = Math.min(100, Math.max(65, 88 + (wordCount > 25 ? 5 : -5) - (fillerCount * 3)));

    const newCandidateMessage: ChatMessage = {
      id: candidateMsgId,
      sender: 'candidate',
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      feedback: {
        fluency,
        grammarScore,
        fillersCount: fillerCount,
        suggestions: fillerCount > 2 
          ? "Good technical vocabulary, but try to minimize pacing filler words. Pause naturally instead of using 'um' or 'like'."
          : "Excellent control and speech structure. Your terminology and sentence cohesion are highly professional."
      }
    };

    setMessages(prev => [...prev, newCandidateMessage]);
    setCurrentInput('');
    if (isListening && recognition) recognition.stop();

    // Schedule recruiter response
    setTimeout(() => {
      const nextIdx = currentQuestionIdx + 1;
      if (nextIdx < recruiterQuestions.length) {
        setCurrentQuestionIdx(nextIdx);
        const nextQ = recruiterQuestions[nextIdx];
        const feedbackPrefix = fluency > 80 
          ? "Great answer. Moving on. " 
          : "Interesting perspective. Let's delve into the next topic. ";
        const recruiterResponse = `${feedbackPrefix}Question ${nextIdx + 1}: ${nextQ}`;
        
        setMessages(prev => [...prev, {
          id: `recruiter-${Date.now()}`,
          sender: 'recruiter',
          text: recruiterResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        speakRecruiter(recruiterResponse);
      } else {
        // Wrap up
        const finalText = "Thank you! That completes our technical simulation panel. I will analyze your performance reports and update the recruiter bank profile.";
        setMessages(prev => [...prev, {
          id: `recruiter-end`,
          sender: 'recruiter',
          text: finalText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        speakRecruiter(finalText);
      }
    }, 1500);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#f4f4f5] flex items-center gap-3">
          AI Interview Simulator
          <span className="text-xs bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 rounded text-[#4ade80] font-mono">
            BETA
          </span>
        </h1>
        <p className="text-sm text-[#a1a1aa]">
          Simulate a real coding or systems design panel interview. Speak with Evelyn, our AI tech recruiter, to get detailed active flow analysis.
        </p>
      </div>

      {!interviewStarted ? (
        <div className="glass-panel rounded-2xl p-8 space-y-6 max-w-2xl mx-auto border border-[#27272a]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#22c55e]/15 text-[#22c55e] mb-2 mx-auto">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Configure Interview Panel</h2>
            <p className="text-xs text-[#a1a1aa]">Select your target role and conversational style to start</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Target Profession / Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors cursor-pointer appearance-none"
              >
                <option value="Frontend Engineer (React)">Frontend Engineer (React)</option>
                <option value="DevOps & Cloud Engineer">DevOps & Cloud Engineer</option>
                <option value="Backend System Architect">Backend System Architect</option>
                <option value="Technical Product Manager">Technical Product Manager</option>
              </select>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Interview Phase & Scope</label>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors cursor-pointer appearance-none"
              >
                <option value="Technical & System Design">Technical & System Design Review</option>
                <option value="Behavioral Fit & Leadership">Behavioral Fit & Leadership Questions</option>
                <option value="Coding Logic & Live Explainer">Coding Logic & Live Explainer</option>
              </select>
            </div>
          </div>

          <button
            onClick={startInterview}
            className="w-full premium-btn-hover flex items-center justify-center gap-2 rounded-xl bg-[#22c55e] py-3 text-sm font-semibold text-[#09090b] border-none cursor-pointer"
          >
            Launch Simulation Session
            <Play className="h-4.5 w-4.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Stats & Recruiter Status */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-panel rounded-2xl p-5 border border-[#27272a] space-y-5 bg-[#18181b]/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#27272a] to-[#3f3f46] flex items-center justify-center text-xs font-bold text-white border border-[#3f3f46]">
                    E
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#09090b] animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Evelyn</h4>
                  <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-semibold">AI Technical Recruiter</span>
                </div>
              </div>

              <div className="border-t border-[#27272a] pt-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#a1a1aa]">Session Time</span>
                  <span className="font-mono font-bold text-white">{formatTimer(sessionTimer)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#a1a1aa]">Progress</span>
                  <span className="font-bold text-[#22c55e]">{Math.min(5, currentQuestionIdx + 1)} / 5 Questions</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#a1a1aa]">Target Role</span>
                  <span className="font-bold text-white truncate max-w-[120px]">{selectedRole}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-[#27272a] space-y-4 bg-[#18181b]/20 text-xs">
              <div className="flex items-center gap-2 border-b border-[#27272a] pb-2 text-[#a1a1aa] uppercase font-bold tracking-wider">
                <HelpCircle className="h-4 w-4 text-[#22c55e]" />
                <span>Simulator Guide</span>
              </div>
              <p className="text-[#a1a1aa] leading-relaxed">
                Click the microphone to record your audio. Once completed, your response is transcribed and calculated for structural cohesion and filler rate.
              </p>
            </div>
          </div>

          {/* Right Panel: Conversation Screen */}
          <div className="lg:col-span-8 space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-[#27272a] h-[500px] flex flex-col justify-between bg-[#121214]/60">
              
              {/* Chats List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${msg.sender === 'candidate' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-[#a1a1aa] uppercase font-semibold">
                      <span>{msg.sender === 'recruiter' ? 'Evelyn (Recruiter)' : 'You (Candidate)'}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                      msg.sender === 'recruiter'
                        ? 'bg-[#18181b] border-[#27272a] text-[#f4f4f5]'
                        : 'bg-[#22c55e]/10 border-[#22c55e]/25 text-[#4ade80]'
                    }`}>
                      {msg.text}
                    </div>

                    {/* Candidate specific instant feedback dropdown */}
                    {msg.feedback && (
                      <div className="mt-2 w-full bg-[#18181b]/90 border border-[#27272a] rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-[#27272a] pb-1.5">
                          <span className="font-bold text-[#22c55e] flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            Active Feedback
                          </span>
                          <div className="flex gap-3 font-semibold font-mono text-[10px]">
                            <span className="text-[#4ade80]">Fluency: {msg.feedback.fluency}%</span>
                            <span className="text-[#a1a1aa]">Grammar: {msg.feedback.grammarScore}%</span>
                            <span className="text-red-400">Fillers: {msg.feedback.fillersCount}</span>
                          </div>
                        </div>
                        <p className="text-[#a1a1aa] italic font-medium">{msg.feedback.suggestions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat Text Input and Recording Dock */}
              <div className="border-t border-[#27272a] pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <textarea
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder={isListening ? "Listening... Speak your answer clearly" : "Type or speak your professional answer here..."}
                    className="flex-1 h-14 bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#22c55e] transition-colors placeholder-[#52525b] resize-none"
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isListening 
                        ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' 
                        : 'bg-[#18181b] border-[#27272a] hover:border-white text-[#a1a1aa]'
                    }`}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={handleSendAnswer}
                    disabled={!currentInput.trim()}
                    className="p-3.5 rounded-xl bg-[#22c55e] text-[#09090b] hover:bg-[#4ade80] transition-colors cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>

                {isListening && (
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    <span className="h-1.5 w-1.5 bg-[#22c55e] rounded-full animate-bounce delay-100" />
                    <span className="h-1.5 w-1.5 bg-[#22c55e] rounded-full animate-bounce delay-200" />
                    <span className="h-1.5 w-1.5 bg-[#22c55e] rounded-full animate-bounce delay-300" />
                    <span className="text-[10px] text-[#a1a1aa] font-semibold tracking-wider ml-1 uppercase">Voice capturing streaming...</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
