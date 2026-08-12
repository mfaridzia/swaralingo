import React, { useState } from 'react';
import { BookMarked, Download, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface SentenceChunk {
  id: number;
  phrase: string;
  meaning: string;
  example: string;
  category: string;
  created_at?: string;
}

interface SavedChunksListProps {
  chunks: { success: boolean; data: SentenceChunk[] } | undefined;
  loadingChunks: boolean;
  fetchingMore: boolean;
  limit: number;
  onLoadMore: () => void;
}

export const SavedChunksList: React.FC<SavedChunksListProps> = ({ chunks, loadingChunks, fetchingMore, limit, onLoadMore }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const exportToCSV = () => {
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
  };

  const exportToPDF = () => {
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
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const chunksArray = Array.isArray(chunks?.data) ? [...chunks.data] : [];
  chunksArray.sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
  const filteredChunks = chunksArray.filter(chunk =>
    (chunk.phrase || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chunk.meaning || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chunk.example || '').toLowerCase().includes(searchQuery.toLowerCase())
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
          placeholder="Search sentence chunks..."
          className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#22c55e] transition-colors"
        />
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
        {loadingChunks ? (
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
        )}

        {fetchingMore && (
          <div className="text-center py-3 text-xs text-[#a1a1aa] animate-pulse">Loading more...</div>
        )}

        {chunks?.data && chunks.data.length >= limit && !fetchingMore && (
          <button
            onClick={onLoadMore}
            className="w-full text-center text-xs font-bold border border-[#27272a] hover:border-zinc-400 py-3.5 rounded-xl cursor-pointer bg-zinc-950/20 text-[#a1a1aa] hover:text-white transition-all mt-4"
          >
            Load More Records
          </button>
        )}
      </div>
    </div>
  );
};
