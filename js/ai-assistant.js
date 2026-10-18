/**
 * CricIQ — AI Assistant (grounded narration layer)
 *
 * Server mode (default): calls the same-origin POST /api/ai proxy, so keys stay
 * in environment variables and never reach the browser.
 *
 * Direct mode (fallback): if the proxy is missing (static host, plain file),
 * call Gemini / Groq directly with the user's own key from localStorage or the
 * placeholder in js/config.js.
 *
 * Design rule: the model narrates, it never calculates. Every number below is
 * produced by the engine; this file only renders those facts into readable
 * lines and asks for prose. See implementation-plan FINAL.md §7.
 */

const CONTEXT_BUDGET_TOKENS = 3500;

const GROUNDING_RULES = `GROUNDING RULES (non-negotiable):
- For anything about this match, use ONLY the facts in MATCH DATA below.
- Never invent a run count, score, ball count, player figure or statistic. If a
  number is not in MATCH DATA, say you do not have it.
- Do not describe, hint at or assume anything that has not appeared in MATCH DATA
  yet. If you recognise this fixture from elsewhere, ignore that knowledge.
- Do not calculate new totals. Quote the figures exactly as given.`;

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
    this.serverUrl = 'api/ai';
    this.knowledgeBaseUrl = 'api/knowledge/rules.json';

    this.serverMode = null;      // null = unknown, true/false after probe
    this.serverProviders = null;
    this.activeProvider = null;  // 'server:gemini' | 'server:groq' | 'gemini' | 'groq'
    this.apiKey = this.resolveGeminiKey();
    this.knowledgeBase = null;
  }

  /* ------------------------------ Credentials ------------------------------ */

  resolveGeminiKey() {
    let local = '';
    if (typeof localStorage !== 'undefined') {
      local = localStorage.getItem('gemini_api_key') || '';
    }
    return local || this.geminiCfg.defaultApiKey || '';
  }

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

  /* ------------------------------ Knowledge base ------------------------------ */

  async loadKnowledgeBase() {
    if (this.knowledgeBase) return this.knowledgeBase;
    try {
      const response = await fetch(this.knowledgeBaseUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.knowledgeBase = await response.json();
      return this.knowledgeBase;
    } catch (err) {
      console.warn('[AIAssistant] knowledge base unavailable:', err.message);
      return this.getFallbackKnowledgeBase();
    }
  }

  getFallbackKnowledgeBase() {
    return {
      dream11_scoring: {},
      cricket_rules: {
        dls_method: {
          name: 'Duckworth-Lewis-Stern (DLS)',
          explanation: 'A formula for revised targets in rain-affected limited-overs matches. It converts remaining overs and wickets into a resource percentage, then sets a par score for the chasing side.'
        },
        powerplay: {
          name: 'Powerplay',
          explanation: 'In T20 cricket the first six overs are the powerplay: only two fielders are allowed outside the 30-yard circle, so boundaries are easier to find.'
        },
        lbw: {
          name: 'Leg Before Wicket',
          explanation: 'A batter is out LBW when the ball would have hit the stumps but struck the body instead. The ball must pitch in line or on the off side, and impact must be in line with the stumps unless no shot was offered.'
        },
        super_over: {
          name: 'Super Over',
          explanation: 'A tied limited-overs match is decided by one over per side. If it is still level, another Super Over follows.'
        },
        extras: {
          name: 'Extras',
          explanation: 'Runs not scored off the bat: wides and no-balls also cost the batting side a re-bowled delivery; byes and leg-byes do not.'
        },
        drs: {
          name: 'Decision Review System',
          explanation: 'A system for challenging an umpire using ball tracking and edge detection. Teams get a limited number of reviews, and a review is lost if the on-field call stands.'
        }
      }
    };
  }

  /**
   * Pull the rules entry matching a topic. Returns null when the question is
   * not about a rule we actually have, so callers never inject unrelated text.
   * (The previous version silently fell back to the DLS text for every
   * unmatched topic, which fed the wrong rule into the prompt.)
   */
  getRuleEntry(topic) {
    const kb = this.knowledgeBase || this.getFallbackKnowledgeBase();
    const rules = (kb && kb.cricket_rules) || {};
    const q = String(topic || '').toLowerCase();
    if (!q) return null;

    const aliases = {
      dls_method: ['dls', 'duckworth', 'lewis', 'stern', 'par score', 'rain'],
      powerplay: ['powerplay', 'power play', 'field restriction', '30-yard'],
      lbw: ['lbw', 'leg before', 'leg-before'],
      super_over: ['super over', 'super-over', 'tie breaker', 'tie-break'],
      extras: ['extra', 'wide', 'no-ball', 'noball', 'bye', 'leg bye', 'legbye'],
      drs: ['drs', 'review', 'ultraedge', 'hawk-eye', 'ball tracking', 'umpire call']
    };

    for (const [key, words] of Object.entries(aliases)) {
      if (!rules[key]) continue;
      if (words.some(w => q.includes(w))) return rules[key];
    }
    return null;
  }

  formatRuleText(entry) {
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    const name = entry.name || 'Rule';
    const body = entry.explanation || entry.description || '';
    const terms = Array.isArray(entry.key_terms) ? entry.key_terms : [];
    let text = `${name}: ${body}`;
    if (terms.length) {
      text += '\n' + terms.slice(0, 4).map(t => `  • ${t}`).join('\n');
    }
    return text;
  }

  /** Rules text for a question, or '' when the question is not rule-related. */
  getCricketRulesText(topic = null) {
    const kb = this.knowledgeBase || this.getFallbackKnowledgeBase();
    const rules = (kb && kb.cricket_rules) || {};

    if (topic) {
      return this.formatRuleText(this.getRuleEntry(topic));
    }

    return Object.values(rules)
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => this.formatRuleText(entry))
      .join('\n\n');
  }

  /** Fantasy scoring text, used only when the fan actually asks about fantasy. */
  getDream11RulesText() {
    const kb = this.knowledgeBase || this.getFallbackKnowledgeBase();
    const ds = kb.dream11_scoring || {};
    const lines = [];

    const walk = (value, label) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach(item => walk(item, label));
        return;
      }
      if (typeof value === 'object') {
        Object.entries(value).forEach(([key, child]) => {
          walk(child, key.replace(/_/g, ' '));
        });
        return;
      }
      lines.push(`  • ${label}: ${value}`);
    };

    Object.entries(ds).forEach(([key, value]) => {
      if (key === 'description') return;
      walk(value, key.replace(/_/g, ' '));
    });

    if (!lines.length) return '';
    return `DREAM11 SCORING (only relevant if the fan asks about fantasy points):\n${lines.slice(0, 30).join('\n')}`;
  }

  /* ------------------------------ Context assembly ------------------------------ */

  estimateTokens(text) {
    return Math.ceil(String(text || '').length / 4);
  }

  /** One delivery as a single factual line. No narration, no invented detail. */
  renderBallLine(ball) {
    if (!ball) return '';
    const over = ball.overDisplay || '?';
    const bowler = ball.bowler || 'bowler';
    const striker = ball.batsmanOnStrike || 'batter';

    let outcome;
    if (ball.isWicket) {
      const kind = String(ball.wicketType || 'out').replace(/_/g, ' ');
      const fielder = ball.fielder ? `, ${ball.fielder}` : '';
      outcome = `OUT (${kind}${fielder})`;
    } else if (ball.extraType === 'wide') {
      outcome = `wide, ${ball.extras || 1} extra`;
    } else if (ball.extraType === 'noball') {
      outcome = `no-ball, ${ball.extras || 1} extra`;
    } else if (ball.extraType) {
      const bat = ball.batsmanRuns ? `, ${ball.batsmanRuns} off the bat` : '';
      outcome = `${ball.extraType}, ${ball.extras || 0} extra${bat}`;
    } else if (ball.isSix) {
      outcome = 'SIX';
    } else if (ball.isBoundary) {
      outcome = 'FOUR';
    } else if (!ball.runs) {
      outcome = 'no run';
    } else {
      outcome = `${ball.runs} run${ball.runs === 1 ? '' : 's'}`;
    }

    let line = `${over} ${bowler} to ${striker}, ${outcome}`;
    if (ball.totalScore !== undefined) {
      line += ` | ${ball.totalScore}/${ball.totalWickets}`;
    }
    return line;
  }

  renderBallLog(balls) {
    if (!Array.isArray(balls) || !balls.length) return '';
    return balls.map(b => this.renderBallLine(b)).filter(Boolean).join('\n');
  }

  /**
   * At-the-crease / bowling block from engine stats. Facts only.
   */
  renderStatsBlock({ state, stats }) {
    const parts = [];

    const batsmen = (stats && stats.batsmen) || null;

    // Live feeds ship a batsmen array instead of per-player stat maps. Render it
    // rather than dropping the crease information entirely.
    if (state && Array.isArray(state.batsmen) && state.batsmen.length) {
      const lines = state.batsmen.slice(0, 2).map(b =>
        `  • ${b.name}${b.notOut ? '*' : ''} ${b.runs} off ${b.balls} ball${b.balls === 1 ? '' : 's'}`
      );
      parts.push(`AT THE CREASE:\n${lines.join('\n')}`);
    } else if (batsmen && state && state.currentBatsmen) {
      const lines = [];
      const add = (name, marker) => {
        if (!name) return;
        const s = batsmen[name];
        if (!s) return;
        // A dismissed batter is not at the crease, even on the ball that got them.
        if (s.isOut) return;
        const boundary = [s.fours ? `${s.fours}x4` : '', s.sixes ? `${s.sixes}x6` : '']
          .filter(Boolean).join(' ');
        const ballsLabel = `${s.balls} ball${s.balls === 1 ? '' : 's'}`;
        lines.push(`  • ${name}${marker} ${s.runs}* off ${ballsLabel}${boundary ? ` (${boundary})` : ''}`);
      };
      add(state.currentBatsmen.striker, ' (striker)');
      add(state.currentBatsmen.nonStriker, ' (non-striker)');
      if (lines.length === 1) {
        lines.push('  • new batter in, yet to face a ball');
      }
      if (lines.length) parts.push(`AT THE CREASE:\n${lines.join('\n')}`);
    }

    const bowlers = (stats && stats.bowlers) || null;
    if (bowlers && state && state.currentBowler && bowlers[state.currentBowler]) {
      const b = bowlers[state.currentBowler];
      parts.push(`BOWLING: ${state.currentBowler} ${b.figures}`);
    } else if (state && state.bowler && state.bowler.name) {
      const b = state.bowler;
      parts.push(`BOWLING: ${b.name} ${b.overs}-${b.runs}-${b.wickets}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build the prompt from the largest projection that fits the budget.
   * Never truncate a log mid-line: either the whole log fits, or we omit it and
   * rely on the state + recent balls + key moments (all derived from the same
   * events, so the answer stays correct — only granularity drops).
   */
  buildContext(options = {}) {
    const {
      state = null,
      balls = [],
      keyMoments = [],
      stats = null,
      question = null,
      history = [],
      summary = '',
      focusBall = null
    } = options;

    const match = (state && state.match) || {};
    const team1 = match.team1 || 'Team A';
    const team2 = match.team2 || 'Team B';

    let context = '';

    // 1. Match identity
    const header = [
      `${team1} vs ${team2}`,
      match.type ? `— ${match.type}` : '',
      match.venue ? `at ${match.venue}` : '',
      match.date ? `(${match.date})` : ''
    ].filter(Boolean).join(' ');
    if (header) context += `MATCH: ${header}\n`;

    // 2. Current state
    if (state) {
      // One state shape for both providers: scripted uses score/wickets,
      // live uses runs/wicketsNumber. Normalise here so callers do not care.
      const runs = typeof state.score === 'number' ? state.score : state.runs;
      const wickets = typeof state.wickets === 'number' ? state.wickets : state.wicketsNumber;
      const overs = state.oversDisplay || state.overs;
      const scoreLine = state.battingTeam && runs !== undefined
        ? `${state.battingTeam} ${runs}/${wickets} after ${overs} overs`
        : '';
      const rr = typeof state.runRate === 'number' ? ` · run rate ${state.runRate.toFixed(2)}` : '';
      if (scoreLine) context += `SCORE: ${scoreLine}${rr}\n`;
    }

    // 3. Batters / bowler figures
    const statsBlock = this.renderStatsBlock({ state, stats });
    if (statsBlock) context += `${statsBlock}\n`;

    // 4. Recent deliveries (facts + the scripted one-line description)
    const recent = Array.isArray(balls) ? balls.slice(-6) : [];
    if (recent.length) {
      const lines = recent.map(b => {
        const base = this.renderBallLine(b);
        const detail = b.commentary ? ` — ${b.commentary}` : '';
        return `  ${base}${detail}`;
      });
      context += `LAST ${recent.length} DELIVERIES:\n${lines.join('\n')}\n`;
    }

    // 4b. The exact delivery the fan clicked, when this is a targeted question
    if (focusBall) {
      context += `FOCUS DELIVERY: ${this.renderBallLine(focusBall)}\n`;
    }

    // 5. Key moments
    if (keyMoments && keyMoments.length) {
      const lines = keyMoments.slice(-6).map(m => {
        const detail = m.keyMomentDetail || m.commentary || m.keyMomentType || 'key moment';
        return `  • ${m.overDisplay}: ${detail}`;
      });
      context += `KEY MOMENTS:\n${lines.join('\n')}\n`;
    }

    // 6. Optional: whole-match digest from the engine, and the full log if it fits
    if (summary && !balls.length) {
      context += `MATCH SUMMARY:\n${summary}\n`;
    }

    if (balls.length > recent.length) {
      const fullLog = this.renderBallLog(balls);
      const candidate = `${context}\nFULL BALL-BY-BALL LOG (${balls.length} deliveries):\n${fullLog}\n`;
      if (this.estimateTokens(candidate) <= CONTEXT_BUDGET_TOKENS) {
        context = candidate;
      } else {
        context += `\n(Full log omitted: ${balls.length} deliveries exceed the context budget. Use the state, recent deliveries and key moments above.)\n`;
      }
    }

    // 7. Rules — only when the question is actually about a rule
    let rulesText = '';
    if (question) {
      rulesText = this.getCricketRulesText(question);
      if (rulesText) context += `\nRULE REFERENCE:\n${rulesText}\n`;
    }

    // 8. Conversation history (Ask me anything only)
    if (history && history.length) {
      context += '\nEARLIER IN THIS CONVERSATION:\n';
      history.slice(-6).forEach(h => {
        context += `${h.role === 'assistant' ? 'CricIQ' : 'Fan'}: ${h.content}\n`;
      });
    }

    // 9. Fantasy scoring — only when asked about it
    if (question && /fantasy|dream11|points|captain|vice[- ]captain/i.test(question)) {
      const fantasy = this.getDream11RulesText();
      if (fantasy) context += `\n${fantasy}\n`;
    }

    let prompt = `${GROUNDING_RULES}\n\nMATCH DATA:\n${context}`;

    if (question) {
      prompt += `\nFAN QUESTION: ${question}\n`;
    }

    return prompt;
  }

  /* ------------------------------ Feature prompts ------------------------------ */

  /**
   * Mode 1 — "What just happened": explain the latest delivery.
   */
  async whatHappened(options = {}) {
    await this.loadKnowledgeBase();
    const prompt = this.buildContext({
      state: options.state,
      balls: Array.isArray(options.balls) ? options.balls.slice(-3) : [],
      keyMoments: options.keyMoments || [],
      stats: options.stats,
      summary: options.summary,
      focusBall: options.focusBall || null
    });

    const target = options.focusBall && options.focusBall.overDisplay
      ? `the delivery at ${options.focusBall.overDisplay}`
      : 'the latest delivery';

    return this.callAI(`${prompt}

TASK: Explain ${target} in 3-4 sentences, as if talking to a friend who looked
away for a moment. Name the batter and bowler, say what the ball produced, and
explain any rule or term that is not obvious (DRS, free hit, powerplay, a wicket
type). Use the exact figures above and the state as it stood after that ball — do
not mention anything that happened later. Do not start with "Sure" or "Here's
what happened" — just dive in.`);
  }

  /**
   * Mode 2 — "Catch me up": summary for someone who just tuned in.
   */
  async catchMeUp(options = {}) {
    await this.loadKnowledgeBase();
    const prompt = this.buildContext({
      state: options.state,
      balls: options.balls || [],
      keyMoments: options.keyMoments || [],
      stats: options.stats,
      summary: options.summary
    });

    return this.callAI(`${prompt}

TASK: Give a 4-5 sentence catch-up for a fan who just sat down. Cover who is
batting, the score and overs, the moments that shaped the innings, and who has
stood out. Use only the figures above. Be conversational and energetic, but do
not invent a stat. Do not start with "Sure" — just dive in.`);
  }

  /**
   * Mode 3 — "Ask me anything".
   */
  async askAnything(question, options = {}) {
    await this.loadKnowledgeBase();
    const prompt = this.buildContext({
      state: options.state,
      balls: options.balls || [],
      keyMoments: options.keyMoments || [],
      stats: options.stats,
      summary: options.summary,
      history: options.history || [],
      focusBall: options.focusBall || null,
      question
    });

    return this.callAI(`${prompt}

TASK: Answer the fan's question in 2-4 sentences. Use the match facts above for
anything about this match, and the rule reference only if it was supplied. If
the answer is not in the data, say plainly that you do not have it. Do not start
with "Sure" or "Great question" — just answer.`);
  }

  /* ------------------------------ Transport ------------------------------ */

  async probeServer() {
    try {
      const response = await fetch(this.serverUrl, { method: 'GET' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.serverMode = Boolean(data.ok);
      this.serverProviders = data.providers || null;
    } catch (e) {
      this.serverMode = false;
      this.serverProviders = null;
    }
    return { serverMode: this.serverMode, providers: this.serverProviders };
  }

  async callGemini(prompt) {
    const key = this.resolveGeminiKey();
    if (!key) {
      throw new Error('No AI backend available. Configure GEMINI_API_KEY on the server, or enter your own key.');
    }

    const url = `${this.baseUrl}/${this.geminiCfg.model}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500, topP: 0.9 }
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
      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const err = new Error('Received empty response from Gemini API.');
      err.status = response.status;
      throw err;
    }

    this.activeProvider = 'gemini';
    return text;
  }

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
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Received empty response from Groq API.');

    this.activeProvider = 'groq';
    return text;
  }

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
   * Server first (keys stay server-side), then direct Gemini, then direct Groq.
   */
  async callAI(prompt) {
    try {
      return await this.callServer(prompt);
    } catch (serverErr) {
      console.warn('[CricIQ] Server proxy unavailable (' + serverErr.message + '), trying direct calls');
    }

    try {
      return await this.callGemini(prompt);
    } catch (err) {
      const canFallback = this.groqCfg.defaultApiKey &&
        (!err.status || err.status === 429 || err.status === 403 || err.status === 500 || err.status === 503);
      if (canFallback) {
        console.warn('[CricIQ] Gemini failed (' + err.message + '), falling back to Groq');
        return this.callGroq(prompt);
      }
      throw err;
    }
  }
}

if (typeof window !== 'undefined') {
  window.AIAssistant = AIAssistant;
}

// Allow the deterministic prompt builder to be tested under Node without a DOM.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIAssistant, CONTEXT_BUDGET_TOKENS, GROUNDING_RULES };
}
