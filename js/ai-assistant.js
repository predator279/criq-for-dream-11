/**
 * CricIQ — AI Assistant
 *
 * Server mode (default on Vercel): calls the same-origin POST /api/ai proxy.
 * Keys stay in Vercel Environment Variables and NEVER reach the browser.
 *
 * Direct mode (fallback): if the server endpoint is missing (e.g. running
 * index.html locally, or on GitHub Pages), falls back to calling Gemini /
 * Groq directly using the user's own key saved in localStorage, or the
 * placeholder embedded key from js/config.js.
 *
 * Provider selection per call:
 *   1. POST /api/ai (server proxy: Gemini primary, Groq fallback server-side)
 *   2. Direct Gemini (localStorage key → embedded default key)
 *   3. Direct Groq (embedded default key)
 */

class AIAssistant {
  constructor() {
    const cfg = (typeof window !== 'undefined' && window.CRICIQ_CONFIG) || {};
    this.geminiCfg = Object.assign(
      { defaultApiKey: '', model: 'gemini-3.1-flash-lite' },
      cfg.gemini || {}
    );
    this.groqCfg = Object.assign(
      { defaultApiKey: '', model: 'openai/gpt-oss-120b' },
      cfg.groq || {}
    );

    this.model = this.geminiCfg.model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.serverUrl = 'api/ai'; // same-origin serverless proxy

    this.serverMode = null;    // null = unknown, true/false after probe
    this.serverProviders = null;
    this.activeProvider = null; // 'server:gemini' | 'server:groq' | 'gemini' | 'groq' | null
    this.apiKey = this.resolveGeminiKey();
  }

  resolveGeminiKey() {
    let local = '';
    if (typeof localStorage !== 'undefined') {
      local = localStorage.getItem('gemini_api_key') || '';
    }
    return local || this.geminiCfg.defaultApiKey || '';
  }

