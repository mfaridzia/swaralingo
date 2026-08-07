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

    const logs = await db.query('SELECT * FROM practice_logs WHERE user_id = ? ORDER BY created_at ASC').all(userId) as any[];
    
    const today = new Date();
    const chartData = [];
    const daysToCalculate = range === '30d' ? 30 : 7;
    
    for (let i = daysToCalculate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const dayLogs = logs.filter(log => {
        const dbDate = new Date(log.created_at);
        const dbYear = dbDate.getFullYear();
        const dbMonth = String(dbDate.getMonth() + 1).padStart(2, '0');
        const dbDay = String(dbDate.getDate()).padStart(2, '0');
        return `${dbYear}-${dbMonth}-${dbDay}` === dateString;
      });

      let dailyScoreSum = 0;
      dayLogs.forEach(log => {
        let score = 100;
        const feedback = log.ai_feedback || '';
        if (feedback.trim() && !feedback.includes("Sentence analyzed") && !feedback.includes("Your sentence is grammatically correct")) {
          const penalty = (feedback.length / Math.max(1, log.user_input.length)) * 100;
          score = Math.max(0, 100 - penalty);
        }
        dailyScoreSum += score;
      });

      const avgScore = dayLogs.length > 0 ? Math.round(dailyScoreSum / dayLogs.length) : 0;

      chartData.push({ date: dateString, count: dayLogs.length, fluencyScore: avgScore });
    }

    const totalSubmissions = logs.length;
    let totalScoreSum = 0;
    logs.forEach(log => {
      let score = 100;
      const feedback = log.ai_feedback || '';
      if (feedback.trim() && !feedback.includes("Sentence analyzed") && !feedback.includes("Your sentence is grammatically correct")) {
        const penalty = (feedback.length / Math.max(1, log.user_input.length)) * 100;
        score = Math.max(0, 100 - penalty);
      }
      totalScoreSum += score;
    });

    const averageFluencyScore = totalSubmissions > 0 ? Math.round(totalScoreSum / totalSubmissions) : 0;
    const rollingWindowPeriod = range === '30d' ? 30 : 7;
    const onePeriodAgo = new Date();
    onePeriodAgo.setDate(today.getDate() - rollingWindowPeriod);
    
    const thisWeekLogs = logs.filter(l => new Date(l.created_at) >= onePeriodAgo);
    const lastWeekLogs = logs.filter(l => new Date(l.created_at) < onePeriodAgo);

    let growthPercentage = 0;
    if (lastWeekLogs.length > 0) {
      growthPercentage = Math.round(((thisWeekLogs.length - lastWeekLogs.length) / lastWeekLogs.length) * 100);
    } else if (thisWeekLogs.length > 0) {
      growthPercentage = 100;
    }

    return c.json({
      success: true,
      data: { weeklyGrowth: { thisWeek: thisWeekLogs.length, lastWeek: lastWeekLogs.length, growthPercentage }, averageFluencyScore, chartData }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default statsRouter;
