/**
 * CricIQ — Main App Controller
 * Wires MatchEngine + AIAssistant + MatchSwitcher + DOM into the live simulation experience.
 */

class CricIQApp {
  constructor() {
    this.engine = new MatchEngine(window.MATCH_DATA);
    this.assistant = new AIAssistant();
    this.switcher = null;
    this.playbackSpeed = 8000; // matches the default Speed dropdown value
    this.el = {}; // DOM refs, populated in bindDOM
    this.lastBallOver = -1;
    this.matchInfo = {
      team1: 'CSK',
      team2: 'MI',
      venue: 'Wankhede Stadium, Mumbai',
      date: 'May 26, 2024',
      type: 'IPL 2024 · Qualifier 1',
      toss: 'CSK won the toss and elected to bat first'
    };
    this.init();
  }

  /* ------------------------------ Lifecycle ------------------------------ */

  init() {
    this.bindDOM();
    this.bindEvents();

    // Engine ↔ app wiring lives here so playbook callbacks are always bound.
    this.engine.onBallPlayed = (ball, index) => this.onBallPlayed(ball, index);
    this.engine.onMatchEnd = () => this.onMatchEnd();
    this.engine.setSpeed(this.playbackSpeed);

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

    this.bindThemeToggle();
    this.applyThemeFromPref();
  }

  bindDOM() {
    const ids = [
      'team-score', 'team-overs', 'batsman-strike', 'batsman-nonstrike',
      'bowler-info', 'ball-timeline', 'commentary-feed', 'btn-play-pause',
      'btn-next-ball', 'speed-selector', 'ball-counter', 'btn-what-happened',
      'btn-catch-up', 'btn-ask', 'ask-input-container', 'ask-input',
      'btn-send-ask', 'ai-response', 'ai-loading', 'ai-response-text',
      'api-key-modal', 'api-key-input', 'btn-save-api-key', 'scorecard',
      'ai-card', 'theme-toggle', 'theme-toggle-icon', 'play-icon', 'play-label',
      'ai-spinner'
    ];
    ids.forEach(id => { this.el[id] = document.getElementById(id); });
    // .scorecard-card has no id attribute in the markup — grab it by class so
    // boundary/wicket flash effects and live updates still target the right card.
    if (!this.el.scorecard) {
      this.el.scorecard = document.querySelector('.scorecard-card');
    }
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
      this.showAIMessage(`Speed updated: one update every ${Number(e.target.value) / 1000}s${this.engine.getMode && this.engine.getMode() === 'live' ? ' (live polling)' : ''}.`);
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

    const closeModal = () => this.el['api-key-modal'].classList.add('hidden');
    const closeBtn = document.getElementById('btn-close-modal');
    const dismissBtn = document.getElementById('btn-dismiss-api-key');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (dismissBtn) dismissBtn.addEventListener('click', closeModal);

    // Timeline over navigation (prev/next over scrolling)
    const prevOverBtn = document.getElementById('btn-prev-over');
    const nextOverBtn = document.getElementById('btn-next-over');
    const scrollWrapper = document.querySelector('.timeline-scroll-wrapper');

    if (prevOverBtn && scrollWrapper) {
      prevOverBtn.addEventListener('click', () => {
        scrollWrapper.scrollBy({ left: -190, behavior: 'smooth' });
        setTimeout(() => this.updateTimelineNavButtons(), 300);
      });
    }

    if (nextOverBtn && scrollWrapper) {
      nextOverBtn.addEventListener('click', () => {
        scrollWrapper.scrollBy({ left: 190, behavior: 'smooth' });
        setTimeout(() => this.updateTimelineNavButtons(), 300);
      });
    }

    if (scrollWrapper) {
      scrollWrapper.addEventListener('scroll', () => {
        this.updateTimelineNavButtons();
      }, { passive: true });
    }

    this.el['btn-save-api-key'].addEventListener('click', () => {
      const key = this.el['api-key-input'].value.trim();
      if (key) {
        this.assistant.setApiKey(key);
        this.showAIMessage('Key saved successfully. AI features are now powered by your Gemini account.');
      }
      closeModal();
    });

    // Wire the engine's ball callback
    this.engine.onBallPlayed = (ball, index) => this.onBallPlayed(ball, index);
    this.engine.onMatchEnd = () => this.onMatchEnd();
  }

