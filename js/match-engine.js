/**  
 * CricIQ — Match Engine with Dual-Mode Ingestion  
 * Supports both Simulated (demo) and Live (API polling) match data sources.  
 */  

// ----------------------------- Match Provider Interface -----------------------------  

/**  
 * Base interface for match data providers.  
 * Both SimulatedProvider and LivePollingProvider implement this interface.  
 */  
class MatchProvider {  
  /**  
   * Returns true if this provider has live data ready.  
   */  
  hasLiveData() {  
    return false;  
  }  

  /**  
   * Starts the data flow (simulated playback or live polling).  
   * @param {Function} onBallPlayed - Callback(ball, index)  
   * @param {Function} onMatchEnd - Callback()  
   */  
  start(onBallPlayed, onMatchEnd) {  
    throw new Error('start() must be implemented by subclass');  
  }  

  /**  
   * Stops the data flow.  
   */  
  stop() {  
    throw new Error('stop() must be implemented by subclass');  
  }  

  /**  
   * Advances to next delivery (for demo mode).  
   * @returns {Object|null} The ball played or null if at end  
   */  
  nextDelivery() {  
    throw new Error('nextDelivery() must be implemented by subclass');  
  }  

  /**  
   * Returns the total number of deliveries in the match.  
   * @returns {number}  
   */  
  getTotalDeliveries() {  
    return 0;  
  }  

  /**  
   * Returns the current delivery index.  
   * @returns {number}  
   */  
  getCurrentIndex() {  
    return -1;  
  }  

  /**  
   * Returns the current match state.  
   * @returns {Object}  
   */  
  getMatchState() {  
    throw new Error('getMatchState() must be implemented by subclass');  
  }  

  /**  
   * Returns the match metadata.  
   * @returns {Object}  
   */  
  getMatchMeta() {  
    throw new Error('getMatchMeta() must be implemented by subclass');  
  }  

  /**  
   * Returns balls played so far.  
   * @returns {Array<Object>}  
   */  
  getBallsPlayed() {  
    return [];  
  }  

  /**  
   * Returns last N balls.  
   * @param {number} n  
   * @returns {Array<Object>}  
   */  
  getLastNBalls(n = 6) {  
    const played = this.getBallsPlayed();  
    return played.slice(-n);  
  }  

  /**  
   * Returns key moments from balls played.  
   * @returns {Array<Object>}  
   */  
  getKeyMoments() {  
    return this.getBallsPlayed().filter(ball => Boolean(ball.isKeyMoment));  
  }  

  /**  
   * Returns formatted commentary log.  
   * @returns {String}  
   */  
  getCommentaryLog() {  
    return this.getBallsPlayed()  
      .map(b => `${b.overDisplay}: ${b.commentary}`)  
      .join('\n');  
  }  

  /**  
   * Returns batsman stats map.  
   * @returns {Object}  
   */  
  getBatsmanStats() {  
    throw new Error('getBatsmanStats() must be implemented by subclass');  
  }  

  /**  
   * Returns bowler figures map.  
   * @returns {Object}  
   */  
  getBowlerStats() {  
    throw new Error('getBowlerStats() must be implemented by subclass');  
  }  

  /**  
   * Returns match summary text.  
   * @returns {String}  
   */  
  getMatchSummary() {  
    throw new Error('getMatchSummary() must be implemented by subclass');  
  }  
}  

// ----------------------------- Simulated Provider -----------------------------  

/**  
 * SimulatedProvider: Uses scripted match data from match-data.js  
 * with interval-based auto-advancement playback.  
 */  
class SimulatedProvider extends MatchProvider {  
  /**  
   * @param {Object} matchData - The MATCH_DATA global object  
   */  
  constructor(matchData) {  
    super();  
    this.matchData = matchData;  
    this.balls = (matchData && matchData.innings && matchData.innings[0] && matchData.innings[0].balls)  
      ? matchData.innings[0].balls  
      : [];  
    this.totalBalls = this.balls.length;  
    this.currentBallIndex = -1;  
    this.isPlaying = false;  
    this.playbackInterval = null;  
    this.playbackSpeed = 8000; // ms between balls  
    this.onBallPlayed = null;  
    this.onMatchEnd = null;  
  }  

  /**  
   * Check if this provider has data (always true for demo).  
   */  
  hasLiveData() {  
    return this.balls.length > 0;  
  }  

  /**  
   * Start auto-advancing balls.  
   */  
  start(onBallPlayed, onMatchEnd) {  
    this.onBallPlayed = onBallPlayed;  
    this.onMatchEnd = onMatchEnd;  

    if (this.currentBallIndex >= this.totalBalls - 1) {  
      if (typeof onMatchEnd === 'function') {  
        onMatchEnd();  
      }  
      return;  
    }  

    this.isPlaying = true;  
    this.playbackInterval = setInterval(() => {  
      this.nextDelivery();  
    }, this.playbackSpeed);  
  }  

