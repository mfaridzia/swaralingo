import { describe, it, expect } from 'vitest';

export interface ChunkItem {
  id: number;
  phrase: string;
  meaning: string;
  example: string;
  category: string;
}

export function filterChunks(
  chunks: ChunkItem[],
  searchQuery: string,
  selectedCategory: string
): ChunkItem[] {
  const query = searchQuery.trim().toLowerCase();

  return chunks.filter((item) => {
    const matchesSearch =
      !query ||
      item.phrase.toLowerCase().includes(query) ||
      item.meaning.toLowerCase().includes(query) ||
      item.example.toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}

describe('Chunks Real-Time Search & Category Filter', () => {
  const mockChunks: ChunkItem[] = [
    {
      id: 1,
      phrase: 'Touch base',
      meaning: 'Berdiskusi singkat',
      example: "Let's touch base tomorrow morning.",
      category: 'IT & Daily',
    },
    {
      id: 2,
      phrase: 'Cut corners',
      meaning: 'Mengambil jalan pintas',
      example: 'We cannot afford to cut corners on security.',
      category: 'Workplace',
    },
    {
      id: 3,
      phrase: 'As per our discussion',
      meaning: 'Sesuai diskusi kita',
      example: 'As per our discussion, attached is the contract.',
      category: 'Formal Email',
    },
  ];

  it('should return all items when query is empty and category is All', () => {
    const filtered = filterChunks(mockChunks, '', 'All');
    expect(filtered.length).toBe(3);
  });

  it('should filter by phrase case-insensitively', () => {
    const filtered = filterChunks(mockChunks, 'touch', 'All');
    expect(filtered.length).toBe(1);
    expect(filtered[0].phrase).toBe('Touch base');
  });

  it('should filter by meaning in Indonesian', () => {
    const filtered = filterChunks(mockChunks, 'jalan pintas', 'All');
    expect(filtered.length).toBe(1);
    expect(filtered[0].phrase).toBe('Cut corners');
  });

  it('should filter by specific category tag', () => {
    const filtered = filterChunks(mockChunks, '', 'Formal Email');
    expect(filtered.length).toBe(1);
    expect(filtered[0].phrase).toBe('As per our discussion');
  });

  it('should combine text search and category filter simultaneously', () => {
    const matched = filterChunks(mockChunks, 'contract', 'Formal Email');
    expect(matched.length).toBe(1);

    const noMatch = filterChunks(mockChunks, 'contract', 'IT & Daily');
    expect(noMatch.length).toBe(0);
  });
});
