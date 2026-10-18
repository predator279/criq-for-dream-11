/**
 * CricIQ — Secure AI proxy (Vercel serverless function)
 *
 * Keys NEVER reach the browser. They are read from Vercel Environment
 * Variables (Environment Variables → GEMINI_API_KEY / GROQ_API_KEY).
 * The hosted app talks only to this same-origin endpoint.
 *
 * GET  /api/ai            → { ok, providers: { gemini, groq } } (health check)
 * POST /api/ai { prompt } → { text, provider: "gemini" | "groq" }
 *
 * Primary: Gemini gemini-3.1-flash-lite (free tier)
 * Fallback: Groq openai/gpt-oss-120b (free tier) on rate-limit/auth/5xx/empty
 */

export const maxDuration = 30;

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      app: 'CricIQ',
      providers: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        groq: Boolean(process.env.GROQ_API_KEY),
        cricapi: Boolean((process.env.CRICAPI_API_KEY || '').trim())
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST with { "prompt": "..." } or GET for health.' });
  }

  let prompt = '';
  try {
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    prompt = (body?.prompt || '').toString();
  } catch {
    // body may already be parsed by the runtime
  }
  if (!prompt.trim()) {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  // Try Gemini first
  try {
    const text = await callGemini(prompt);
    return res.status(200).json({ text, provider: 'gemini' });
  } catch (geminiError) {
    const status = geminiError.status || 500;
    const canFallback = status === 429 || status === 403 || status === 500 || status === 503 || !status;
    if (!canFallback) {
      console.error(`[CricIQ proxy] Gemini failed (${status}): ${geminiError.message}`);
      return res.status(502).json({ error: `Gemini error: ${geminiError.message}` });
    }

    // Fallback to Groq
    try {
      console.warn(`[CricIQ proxy] Gemini failed (${status}), falling back to Groq`);
      const text = await callGroq(prompt);
      return res.status(200).json({ text, provider: 'groq' });
    } catch (groqError) {
      console.error(`[CricIQ proxy] Groq also failed: ${groqError.message}`);
      return res.status(502).json({ error: `Both providers failed. Groq error: ${groqError.message}` });
    }
  }
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('GEMINI_API_KEY missing');
    err.status = 0; // no key configured yet
    throw err;
  }

  const response = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.9
      }
    })
  });

  if (!response.ok) {
    let msg = `Gemini API error (${response.status})`;
    try {
      const errData = await response.json();
      msg = errData.error?.message || msg;
    } catch { /* ignore parse failures */ }
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error('Empty response from Gemini');
    err.status = response.status;
    throw err;
  }
  return text;
}

async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY is missing too');
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    let msg = `Groq API error (${response.status})`;
    try {
      const errData = await response.json();
      msg = errData.error?.message || msg;
    } catch { /* ignore parse failures */ }
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');
  return text;
}