  /**  
   * Stop auto-advancing.  
   */  
  stop() {  
    if (this.playbackInterval) {  
      clearInterval(this.playbackInterval);  
      this.playbackInterval = null;  
    }  
    this.isPlaying = false;  
  }  

  /**  
   * Advance simulation by one ball.  
   * @returns {Object|null}  
   */  
  nextDelivery() {  
    if (this.currentBallIndex >= this.totalBalls - 1) {  
      this.stop();  
      if (typeof this.onMatchEnd === 'function') {  
        this.onMatchEnd();  
      }  
      return null;  
    }  

    this.currentBallIndex++;  
    const ball = this.balls[this.currentBallIndex];  

    if (typeof this.onBallPlayed === 'function') {  
      this.onBallPlayed(ball, this.currentBallIndex);  
    }  

    if (this.currentBallIndex >= this.totalBalls - 1) {  
      this.stop();  
      if (typeof this.onMatchEnd === 'function') {  
        this.onMatchEnd();  
      }  
    }  

    return ball;  
  }  

  /**  
   * Update playback speed.  
   * @param {number} ms  
   */  
  setSpeed(ms) {  
    const speed = Number(ms) || 8000;  
    this.playbackSpeed = speed;  

    if (this.isPlaying) {  
      this.stop();  
      this.start(this.onBallPlayed, this.onMatchEnd);  
    }  
  }  

  /**  
   * Toggle play/pause.  
   */  
  togglePlayPause() {  
    if (this.isPlaying) {  
      this.stop();  
    } else {  
      this.start(this.onBallPlayed, this.onMatchEnd);  
    }  
  }  /**
   * Legal deliveries bowled so far. Overs must be derived from this, not from the
   * last ball's label: after the sixth legal ball the label still reads "0.6",
   * but the scorecard has to say "1.0" (that is how cricket scores are written).
   */
  getLegalBallsPlayed() {
    let legal = 0;
    for (const b of this.getBallsPlayed()) {
      if (b.extraType !== 'wide' && b.extraType !== 'noball') legal += 1;
    }
    return legal;
  }

  /**
   * Overs as a scorecard string (legalBalls / 6, remainder as the decimal part).
   */
  getOversDisplay() {
    const legal = this.getLegalBallsPlayed();
    return `${Math.floor(legal / 6)}.${legal % 6}`;
  }

  /**
   * Deliveries from the start of the innings up to and including `index`.
   * Everything the UI or the AI can say about ball N is built from this slice,
   * which is what makes "What just happened" work on an earlier ball without
   * leaking anything that came after it.
   */
  getBallsUpTo(index) {
    if (index === undefined || index < 0) return [];
    const last = Math.min(Math.round(index), this.totalBalls - 1);
    return this.balls.slice(0, last + 1);
  }

  /** Legal deliveries inside getBallsUpTo(index). */
  getLegalBallsUpTo(index) {
    let legal = 0;
    for (const b of this.getBallsUpTo(index)) {
      if (b.extraType !== 'wide' && b.extraType !== 'noball') legal += 1;
    }
    return legal;
  }

  /** Overs string for an arbitrary position (legalBalls / 6). */
  formatOvers(legalBalls) {
    return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  }

  /**
   * Deterministic state at any delivery index. Used for scrubbing and for
   * answering questions about a past ball.
   */
  getStateAtIndex(index) {
    const innings = (this.matchData && this.matchData.innings && this.matchData.innings[0]) || {};
    const battingTeam = innings.battingTeam || "CSK";
    const bowlingTeam = innings.bowlingTeam || "MI";

    if (index === undefined || index < 0) {
      return {
        score: 0,
        wickets: 0,
        oversDisplay: "0.0",
        battingTeam,
        bowlingTeam,
        currentBatsmen: { striker: null, nonStriker: null },
        currentBowler: null,
        ballsPlayed: 0,
        ballIndex: -1,
        isLive: false,
        isDemo: true
      };
    }

    const bounded = Math.min(Math.round(index), this.totalBalls - 1);
    const ball = this.balls[bounded];
    return {
      score: ball.totalScore,
      wickets: ball.totalWickets,
      oversDisplay: this.formatOvers(this.getLegalBallsUpTo(bounded)),
      battingTeam,
      bowlingTeam,
      currentBatsmen: {
        striker: ball.batsmanOnStrike,
        nonStriker: ball.batsmanNonStrike
      },
      currentBowler: ball.bowler,
      ballsPlayed: bounded + 1,
      ballIndex: bounded,
      isLive: false,
      isDemo: true
    };
  }

