/**
 * CricIQ — Config / Key Vault
 *
 * HOSTED MODE (Vercel — recommended for the submission):
 *   The evaluator's browser talks to the same-origin POST /api/ai serverless
 *   proxy. Your keys live ONLY in Vercel Environment Variables (dashboard →
 *   Settings → Environment Variables → add):
 *
 *       GEMINI_API_KEY   (free tier — gemini-3.1-flash-lite)
 *       GROQ_API_KEY     (free tier — openai/gpt-oss-120b fallback)
 *
 *   Encrypted at rest by Vercel, injected at runtime on the server, never in
 *   the repo and never in any shipped JavaScript. Add as Sensitive/encrypted
 *   variables; no need to expose them to the client (do NOT tick "Vercel
 *   Preview/Production public exposure" style client options).
 *
 * DIRECT MODE (optional, for opening index.html without the server):
 *   You may paste keys here for local development only. These DO ship to
 *   anyone who views the page, so leave them empty for the public submission.
 */

window.CRICIQ_CONFIG = {
  gemini: {
    // Optional: direct-browser key for local use only. DOES NOT go to Vercel.
    defaultApiKey: "",            // e.g. "AIzaSy..." (local use only — leave empty before pushing)
    model: "gemini-3.1-flash-lite"
  },
  groq: {
    // Optional: direct-browser Groq key for local use only. DOES NOT go to Vercel.
    defaultApiKey: "",
    model: "openai/gpt-oss-120b"
  }
};
