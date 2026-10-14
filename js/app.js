/**
 * CricIQ — Main App Controller
 * Wires MatchEngine + AIAssistant + DOM into the live simulation experience.
 */

class CricIQApp {
  constructor() {
    this.engine = new MatchEngine(window.MATCH_DATA);
    this.assistant = new AIAssistant();
    this.el = {}; // DOM refs, populated in bindDOM
    this.lastBallOver = -1;
    this.init();
  }

  /* ------------------------------ Lifecycle ------------------------------ */

  init() {
    this.bindDOM();
    this.bindEvents();
    this.updateMatchInfo();
    this.showInitialState();

    // Probe the server proxy first, then decide whether the key modal is needed
    this.assistant.probeServer().then(state => {
      this.applyBackendStatus(state);
      // If the user already saved their own key, never block the UI with the modal
      if (this.assistant.hasApiKey()) {
        this.el['api-key-modal'].classList.add('hidden');
      }
    });
  }

  bindDOM() {
    const ids = [
      'team-score', 'team-overs', 'batsman-strike', 'batsman-nonstrike',
      'bowler-info', 'ball-timeline', 'commentary-feed', 'btn-play-pause',
      'btn-next-ball', 'speed-selector', 'ball-counter', 'btn-what-happened',
      'btn-catch-up', 'btn-ask', 'ask-input-container', 'ask-input',
      'btn-send-ask', 'ai-response', 'ai-loading', 'ai-response-text',
      'api-key-modal', 'api-key-input', 'btn-save-api-key', 'scorecard',
      'ai-card'
    ];
    ids.forEach(id => { this.el[id] = document.getElementById(id); });
  }