  /**  
   * Get current match state.  
   */  
  getMatchState() {  
    return this.getStateAtIndex(this.currentBallIndex);
  }

  /**  
   * Upgrade the demo engine: rewind to ball 0 and stop any active playback.  
   */  
  reset() {  
    this.stop();  
    this.currentBallIndex = -1;  
  }  

  /**  
   * Get match metadata.  
   */  
  getMatchMeta() {  
    return this.matchData && this.matchData.match ? this.matchData.match : {};  
  }  

  /**  
   * Get all balls played so far.  
   */  
  getBallsPlayed() {  
    if (this.currentBallIndex < 0) return [];  
    return this.balls.slice(0, this.currentBallIndex + 1);  
  }  

  /**  
   * Get batsman stats.  
   */  
  getBatsmanStats(index) {  
    const stats = {};  
    const played = index === undefined ? this.getBallsPlayed() : this.getBallsUpTo(index);  

    for (const b of played) {  
      if (b.batsmanOnStrike && !stats[b.batsmanOnStrike]) {  
        stats[b.batsmanOnStrike] = {  
          name: b.batsmanOnStrike,  
          runs: 0,  
          balls: 0,  
          fours: 0,  
          sixes: 0,  
          isOut: false,  
          dismissal: null  
        };  
      }  
      if (b.batsmanNonStrike && !stats[b.batsmanNonStrike]) {  
        stats[b.batsmanNonStrike] = {  
          name: b.batsmanNonStrike,  
          runs: 0,  
          balls: 0,  
          fours: 0,  
          sixes: 0,  
          isOut: false,  
          dismissal: null  
        };  
      }  

      if (b.batsmanOnStrike) {  
        stats[b.batsmanOnStrike].runs += (b.batsmanRuns || 0);  
        if (b.extraType !== 'wide') {  
          stats[b.batsmanOnStrike].balls += 1;  
        }  
        if (b.isBoundary || b.batsmanRuns === 4) {  
          stats[b.batsmanOnStrike].fours += 1;  
        }  
        if (b.isSix || b.batsmanRuns === 6) {  
          stats[b.batsmanOnStrike].sixes += 1;  
        }  
      }  

      if (b.isWicket && b.dismissedBatsman) {  
        if (!stats[b.dismissedBatsman]) {  
          stats[b.dismissedBatsman] = {  
            name: b.dismissedBatsman,  
            runs: 0,  
            balls: 0,  
            fours: 0,  
            sixes: 0,  
            isOut: false,  
            dismissal: null  
          };  
        }  
        stats[b.dismissedBatsman].isOut = true;  
        stats[b.dismissedBatsman].dismissal = {  
          type: b.wicketType,  
          bowler: b.bowler,  
          fielder: b.fielder,  
          overDisplay: b.overDisplay  
        };  
      }  
    }  

    return stats;  
  }  

  /**  
   * Get bowler figures.  
   */  
  getBowlerStats(index) {  
    const stats = {};  
    const played = index === undefined ? this.getBallsPlayed() : this.getBallsUpTo(index);  
    const bowlerOvers = {};  

    for (const b of played) {  
      if (!b.bowler) continue;  

      if (!stats[b.bowler]) {  
        stats[b.bowler] = {  
          name: b.bowler,  
          legalBalls: 0,  
          runs: 0,  
          wickets: 0,  
          maidens: 0,  
          overs: "0.0",  
          figures: "0-0-0-0"  
        };  
      }  

      const overKey = `${b.bowler}_${b.over}`;  
      if (!bowlerOvers[overKey]) {  
        bowlerOvers[overKey] = { legalBalls: 0, runs: 0 };  
      }  

      const isLegal = b.extraType !== 'wide' && b.extraType !== 'noball';  
      if (isLegal) {  
        stats[b.bowler].legalBalls += 1;  
        bowlerOvers[overKey].legalBalls += 1;  
      }  

      const runsConceded = (b.extraType === 'bye' || b.extraType === 'legbye') ? 0 : (b.runs || 0);  
      stats[b.bowler].runs += runsConceded;  
      bowlerOvers[overKey].runs += runsConceded;  

      if (b.isWicket && b.wicketType !== 'run_out') {  
        stats[b.bowler].wickets += 1;  
      }  
    }  

    for (const key in bowlerOvers) {  
      const o = bowlerOvers[key];  
      const bowlerName = key.substring(0, key.lastIndexOf('_'));  
      if (o.legalBalls === 6 && o.runs === 0) {  
        if (stats[bowlerName]) {  
          stats[bowlerName].maidens += 1;  
        }  
      }  
    }  

    for (const name in stats) {  
      const b = stats[name];  
      const fullOvers = Math.floor(b.legalBalls / 6);  
      const partBalls = b.legalBalls % 6;  
      b.overs = partBalls === 0 ? `${fullOvers}.0` : `${fullOvers}.${partBalls}`;  
      const overDisplayFig = partBalls === 0 ? `${fullOvers}` : `${fullOvers}.${partBalls}`;  
      b.figures = `${overDisplayFig}-${b.maidens}-${b.runs}-${b.wickets}`;  
    }  

    return stats;  
  }  

