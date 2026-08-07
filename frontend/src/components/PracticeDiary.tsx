import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Volume2, 
  Mic, 
  MicOff, 
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle2,
  Activity,
  Smile
} from 'lucide-react';

interface PracticeDiaryProps {
  targetLanguage: string;
  userInput: string;
  setUserInput: (val: string) => void;
  improvedVersion: string;
  aiFeedback: string;
  isGenerating: boolean;
  handleQuickImprove: () => void;
  handleSaveLog: (audioBase64?: string | null) => void;
}

const languageLocales: Record<string, string> = {
  English: 'en-US',
  French: 'fr-FR',
  Spanish: 'es-ES',
  Japanese: 'ja-JP',
  German: 'de-DE'
};

interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export const PracticeDiary: React.FC<PracticeDiaryProps> = ({
  targetLanguage,
  userInput,
  setUserInput,
  improvedVersion,
  aiFeedback,
  isGenerating,
  handleQuickImprove,
  handleSaveLog,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  
  // Audio recording references and state
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  // Text-to-speech voice customization states
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);

  // Shadowing Mode states
  const [isShadowingOpen, setIsShadowingOpen] = useState(false);
  const [isShadowRecording, setIsShadowRecording] = useState(false);
  const [shadowTranscript, setShadowTranscript] = useState('');
  const [shadowScore, setShadowScore] = useState<number | null>(null);
  const [shadowWords, setShadowWords] = useState<Array<{ word: string; matched: boolean }>>([]);

  // Vocal Filler Detector states (counts fillers in the original user transcription)
  const [detectedFillers, setDetectedFillers] = useState<{ [key: string]: number }>({});
  const [totalFillers, setTotalFillers] = useState(0);

  const stopAudioRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
        recorder.stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Error stopping media recorder:", err);
      }
      mediaRecorderRef.current = null;
    }
  };

  // Perform vocal filler detection on original userInput sentence
  useEffect(() => {
    if (!userInput) {
      setDetectedFillers({});
      setTotalFillers(0);
      return;
    }

    const fillers = ['um', 'uh', 'like', 'so', 'actually', 'basically', 'you know'];
    const counts: { [key: string]: number } = {};
    let total = 0;

    fillers.forEach(word => {
      // Use boundary-aware regex to find occurrences
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = userInput.match(regex);
      if (matches) {
        counts[word] = matches.length;
        total += matches.length;
      }
    });

    setDetectedFillers(counts);
    setTotalFillers(total);
  }, [userInput]);

  // Reset shadowing and matching state when a new polished sentence is generated
  useEffect(() => {
    setIsShadowingOpen(false);
    setIsShadowRecording(false);
    setShadowTranscript('');
    setShadowScore(null);
    setShadowWords([]);
  }, [improvedVersion]);

  // Initialize Speech Recognition on mount for main user recording
  useEffect(() => {
    const BrowserWin = window as unknown as IWindow;
    const SpeechRecognition = BrowserWin.SpeechRecognition || BrowserWin.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = languageLocales[targetLanguage] || 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        stopAudioRecording();
      };

      rec.onend = () => {
        setIsListening(false);
        stopAudioRecording();
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setUserInput(userInput + (userInput ? ' ' : '') + finalTranscript);
        }
      };

      setRecognition(rec);
    }
  }, [setUserInput, targetLanguage]);

  // Load and filter English voices for TTS dropdown selector
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices() || [];
        const langKey = targetLanguage || 'English';
        const localeCode = languageLocales[langKey] || 'en-US';
        const prefix = localeCode.substring(0, 2);
        
        const targetVoices = voices.filter(voice => 
          voice && voice.lang && voice.lang.toLowerCase().startsWith(prefix.toLowerCase())
        );
        setAvailableVoices(targetVoices);

        // Auto-select default voice
        if (targetVoices.length > 0) {
          const defaultVoice = targetVoices.find(v => v.lang.toLowerCase() === localeCode.toLowerCase()) || targetVoices[0];
          if (defaultVoice && defaultVoice.name) {
            setSelectedVoiceName(defaultVoice.name);
          }
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [targetLanguage]);

  const toggleListening = () => {
    if (!recognition) {
      alert("Speech-to-text recognition is not supported in this browser. Try Google Chrome or Safari.");
      return;
    }

    if (isListening) {
      recognition.stop();
      stopAudioRecording();
    } else {
      setAudioBase64(null);
      recognition.start();

      // Start capturing actual audio from microphone in parallel
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          const recorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64data = reader.result as string;
              setAudioBase64(base64data);
            };
          };

          recorder.start();
          mediaRecorderRef.current = recorder;
        }).catch(err => {
          console.warn("Could not start audio stream recording:", err);
        });
      }
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const voice = availableVoices.find(v => v.name === selectedVoiceName);
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.lang = languageLocales[targetLanguage] || 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in this browser.");
    }
  };

  // Shadowing Microphone Recording
  const handleToggleShadowRecording = () => {
    const BrowserWin = window as unknown as IWindow;
    const SpeechRecognition = BrowserWin.SpeechRecognition || BrowserWin.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isShadowRecording) {
      setIsShadowRecording(false);
    } else {
      setShadowTranscript('');
      setShadowScore(null);
      setShadowWords([]);
      setIsShadowRecording(true);

      const shadowRec = new SpeechRecognition();
      shadowRec.continuous = false;
      shadowRec.interimResults = false;
      shadowRec.lang = languageLocales[targetLanguage] || 'en-US';

      shadowRec.onstart = () => {};
      shadowRec.onerror = (e: any) => {
        console.error(e);
        setIsShadowRecording(false);
      };
      
      shadowRec.onend = () => {
        setIsShadowRecording(false);
      };

      shadowRec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setShadowTranscript(transcript);
        evaluateShadowing(transcript);
      };

      shadowRec.start();
    }
  };

  // Evaluate accuracy score and highlight words
  const evaluateShadowing = (spokenText: string) => {
    if (!improvedVersion) return;

    // Clean punctuation
    const cleanWord = (w: string) => w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");

    const originalWords = improvedVersion.split(/\s+/);
    const spokenWordsSet = new Set(spokenText.split(/\s+/).map(cleanWord));

    let matchedCount = 0;
    const wordEvaluations = originalWords.map(word => {
      const isMatched = spokenWordsSet.has(cleanWord(word));
      if (isMatched) matchedCount++;
      return {
        word,
        matched: isMatched
      };
    });

    const score = Math.round((matchedCount / originalWords.length) * 100);
    setShadowScore(score);
    setShadowWords(wordEvaluations);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#f4f4f5]">Active Speaking Practice</h1>
        <p className="text-sm text-[#a1a1aa]">
          Write down your daily activity or answers. Our AI engine will transform it into natural, professional-level English.
        </p>
      </div>

      <div className="glass-panel space-y-4 rounded-2xl p-6">
        <div className="flex flex-col space-y-2 relative">
          <label htmlFor="user-sentence" className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Your English sentence</label>
          
          <textarea
            id="user-sentence"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isListening}
            placeholder={isListening ? "Listening to your voice... Speak now." : "e.g., Today I prefer React instead of Angular because the ecosystem is huge..."}
            className={`h-28 w-full rounded-xl border p-4 pr-14 text-[0.925rem] leading-relaxed outline-none transition-all focus:ring-3 focus:ring-[#22c55e]/15 ${
              isListening 
                ? 'border-[#27272a] bg-[#121214]/60 text-[#71717a] cursor-not-allowed placeholder-[#71717a]/40' 
                : 'border-[#27272a] bg-[#121214] text-[#f4f4f5] placeholder-[#52525b] focus:border-[#22c55e] focus:bg-[#151518]'
            }`}
          />
          
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Start speaking English"}
            className={`absolute bottom-3 right-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
              isListening 
                ? 'bg-red-500/25 border-red-500/50 text-red-400 animate-pulse' 
                : 'bg-[#18181b] border-[#27272a] hover:border-white text-[#a1a1aa] hover:text-white'
            }`}
          >
            {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
          </button>
        </div>

        {/* Vocal Filler Detector UI panel */}
        {totalFillers > 0 && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Vocal Fillers Detected ({totalFillers})
              </span>
              <span className="text-[10px] text-amber-500 font-mono font-bold">WARNING DETECTED</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {Object.entries(detectedFillers).map(([word, count]) => (
                <span key={word} className="text-[10px] bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg text-amber-300 font-mono font-semibold">
                  "{word}" x {count}
                </span>
              ))}
            </div>

            <p className="text-[11px] text-[#a1a1aa] leading-relaxed italic">
              * Coach recommendation: Pause silently for a split second instead of using pacing fillers. It signals confidence and structure.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            disabled={isGenerating || !userInput.trim() || isListening}
            onClick={handleQuickImprove}
            className="premium-btn-hover flex items-center gap-2 rounded-xl bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-[#09090b] border-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? 'Analyzing...' : 'Analyze & Naturalize'}
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(aiFeedback || improvedVersion) && (
        <div className="glass-panel border-l-4 border-l-[#22c55e] space-y-6 rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold tracking-wider uppercase text-[#22c55e]">AI Speaking Coach</h3>
            
            {/* Custom Voice Setting Selector trigger */}
            {availableVoices.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsVoicePanelOpen(prev => !prev)}
                  className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white transition-colors bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-xl cursor-pointer font-semibold"
                >
                  <SettingsIcon className="h-3.5 w-3.5" />
                  Voice Settings
                </button>

                {isVoicePanelOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#121214] border border-[#27272a] rounded-xl p-4 shadow-xl z-20 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">Select Voice Aksen / Gender</span>
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => setSelectedVoiceName(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#22c55e] cursor-pointer"
                      >
                        {availableVoices.map(voice => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name.replace('Microsoft', '').replace('Google', '').trim()} ({voice.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-row flex-wrap gap-6 w-full">
            <div className="space-y-1 flex-1 min-w-[280px]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Your Original</span>
              <p className="rounded-xl border border-[#27272a] bg-[#121214] p-4 text-[0.875rem] italic text-[#d4d4d8] break-all">
                "{userInput}"
              </p>
            </div>

            <div className="space-y-1 flex-1 min-w-[280px]">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#22c55e]">Natural Version</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => speakText(improvedVersion)}
                    title="Listen to pronunciation"
                    className="flex items-center gap-1 text-[10px] text-[#22c55e] hover:text-[#4ade80] transition-colors border border-[#22c55e]/30 px-2 py-1 rounded bg-[#22c55e]/5 cursor-pointer font-bold uppercase tracking-wider"
                  >
                    <Volume2 className="h-3 w-3" />
                    Listen
                  </button>
                  <button
                    onClick={() => setIsShadowingOpen(prev => !prev)}
                    title="Practice Shadowing"
                    className="flex items-center gap-1 text-[10px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors border border-[#3b82f6]/30 px-2 py-1 rounded bg-[#3b82f6]/5 cursor-pointer font-bold uppercase tracking-wider"
                  >
                    <Mic className="h-3 w-3" />
                    Shadowing
                  </button>
                </div>
              </div>
              <p className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 p-4 text-[0.875rem] font-medium text-[#4ade80] break-all">
                "{improvedVersion}"
              </p>
            </div>
          </div>

          {/* Shadowing Arena Arena Panel */}
          {isShadowingOpen && (
            <div className="p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-500/10 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 animate-pulse" />
                  Active Shadowing Arena
                </span>
                {shadowScore !== null && (
                  <span className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-lg ${
                    shadowScore > 85 ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  }`}>
                    {shadowScore}% ACCURACY MATCH
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">Pronunciation Matching:</span>
                {shadowWords.length > 0 ? (
                  <div className="p-3 bg-[#121214] border border-[#27272a] rounded-xl text-sm leading-relaxed flex flex-wrap gap-1">
                    {shadowWords.map((item, idx) => (
                      <span 
                        key={idx} 
                        className={`px-0.5 rounded ${
                          item.matched ? 'text-[#4ade80] font-semibold' : 'text-red-400 line-through decoration-red-500/40'
                        }`}
                      >
                        {item.word}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#a1a1aa] italic">Press record and read the Natural Version aloud to measure similarity</p>
                )}
              </div>

              {shadowTranscript && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#a1a1aa]">You Spoke:</span>
                  <p className="text-xs italic text-[#d4d4d8]">"{shadowTranscript}"</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleShadowRecording}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                    isShadowRecording 
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' 
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-400'
                  }`}
                >
                  {isShadowRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {isShadowRecording ? 'Rec Streaming...' : 'Record Shadowing'}
                </button>
                
                {isShadowRecording && (
                  <span className="text-[10px] text-blue-400 animate-pulse font-mono font-semibold">Speak now! Read the Naturalized version.</span>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#27272a] bg-[#121214] p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#a1a1aa]">Coach Feedback & Explanation</h4>
            <p className="text-sm text-[#d4d4d8] leading-relaxed">{aiFeedback}</p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                handleSaveLog(audioBase64);
                setAudioBase64(null);
              }}
              className="premium-btn-hover flex items-center gap-2 rounded-xl bg-[#27272a] px-5 py-2.5 text-sm font-semibold text-white border-none cursor-pointer"
            >
              Save to Diary
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
