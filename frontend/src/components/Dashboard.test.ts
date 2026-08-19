import { describe, it, expect } from 'vitest';

export function calculateStreak(createdDates: string[]): number {
  if (!createdDates.length) return 0;

  const uniqueDays = new Set<string>();
  createdDates.forEach(dateStr => {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        uniqueDays.add(d.toISOString().slice(0, 10));
      }
    } catch {
      // ignore
    }
  });

  const sortedDays = Array.from(uniqueDays).sort().reverse();
  if (!sortedDays.length) return 0;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const latestDay = sortedDays[0];
  if (latestDay !== todayStr && latestDay !== yesterdayStr) {
    return 0; // streak broken
  }

  let streak = 1;
  let current = new Date(latestDay);

  for (let i = 1; i < sortedDays.length; i++) {
    const prevExpected = new Date(current);
    prevExpected.setDate(current.getDate() - 1);
    const prevExpectedStr = prevExpected.toISOString().slice(0, 10);

    if (sortedDays[i] === prevExpectedStr) {
      streak++;
      current = prevExpected;
    } else {
      break;
    }
  }

  return streak;
}

export function getUnlockedBadges(streak: number, totalLogs: number) {
  return {
    starter: totalLogs >= 1,
    rising: streak >= 3,
    dedicated: streak >= 7,
    elite: streak >= 14,
  };
}

describe('Streak & Gamification Badge Engine', () => {
  it('should return 0 streak when there are no logs', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('should calculate active streak for consecutive days including today', () => {
    const today = new Date();
    const day1 = today.toISOString();
    
    const d2 = new Date(today);
    d2.setDate(today.getDate() - 1);
    const day2 = d2.toISOString();

    const d3 = new Date(today);
    d3.setDate(today.getDate() - 2);
    const day3 = d3.toISOString();

    const streak = calculateStreak([day1, day2, day3]);
    expect(streak).toBe(3);
  });

  it('should reset streak when consecutive chain is broken', () => {
    const today = new Date();
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 4);

    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 5);

    const streak = calculateStreak([fourDaysAgo.toISOString(), fiveDaysAgo.toISOString()]);
    expect(streak).toBe(0);
  });

  it('should unlock appropriate badges based on milestones', () => {
    const badges1 = getUnlockedBadges(1, 1);
    expect(badges1.starter).toBe(true);
    expect(badges1.rising).toBe(false);

    const badges3 = getUnlockedBadges(3, 5);
    expect(badges3.starter).toBe(true);
    expect(badges3.rising).toBe(true);
    expect(badges3.dedicated).toBe(false);

    const badges7 = getUnlockedBadges(7, 10);
    expect(badges7.dedicated).toBe(true);
    expect(badges7.elite).toBe(false);

    const badges14 = getUnlockedBadges(14, 25);
    expect(badges14.elite).toBe(true);
  });
});