  /**  
   * Get match summary.  
   */  
  getMatchSummary() {  
    const match = (this.matchData && this.matchData.match) || {  
      team1: { name: "Chennai Super Kings", short: "CSK" },  
      team2: { name: "Mumbai Indians", short: "MI" },  
      venue: "Wankhede Stadium, Mumbai",  
      type: "IPL 2024 · Qualifier 1",  
      toss: "CSK won the toss and elected to bat first"  
    };  

    if (this.currentBallIndex === -1) {  
      return `Match: ${match.team1.short} vs ${match.team2.short} — ${match.type} at ${match.venue}\nMatch has not started yet. Toss: ${match.toss}.`;  
    }  

    const latestBall = this.balls[this.currentBallIndex];  
    const innings = (this.matchData && this.matchData.innings && this.matchData.innings[0]) || { battingTeam: "CSK" };  
    const batsmanStats = this.getBatsmanStats();  
    const bowlerStats = this.getBowlerStats();  

    const score = latestBall.totalScore;  
    const wickets = latestBall.totalWickets;  
    const oversDisplay = this.getOversDisplay();  

    const formatBoundaries = (fours, sixes) => {  
      const parts = [];  
      if (fours > 0) parts.push(`${fours} four${fours > 1 ? 's' : ''}`);  
      if (sixes > 0) parts.push(`${sixes} six${sixes > 1 ? 'es' : ''}`);  
      return parts.length > 0 ? ` — ${parts.join(', ')}` : '';  
    };  

    const strikerName = latestBall.batsmanOnStrike;  
    const nonStrikerName = latestBall.batsmanNonStrike;  

    const striker = batsmanStats[strikerName] || { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };  
    const nonStriker = batsmanStats[nonStrikerName] || { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };  

    const strikerAsterisk = striker.isOut ? '' : '*';  
    const nonStrikerAsterisk = nonStriker.isOut ? '' : '*';  

    const strikerLine = `• ${strikerName} ${striker.runs}${strikerAsterisk} (${striker.balls} balls)${formatBoundaries(striker.fours, striker.sixes)}`;  
    const nonStrikerLine = `• ${nonStrikerName} ${nonStriker.runs}${nonStrikerAsterisk} (${nonStriker.balls} balls)${formatBoundaries(nonStriker.fours, nonStriker.sixes)}`;  

    const bowler = bowlerStats[latestBall.bowler] || { figures: '0-0-0-0' };  
    const bowlerLine = `Current bowler: ${latestBall.bowler} — figures: ${bowler.figures}`;  

    const played = this.getBallsPlayed();  
    const keyEvents = [];  

    for (const b of played) {  
      if (b.isWicket) {  
        const bStat = batsmanStats[b.dismissedBatsman] || { runs: b.batsmanRuns || 0, balls: 1 };  
        let desc = '';  
        if (b.wicketType === 'caught') {  
          desc = `${b.dismissedBatsman} caught by ${b.fielder || 'fielder'} off ${b.bowler} (${bStat.runs} off ${bStat.balls} balls)`;  
        } else if (b.wicketType === 'run_out') {  
          desc = `RUN OUT — ${b.dismissedBatsman} run out (${b.fielder ? b.fielder : 'fielder'}) (${bStat.runs} off ${bStat.balls} balls)`;  
        } else if (b.wicketType === 'caught_behind') {  
          desc = `${b.dismissedBatsman} caught behind by ${b.fielder || 'wicketkeeper'} off ${b.bowler} (${bStat.runs} off ${bStat.balls} balls)`;  
        } else if (b.wicketType === 'bowled') {  
          desc = `${b.dismissedBatsman} bowled by ${b.bowler} (${bStat.runs} off ${bStat.balls} balls)`;  
        } else if (b.wicketType === 'lbw') {  
          desc = `${b.dismissedBatsman} lbw b ${b.bowler} (${bStat.runs} off ${bStat.balls} balls)`;  
        } else {  
          desc = `${b.dismissedBatsman} out (${b.wicketType}) off ${b.bowler} (${bStat.runs} off ${bStat.balls} balls)`;  
        }  
        keyEvents.push(`• Over ${b.overDisplay}: ${desc}`);  
      } else if (b.isKeyMoment) {  
        if (b.keyMomentType === 'DRS') {  
          keyEvents.push(`• Over ${b.overDisplay}: DRS review — LBW appeal against ${b.batsmanOnStrike} — NOT OUT (impact outside off)`);  
        } else if (b.keyMomentType === 'dropped_catch') {  
          const runsAtDrop = batsmanStats[b.batsmanOnStrike]?.runs || 0;  
          keyEvents.push(`• Over ${b.overDisplay}: DROPPED CATCH — ${b.fielder} dropped ${b.batsmanOnStrike} at slip off ${b.bowler} (on ${runsAtDrop})`);  
        } else {  
          const detail = b.keyMomentDetail ? b.keyMomentDetail.split('.')[0] : (b.keyMomentType || 'Key moment');  
          keyEvents.push(`• Over ${b.overDisplay}: ${detail}`);  
        }  
      }  
    }  

    const recent6 = this.getLastNBalls(6).map(b => {  
      if (b.isWicket) return 'W';  
      if (b.extraType === 'wide') return 'wd';  
      if (b.extraType === 'noball') return 'nb';  
      return `${b.runs}`;  
    });  

    let legalDeliveries = 0;  
    for (const b of played) {  
      if (b.extraType !== 'wide' && b.extraType !== 'noball') {  
        legalDeliveries++;  
      }  
    }  
    const oversDecimal = legalDeliveries / 6;  
    const runRate = oversDecimal > 0 ? (score / oversDecimal).toFixed(2) : "0.00";  

    let summary = `Match: ${match.team1.short} vs ${match.team2.short} — ${match.type} at ${match.venue}\n`;  
    summary += `${innings.battingTeam} are batting first: ${score}/${wickets} after ${oversDisplay} overs\n\n`;  
    summary += `Current batsmen:\n${strikerLine}\n${nonStrikerLine}\n\n`;  
    summary += `${bowlerLine}\n\n`;  
    if (keyEvents.length > 0) {  
      summary += `Key events so far:\n${keyEvents.join('\n')}\n\n`;  
    }  
    summary += `Recent ${recent6.length} balls: ${recent6.join(', ')}\n`;  
    summary += `Run rate: ${runRate}`;  

    return summary;  
  }  
}  

