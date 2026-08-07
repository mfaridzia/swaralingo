import { Hono } from 'hono';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getContext } from 'hono/context-storage';
import { getEnvVar } from '../config.js';
import { getAudioStorage } from '../audioStorage.js';

const transcribeRouter = new Hono();

const WHISPER_MODEL = '@cf/openai/whisper-large-v3-turbo';

interface WorkerAiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

// Akses binding AI Workers (hanya ada di Cloudflare Workers / wrangler dev; kosong di bun dev lokal)
function getAiBinding(): WorkerAiBinding | undefined {
  try {
    const env = getContext().env as Record<string, unknown>;
    return env.AI as WorkerAiBinding | undefined;
  } catch {
    return undefined;
  }
}

const transcribeSchema = z.object({
  audioKey: z.string().optional(),
  audioBase64: z.string().optional().nullable(),
  targetLanguage: z.string().optional().default('English'),
});

// Konversi ArrayBuffer → base64 dengan chunking agar btoa tidak stack overflow pada audio besar
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

// Jalur utama: Workers AI Whisper (gratis, kuota lepas dari Gemini). Gagal → fallback Gemini di bawah.
async function transcribeWithWhisper(base64Data: string): Promise<string> {
  const ai = getAiBinding();
  if (!ai) throw new Error('AI binding not available');
  const result = await ai.run(WHISPER_MODEL, { audio: base64Data });
  const text = (result as { text?: string }).text?.trim();
  if (!text) throw new Error('Whisper returned empty transcription');
  return text;
}

// Fallback: Gemini Multimodal — dipakai di local bun dev (tanpa AI binding) atau saat Whisper gagal
async function transcribeWithGemini(base64Data: string, mimeType: string, targetLanguage: string): Promise<string> {
  const apiKey = getEnvVar('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Gemini API Key is missing in server .env configuration.');

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
  const result = await model.generateContent([
    { inlineData: { data: base64Data, mimeType: mimeType } },
    { text: `Transcribe this audio file exactly as spoken in ${targetLanguage}. Write only the transcription. If there are filler words, transcribe them. Do not write any other explanation or pleasantries. If there is no voice, write [No Voice Detected].` }
  ]);

  const transcription = result.response.text().trim();
  if (!transcription) throw new Error('Gemini returned empty transcription');
  return transcription;
}

export const transcribeHandler = async (c: any) => {
  try {
    const body = await c.req.json();
    const parsed = transcribeSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid input data' }, 400);
    }

    const { audioKey, audioBase64, targetLanguage } = parsed.data;
    if (!audioKey && !audioBase64) {
      return c.json({ success: false, error: 'Audio data is required' }, 400);
    }

    let base64Data: string;
    let mimeType = 'audio/webm';

    if (audioKey) {
      const audio = await getAudioStorage().get(audioKey);
      if (!audio) {
        return c.json({ success: false, error: 'Audio not found' }, 404);
      }
      base64Data = arrayBufferToBase64(await new Response(audio.body).arrayBuffer());
      mimeType = audio.contentType;
    } else {
      const audioB64 = audioBase64 || '';
      const commaIndex = audioB64.indexOf(',');
      base64Data = commaIndex > -1 ? audioB64.substring(commaIndex + 1) : audioB64;

      if (audioB64.startsWith('data:')) {
        const colonIndex = audioB64.indexOf(':');
        const semicolonIndex = audioB64.indexOf(';');
        if (colonIndex > -1 && semicolonIndex > -1) {
          mimeType = audioB64.substring(colonIndex + 1, semicolonIndex);
        }
      }
    }

    try {
      const transcription = await transcribeWithWhisper(base64Data);
      return c.json({ success: true, transcription });
    } catch {
      // Whisper tidak tersedia / gagal — fallback ke Gemini
      const transcription = await transcribeWithGemini(base64Data, mimeType, targetLanguage);
      return c.json({ success: true, transcription });
    }
  } catch (error: any) {
    const isQuotaExceeded = error.message?.includes('Quota exceeded') || error.status === 429;
    return c.json({ success: false, error: isQuotaExceeded ? 'Gemini API quota exceeded. Please try again later.' : 'Failed to transcribe: ' + error.message }, 500);
  }
};

transcribeRouter.post('/', transcribeHandler);

export default transcribeRouter;