  /**
   * Set API key in memory and localStorage.
   * @param {string} key
   */
  setApiKey(key) {
    this.apiKey = (key || '').trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gemini_api_key', this.apiKey);
    }
  }

  hasApiKey() {
    return Boolean(this.resolveGeminiKey());
  }

  getActiveProvider() {
    return this.activeProvider;
  }

  /**
   * Probe the same-origin server proxy. Fire-and-forget at app boot.
   * @returns {Promise<Object>} { serverMode, providers }
   */
  async probeServer() {
    try {
      const response = await fetch(this.serverUrl, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.serverMode = Boolean(data.ok);
      this.serverProviders = data.providers || null;
    } catch (e) {
      // 404 (GitHub Pages / file://) or network error — direct mode
      this.serverMode = false;
      this.serverProviders = null;
    }
    return { serverMode: this.serverMode, providers: this.serverProviders };
  }

  /**
   * Execute REST call to Gemini generateContent endpoint directly from browser.
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  async callGemini(prompt) {
    const key = this.resolveGeminiKey();
    if (!key) {
      throw new Error('No AI backend available. If you are viewing this via a static host, configure GEMINI_API_KEY on the server, or enter your own key here.');
    }

    const url = `${this.baseUrl}/${this.geminiCfg.model}:generateContent?key=${key}`;
    const response = await fetch(url, {
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
      let errorMsg = 'Failed to get AI response';
      try {
        const error = await response.json();
        errorMsg = error.error?.message || errorMsg;
      } catch (e) {
        errorMsg = `API Error (${response.status}: ${response.statusText})`;
      }
      // Tag rate-limit/auth errors so the caller can decide to fall back
      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts[0]
    ) {
      const err = new Error('Received empty response from Gemini API.');
      err.status = response.status;
      throw err;
    }

    this.activeProvider = 'gemini';
    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Fallback: Groq (OpenAI-compatible chat completions).
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  async callGroq(prompt) {
    const key = this.groqCfg.defaultApiKey;
    if (!key) {
      throw new Error('Groq fallback key is not configured in js/config.js.');
    }

    const response = await fetch(this.groqUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: this.groqCfg.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      let errorMsg = 'Failed to get AI response from Groq';
      try {
        const error = await response.json();
        errorMsg = error.error?.message || errorMsg;
      } catch (e) {
        errorMsg = `Groq API Error (${response.status}: ${response.statusText})`;
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Received empty response from Groq API.');
    }

    this.activeProvider = 'groq';
    return data.choices[0].message.content;
  }

  /**
   * Server-first, then direct Gemini, then direct Groq.
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  async callAI(prompt) {
    // 1. Server proxy (keys stay server-side)
    try {
      return await this.callServer(prompt);
    } catch (serverErr) {
      console.warn('[CricIQ] Server proxy unavailable (' + serverErr.message + '), trying direct calls');
    }

    // 2. Direct Gemini (BYO key / embedded key)
    try {
      return await this.callGemini(prompt);
    } catch (err) {
      const canFallback = this.groqCfg.defaultApiKey &&
        // Fall back on rate limits, auth issues, empty responses, or network errors.
        (!err.status || err.status === 429 || err.status === 403 || err.status === 500 || err.status === 503);
      if (canFallback) {
        console.warn('[CricIQ] Gemini failed (' + err.message + '), falling back to Groq');
        return this.callGroq(prompt);
      }
      throw err;
    }
  }

  /**
   * POST the prompt to the same-origin serverless proxy.
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  async callServer(prompt) {
    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Server proxy error (${response.status})`);
    }
    if (!data.text) {
      throw new Error('Server proxy returned no text.');
    }
    this.activeProvider = data.provider ? `server:${data.provider}` : 'server';
    return data.text;
  }

  /**
   * Feature 1: "What Happened?"
   * Explains recent deliveries and controversial / key moments in plain English.
   * @param {Object|string} matchState
   * @param {Array<Object>} lastNBalls
   * @param {Array<Object>} keyMoments
   * @returns {Promise<string>}
   */
  async whatHappened(matchState, lastNBalls, keyMoments) {
    let stateStr = '';
    if (typeof matchState === 'string') {
      stateStr = matchState;
    } else if (matchState) {
      stateStr = `${matchState.battingTeam} ${matchState.score}/${matchState.wickets} in ${matchState.oversDisplay} overs (vs ${matchState.bowlingTeam})`;
    }

    const ballsList = Array.isArray(lastNBalls) ? lastNBalls : [];
    const ballsStr = ballsList.map(b => {
      let keyInfo = '';
      if (b.isKeyMoment) {
        keyInfo = ` [KEY MOMENT: ${b.keyMomentType || 'Key moment'} - ${b.keyMomentDetail || ''}]`;
      } else if (b.isWicket) {
        keyInfo = ` [WICKET: ${b.wicketType || 'Out'} - ${b.dismissedBatsman || ''}]`;
      }
      return `${b.overDisplay} | ${b.bowler} to ${b.batsmanOnStrike} | ${b.runs} run(s) | ${b.commentary}${keyInfo}`;
    }).join('\n');

    const prompt = `You are a friendly, knowledgeable cricket expert helping a fan understand what just happened during a live IPL match.

Current match situation:
${stateStr}

Here are the last few balls:
${ballsStr}

Explain what just happened in 3-4 sentences. Be conversational and engaging — like explaining to a friend. If there was a key moment (DRS, dropped catch, run out, big wicket), focus on explaining it clearly, including any rules involved. Use cricket terminology but explain it simply.

Don't start with "Sure!" or "Here's what happened". Just dive right in.`;

    return this.callAI(prompt);
  }

  /**
   * Feature 2: "Catch Me Up"
   * Provides a late-joiner narrative match summary.
   * @param {string} matchSummary
   * @param {Array<Object>} allBalls
   * @param {Array<Object>} keyMoments
   * @returns {Promise<string>}
   */
  async catchMeUp(matchSummary, allBalls, keyMoments) {
    const keyMomentsList = Array.isArray(keyMoments) ? keyMoments : [];
    const keyMomentsStr = keyMomentsList.length > 0
      ? keyMomentsList.map(m => `${m.overDisplay}: ${m.keyMomentType || 'Key moment'} - ${m.keyMomentDetail || m.commentary}`).join('\n')
      : 'None so far.';

    const commentaryStr = Array.isArray(allBalls)
      ? allBalls.map(b => `${b.overDisplay}: ${b.commentary}`).join('\n')
      : (typeof allBalls === 'string' ? allBalls : '');

    const prompt = `You are a friendly cricket expert giving a quick update to a fan who just tuned in.

Match data:
${matchSummary}

Key moments:
${keyMomentsStr}

Full commentary log:
${commentaryStr}

Give a 4-5 sentence summary as if catching up a friend who just sat down. Cover:
1. Who's batting, score, overs
2. Key moments and turning points
3. Impressive players
4. Current momentum/situation

Be conversational and enthusiastic. Don't start with "Sure!" — just dive in.`;

    return this.callAI(prompt);
  }

  /**
   * Feature 3: "Ask Anything"
   * Answers a fan's free-form question grounded in actual match data.
   * @param {string} question
   * @param {string} matchSummary
   * @param {Array<Object>} allBalls
   * @param {Array<Object>} keyMoments
   * @returns {Promise<string>}
   */
  async askAnything(question, matchSummary, allBalls, keyMoments) {
    const keyMomentsList = Array.isArray(keyMoments) ? keyMoments : [];
    const keyMomentsStr = keyMomentsList.length > 0
      ? keyMomentsList.map(m => `• Over ${m.overDisplay}: ${m.keyMomentType || 'Key moment'} - ${m.keyMomentDetail || m.commentary}`).join('\n')
      : 'None so far.';

    const ballList = Array.isArray(allBalls) ? allBalls : [];
    const ballLogStr = ballList.map(b => {
      let tag = '';
      if (b.isWicket) tag = ' [WICKET!]';
      else if (b.isSix) tag = ' [SIX!]';
      else if (b.isBoundary) tag = ' [FOUR!]';
      return `${b.overDisplay} | ${b.bowler} to ${b.batsmanOnStrike} | Runs: ${b.runs} | ${b.commentary}${tag}`;
    }).join('\n');

    const prompt = `You are a friendly cricket expert. A fan watching this live IPL match has a question.

Match situation:
${matchSummary}

Key moments:
${keyMomentsStr}

Ball-by-ball log:
${ballLogStr}

Fan's question: "${question}"

Answer based on the match data. Be helpful, accurate, conversational. If about rules, explain simply. If about stats, be precise. If you can't answer, say so.

Keep to 2-4 sentences. Don't start with "Sure!" or "Great question!" — just answer.`;

    return this.callAI(prompt);
  }
}

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.AIAssistant = AIAssistant;
}