// ----------------------------- Live Polling Provider -----------------------------  

/**  
 * LivePollingProvider: Polls the /api/live-match serverless proxy (which talks to  
 * CricAPI) and emits a normalized state. It does NOT synthesize fake balls — the UI  
 * renders whatever the last poll returned.  
 */  
class LivePollingProvider {  
  /**  
   * @param {Object} options  
   * @param {number} options.pollInterval - Polling interval in ms (default 5000)  
   */  
  constructor(options = {}) {  
    this.pollInterval = options.pollInterval || 5000;  
    this.pollTimer = null;  
    this.isPolling = false;  
    this.active = false;       // false once stop() is called, even mid first fetch
    this.onStateUpdate = null;  // callback(state)   
    this.onMatchEnd = null;
    this.matchId = null;  
    this.matchInfo = null;  
    this.liveMatchData = null;  
    this.lastStateJSON = null;  
  }  

  /**  
   * Check if a live match is selected for polling.  
   */  
  hasLiveData() {  
    return Boolean(this.matchId);  
  }  

  /**  
   * Select (or change) the live match to poll.
   */  
  setMatch(matchId) {  
    this.matchId = matchId || null;  
    this.matchInfo = null;  
    this.liveMatchData = null;  
    this.lastStateJSON = null;  
  }  

  /**  
   * Update polling cadence (ms). Restarts the timer if already polling.
   */  
  setPollInterval(ms) {
    // Free CricAPI tier = 100 hits/day; poll no faster than one hit per 10 s so
    // continuous watching doesn't burn the quota in minutes.
    const interval = Math.max(10000, Number(ms) || 15000);
    if (this.isPolling) {  
      this.stop();  
      this.start(this.onStateUpdate, this.onMatchEnd);  
    }  
  }

  /**  
   * Start polling.  
   */  
  start(onStateUpdate, onMatchEnd) {  
    this.onStateUpdate = onStateUpdate;  
    this.onMatchEnd = onMatchEnd;

    if (!this.hasLiveData()) {  
      console.warn('[LivePollingProvider] start() called without a match id');  
      return;  
    }  

    // Initial fetch, then periodic updates. runInitial handles "match over" once.
    // `active` guards the async gap: stop() during the first fetch must not leave
    // a timer running afterwards (that would keep burning CricAPI quota unseen).
    this.active = true;
    const initial = this.fetchMatchUpdates();
    if (initial && typeof initial.then === 'function') {
      initial.then(() => {
        if (!this.active || this.isPolling) return;
        this.isPolling = true;
        this.pollTimer = setInterval(() => {  
          this.fetchMatchUpdates();  
        }, this.pollInterval);  
      });
    } else if (this.active) {
      this.isPolling = true;
      this.pollTimer = setInterval(() => {  
        this.fetchMatchUpdates();  
      }, this.pollInterval);  
    }
  }  

