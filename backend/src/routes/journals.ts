import { Hono } from 'hono';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../database.js';
import { getEnvVar } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const journalsRouter = new Hono();

// Identitas dari session token — userId client diabaikan (menutup IDOR)
journalsRouter.use('*', requireAuth);

const getAiClient = () => {
  const apiKey = getEnvVar('GEMINI_API_KEY');
  return new GoogleGenerativeAI(apiKey);
};

// Schema validation for submitting a journal entry
const journalSubmitSchema = z.object({
  prompt: z.string().optional().nullable(),
  targetLanguage: z.string().optional(),
  content: z.string().min(5),
  clientUuid: z.string().uuid().optional(),
});

// GET: Fetch all journal entries for a user
journalsRouter.get('/', async (c) => {
  try {
    const userId = c.get('authUserId');
    const entries = await db.query('SELECT * FROM journals WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').all(userId);
    return c.json({ success: true, data: entries });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET: Generate a dynamic journal prompt
journalsRouter.get('/prompt', async (c) => {
  try {
    const targetLanguage = c.req.query('targetLanguage') || 'English';
    const apiKey = getEnvVar('GEMINI_API_KEY');
    if (!apiKey) {
      return c.json({ 
        success: true, 
        prompt: "What was a technical block you overcame today, and how did you resolve it?" 
      });
    }

    const model = getAiClient().getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const result = await model.generateContent(
      `You are an empathetic journaling coach for tech professionals. Generate a single, short reflective question in ${targetLanguage} for a software engineer's journal entry. It should encourage reflection on either: technical achievements, soft skills, meeting emotions, or career goals. Keep it under 2 sentences. Return only the question without any intro, outro, or quotes.`
    );

    const generatedPrompt = result.response.text().trim();
    return c.json({ success: true, prompt: generatedPrompt });
  } catch (error: any) {
    // Fallback if AI prompt fails
    const targetLanguage = c.req.query('targetLanguage') || 'English';
    const fallbacks: Record<string, string> = {
      English: "What was one small victory you achieved today, and how did it impact your confidence?",
      French: "Quelle a été votre petite victoire d'aujourd'hui, et comment a-t-elle influencé votre confiance ?",
      Spanish: "¿Cuál fue una pequeña victoria que lograste hoy y cómo afectó tu confianza?",
      Japanese: "今日達成した小さな勝利は何ですか？それはあなたの自信にどのように影響しましたか？",
      German: "Was war heute ein kleiner Erfolg für Sie und wie hat er sich auf Ihr Selbstvertrauen ausgewirkt?"
    };
    return c.json({ 
      success: true, 
      prompt: fallbacks[targetLanguage] || fallbacks['English']
    });
  }
});

// POST: Submit a journal entry (processes mood and AI reflection via Gemini)
journalsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = journalSubmitSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Content must be at least 5 characters.' }, 400);
    }

    const userId = c.get('authUserId');
    const { prompt = null, content, targetLanguage = 'English', clientUuid = null } = result.data;
    const nowMs = Date.now();

    if (clientUuid) {
      const existing = await db.query(
        'SELECT id FROM journals WHERE client_uuid = ?'
      ).get(clientUuid) as { id: number } | undefined;
      if (existing) {
        return c.json({
          success: true,
          data: { id: existing.id, user_id: userId, prompt, content, mood: 'Neutral', ai_reflection: '', created_at: new Date().toISOString() },
        });
      }
    }
    
    let detectedMood = 'Neutral';
    let aiReflection = 'Thank you for sharing your thoughts today. Keep practicing and journaling!';

    const apiKey = getEnvVar('GEMINI_API_KEY');
    if (apiKey) {
      try {
        const systemPrompt = `You are a warm, empathetic AI Journaling Coach.
Analyze the user's journal content written in ${targetLanguage}. 
1. Determine their primary mood or emotional tone from the text. Categorize it as exactly one of these: "Stressed", "Tired", "Proud", "Optimistic", "Exhausted", "Happy", "Inspired", "Anxious", "Confused", or "Neutral".
2. Provide a warm, supportive, and motivating response in ${targetLanguage} reflecting on what they wrote. Keep it friendly and concise (exactly 2-3 sentences).

Format your output strictly as a JSON object with these two fields:
{
  "mood": "DetectedMoodHere",
  "reflection": "Your warm, brief coaching feedback here"
}`;

        const model = getAiClient().getGenerativeModel({ 
          model: 'gemini-3.5-flash-lite',
          generationConfig: { responseMimeType: 'application/json' }
        });

        const gResponse = await model.generateContent([
          { text: systemPrompt },
          { text: `User Journal Entry:\n"${content}"` }
        ]);

        const resText = gResponse.response.text().trim();
        const firstBrace = resText.indexOf('{');
        const lastBrace = resText.lastIndexOf('}');
        
        if (firstBrace > -1 && lastBrace > -1) {
          const cleanJsonText = resText.slice(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(cleanJsonText);
          detectedMood = parsed.mood || 'Neutral';
          aiReflection = parsed.reflection || aiReflection;
        }
      } catch (err) {
        console.error('Gemini Journal AI Error:', err);
      }
    }

    // Save to database
    const stmt = db.prepare(
      'INSERT INTO journals (user_id, prompt, content, mood, ai_reflection, client_uuid, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const info = await stmt.run(userId, prompt, content, detectedMood, aiReflection, clientUuid, nowMs);

    return c.json({
      success: true,
      data: {
        id: info.lastInsertRowid,
        user_id: userId,
        prompt,
        content,
        mood: detectedMood,
        ai_reflection: aiReflection,
        created_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default journalsRouter;
