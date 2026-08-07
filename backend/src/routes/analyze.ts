import { Hono } from 'hono';
import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../database.js';
import { analyzeRateLimiter } from '../middleware/rateLimiter.js';
import { getEnvVar } from '../config.js';

const analyzeRouter = new Hono();

const getAiClient = () => {
  const apiKey = getEnvVar('GEMINI_API_KEY');
  return new GoogleGenerativeAI(apiKey);
};

analyzeRouter.post('/', analyzeRateLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const { sentence, targetLanguage = 'English' } = body;
    if (!sentence || typeof sentence !== 'string') {
      return c.json({ success: false, error: 'Sentence is required' }, 400);
    }

    try {
      if (targetLanguage === 'English') {
        const cached = await db.prepare('SELECT improved, feedback FROM analysis_cache WHERE sentence = ?').get(sentence) as any;
        if (cached) {
          return c.json({ success: true, data: { improved: cached.improved, feedback: cached.feedback } });
        }
      }
    } catch (cacheErr) {}

    const apiKey = getEnvVar('GEMINI_API_KEY');
    if (!apiKey) {
      return c.json({ success: false, error: 'Gemini API Key is missing in server .env configuration.' }, 500);
    }

    let improvedVersion = '';
    let aiFeedback = '';

    try {
      const systemPrompt = `You are an expert ${targetLanguage} language coach. Analyze the user's ${targetLanguage} sentence, correct all grammatical, structural, and vocabulary errors. If the sentence is completely wrong, nonsensical, or gibberish (e.g. random strings of characters like dfdfdf ghghghghg), provide a correct basic ${targetLanguage} template and explain that the sentence is unintelligible. Provide a clean natural/polished version. Provide an educational explanation targeting why the change was made in a simple, friendly manner. If the sentence is already grammatically perfect and natural, write exactly "Your sentence is grammatically correct" in the feedback field. Format your output strictly as a JSON object with these two fields: { "improved": "The polished sentence here", "feedback": "Your brief explanation of corrections made" }`;
      
      const modelWithSystemInstruction = getAiClient().getGenerativeModel({ model: 'gemini-3.5-flash', systemInstruction: systemPrompt });

      const response = await modelWithSystemInstruction.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Sentence to analyze: "${sentence}"` }] }],
        generationConfig: { responseMimeType: 'application/json' }
      });

      const resText = response.response.text().trim();
      
      if (!resText.includes('{') || !resText.includes('}')) {
        if (resText.toLowerCase().includes("grammatically correct") || resText.toLowerCase().includes("fine") || resText.toLowerCase().includes("correct")) {
          improvedVersion = sentence;
          aiFeedback = "Your sentence is grammatically correct";
        } else {
          improvedVersion = resText;
          aiFeedback = "Sentence evaluated successfully.";
        }
      } else {
        const firstBrace = resText.indexOf('{');
        const lastBrace = resText.lastIndexOf('}');
        const cleanJsonText = resText.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(cleanJsonText);
        improvedVersion = parsed.improved;
        aiFeedback = parsed.feedback;
      }

      if (!improvedVersion || !aiFeedback) {
        improvedVersion = sentence;
        aiFeedback = "Your sentence is grammatically correct";
      }

      try {
        if (targetLanguage === 'English') {
          const insertStmt = db.prepare('INSERT OR IGNORE INTO analysis_cache (sentence, improved, feedback) VALUES (?, ?, ?)');
          await insertStmt.run(sentence, improvedVersion, aiFeedback);
        }
      } catch (cacheSaveErr) {}

    } catch (err: any) {
      const isQuotaExceeded = err.message?.includes('Quota exceeded') || err.status === 429;
      return c.json({ success: false, error: isQuotaExceeded ? 'Gemini API quota exceeded. Please try again in 1 minute.' : 'Failed to analyze: ' + err.message }, 500);
    }

    return c.json({ success: true, data: { improved: improvedVersion, feedback: aiFeedback } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

import { transcribeHandler } from './transcribe.js';

// Alias agar URL lama /api/analyze/transcribe tetap berfungsi (handler utama di /api/transcribe)
analyzeRouter.post('/transcribe', transcribeHandler);

export default analyzeRouter;
