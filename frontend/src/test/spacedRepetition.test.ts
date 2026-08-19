import { describe, it, expect } from 'vitest';

/**
 * SuperMemo SM-2 implementation used in Flashcard Review
 */
export function calculateSM2(
  quality: number, // 1: Hard, 3: Good/Medium, 5: Easy
  prevRepetitions: number,
  prevInterval: number,
  prevEasiness: number
) {
  let repetition = prevRepetitions;
  let interval = prevInterval;
  let easiness = prevEasiness;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  return { repetition, interval, easiness: Number(easiness.toFixed(2)) };
}

describe('Spaced Repetition (SM-2) Logic', () => {
  it('should reset interval and repetition when difficulty is Hard (rating 1)', () => {
    const result = calculateSM2(1, 5, 20, 2.5);
    expect(result.repetition).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.easiness).toBeLessThan(2.5);
  });

  it('should increment repetitions and calculate next intervals for Good (rating 3)', () => {
    // Step 1: First review
    const step1 = calculateSM2(3, 0, 0, 2.5);
    expect(step1.repetition).toBe(1);
    expect(step1.interval).toBe(1);

    // Step 2: Second review
    const step2 = calculateSM2(3, step1.repetition, step1.interval, step1.easiness);
    expect(step2.repetition).toBe(2);
    expect(step2.interval).toBe(6);

    // Step 3: Third review
    const step3 = calculateSM2(3, step2.repetition, step2.interval, step2.easiness);
    expect(step3.repetition).toBe(3);
    expect(step3.interval).toBeGreaterThan(6);
  });

  it('should increase easiness factor for Easy ratings (rating 5)', () => {
    const result = calculateSM2(5, 1, 6, 2.5);
    expect(result.easiness).toBe(2.6);
    expect(result.repetition).toBe(2);
  });

  it('should not allow easiness factor to drop below 1.3 minimum floor', () => {
    let easiness = 1.3;
    for (let i = 0; i < 5; i++) {
      const res = calculateSM2(1, 0, 1, easiness);
      easiness = res.easiness;
    }
    expect(easiness).toBe(1.3);
  });
});
