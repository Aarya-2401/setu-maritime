import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export function createGemini() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is missing. Add it to backend/.env');
  return new ChatGoogleGenerativeAI({ apiKey: key, model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', temperature: 0.6 });
}
