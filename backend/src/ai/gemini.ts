import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export function createGemini() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is missing. Add it to backend/.env');
  const modelName = (process.env.GEMINI_MODEL || 'gemini-3.5-flash').trim();
  return new ChatGoogleGenerativeAI({ apiKey: key, model: modelName, temperature: 0.6 });
}
