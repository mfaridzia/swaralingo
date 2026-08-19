import { describe, it, expect } from 'vitest';

export function detectVocalFillers(text: string) {
  if (!text) return { counts: {}, total: 0 };
  const fillers = ['um', 'uh', 'like', 'so', 'actually', 'basically', 'you know'];
  const counts: { [key: string]: number } = {};
  let total = 0;

  fillers.forEach(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      counts[word] = matches.length;
      total += matches.length;
    }
  });

  return { counts, total };
}

describe('Vocal Filler Detector', () => {
  it('should detect filler words like "um", "uh", "like", and "you know"', () => {
    const speech = "Um, I was thinking that, like, we should go, you know, to the store.";
    const result = detectVocalFillers(speech);

    expect(result.total).toBe(3);
    expect(result.counts['um']).toBe(1);
    expect(result.counts['like']).toBe(1);
    expect(result.counts['you know']).toBe(1);
  });

  it('should not detect sub-words as fillers (boundary-aware)', () => {
    const speech = "The umbrella was unlike any other tool.";
    const result = detectVocalFillers(speech);

    expect(result.total).toBe(0);
    expect(result.counts['um']).toBeUndefined();
    expect(result.counts['like']).toBeUndefined();
  });

  it('should handle empty or whitespace text cleanly', () => {
    expect(detectVocalFillers('').total).toBe(0);
    expect(detectVocalFillers('   ').total).toBe(0);
  });
});