  bindEvents() {
    this.el['btn-play-pause'].addEventListener('click', () => {
      this.engine.togglePlayPause();
      this.updatePlaybackControls();
    });

    this.el['btn-next-ball'].addEventListener('click', () => {
      this.engine.nextBall();
      this.updatePlaybackControls();
    });

    this.el['speed-selector'].addEventListener('change', (e) => {
      this.engine.setSpeed(e.target.value);
    });

    this.el['btn-what-happened'].addEventListener('click', () => {
      this.el['ask-input-container'].classList.add('hidden');
      this.handleWhatHappened();
    });

    this.el['btn-catch-up'].addEventListener('click', () => {
      this.el['ask-input-container'].classList.add('hidden');
      this.handleCatchMeUp();
    });

    this.el['btn-ask'].addEventListener('click', () => {
      this.el['ask-input-container'].classList.toggle('hidden');
      if (!this.el['ask-input-container'].classList.contains('hidden')) {
        this.el['ask-input'].focus();
      }
    });

    this.el['btn-send-ask'].addEventListener('click', () => this.handleAskAnything());

    this.el['ask-input'].addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAskAnything();
    });

    this.el['btn-save-api-key'].addEventListener('click', () => {
      const key = this.el['api-key-input'].value.trim();
      if (key) {
        this.assistant.setApiKey(key);
      }
      this.el['api-key-modal'].classList.add('hidden');
      this.showAIMessage('✅ Key saved. AI features are now powered by your Gemini account.');
    });

    // Wire the engine's ball callback
    this.engine.onBallPlayed = (ball, index) => this.onBallPlayed(ball, index);
    this.engine.onMatchEnd = () => this.onMatchEnd();
  }

  applyBackendStatus(state) {
    const chip = document.querySelector('.ai-chip');
    const serverHasKeys = state.serverMode && state.providers &&
      (state.providers.gemini || state.providers.groq);

    if (chip) {
      if (state.serverMode && serverHasKeys) chip.textContent = 'Server AI · live';
      else if (state.serverMode) chip.textContent = 'Server AI · keys missing';
      else chip.textContent = 'Gemini 3.1 Flash Lite · direct';
    }

    const needsModal = state.serverMode
      ? !serverHasKeys && !this.assistant.hasApiKey()
      : !this.assistant.hasApiKey() && !window.CRICIQ_CONFIG?.groq?.defaultApiKey;

    if (needsModal) {
      this.el['api-key-modal'].classList.remove('hidden');
    }
  }

  updateMatchInfo() {
    // Static info lives in index.html; nothing dynamic required for this build.
    this.el['ball-counter'].textContent = `Ball 0 of ${this.engine.totalBalls}`;
  }

  showInitialState() {
    // The commentary feed starts with a ready message baked into index.html.
    this.updatePlaybackControls();
  }

  /* --------------------------- Engine callbacks --------------------------- */

  onBallPlayed(ball, index) {
    this.updateScorecard(ball);
    this.addBallToTimeline(ball, index);
    this.addCommentaryEntry(ball);
    this.updatePlaybackControls();
  }

  onMatchEnd() {
    this.el['btn-next-ball'].disabled = true;
    this.updatePlaybackControls();

    const entry = document.createElement('div');
    entry.className = 'commentary-entry key-moment';
    entry.innerHTML = `
      <div class="commentary-header">
        <span class="over-badge">6.0</span>
        <span class="runs-badge boundary">END</span>
      </div>
      <p class="commentary-text">End of powerplay — CSK ${this.engine.getMatchState().score}/${this.engine.getMatchState().wickets} after 6 overs. Press "⚡ What Happened?" or "📺 Catch Me Up" for the AI take on the session.</p>`;
    this.el['commentary-feed'].prepend(entry);
  }

  /* ------------------------------ UI updates ------------------------------ */

  formatBatsmanLabel(name) {
    const parts = (name || '').trim().split(/\s+/);
    const initial = parts.length > 1 ? parts[0][0] + ' ' : '';
    return initial + parts[parts.length - 1];
  }

  updateScorecard(ball) {
    this.el['team-score'].textContent = `${ball.totalScore}/${ball.totalWickets}`;
    this.el['team-overs'].textContent = `(${ball.overDisplay} ov)`;

    const batsmanStats = this.engine.getBatsmanStats();
    const striker = batsmanStats[ball.batsmanOnStrike];
    const nonStriker = batsmanStats[ball.batsmanNonStrike];

    const fmt = (s, notOut) => {
      if (!s) return '';
      const star = notOut ? '*' : '';
      return `${s.name} ${s.runs}${star} (${s.balls})`;
    };
    this.el['batsman-strike'].innerHTML =
      `<span class="strike-marker">●</span> ${fmt(striker, true)}`;
    this.el['batsman-nonstrike'].textContent = fmt(nonStriker, true);

    const bowlerStats = this.engine.getBowlerStats();
    const b = bowlerStats[ball.bowler];
    this.el['bowler-info'].textContent =
      this.formatBatsmanLabel(ball.bowler) + (b ? ` ${b.figures}` : '');

    // Flash effects
    if (ball.isWicket) {
      this.flashClass(this.el.scorecard, 'wicket-flash');
    } else if (ball.isSix || ball.isBoundary) {
      this.flashClass(this.el.scorecard, 'boundary-flash');
    }
  }

  flashClass(node, cls) {
    node.classList.remove(cls);
    // force reflow so repeated flashes re-animate
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), 600);
  }

  addBallToTimeline(ball, index) {
    // Over separator when a new over starts (and not the very first ball)
    if (ball.over !== this.lastBallOver && index !== 0) {
      const sep = document.createElement('div');
      sep.className = 'over-separator';
      this.el['ball-timeline'].appendChild(sep);
    }
    this.lastBallOver = ball.over;

    const circle = document.createElement('div');
    circle.className = 'ball-circle pop-in ' + this.ballTypeClass(ball);
    circle.textContent = this.ballDisplayText(ball);
    circle.title = `${ball.overDisplay} · ${ball.bowler} to ${ball.batsmanOnStrike}`;
    this.el['ball-timeline'].appendChild(circle);
    this.el['ball-timeline'].scrollLeft = this.el['ball-timeline'].scrollWidth;
  }

  ballTypeClass(ball) {
    if (ball.isWicket) return 'wicket';
    if (ball.extraType) return 'extra';
    if (ball.isSix) return 'six';
    if (ball.isBoundary) return 'boundary';
    if ((ball.batsmanRuns || 0) >= 3) return 'three';
    if (ball.batsmanRuns === 2) return 'two';
    if (ball.batsmanRuns === 1) return 'single';
    return 'dot';
  }

  ballDisplayText(ball) {
    if (ball.isWicket) return 'W';
    if (ball.extraType === 'wide') return 'wd';
    if (ball.extraType === 'noball') return 'nb';
    if (ball.extraType) return String(ball.extras);
    return String(ball.runs);
  }

  addCommentaryEntry(ball) {
    const entry = document.createElement('div');
    entry.className = 'commentary-entry slide-down' + (ball.isKeyMoment ? ' key-moment' : '');

    let runsBadge = '';
    if (ball.isWicket) {
      runsBadge = '<span class="runs-badge wicket">W</span>';
    } else if (ball.isSix) {
      runsBadge = '<span class="runs-badge six">6</span>';
    } else if (ball.isBoundary) {
      runsBadge = '<span class="runs-badge boundary">4</span>';
    } else if (ball.extraType) {
      runsBadge = `<span class="runs-badge extra">${this.ballDisplayText(ball)}</span>`;
    } else {
      runsBadge = `<span class="runs-badge ${this.ballTypeClass(ball)}">${ball.runs}</span>`;
    }

    let html = `
      <div class="commentary-header">
        <span class="over-badge">${ball.overDisplay}</span>
        ${runsBadge}
      </div>
      <p class="commentary-text">${this.escapeHTML(ball.commentary)}</p>`;

    if (ball.isKeyMoment && ball.keyMomentDetail) {
      html += `<p class="key-moment-detail">${this.escapeHTML(ball.keyMomentDetail)}</p>`;
    }

    entry.innerHTML = html;

    const feed = this.el['commentary-feed'];
    // Remove the initial "press play" placeholder once real balls arrive
    const placeholder = feed.querySelector('.commentary-entry:first-child p.commentary-text');
    if (placeholder && placeholder.textContent.startsWith('Match ready to begin')) {
      feed.innerHTML = '';
    }

    feed.prepend(entry);

    while (feed.children.length > 8) {
      feed.removeChild(feed.lastChild);
    }
  }

  escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  updatePlaybackControls() {
    this.el['btn-play-pause'].textContent = this.engine.isPlaying ? '⏸ Pause' : '▶ Play';
    this.el['ball-counter'].textContent =
      `Ball ${this.engine.currentBallIndex + 1} of ${this.engine.totalBalls}`;
    this.el['btn-next-ball'].disabled =
      this.engine.currentBallIndex >= this.engine.totalBalls - 1;
  }

  /* ----------------------------- AI interactions ----------------------------- */

  guardBeforeAI() {
    if (this.engine.currentBallIndex === -1) {
      this.showAIMessage('Start the match first! Press ▶ Play or ⏭ Next Ball before using AI features.');
      return false;
    }
    return true;
  }

  async runAIFeature(fn) {
    this.showAILoading();
    this.disableAIButtons(true);
    try {
      const text = await fn();
      this.showAIResponse(text);
    } catch (error) {
      this.showAIError(error.message);
    } finally {
      this.disableAIButtons(false);
    }
  }

  handleWhatHappened() {
    if (!this.guardBeforeAI()) return;
    const state = this.engine.getMatchState();
    // AI methods are async; keep button handlers non-blocking.
    this.runAIFeature(() =>
      this.assistant.whatHappened(state, this.engine.getLastNBalls(6), this.engine.getKeyMoments())
    );
  }

  handleCatchMeUp() {
    if (!this.guardBeforeAI()) return;
    this.runAIFeature(() =>
      this.assistant.catchMeUp(
        this.engine.getMatchSummary(),
        this.engine.getBallsPlayed(),
        this.engine.getKeyMoments()
      )
    );
  }

  handleAskAnything() {
    const question = this.el['ask-input'].value.trim();
    if (!question) {
      this.el['ask-input'].style.borderColor = 'var(--accent-red)';
      setTimeout(() => { this.el['ask-input'].style.borderColor = ''; }, 1200);
      return;
    }
    if (!this.guardBeforeAI()) return;

    const q = question;
    this.el['ask-input'].value = '';
    this.runAIFeature(() =>
      this.assistant.askAnything(q, this.engine.getMatchSummary(), this.engine.getBallsPlayed(), this.engine.getKeyMoments())
    );
  }

  showAILoading() {
    this.el['ai-loading'].classList.remove('hidden');
    this.el['ai-response-text'].classList.add('hidden');
  }

  showAIResponse(text) {
    this.el['ai-loading'].classList.add('hidden');
    this.el['ai-response-text'].classList.remove('hidden');
    const provider = (this.assistant.getActiveProvider() || '');
    let tag;
    if (provider.startsWith('server:gemini')) tag = 'Gemini (server proxy)';
    else if (provider.startsWith('server:groq')) tag = 'Groq fallback (server proxy)';
    else if (provider === 'server') tag = 'Server proxy';
    else if (provider === 'groq') tag = 'Groq (direct fallback)';
    else tag = 'Gemini ' + this.assistant.model;
    this.el['ai-response-text'].innerHTML =
      `<p>${this.escapeHTML(text)}</p>
       <p class="ai-provider-tag">🤖 ${this.escapeHTML(tag)}</p>`;
  }

  showAIError(message) {
    this.el['ai-loading'].classList.add('hidden');
    this.el['ai-response-text'].classList.remove('hidden');
    this.el['ai-response-text'].innerHTML = `<p class="ai-error">❌ Error: ${this.escapeHTML(message)}</p>`;
  }

  showAIMessage(text) {
    this.el['ai-loading'].classList.add('hidden');
    this.el['ai-response-text'].classList.remove('hidden');
    this.el['ai-response-text'].innerHTML = `<p>${this.escapeHTML(text)}</p>`;
  }

  disableAIButtons(disabled) {
    ['btn-what-happened', 'btn-catch-up', 'btn-ask', 'btn-send-ask'].forEach(id => {
      this.el[id].disabled = disabled;
      this.el[id].style.opacity = disabled ? '0.5' : '';
      this.el[id].style.cursor = disabled ? 'not-allowed' : '';
    });
  }
}

// Boot the app
window.addEventListener('DOMContentLoaded', () => {
  window.cricIQApp = new CricIQApp();
});
