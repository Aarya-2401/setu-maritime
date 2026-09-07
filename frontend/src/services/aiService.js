// ---------------------------------------------------------------------------
// ORCA AI Copilot Service
// Connects frontend to the LangGraph Multi-Agent AI API (POST /api/v1/ai/chat)
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

/**
 * Send query to the LangGraph multi-agent orchestration service.
 * @param {string} query - User prompt/question
 * @returns {Promise<{success: boolean, answer: string, intent?: string, agentsExecuted?: string[], cardUpdates?: Array, mapUpdate?: Object, agentResults?: Array}>}
 */
export async function askOrcaAI(query) {
  const endpoint = `${API_BASE}/ai/chat`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error || `AI service returned HTTP ${response.status}`);
  }

  return await response.json();
}
