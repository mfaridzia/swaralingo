import { describe, it, expect } from 'vitest';

export function calculateShadowingAccuracy(
  userTranscript: string,
  targetSentence: string
): { score: number; words: Array<{ word: string; matched: boolean }> } {
  if (!userTranscript || !targetSentence) {
    return { score: 0, words: [] };
  }

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
      .split(/\s+/)
      .filter(Boolean);

  const targetWords = clean(targetSentence);
  const spokenWords = clean(userTranscript);

  if (targetWords.length === 0) return { score: 0, words: [] };

  let matchedCount = 0;
  const wordDiffs = targetWords.map((tWord) => {
    const isMatched = spokenWords.includes(tWord);
    if (isMatched) matchedCount++;
    return { word: tWord, matched: isMatched };
  });

  const accuracy = Math.round((matchedCount / targetWords.length) * 100);
  return { score: Math.min(100, Math.max(0, accuracy)), words: wordDiffs };
}

describe('Shadowing Pronunciation Word-Matching Logic', () => {
  const target = "I went to the store yesterday.";

  it('should return 100% score for exact match', () => {
    const spoken = "I went to the store yesterday.";
    const result = calculateShadowingAccuracy(spoken, target);

    expect(result.score).toBe(100);
    expect(result.words.every(w => w.matched)).toBe(true);
  });

  it('should calculate partial score and mark missing words', () => {
    const spoken = "I went store yesterday"; // missing "to" and "the"
    const result = calculateShadowingAccuracy(spoken, target);

    expect(result.score).toBe(67); // 4 out of 6 words
    const missingThe = result.words.find(w => w.word === 'the');
    expect(missingThe?.matched).toBe(false);

    const matchedWent = result.words.find(w => w.word === 'went');
    expect(matchedWent?.matched).toBe(true);
  });

  it('should handle completely different speech', () => {
    const spoken = "Something totally unrelated";
    const result = calculateShadowingAccuracy(spoken, target);

    expect(result.score).toBe(0);
    expect(result.words.every(w => !w.matched)).toBe(true);
  });

  it('should handle empty transcripts gracefully', () => {
    expect(calculateShadowingAccuracy('', target).score).toBe(0);
    expect(calculateShadowingAccuracy(target, '').score).toBe(0);
  });
});
