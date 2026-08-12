import { Hono } from 'hono';
import db from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const statsRouter = new Hono();

// Identitas dari session token — userId client diabaikan (menutup IDOR)
statsRouter.use('*', requireAuth);

statsRouter.get('/', async (c) => {
  try {
    const userId = c.get('authUserId');
    const range = c.req.query('range') || '7d';
    const daysToCalculate = range === '30d' ? 30 : 7;

    // Optimized: only SELECT columns needed for scoring (not audio_base64, etc.)
    const logs = await db.query(
      `SELECT created_at, user_input, ai_feedback FROM practice_logs WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`
    ).all(userId) as any[];

    const today = new Date();

    // Pre-compute date strings for chart window
    const dateStrings: string[] = [];
    for (let i = daysToCalculate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dateStrings.push(`${year}-${month}-${day}`);
    }

    // Index logs by date key in one pass
    const logsByDate = new Map<string, typeof logs>();
    for (const log of logs) {
      const dbDate = new Date(log.created_at);
      const key = `${dbDate.getFullYear()}-${String(dbDate.getMonth() + 1).padStart(2, '0')}-${String(dbDate.getDate()).padStart(2, '0')}`;
      if (!logsByDate.has(key)) logsByDate.set(key, []);
      logsByDate.get(key)!.push(log);
    }

    // Compute chart + scores in one pass per date
    let totalScoreSum = 0;
    const chartData = [];
    const rollingWindowMs = daysToCalculate * 24 * 60 * 60 * 1000;
    const cutoffTime = today.getTime() - rollingWindowMs;
    let thisWeekCount = 0;
    let lastWeekCount = 0;

    for (const dateString of dateStrings) {
      const dayLogs = logsByDate.get(dateString) || [];
      let dailyScoreSum = 0;

      for (const log of dayLogs) {
        let score = 100;
        const feedback = log.ai_feedback || '';
        if (feedback.trim() && !feedback.includes("Sentence analyzed") && !feedback.includes("Your sentence is grammatically correct")) {
          const penalty = (feedback.length / Math.max(1, (log.user_input || '').length)) * 100;
          score = Math.max(0, 100 - penalty);
        }
        dailyScoreSum += score;
        totalScoreSum += score;

        // Classify week in same loop
        if (new Date(log.created_at).getTime() >= cutoffTime) {
          thisWeekCount++;
        } else {
          lastWeekCount++;
        }
      }

      const avgScore = dayLogs.length > 0 ? Math.round(dailyScoreSum / dayLogs.length) : 0;
      chartData.push({ date: dateString, count: dayLogs.length, fluencyScore: avgScore });
    }

    const averageFluencyScore = logs.length > 0 ? Math.round(totalScoreSum / logs.length) : 0;

    let growthPercentage = 0;
    if (lastWeekCount > 0) {
      growthPercentage = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
    } else if (thisWeekCount > 0) {
      growthPercentage = 100;
    }

    return c.json({
      success: true,
      data: {
        weeklyGrowth: { thisWeek: thisWeekCount, lastWeek: lastWeekCount, growthPercentage },
        averageFluencyScore,
        chartData,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default statsRouter;
