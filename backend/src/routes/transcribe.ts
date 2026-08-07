import { Hono } from 'hono';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEnvVar } from '../config.js';
import { getAudioStorage } from '../audioStorage.js';

const transcribeRouter = new Hono();

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

    const apiKey = getEnvVar('GEMINI_API_KEY');
    if (!apiKey) {
      return c.json({ success: false, error: 'Gemini API Key is missing in server .env configuration.' }, 500);
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-3.5-flash' });
    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType: mimeType } },
      { text: `Transcribe this audio file exactly as spoken in ${targetLanguage}. Write only the transcription. If there are filler words, transcribe them. Do not write any other explanation or pleasantries. If there is no voice, write [No Voice Detected].` }
    ]);

    const transcription = result.response.text().trim();
    return c.json({ success: true, transcription });
  } catch (error: any) {
    const isQuotaExceeded = error.message?.includes('Quota exceeded') || error.status === 429;
    return c.json({ success: false, error: isQuotaExceeded ? 'Gemini API quota exceeded. Please try again later.' : 'Failed to transcribe: ' + error.message }, 500);
  }
};

transcribeRouter.post('/', transcribeHandler);

export default transcribeRouter;