  /**  
   * Stop polling.  
   */  
  stop() {  
    this.active = false;
    if (this.pollTimer) {  
      clearInterval(this.pollTimer);  
      this.pollTimer = null;  
    }  
    this.isPolling = false;  
  }  /**  
   * Toggle polling on/off (the live-mode meaning of play/pause).  
   */  
  togglePolling() {  
    if (this.isPolling) {  
      this.stop();  
    } else {  
      this.start(this.onStateUpdate, this.onMatchEnd);  
    }  
  }  

  /**  
   * Fetch the latest scorecard once. Calls onStateUpdate(state) when something changed.  
   */  
  async fetchMatchUpdates() {  
    if (!this.matchId) return;  

    try {  
      const response = await fetch('/api/live-match', {  
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({ action: 'getScore', matchId: this.matchId })  
      });  

      if (!response.ok) throw new Error(`HTTP ${response.status}`);  

      const data = await response.json();  
      if (!data.ok || !data.state) {  
        console.warn('[LivePollingProvider] no state for match', this.matchId, data.reason || '');  
        return;  
      }  

      const state = { ...data.state, isLive: true, isDemo: false, source: 'live-api' };  
      const json = JSON.stringify(state);
      this.liveMatchData = { state, matchInfo: data.matchInfo || null };  
      this.matchInfo = this.matchInfo || state;

      // Only push to the UI when the payload actually changed (polls are frequent;  
      // re-rendering identical state would re-trigger CSS flashes).  
      if (json !== this.lastStateJSON) {  
        this.lastStateJSON = json;  
        if (typeof this.onStateUpdate === 'function') this.onStateUpdate(state);  
      }

      // Match over? Stop polling once we surface the final state.  
      const t = String(state.statusText || '').toLowerCase();
      if (/(won|complete|abandon|no result|tied|drawn)/.test(t) && this.isPolling) {
        this.stop();
        if (typeof this.onMatchEnd === 'function') this.onMatchEnd();
      }
    } catch (err) {  
      console.warn('[LivePollingProvider] fetchMatchUpdates failed:', err.message);  
    }  
  }  

  /**  
   * Get current match state from live data (or null until the first poll lands).  
   */  
  getMatchState() {  
    if (this.liveMatchData && this.liveMatchData.state) {  
      return { ...this.liveMatchData.state };  
    }  
    return {  
      score: 0, wickets: 0, oversDisplay: '0.0',  
      runs: 0, wicketsNumber: 0, overs: '0.0',  
      batsmen: [], bowler: null,  
      isLive: true, isDemo: false, awaitingData: true,  
      source: 'live-api'  
    };  
  }  

  /**  
   * Get match metadata (standard shape used by app.js updateMatchInfo).  
   */  
  getMatchMeta() {  
    const s = this.liveMatchData && this.liveMatchData.state;
    const info = (this.liveMatchData && this.liveMatchData.matchInfo) || {};
    if (!s && !info.name) return {};  
    return {  
      team1: { short: (s && s.battingTeam || '').slice(0, 14), name: s && s.battingTeam },  
      team2: { short: (s && s.bowlingTeam || '').slice(0, 14), name: s && s.bowlingTeam },  
      venue: info.venue || 'Live match',  
      date: info.date || '',  
      type: info.name || 'Live · CricAPI',  
      toss: '',  
      statusText: info.statusText || (s && s.statusText)  
    };  
  }  

  /**  
   * Balls played — live feed has no ball array; return empty so AI fallbacks are safe.  
   */  
  getBallsPlayed() { return []; }  

  getBatsmanStats() { return {}; }  

  getBowlerStats() { return {}; }  

  getMatchSummary() {  
    const s = this.liveMatchData && this.liveMatchData.state;  
    if (!s) return 'Live match selected — waiting for first scorecard update.';  
    const bm = (s.batsmen || []).map(b => `${b.name} ${b.runs}${b.notOut ? '*' : ''} (${b.balls})`).join(', ');  
    const bw = s.bowler ? `${s.bowler.name} ${s.bowler.overs}-${s.bowler.wickets}-${s.bowler.runs}` : 'n/a';  
    return `LIVE (CricAPI)\n${s.battingTeam} ${s.runs}/${s.wickets} after ${s.overs} overs vs ${s.bowlingTeam}\n` +  
      `Batsmen: ${bm || 'n/a'}\nBowler: ${bw}\nStatus: ${s.statusText || ''}`;  
  }  