  bindThemeToggle() {
    this.el['theme-toggle'].addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      this.currentTheme = next;
      this.syncThemeIcon(next);
      try { localStorage.setItem('criciq-theme', next); } catch (e) {}
    });
  }

  applyThemeFromPref() {
    let pref = 'light';
    try { pref = localStorage.getItem('criciq-theme') || 'light'; } catch (e) {}
    if (!['light', 'dark'].includes(pref)) pref = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', pref);
    this.currentTheme = pref;
    this.syncThemeIcon(pref);
  }

  syncThemeIcon(theme) {
    const icon = this.el['theme-toggle-icon'];
    if (!icon) return;
    if (theme === 'dark') {
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-label', 'Switch to light mode');
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    } else {
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-label', 'Switch to dark mode');
      icon.innerHTML = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>';
    }
  }

  applyBackendStatus(state) {
    const chip = document.querySelector('.ai-chip');
    const serverHasKeys = state.serverMode && state.providers &&
      (state.providers.gemini || state.providers.groq);

    if (chip) {
      if (state.serverMode && serverHasKeys) chip.textContent = 'Server AI · live';
      else if (state.serverMode) chip.textContent = 'Server AI · active';
      else if (this.assistant.hasApiKey()) chip.textContent = 'Gemini · direct';
      else chip.textContent = 'AI companion';
    }

    // Do NOT aggressively block the user screen with modal if running on server or if user dismissed
    const hasLocalKey = this.assistant.hasApiKey() || window.CRICIQ_CONFIG?.gemini?.defaultApiKey || window.CRICIQ_CONFIG?.groq?.defaultApiKey;
    const dismissed = sessionStorage.getItem('criciq-modal-dismissed');
    
    // Only show modal if completely offline direct mode without keys and not dismissed yet
    if (!state.serverMode && !hasLocalKey && !dismissed) {
      // Don't auto pop-up on first load to keep UI clean and immediate; user can access or AI will prompt when clicked
      sessionStorage.setItem('criciq-modal-dismissed', 'true');
    }
  }

  updateMatchInfo() {
    // Update match info from engine state (demo meta, or live placeholder meta)
    const meta = this.engine.getMatchMeta();
    if (meta.team1) {
      this.matchInfo.team1 = meta.team1.short || meta.team1; 
    }
    if (meta.team2) {
      this.matchInfo.team2 = meta.team2.short || meta.team2;
    }
    if (meta.venue) {
      this.matchInfo.venue = meta.venue;
    }
    if (meta.date) {
      this.matchInfo.date = meta.date;
    }
    if (meta.type) {
      this.matchInfo.type = meta.type;
    }
    if (meta.toss) {
      this.matchInfo.toss = meta.toss;
    }

    // Only overwrite the header block when the meta actually carries values.
    if (meta.team1) {
      const tag = document.querySelector('.csk-tag');
      if (tag) tag.textContent = meta.team1.short || meta.team1.name || meta.team1;
    }

    // Update DOM
    const metaPrimary = document.querySelector('.match-meta-primary');
    const metaSecondary = document.querySelector('.match-meta-secondary');
    const tossText = document.querySelector('.toss-text');
    
    if (metaPrimary) {
      metaPrimary.textContent = `${this.matchInfo.venue} · ${this.matchInfo.date}`;
    }
    if (metaSecondary) {
      metaSecondary.textContent = this.matchInfo.type;
    }
    if (tossText) {
      tossText.textContent = this.matchInfo.toss;
    }

    this.el['ball-counter'].textContent = `Ball 0 of ${this.engine.totalBalls || 37}`;
  }

  showInitialState() {
    // The commentary feed starts with a ready message baked into index.html.
    this.updatePlaybackControls();
  }

  /* --------------------------- Engine callbacks --------------------------- */

  onBallPlayed(ball, index) {
    // Live mode pushes a whole state object instead of a scripted ball.
    if (this.engine.getMode && this.engine.getMode() === 'live') {
      this.updateLiveScorecard(ball);
      return;
    }
    this.updateScorecard(ball);
    this.addBallToTimeline(ball, index);
    this.addCommentaryEntry(ball);
    this.updatePlaybackControls();
  }

  updateLiveScorecard(state) {
    if (!state || state.awaitingData) {
      this.el['team-score'].textContent = '–/–';
      this.el['team-overs'].textContent = '(awaiting feed)';
      return;
    }

    const short = (name) => this.getTeamShort_(name);
    this.el['team-score'].textContent = `${state.runs}/${state.wickets}`;
    this.el['team-overs'].textContent = `(${state.overs} ov)`;
    document.querySelector('.team-name.csk-tag').textContent = short(state.battingTeam);
    this.engine.battingTeamLabel = short(state.battingTeam);

    const bm = (state.batsmen || []);
    const fmt = (b) => b ? `${this.formatBatsmanLabel(b.name)} ${b.runs}${b.notOut ? '*' : ''} (${b.balls})` : '–';
    this.el['batsman-strike'].innerHTML =
      `<span class="strike-marker">●</span> ${fmt(bm[0])}`;
    this.el['batsman-nonstrike'].textContent = fmt(bm[1] || null);

    const b = state.bowler;
    this.el['bowler-info'].textContent =
      b ? `${this.formatBatsmanLabel(b.name)} ${b.overs}-${b.wickets}-${b.runs}` : 'Awaiting bowler data';

    if (this.engine.lastLiveState && this.engine.lastLiveState.runs !== undefined &&
        state.runs > this.engine.lastLiveState.runs) {
      this.flashClass(this.el.scorecard, 'boundary-flash');
    }
    if (this.engine.lastLiveState && this.engine.lastLiveState.wickets !== undefined &&
        state.wickets > this.engine.lastLiveState.wickets) {
      this.flashClass(this.el.scorecard, 'wicket-flash');
    }
    this.engine.lastLiveState = state;

    this.el['ball-counter'].textContent = `Live · updated ${new Date(state.lastUpdated || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    this.updatePlaybackControls();
  }

  getTeamShort_(name) {
    if (!name) return '?';
    const known = this.switcher && this.switcher.getTeamShort ? this.switcher : null;
    return known ? known.getTeamShort(name) : name.slice(0, 3).toUpperCase();
  }

  /**
   * Called by MatchSwitcher when the user picks another match. Resets all panels.
   */
  onMatchSwitched({ mode, matchId }) {
    // Stop old visuals.
    this.el['ball-timeline'].innerHTML = '';
    this.el['commentary-feed'].innerHTML = '';
    this.lastBallOver = -1;
    this.engine.lastLiveState = null;
    const overBadge = document.getElementById('current-over-badge');
    if (overBadge) overBadge.textContent = 'Over 1';
    this.updateTimelineNavButtons();

    // New commentary placeholder.
    const entry = document.createElement('div');
    entry.className = 'commentary-entry';
    entry.innerHTML = `
      <div class="commentary-header">
        <span class="over-badge">${mode === 'live' ? 'API' : '0.0'}</span>
        <span class="runs-badge dot">0</span>
      </div>
      <p class="commentary-text">${mode === 'live'
        ? 'Connecting to the live CricAPI feed — first update arriving… Press <strong>Pause</strong> anytime to freeze polling.'
        : 'Simulated powerplay ready. Press <strong>Play</strong> to start.'}</p>`;
    this.el['commentary-feed'].appendChild(entry);

    this.el['btn-next-ball'].disabled = false;
    this.el['team-score'].textContent = mode === 'live' ? '–/–' : '0/0';
    this.el['team-overs'].textContent = mode === 'live' ? '(awaiting feed)' : '(0.0 ov)';

    if (mode === 'live') {
      document.querySelector('.score-status-label').textContent = 'LIVE';
    } else {
      document.querySelector('.score-status-label').textContent = 'Powerplay';
      document.querySelector('.team-name.csk-tag').textContent = this.matchInfo.team1 || 'CSK';
      this.el['batsman-strike'].innerHTML = '<span class="strike-marker">●</span> ';
      this.el['batsman-nonstrike'].textContent = '';
      this.el['bowler-info'].textContent = '';
    }

    this.updateMatchInfo();
    this.updatePlaybackControls();

    // Live mode auto-starts polling (that IS liveness); demo stays paused until Play.
    if (mode !== 'live') {
      this.showAIMessage('Demo match selected. Press Play to simulate the powerplay.');
    }
  }

  onMatchEnd() {
    if (this.engine.getMode && this.engine.getMode() === 'live') {
      const st = this.engine.getMatchState();
      this.el['btn-next-ball'].disabled = true;
      this.el['btn-play-pause'].disabled = true;
      const entry = document.createElement('div');
      entry.className = 'commentary-entry key-moment';
      entry.innerHTML = `
        <div class="commentary-header">
          <span class="over-badge">END</span>
          <span class="runs-badge boundary">🏁</span>
        </div>
        <p class="commentary-text">Match over — ${st.battingTeam || ''} ${st.runs}/${st.wickets} (${st.overs}). ${st.statusText || ''}</p>`;
      this.el['commentary-feed'].prepend(entry);
      return;
    }

    this.el['btn-next-ball'].disabled = true;
    this.updatePlaybackControls();

    const entry = document.createElement('div');
    entry.className = 'commentary-entry key-moment';
    entry.innerHTML = `
      <div class="commentary-header">
        <span class="over-badge">6.0</span>
        <span class="runs-badge boundary">END</span>
      </div>
      <p class="commentary-text">End of powerplay — CSK ${this.engine.getMatchState().score}/${this.engine.getMatchState().wickets} after 6 overs. Select "What happened" or "Catch me up" for instant AI analysis.</p>`;
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
    if (!node) return;
    node.classList.remove(cls);
    // force reflow so repeated flashes re-animate
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), 600);
  }

  addBallToTimeline(ball, index) {
    const timeline = this.el['ball-timeline'];
    if (!timeline) return;

    // Identify which over bucket (e.g. over 0, over 1, ...)
    const overNum = ball.over !== undefined ? ball.over : Math.floor(index / 6);
    let overGroup = document.getElementById(`over-group-${overNum}`);

    if (!overGroup) {
      overGroup = document.createElement('div');
      overGroup.id = `over-group-${overNum}`;
      overGroup.className = 'over-group';
      overGroup.dataset.over = overNum;

      const label = document.createElement('span');
      label.className = 'over-group-label';
      label.textContent = `Ov ${overNum + 1}`;
      overGroup.appendChild(label);

      timeline.appendChild(overGroup);
    }

    // Mark previous groups inactive and highlight the latest active over
    timeline.querySelectorAll('.over-group').forEach(g => g.classList.remove('active-over'));
    overGroup.classList.add('active-over');

    // Update the over badge in the header
    const overBadge = document.getElementById('current-over-badge');
    if (overBadge) {
      overBadge.textContent = `Over ${overNum + 1}`;
    }

    const circle = document.createElement('div');
    circle.className = 'ball-circle pop-in ' + this.ballTypeClass(ball);
    circle.textContent = this.ballDisplayText(ball);
    circle.title = `${ball.overDisplay} · ${ball.bowler} to ${ball.batsmanOnStrike}`;
    overGroup.appendChild(circle);

    // Smoothly scroll the container to bring the active over into focus
    const wrapper = document.querySelector('.timeline-scroll-wrapper');
    if (wrapper) {
      wrapper.scrollTo({
        left: overGroup.offsetLeft - 16,
        behavior: 'smooth'
      });
    }
    this.updateTimelineNavButtons();
  }

  updateTimelineNavButtons() {
    const wrapper = document.querySelector('.timeline-scroll-wrapper');
    const prevBtn = document.getElementById('btn-prev-over');
    const nextBtn = document.getElementById('btn-next-over');
    if (!wrapper || !prevBtn || !nextBtn) return;

    prevBtn.disabled = wrapper.scrollLeft <= 5;
    nextBtn.disabled = wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 5;
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
    const isPlaying = Boolean(this.engine.isPlaying);
    this.el['btn-play-pause'].classList.toggle('btn-primary', !isPlaying);
    this.el['btn-play-pause'].classList.toggle('btn-ghost', isPlaying);
    this.syncPlayIcon(isPlaying);

    const live = this.engine.getMode && this.engine.getMode() === 'live';
    if (live) {
      // No scripted ball counter in live mode; polling cadence is the story.
      this.el['ball-counter'].textContent = this.el['ball-counter'].textContent.startsWith('Live')
        ? this.el['ball-counter'].textContent
        : 'Live feed';
    } else {
      this.el['ball-counter'].textContent =
        `Ball ${Math.max(this.engine.currentBallIndex + 1, 0)} of ${this.engine.totalBalls}`;
    }

    if (live) {
      // Nudge refetch while paused so users can "refresh" manually.
      this.el['btn-next-ball'].disabled = false;
    } else {
      this.el['btn-next-ball'].disabled =
        this.engine.currentBallIndex >= this.engine.totalBalls - 1;
    }
  }

  syncPlayIcon(isPlaying) {
    const icon = this.el['play-icon'];
    if (!icon) return;
    const label = this.el['play-label'];
    if (isPlaying) {
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      if (label) label.textContent = 'Pause';
    } else {
      icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      if (label) label.textContent = 'Play';
    }
  }

  /* ----------------------------- AI interactions ----------------------------- */

  guardBeforeAI() {
    if (this.engine.currentBallIndex === -1) {
      this.showAIMessage('Start the match first. Press Play or Next ball before using AI features.');
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
    
    // Pass conversation history if available
    const history = this.assistant.conversationHistory || [];
    this.runAIFeature(async () => {
      const response = await this.assistant.askAnything(q, this.engine.getMatchSummary(), this.engine.getBallsPlayed(), this.engine.getKeyMoments(), history);
      // Save to history
      if (!this.assistant.conversationHistory) {
        this.assistant.conversationHistory = [];
      }
      this.assistant.conversationHistory.push({ role: 'user', content: q });
      this.assistant.conversationHistory.push({ role: 'assistant', content: response });
      // Keep last 10 messages
      if (this.assistant.conversationHistory.length > 10) {
        this.assistant.conversationHistory = this.assistant.conversationHistory.slice(-10);
      }
      return response;
    });
  }

  showAILoading() {      this.el['ai-loading'].classList.remove('hidden');
      this.el['ai-response-text'].classList.add('hidden');
      const spinner = this.el['ai-spinner'];
      if (spinner) {
        spinner.style.animation = 'none';
        void spinner.offsetWidth;
        spinner.style.animation = 'spin 0.8s linear infinite';
      }
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
       <p class="ai-provider-tag"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M8 15h8"/></svg>${this.escapeHTML(tag)}</p>`;
  }

  showAIError(message) {
    this.el['ai-loading'].classList.add('hidden');
    this.el['ai-response-text'].classList.remove('hidden');
    this.el['ai-response-text'].innerHTML = `<p class="ai-error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Error: ${this.escapeHTML(message)}</p>`;
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
  const app = new CricIQApp();
  window.cricIQApp = app;
  
  // Initialize match switcher
  if (typeof window.MatchSwitcher !== 'undefined') {
    app.switcher = new MatchSwitcher(app);
    app.switcher.bindDOM();
    app.switcher.fetchMatches();
  }

  // Update match info periodically for live mode
  setInterval(() => {
    if (app.switcher && app.switcher.matches.live.length > 0) {
      app.switcher.fetchMatches();
    }
  }, 10000); // Every 10 seconds
});
