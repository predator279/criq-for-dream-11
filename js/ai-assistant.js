/**  
 * CricIQ — AI Assistant with Knowledge Grounding  
 *  
 * Server mode (default on Vercel): calls the same-origin POST /api/ai proxy.  
 * Keys stay in Vercel Environment Variables and NEVER reach the browser.  
 *  
 * Direct mode (fallback): if the server endpoint is missing (e.g. running  
 * index.html locally, or on GitHub Pages), falls back to calling Gemini /  
 * Groq directly using the user's own key saved in localStorage, or the  
 * placeholder embedded key from js/config.js.  
 *  
 * This enhanced version adds knowledge-based grounding:  
 * - Dream11 scoring rules loaded from api/knowledge/rules.json  
 * - Cricket rules glossary for DRS, powerplay, LBW, Super Over explanations  
 * - Match context assembly with live state, top scorers, last 12 balls  
 * - Google Search Grounding option for player stats and weather (Gemini)  
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
    this.knowledgeBaseUrl = 'api/knowledge/rules.json';  

    this.serverMode = null;    // null = unknown, true/false after probe  
    this.serverProviders = null;  
    this.activeProvider = null; // 'server:gemini' | 'server:groq' | 'gemini' | 'groq' | null  
    this.apiKey = this.resolveGeminiKey();  
    this.knowledgeBase = null; // Loaded on demand  
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
   * Load the knowledge base (Dream11 rules, cricket glossary).  
   * Cached after first load.  
   */  
  async loadKnowledgeBase() {  
    if (this.knowledgeBase) {  
      return this.knowledgeBase;  
    }  

    try {  
      const response = await fetch(this.knowledgeBaseUrl);  
      if (!response.ok) {  
        throw new Error(`HTTP ${response.status}`);  
      }  
      const data = await response.json();  
      this.knowledgeBase = data;  
      return data;  
    } catch (err) {  
      console.warn('[AIAssistant] Failed to load knowledge base:', err.message);  
      // Return a minimal fallback so the app still works  
      return this.getFallbackKnowledgeBase();  
    }  
  }  

  /**  
   * Minimal fallback knowledge if rules.json can't be loaded.  
   */  
  getFallbackKnowledgeBase() {  
    return {  
      dream11_scoring: {  
        batting: {  
          points: [  
            '1 point per run',  
            '2 points for a four (1 + 1 bonus)',  
            '3 points for a six (1 + 2 bonus)',  
            '1 point bonus at 30 runs',  
            '2 point bonus at 50 runs',  
            '4 point bonus at 100 runs'  
          ]  
        },  
        bowling: {  
          points: [  
            '25 points per wicket',  
            '29 points for caught/bowled/LBW/stumped (+4 bonus)',  
            '31 points for caught and bowled (+6 bonus)',  
            '4 points for 3-wicket haul',  
            '8 points for 4-wicket haul',  
            '12 points for 5-wicket haul',  
            '2 points per maiden over'  
          ]  
        },  
        fielding: {  
          points: [  
            '6 points for a catch',  
            '12 points for a stumping',  
            '12 points for a direct-hit run-out',  
            '6 points for a run-out assist'  
          ]  
        },  
        captain: 'Captain earns 2x points, Vice-Captain earns 1.5x points'  
      },  
      cricket_rules: {  
        dls: 'Duckworth-Lewis-Stern (DLS) method calculates revised targets in rain-affected matches using remaining overs and wickets as resources. Par score = what chasing team should be at to tie.',  
        powerplay: 'In T20, first 6 overs are powerplay with only 2 fielders outside the 30-yard circle, making it easier to score boundaries.',  
        lbw: 'Leg Before Wicket (LBW): Batter out if ball would have hit stumps but was intercepted by body (except hand holding bat). Must pitch in line or on off-side, impact in line with stumps (unless no shot), and ball hitting stumps.',  
        super_over: 'Tied match is broken by a Super Over: each team gets 1 additional over. Higher score wins. If still tied, another Super Over is played.',  
        extras: 'Wide: 1 run + extra ball. No-ball: 1 run + extra ball. Bye: runs without ball touching bat (no batter credit). Leg bye: runs off batter body (no batter credit).',  
        drs: 'Decision Review System allows teams to challenge umpire decisions using Hawk-Eye ball-tracking and UltraEdge edge detection. Each team gets 1-2 reviews per innings.'  
      }  
    };  
  }  

  /**  
   * Get Dream11 scoring rules as formatted text.  
   */  
  getDream11RulesText() {  
    const kb = this.knowledgeBase || this.getFallbackKnowledgeBase();  
    const ds = kb.dream11_scoring;  

    let text = 'DREAM11 FANTASY POINT SYSTEM:\n\n';  

    // Batting  
    text += 'BATTING:\n';  
    if (ds.batting?.points) {  
      ds.batting.points.forEach(p => {  
        text += `  • ${p}\n`;  
      });  
    } else {  
      text += '  • 1 point per run\n';  
      text += '  • 2 points for a four\n';  
      text += '  • 3 points for a six\n';  
      text += '  • 1 point bonus at 30, 2 at 50, 4 at 100\n';  
      text += '  • Strike rate bonus/penalty if 50+ balls faced\n';  
    }  

    text += '\nBOWLING:\n';  
    if (ds.bowling?.points) {  
      ds.bowling.points.forEach(p => {  
        text += `  • ${p}\n`;  
      });  
    } else {  
      text += '  • 25 points per wicket\n';  
      text += '  • 29 points for caught/bowled/LBW/stumped\n';  
      text += '  • 31 points for caught and bowled\n';  
      text += '  • 4/8/12 points for 3/4/5-wicket haul\n';  
      text += '  • 2 points per maiden over\n';  
      text += '  • Economy bonuses/penalties\n';  
    }  

    text += '\nFIELDING:\n';  
    if (ds.fielding?.points) {  
      ds.fielding.points.forEach(p => {  
        text += `  • ${p}\n`;  
      });  
    } else {  
      text += '  • 6 points for a catch\n';  
      text += '  • 12 points for a stumping\n';  
      text += '  • 12 points for a direct-hit run-out\n';  
      text += '  • 6 points for a run-out assist\n';  
    }  

    text += `\n\n${ds.captain || 'Captain: 2x points | Vice-Captain: 1.5x points'}\n`;  

    return text;  
  }  

  /**  
   * Get cricket rules explanation.  
   */  
  getCricketRulesText(topic = null) {  
    const kb = this.knowledgeBase || this.getFallbackKnowledgeBase();  
    const cr = kb.cricket_rules;  

    if (topic) {  
      const ruleKey = topic.toLowerCase().replace(/\s+/g, '_');  
      const mapping = {  
        'dls': 'dls',  
        'duckworth': 'dls',  
        'powerplay': 'powerplay',  
        'lbw': 'lbw',  
        'leg_before_wicket': 'lbw',  
        'super_over': 'super_over',  
        'super over': 'super_over',  
        'tie_breaker': 'super_over',  
        'extras': 'extras',  
        'wide': 'extras',  
        'noball': 'extras',  
        'bye': 'extras',  
        'legbye': 'extras',  
        'drs': 'drs',  
        'decision_review': 'drs',  
        'review': 'drs'  
      };  
      const actualKey = mapping[ruleKey] || 'dls';  
      return cr[actualKey] || `No explanation available for "${topic}".`;  
    }  

    // Return all rules  
    let text = 'CRICKET RULES GLOSSARY:\n\n';  

    if (cr.dls) {  
      text += `DLS METHOD: ${cr.dls}\n\n`;  
    }  
    if (cr.powerplay) {  
      text += `POWERPLAY (T20): ${cr.powerplay}\n\n`;  
    }  
    if (cr.lbw) {  
      text += `LBW: ${cr.lbw}\n\n`;  
    }  
    if (cr.super_over) {  
      text += `SUPER OVER: ${cr.super_over}\n\n`;  
    }  
    if (cr.extras) {  
      text += `EXTRAS: ${cr.extras}\n\n`;  
    }  
    if (cr.drs) {  
      text += `DRS: ${cr.drs}\n`;  
    }  

    return text;  
  }  

  /**  
   * Probe the same-origin server proxy.  
   */  
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

  /**  
   * Execute REST call to Gemini generateContent endpoint directly from browser.  
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
   * Build the context for AI prompts with 3 layers:  
   * 1. Static knowledge base (Dream11 + cricket rules)  
   * 2. Live match state  
   * 3. User query  
   */  
  async buildContext(matchState, lastNBalls, keyMoments, question = null, history = []) {  
    // Layer 1: Knowledge base  
    const kbText = this.getDream11RulesText();  

    // Layer 2: Match state  
    let matchContext = '';  
    if (typeof matchState === 'string') {  
      matchContext = matchState;  
    } else if (matchState) {  
      matchContext = `${matchState.battingTeam} ${matchState.score}/${matchState.wickets} in ${matchState.oversDisplay} overs (vs ${matchState.bowlingTeam})`;  

      if (matchState.currentBatsmen) {  
        matchContext += `\nBatsmen: ${matchState.currentBatsmen.striker}* / ${matchState.currentBatsmen.nonStriker}*`;  
      }  
      if (matchState.currentBowler) {  
        matchContext += `\nBowler: ${matchState.currentBowler}`;  
      }  
    }  

    // Add batsman stats if available  
    const batsmanStats = (typeof this.getBatsmanStats === 'function') ? this.getBatsmanStats() : {};  
    if (Object.keys(batsmanStats).length > 0) {  
      matchContext += '\nTOP BATTING PERFORMERS:\n';  
      const sortedBatsmen = Object.values(batsmanStats).sort((a, b) => b.runs - a.runs);  
      sortedBatsmen.slice(0, 3).forEach(b => {  
        if (b.runs > 0) {  
          const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : 0;  
          matchContext += `  • ${b.name}: ${b.runs} runs off ${b.balls} balls (${sr} SR), ${b.fours || 0}x4 ${b.sixes || 0}x6${b.isOut ? ' (OUT)' : '*'}\n`;  
        }  
      });  
    }  

    // Add bowler stats if available  
    const bowlerStats = (typeof this.getBowlerStats === 'function') ? this.getBowlerStats() : {};  
    if (Object.keys(bowlerStats).length > 0) {  
      matchContext += '\nBOWLING FIGURES:\n';  
      Object.values(bowlerStats).forEach(b => {  
        if (b.runs > 0 || b.wickets > 0) {  
          matchContext += `  • ${b.name}: ${b.figures}\n`;  
        }  
      });  
    }  

    // Add key moments if available  
    if (keyMoments && keyMoments.length > 0) {  
      matchContext += '\nKEY MOMENTS:\n';  
      keyMoments.slice(-6).forEach((m, i) => {  
        let desc = '';  
        if (m.keyMomentType === 'DRS') {  
          desc = `DRS review - LBW appeal against ${m.batsmanOnStrike}: ${m.keyMomentDetail || 'NOT OUT'}`;  
        } else if (m.keyMomentType === 'dropped_catch') {  
          desc = `Dropped catch - ${m.fielder} dropped ${m.batsmanOnStrike} at slip`;  
        } else {  
          desc = m.keyMomentDetail || m.commentary;  
        }  
        matchContext += `  • Over ${m.overDisplay}: ${desc}\n`;  
      });  
    }  

    // Layer 3: Build the prompt  
    let prompt = `${kbText}\n\n`;  

    // Add cricket rules relevant to the question if it's about rules  
    if (question) {  
      const questionLower = question.toLowerCase();  
      if (questionLower.includes('drs') || questionLower.includes('review') || questionLower.includes('duckworth') || questionLower.includes('lbw') || questionLower.includes('powerplay') || questionLower.includes('super over')) {  
        prompt += this.getCricketRulesText(questionLower) + '\n\n';  
      }  
    }  

    prompt += 'CURRENT MATCH CONTEXT:\n';  
    prompt += matchContext + '\n\n';  

    // Add last 6 balls  
    const balls = Array.isArray(lastNBalls) ? lastNBalls : [];  
    if (balls.length > 0) {  
      prompt += 'RECENT BALLS (last ' + Math.min(balls.length, 6) + '):\n';  
      balls.slice(-6).forEach(b => {  
        let tag = '';  
        if (b.isWicket) tag = ' [WICKET]';  
        else if (b.isSix) tag = ' [SIX]';  
        else if (b.isBoundary) tag = ' [FOUR]';  
        prompt += `  ${b.overDisplay}: ${b.bowler} to ${b.batsmanOnStrike} — ${b.runs} ${b.extraType || ''} runs${tag}\n`;  
        prompt += `    ${b.commentary}\n`;  
      });  
      prompt += '\n';  
    }  

    // Add user query  
    if (question) {  
      prompt += 'USER QUESTION:\n';  
      prompt += `Q: ${question}\n\n`;  
    }  

    // Add conversation history if provided  
    if (history && history.length > 0) {  
      prompt += 'CONVERSATION HISTORY:\n';  
      history.forEach(h => {  
        prompt += `${h.role}: ${h.content}\n`;  
      });  
      prompt += '\n';  
    }  

    // Specific instructions based on question type  
    if (question) {  
      const ql = question.toLowerCase();  

      if (ql.includes('captain') || ql.includes('vice captain') || ql.includes('fantasy') || ql.includes('dream11')) {  
        prompt += `FANTASY TIPS REQUESTED: Based on current match conditions, recommend who should be Captain or Vice-Captain. Consider: batting position, current form (runs scored, strike rate), bowling workload, pitch conditions, and Dream11 scoring system.\n\n`;  
      }  

      if (ql.includes('point') || ql.includes('how many') || ql.includes('worth') || ql.includes('score')) {  
        prompt += `Note: For Dream11 fantasy points, use the scoring system above. Be precise about point values.\n\n`;  
      }  

      if (ql.includes('rule') || ql.includes('how does') || ql.includes('what is') || ql.includes('explain')) {  
        prompt += `If explaining a cricket rule, be clear and concise. Reference the DLS, powerplay, LBW, DRS, or Super Over rules from the knowledge base above as relevant.\n\n`;  
      }  
    }  

    return prompt;  
  }  

  /**  
   * Feature 1: "What Happened?"  
   */  
  async whatHappened(matchState, lastNBalls, keyMoments) {  
    const prompt = await this.buildContext(matchState, lastNBalls, keyMoments, null);  

    const promptText = `${prompt}  
EXPLAIN WHAT JUST HAPPENED in 3-4 sentences. Be conversational and engaging — like explaining to a friend. If there was a key moment (DRS, dropped catch, run out, big wicket), focus on explaining it clearly, including any rules involved. Use cricket terminology but explain it simply.

Don't start with "Sure!" or "Here's what happened". Just dive right in.`;  

    return this.callAI(promptText);  
  }  

  /**  
   * Feature 2: "Catch Me Up"  
   */  
  async catchMeUp(matchSummary, allBalls, keyMoments) {  
    const prompt = await this.buildContext(matchSummary, allBalls, keyMoments, null);  

    const promptText = `${prompt}  
GIVE A 4-5 SENTENCE SUMMARY as if catching up a friend who just sat down. Cover:
1. Who's batting, score, overs
2. Key moments and turning points  
3. Impressive players
4. Current momentum/situation

Be conversational and enthusiastic. Don't start with "Sure!" — just dive in.`;  

    return this.callAI(promptText);  
  }  

  /**  
   * Feature 3: "Ask Anything"  
   */  
  async askAnything(question, matchSummary, allBalls, keyMoments, history = []) {  
    const prompt = await this.buildContext(matchSummary, allBalls, keyMoments, question, history);  

    const promptText = `${prompt}  
ANSWER THE QUESTION based on the match data and your knowledge. Be helpful, accurate, conversational. If about rules, explain simply. If about stats, be precise. If about Dream11, reference the scoring system. If you can't answer, say so.

Keep to 2-4 sentences. Don't start with "Sure!" or "Great question!" — just answer.`;  

    return this.callAI(promptText);  
  }  
}  

// Attach to window for global access  
if (typeof window !== 'undefined') {  
  window.AIAssistant = AIAssistant;  
}