  getCommentaryLog() { return ''; }  

  getLastNBalls(n = 6) { return []; }  

  getKeyMoments() { return []; }  
}  

// ----------------------------- Match Engine (Facade) -----------------------------  

/**  
 * MatchEngine facade that supports both simulated and live providers.  
 * The UI and fantasy point calculators interact with this facade regardless of the underlying provider.  
 */  
class MatchEngine {  
  /**  
   * @param {Object} matchData - Global MATCH_DATA object (for simulated mode)  
   */  
  constructor(matchData) {  
    this.matchData = matchData;  
    this.simulatedProvider = new SimulatedProvider(matchData);  
    this.liveProvider = new LivePollingProvider({  
      fallbackProvider: this.simulatedProvider  
    });  
    this.currentProvider = this.simulatedProvider;  
    this.mode = 'demo'; // 'demo' | 'live'  
    this.playbackSpeed = 5000; // default poll/simulation interval in ms
    this.onBallPlayed = null;  
    this.onMatchEnd = null;  
  }  

  /**  
   * Switch to demo/simulated mode.  
   */  
  switchToDemo() {  
    this.pause();  
    this.mode = 'demo';  
    this.currentProvider = this.simulatedProvider;  
    this.simulatedProvider.reset();  
    console.log('[CricIQ] Switched to demo mode');  
  }

  /**  
   * Switch to live mode for a specific CricAPI match id.
   */  
  switchToLive(matchId) {  
    this.pause();  
    this.mode = 'live';  
    this.currentProvider = this.liveProvider;  
    this.liveProvider.setMatch(matchId);  
    this.liveProvider.setPollInterval(this.playbackSpeed || 5000);
    this.liveProvider.onStateUpdate = (state) => {  
      if (typeof this.onBallPlayed === 'function') this.onBallPlayed(state);  
    };  
    this.liveProvider.start();  
    console.log('[CricIQ] Switched to live mode, match', matchId);  
  }  

  /**  
   * Start auto-advancing balls or live polling.  
   */  
  play() {  
    if (this.mode === 'live') {  
      if (!this.liveProvider.hasLiveData()) {  
        console.warn('[CricIQ] play() in live mode but no match selected');  
        return;  
      }  
      this.liveProvider.start();  
    } else {  
      const onBall = typeof this.onBallPlayed === 'function' ? this.onBallPlayed : null;  
      const onEnd = typeof this.onMatchEnd === 'function' ? this.onMatchEnd : null;  
      this.simulatedProvider.start(onBall, onEnd);  
    }  
  }

  /**  
   * Stop playback/polling.  
   */  
  pause() {  
    if (this.mode === 'live') this.liveProvider.stop();  
    else this.simulatedProvider.stop();  
  }  

  /**  
   * Toggle between play and pause. Returns the new playing state.
   */  
  togglePlayPause() {  
    if (this.isPlaying) {  
      this.pause();  
    } else {  
      this.play();  
    }  
    return this.isPlaying;  
  }

  /**  
   * True when the active provider is advancing automatically at the moment.
   */  
  get isPlaying() {
    const p = this.currentProvider;
    if (p === this.simulatedProvider) return Boolean(p.isPlaying);
    if (p === this.liveProvider) return this.mode === 'live' && Boolean(p.isPolling);
    return false;
  }  

  /**  
   * Advance simulation by one ball (or fetch live updates).  
   *  
   * The provider only learns its callbacks inside start(), so stepping with  
   * "Next ball" before ever pressing Play used to advance the index in silence  
   * (nothing rendered, and Play then resumed mid-match). Keep the provider in  
   * sync here so a manual step always reaches the UI.  
   */  
  nextBall() {  
    if (this.mode === 'live') {  
      this.liveProvider.fetchMatchUpdates();  
      return null;  
    }  
    this.syncProviderCallbacks();  
    return this.simulatedProvider.nextDelivery();  
  }  

  /**  
   * Push the facade's callbacks onto the active scripted provider.  
   */  
  syncProviderCallbacks() {  
    const provider = this.simulatedProvider;  
    if (!provider) return;  
    if (typeof this.onBallPlayed === 'function') {  
      provider.onBallPlayed = this.onBallPlayed;  
    }  
    if (typeof this.onMatchEnd === 'function') {  
      provider.onMatchEnd = this.onMatchEnd;  
    }  
  }

  /**  
   * Update playback speed. Demo mode: ms between balls. Live mode: ms between API polls.
   */  
  setSpeed(ms) {  
    const speed = Number(ms) || 5000;  
    this.playbackSpeed = speed;
    if (this.mode === 'live') {
      this.liveProvider.setPollInterval(speed);
    } else {  
      this.simulatedProvider.setSpeed(speed);  
    }  
  }  

