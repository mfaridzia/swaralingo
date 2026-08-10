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
  audioBlobId?: number;
  created_at: string;
  client_uuid?: string;
}

interface SavedDiaryLogsProps {
  logs: { success: boolean; data: PracticeLog[] } | undefined;
  loadingLogs: boolean;
}

export const SavedDiaryLogs: React.FC<SavedDiaryLogsProps> = ({ logs, loadingLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [transcribingLogId, setTranscribingLogId] = useState<number | null>(null);
  const [transcriptions, setTranscriptions] = useState<{ [logId: number]: string }>({});
  const [audioUrls, setAudioUrls] = useState<{ [logId: number]: string }>({});

  const loadAudioUrl = async (log: PracticeLog) => {
    if (audioUrls[log.id]) return;
    try {
      if (log.audio_key) {
        const res = await apiFetch(`/audio/${log.audio_key}`);
        const blob = await res.blob();
        setAudioUrls(prev => ({ ...prev, [log.id]: URL.createObjectURL(blob) }));
      } else if (log.audioBlobId) {
        const { db } = await import('../offline/db/dexie');
        const record = await db.audioBlobs.get(log.audioBlobId);
        if (record?.blob) {
          setAudioUrls(prev => ({ ...prev, [log.id]: URL.createObjectURL(record.blob) }));
        }
      }
    } catch { /* ignored */ }
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
        setTranscriptions(prev => ({ ...prev, [log.id]: resData.transcription }));
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
  };

  const exportToPDF = () => {
    const data = filteredLogs;
    if (data.length === 0) return;

    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(34, 197, 94);
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
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const logsArray = Array.isArray(logs?.data) ? logs.data : [];
  const filteredLogs = logsArray.filter(log =>
    (log.user_input || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.improved_version || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.ai_feedback || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-[#22c55e]" />
          <h2 className="text-lg font-bold tracking-tight text-white">Your Saved Records</h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            title="Export as CSV"
            className="flex items-center gap-1 text-[10px] uppercase font-bold border border-[#27272a] hover:border-white px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white transition-colors cursor-pointer bg-transparent"
          >
            CSV
            <Download className="h-3 w-3" />
          </button>
          <button
            onClick={exportToPDF}
            title="Export as PDF"
            className="flex items-center gap-1 text-[10px] uppercase font-bold border border-[#27272a] hover:border-white px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white transition-colors cursor-pointer bg-transparent"
          >
            PDF
            <Download className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search diary entries..."
          className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#22c55e] transition-colors"
        />
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
        {loadingLogs ? (
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
        )}
      </div>
    </div>
  );
};
