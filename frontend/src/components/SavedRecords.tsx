import React, { useState, useEffect } from 'react';
import { BookMarked, Download, Search, FileText, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { apiFetch } from '../api';
import { SyncDot } from '../offline/indicator';

interface PracticeLog {
  id: number;
  user_input: string;
  ai_feedback: string;
  improved_version: string;
  audio_base64?: string | null;
  audio_key?: string | null;
  audioBlobId?: number;    // FK ke audioBlobs (offline, sebelum sync)
  created_at: string;
  client_uuid?: string;
}

interface SentenceChunk {
  id: number;
  phrase: string;
  meaning: string;
  example: string;
  category: string;
}

interface SavedRecordsProps {
  activeTab: 'diary' | 'chunks' | 'stats' | 'settings' | 'simulator' | 'journal';
  logs: { success: boolean; data: PracticeLog[] } | undefined;
  loadingLogs: boolean;
  chunks: { success: boolean; data: SentenceChunk[] } | undefined;
  loadingChunks: boolean;
  userId: number;
}

export const SavedRecords: React.FC<SavedRecordsProps> = ({
  activeTab,
  logs,
  loadingLogs,
  chunks,
  loadingChunks,
  userId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [transcribingLogId, setTranscribingLogId] = useState<number | null>(null);
  const [transcriptions, setTranscriptions] = useState<{ [logId: number]: string }>({});
  const [audioUrls, setAudioUrls] = useState<{ [logId: number]: string }>({});

  // <audio> browser tak bisa kirim Authorization header → fetch via apiFetch → blob URL.
  // Legacy base64 langsung dipakai sebagai src.
  const loadAudioUrl = async (log: PracticeLog) => {
    if (audioUrls[log.id]) return;
    try {
      if (log.audio_key) {
        const res = await apiFetch(`/audio/${log.audio_key}`);
        const blob = await res.blob();
        setAudioUrls(prev => ({ ...prev, [log.id]: URL.createObjectURL(blob) }));
      } else if (log.audioBlobId) {
        // Offline: read blob from local Dexie
        const { db } = await import('../offline/db/dexie');
        const record = await db.audioBlobs.get(log.audioBlobId);
        if (record?.blob) {
          setAudioUrls(prev => ({ ...prev, [log.id]: URL.createObjectURL(record.blob) }));
        }
      }
    } catch { /* audio tidak tersedia — biarkan kosong */ }
  };

  useEffect(() => {
    if (!Array.isArray(logs?.data)) return;
    logs.data.forEach(log => { if (log.audio_key || (log as any).audioBlobId) loadAudioUrl(log); });
  }, [logs]);

  const downloadAudio = async (log: PracticeLog) => {
    const fileName = `speaking-log-${log.id}.webm`;
    if (log.audio_key) {
      const res = await apiFetch(`/audio/${log.audio_key}?download=1`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } else if (log.audio_base64) {
      const a = document.createElement('a');
      a.href = log.audio_base64;
      a.download = fileName;
      a.click();
    } else if (log.audioBlobId) {
      const { db } = await import('../offline/db/dexie');
      const record = await db.audioBlobs.get(log.audioBlobId);
      if (record?.blob) {
        const url = URL.createObjectURL(record.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleTranscribe = async (log: PracticeLog) => {
    if (!log.audio_key && !log.audio_base64 && !log.audioBlobId) return;
    setTranscribingLogId(log.id);
    try {
      // Resolve audioBase64 from offline blob if needed
      let audioBase64 = log.audio_base64 || undefined;
      if (!audioBase64 && log.audioBlobId) {
        const { db } = await import('../offline/db/dexie');
        const record = await db.audioBlobs.get(log.audioBlobId);
        if (record?.blob) {
          audioBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(record.blob);
          });
        }
      }
      const res = await apiFetch('/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioKey: log.audio_key || undefined,
          audioBase64,
          targetLanguage: localStorage.getItem('fluency_user') ? JSON.parse(localStorage.getItem('fluency_user')!).target_language || 'English' : 'English'
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setTranscriptions(prev => ({
          ...prev,
          [log.id]: resData.transcription
        }));
      } else {
        alert(resData.error || "Failed to transcribe audio.");
      }
    } catch (err) {
      alert("Failed to connect to backend server for transcription.");
    } finally {
      setTranscribingLogId(null);
    }
  };

  const exportToCSV = () => {
    if (activeTab === 'diary') {
      const data = filteredLogs;
      if (data.length === 0) return;
      const headers = ['Date', 'Original Sentence', 'Polished Sentence', 'AI Feedback'];
      const rows = data.map(log => [
        new Date(log.created_at).toLocaleDateString(),
        `"${log.user_input.replace(/"/g, '""')}"`,
        `"${log.improved_version.replace(/"/g, '""')}"`,
        `"${log.ai_feedback.replace(/"/g, '""')}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      downloadFile(csvContent, 'fluency-diary.csv', 'text/csv;charset=utf-8;');
    } else if (activeTab === 'chunks') {
      const data = filteredChunks;
      if (data.length === 0) return;
      const headers = ['Phrase', 'Meaning', 'Example', 'Category'];
      const rows = data.map(c => [
        `"${c.phrase.replace(/"/g, '""')}"`,
        `"${c.meaning.replace(/"/g, '""')}"`,
        `"${c.example.replace(/"/g, '""')}"`,
        `"${c.category.replace(/"/g, '""')}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      downloadFile(csvContent, 'fluency-sentence-chunks.csv', 'text/csv;charset=utf-8;');
    }
  };

  const exportToPDF = () => {
    if (activeTab === 'diary') {
      const data = filteredLogs;
      if (data.length === 0) return;

      const doc = new jsPDF();
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(18);
      doc.setTextColor(34, 197, 94); // Emerald color
      doc.text('SwaraLingo - Practice Diary Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(113, 113, 122);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 26);
      doc.line(14, 28, 196, 28);

      let yPos = 38;
      data.forEach((log, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(9, 9, 11);
        doc.text(`${index + 1}. Entry (${new Date(log.created_at).toLocaleDateString()})`, 14, yPos);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(63, 63, 70);
        
        yPos += 6;
        doc.text(`Original: "${log.user_input}"`, 18, yPos);
        yPos += 6;
        doc.setTextColor(34, 197, 94);
        doc.text(`Polished: "${log.improved_version}"`, 18, yPos);
        yPos += 6;
        doc.setTextColor(113, 113, 122);
        
        const splitFeedback = doc.splitTextToSize(`Coach Feedback: ${log.ai_feedback}`, 178);
        doc.text(splitFeedback, 18, yPos);
        yPos += (splitFeedback.length * 5) + 8;
      });

      doc.save('fluency-diary-report.pdf');
    } else if (activeTab === 'chunks') {
      const data = filteredChunks;
      if (data.length === 0) return;

      const doc = new jsPDF();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(34, 197, 94);
      doc.text('SwaraLingo - Sentence Chunks Bank', 14, 20);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(113, 113, 122);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 26);
      doc.line(14, 28, 196, 28);

      let yPos = 38;
      data.forEach((c, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(9, 9, 11);
        doc.text(`${index + 1}. Phrase: "${c.phrase}"`, 14, yPos);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(63, 63, 70);
        
        yPos += 6;
        doc.text(`Meaning (Bahasa): ${c.meaning}`, 18, yPos);
        yPos += 6;
        doc.setTextColor(113, 113, 122);
        doc.text(`Example Sentence: "${c.example}"`, 18, yPos);
        yPos += 12;
      });

      doc.save('fluency-sentence-chunks-report.pdf');
    }
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Filter logs and chunks based on search query (case-insensitive)
  const logsArray = Array.isArray(logs?.data) ? logs.data : [];
  const filteredLogs = logsArray.filter(log =>
    (log.user_input || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.improved_version || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.ai_feedback || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chunksArray = Array.isArray(chunks?.data) ? chunks.data : [];
  const filteredChunks = chunksArray.filter(chunk =>
    (chunk.phrase || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chunk.meaning || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chunk.example || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="lg:col-span-5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-[#22c55e]" />
          <h2 className="text-lg font-bold tracking-tight text-white">Your Saved Records</h2>
        </div>

        {/* Export action triggers */}
        {(activeTab === 'diary' || activeTab === 'chunks') && (
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              title="Export as CSV"
              className="flex items-center gap-1 text-[10px] uppercase font-bold border border-[#27272a] hover:border-white px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
            >
              CSV
              <Download className="h-3 w-3" />
            </button>
            <button
              onClick={exportToPDF}
              title="Export as PDF"
              className="flex items-center gap-1 text-[10px] uppercase font-bold border border-[#27272a] hover:border-white px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
            >
              PDF
              <Download className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Interactive Search Bar input field (Only on Diary or Chunks view tabs) */}
      {(activeTab === 'diary' || activeTab === 'chunks') && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === 'diary' ? 'diary entries' : 'sentence chunks'}...`}
            className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#22c55e] transition-colors"
          />
        </div>
      )}

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {activeTab === 'diary' ? (
          loadingLogs ? (
            <div className="text-center py-8 text-sm text-[#a1a1aa]">Loading diary...</div>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="glass-panel p-4 space-y-3 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-[#a1a1aa]">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                  {log.client_uuid ? <SyncDot clientId={log.client_uuid} /> : <span className="h-2 w-2 rounded-full bg-[#22c55e]" />}
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#a1a1aa]">Original:</span>
                  <p className="text-xs italic text-[#d4d4d8] break-all">"{log.user_input}"</p>
                </div>

                <div className="space-y-1 border-t border-[#27272a] pt-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#22c55e]">Polished:</span>
                  <p className="text-xs font-medium text-[#4ade80] break-all">"{log.improved_version}"</p>
                </div>

                {(log.audio_key || log.audio_base64 || log.audioBlobId) && (
                  <div className="space-y-2 border-t border-[#27272a]/60 pt-3 mt-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <audio
                        src={audioUrls[log.id] || log.audio_base64 || ''}
                        controls
                        className="h-7 w-full max-w-[170px] rounded-lg bg-[#121214] opacity-80 hover:opacity-100 transition-opacity"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleTranscribe(log)}
                          disabled={transcribingLogId === log.id}
                          title="Transcribe Audio Recording"
                          className="p-2 rounded-lg border border-[#27272a] hover:border-white text-[#a1a1aa] hover:text-[#22c55e] transition-colors cursor-pointer bg-[#121214]/40 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {transcribingLogId === log.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-[#22c55e]" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={() => downloadAudio(log)}
                          title="Download Recorded Voice"
                          className="p-2 rounded-lg border border-[#27272a] hover:border-white text-[#a1a1aa] hover:text-white transition-colors cursor-pointer bg-[#121214]/40"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Display re-transcribed text result */}
                    {transcriptions[log.id] && (
                      <div className="p-2.5 bg-[#121214]/80 border border-[#27272a] rounded-xl space-y-1 animate-fadeIn">
                        <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#3b82f6]">Transcribed Pronunciation:</span>
                        <p className="text-[11px] text-[#e4e4e7] leading-tight italic break-all">
                          "{transcriptions[log.id]}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 border border-dashed border-[#27272a] rounded-xl text-sm text-[#52525b]">
              {searchQuery ? 'No matching logs found.' : 'No diary logs yet. Create your first translation!'}
            </div>
          )
        ) : activeTab === 'chunks' ? (
          loadingChunks ? (
            <div className="text-center py-8 text-sm text-[#a1a1aa]">Loading chunks...</div>
          ) : filteredChunks.length > 0 ? (
            filteredChunks.map((chunk) => (
              <div key={chunk.id} className="glass-panel p-4 space-y-2 rounded-xl">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-[#f4f4f5]">{chunk.phrase}</span>
                  <span className="text-[9px] bg-[#27272a] px-2 py-0.5 rounded text-[#a1a1aa]">
                    {chunk.category}
                  </span>
                </div>

                <p className="text-xs text-[#a1a1aa]">{chunk.meaning}</p>
                
                <div className="p-2 mt-2 text-xs bg-[#121214] rounded border border-[#27272a] text-[#d4d4d8] italic break-all">
                  Ex: "{chunk.example}"
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border border-dashed border-[#27272a] rounded-xl text-sm text-[#52525b]">
              {searchQuery ? 'No matching chunks found.' : 'No sentence chunks yet. Add templates to practice!'}
            </div>
          )
        ) : activeTab === 'stats' ? (
          <div className="glass-panel p-6 space-y-4 rounded-xl border border-[#27272a]">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#22c55e]">Weekly Coaching Tip</h3>
            <p className="text-xs text-[#d4d4d8] leading-relaxed">
              Consistency is key. Try submitting at least 3 practice sentences every day to build native speaking reflex and muscle memory.
            </p>
            <div className="rounded-xl border border-[#27272a] bg-[#121214] p-4 text-[10px] text-[#a1a1aa] space-y-1">
              <span className="font-bold text-[#22c55e] uppercase">Your focus this week:</span>
              <p>Mastering target sentence chunks in daily IT standup context.</p>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-6 space-y-4 rounded-xl border border-[#27272a]">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#22c55e]">Profile Info</h3>
            <p className="text-xs text-[#d4d4d8] leading-relaxed">
              Ensure you use a valid email address and a strong secure password containing letters and numbers.
            </p>
            <div className="rounded-xl border border-[#27272a] bg-[#121214] p-4 text-[10px] text-[#a1a1aa] space-y-2">
              <div>
                <span className="font-bold text-[#22c55e] uppercase">Account ID:</span>
                <p className="font-mono mt-0.5">#Active</p>
              </div>
              <div>
                <span className="font-bold text-white uppercase">Last sync status:</span>
                <p className="text-[#4ade80] mt-0.5">Connected & Synchronized</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