  /**  
   * In live mode, re-sync to current live position.  
   */  
  jumpToLive() {  
    if (this.mode === 'live') {  
      this.liveProvider.jumpToLive();  
    }  
  }  

  /**  
   * Get current match state.  
   */  
  getMatchState() {  
    return this.currentProvider.getMatchState();  
  }  

  /**
   * State at an arbitrary delivery index (scripted replays only). Falls back to
   * the current state for providers that cannot rewind.
   */
  getStateAtIndex(index) {
    const provider = this.currentProvider;
    if (provider && typeof provider.getStateAtIndex === 'function') {
      return provider.getStateAtIndex(index);
    }
    return this.getMatchState();
  }

  /**
   * Deliveries from ball one up to `index` (scripted replays only).
   */
  getBallsUpTo(index) {
    const provider = this.currentProvider;
    if (provider && typeof provider.getBallsUpTo === 'function') {
      return provider.getBallsUpTo(index);
    }
    return this.getBallsPlayed();
  }

  /**
   * Legal deliveries bowled so far, when the active provider tracks deliveries.
   */
  getLegalBallsPlayed() {
    const provider = this.currentProvider;
    if (provider && typeof provider.getLegalBallsPlayed === 'function') {
      return provider.getLegalBallsPlayed();
    }
    return 0;
  }

  /**
   * Overs as a scorecard string for the active provider.
   */
  getOversDisplay() {
    const provider = this.currentProvider;
    if (provider && typeof provider.getOversDisplay === 'function') {
      return provider.getOversDisplay();
    }
    const state = provider ? provider.getMatchState() : null;
    return (state && (state.oversDisplay || state.overs)) || '0.0';
  }

  /**  
   * Get match metadata.  
   */  
  getMatchMeta() {  
    return this.currentProvider.getMatchMeta();  
  }  

  /**  
   * Get all balls played so far.  
   */  
  getBallsPlayed() {  
    return this.currentProvider.getBallsPlayed();  
  }  

  /**  
   * Get last N balls.  
   */  
  getLastNBalls(n = 6) {  
    return this.currentProvider.getLastNBalls(n);  
  }  

  /**  
   * Get key moments.  
   */  
  getKeyMoments() {  
    return this.currentProvider.getKeyMoments();  
  }  

  /**  
   * Get commentary log.  
   */  
  getCommentaryLog() {  
    return this.currentProvider.getCommentaryLog();  
  }  

  /**  
   * Get batsman stats. Optional index rewinds to that delivery (replay only).  
   */  
  getBatsmanStats(index) {  
    return this.currentProvider.getBatsmanStats(index);  
  }  

  /**  
   * Get bowler figures. Optional index rewinds to that delivery (replay only).  
   */  
  getBowlerStats(index) {  
    return this.currentProvider.getBowlerStats(index);  
  }  

  /**  
   * Get match summary.  
   */  
  getMatchSummary() {  
    return this.currentProvider.getMatchSummary();  
  }  

  /**  
   * Set callback for ball played events.  
   */  
  setOnBallPlayed(callback) {  
    this.onBallPlayed = callback;  
    this.currentProvider.onBallPlayed = callback;  
  }  

  /**  
   * Set callback for match end event.  
   */  
  setOnMatchEnd(callback) {  
    this.onMatchEnd = callback;  
    this.currentProvider.onMatchEnd = callback;  
  }/**
   * Get total balls (from current provider or simulated provider).
   */
  get totalBalls() {
    if (this.currentProvider === this.simulatedProvider) {
      return this.simulatedProvider.totalBalls;
    }
    return this.liveProvider.totalBalls || this.simulatedProvider.totalBalls;
  }

  /**
   * Get current ball index (from current provider).
   */
  get currentBallIndex() {
    return this.currentProvider.currentBallIndex;
  }

  /**
   * Get current mode.
   */
  getMode() {
    return this.mode;
  }

  /**
   * Check if currently in live mode with active data.
   */
  isLiveMode() {
    return this.mode === 'live' && this.liveProvider.hasLiveData();
  }

  /**
   * Fetch latest live data once (no polling change). Used by "Next ball" in live mode.
   */
  fetchLiveOnce() {
    if (this.mode === 'live') this.liveProvider.fetchMatchUpdates();
  }
}  

// Attach to window for global access  
if (typeof window !== 'undefined') {  
  window.MatchEngine = MatchEngine;  
  window.SimulatedProvider = SimulatedProvider;  
  window.LivePollingProvider = LivePollingProvider;  
}
