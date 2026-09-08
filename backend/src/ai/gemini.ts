import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export function createGemini() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is missing. Add it to backend/.env');
  let modelName = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim();
  if (modelName === 'gemini-3.5-flash' || modelName === 'gemini-2.5-flash' || !modelName.startsWith('gemini-')) {
    modelName = 'gemini-1.5-flash';
  }

  return new ChatGoogleGenerativeAI({ apiKey: key, model: modelName, temperature: 0.6 });
}
