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
  }  

  /**  
   * Get current match state.  
   */  
  getMatchState() {  
    const innings = (this.matchData && this.matchData.innings && this.matchData.innings[0]) || {};  
    const battingTeam = innings.battingTeam || "CSK";  
    const bowlingTeam = innings.bowlingTeam || "MI";  

    if (this.currentBallIndex === -1) {  
      return {  
        score: 0,  
        wickets: 0,  
        oversDisplay: "0.0",  
        battingTeam,  
        bowlingTeam,  
        currentBatsmen: {  
          striker: null,  
          nonStriker: null  
        },  
        currentBowler: null,  
        ballsPlayed: 0,  
        isLive: false,  
        isDemo: true  
      };  
    }  

    const latestBall = this.balls[this.currentBallIndex];  
    return {  
      score: latestBall.totalScore,  
      wickets: latestBall.totalWickets,  
      oversDisplay: latestBall.overDisplay,  
      battingTeam,  
      bowlingTeam,  
      currentBatsmen: {  
        striker: latestBall.batsmanOnStrike,  
        nonStriker: latestBall.batsmanNonStrike  
      },  
      currentBowler: latestBall.bowler,  
      ballsPlayed: this.currentBallIndex + 1,  
      isLive: false,  
      isDemo: true  
    };  
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
  getBatsmanStats() {  
    const stats = {};  
    const played = this.getBallsPlayed();  

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
  getBowlerStats() {  
    const stats = {};  
    const played = this.getBallsPlayed();  
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
    const oversDisplay = latestBall.overDisplay;  

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
 * LivePollingProvider: Polls a live cricket API endpoint for real-time data.  
 * If no API is available, falls back to demo simulation.  
 */  
class LivePollingProvider extends MatchProvider {  
  /**  
   * @param {Object} options  
   * @param {string} options.apiUrl - URL to poll for live match data  
   * @param {number} options.pollInterval - Polling interval in ms (default 5000)  
   * @param {Object} options.fallbackProvider - Fallback SimulatedProvider if API fails  
   */  
  constructor(options = {}) {  
    super();  
    this.apiUrl = options.apiUrl || '';  
    this.pollInterval = options.pollInterval || 5000;  
    this.fallbackProvider = options.fallbackProvider || null;  
    this.pollTimer = null;  
    this.onBallPlayed = null;  
    this.onMatchEnd = null;  
    this.lastKnownScore = { runs: 0, wickets: 0, overs: "0.0" };  
    this.liveMatchData = null;  
    this.isLiveMode = false;  
    this.isAutoScrollPaused = false;  
    this.currentMatchId = null;  
    this.currentMatchInfo = null;  
  }  

  /**  
   * Check if live API is configured.  
   */  
  hasLiveData() {  
    return Boolean(this.apiUrl);  
  }  

  /**  
   * Start live polling.  
   */  
  start(onBallPlayed, onMatchEnd) {  
    this.onBallPlayed = onBallPlayed;  
    this.onMatchEnd = onMatchEnd;  

    if (!this.hasLiveData()) {  
      // No API configured, use fallback  
      if (this.fallbackProvider) {  
        this.fallbackProvider.start(onBallPlayed, onMatchEnd);  
      }  
      return;  
    }  

    this.isLiveMode = true;  
    // Initial fetch  
    this.fetchMatches().then(() => {  
      // Start polling  
      this.pollTimer = setInterval(() => {  
        this.fetchMatchUpdates();  
      }, this.pollInterval);  
    });  
  }  

  /**  
   * Stop live polling.  
   */  
  stop() {  
    if (this.pollTimer) {  
      clearInterval(this.pollTimer);  
      this.pollTimer = null;  
    }  
    this.isLiveMode = false;  

    // Also stop fallback if active  
    if (this.fallbackProvider && this.fallbackProvider.isPlaying) {  
      this.fallbackProvider.stop();  
    }  
  }  

  /**  
   * Play/Pause for live mode (toggles auto-scroll sync).  
   */  
  togglePlayPause() {  
    if (this.isLiveMode) {  
      // In live mode, this toggles auto-scroll sync  
      this.isAutoScrollPaused = !this.isAutoScrollPaused;  
    } else if (this.fallbackProvider) {  
      this.fallbackProvider.togglePlayPause();  
    }  
  }  

  /**  
   * Jump to live (re-sync after pausing).  
   */  
  jumpToLive() {  
    this.isAutoScrollPaused = false;  
    if (this.fallbackProvider) {  
      this.fetchMatchUpdates();  
    }  
  }  

  /**  
   * Get the next delivery (for live mode, fetches latest updates).  
   */  
  nextDelivery() {  
    if (this.isLiveMode) {  
      // In live mode, just fetch latest  
      this.fetchMatchUpdates();  
      return null;  
    } else if (this.fallbackProvider) {  
      return this.fallbackProvider.nextDelivery();  
    }  
    return null;  
  }  

  /**  
   * Set playback speed (only applies to fallback).  
   */  
  setSpeed(ms) {  
    if (this.fallbackProvider) {  
      this.fallbackProvider.setSpeed(ms);  
    }  
  }  

  /**  
   * Get current match state from live data or fallback.  
   */  
  getMatchState() {  
    if (this.liveMatchData) {  
      return {  
        ...this.liveMatchData.state,  
        isLive: true,  
        isDemo: false,  
        source: 'live-api'  
      };  
    }  

    if (this.fallbackProvider) {  
      const state = this.fallbackProvider.getMatchState();  
      return {  
        ...state,  
        isLive: this.isLiveMode && !this.isAutoScrollPaused,  
        isDemo: !this.isLiveMode,  
        source: this.isLiveMode ? 'live-fallback' : 'demo'  
      };  
    }  

    return {  
      score: 0,  
      wickets: 0,  
      oversDisplay: "0.0",  
      isLive: false,  
      isDemo: true,  
      source: 'none'  
    };  
  }  

  /**  
   * Get match metadata.  
   */  
  getMatchMeta() {  
    if (this.currentMatchInfo) {  
      return this.currentMatchInfo;  
    }  
    if (this.fallbackProvider) {  
      return this.fallbackProvider.getMatchMeta();  
    }  
    return {};  
  }  

  /**  
   * Get balls played (from live feed or fallback).  
   */  
  getBallsPlayed() {  
    if (this.liveMatchData && this.liveMatchData.balls) {  
      return this.liveMatchData.balls;  
    }  
    if (this.fallbackProvider) {  
      return this.fallbackProvider.getBallsPlayed();  
    }  
    return [];  
  }  

  /**  
   * Get batsman stats.  
   */  
  getBatsmanStats() {  
    if (this.fallbackProvider) {  
      return this.fallbackProvider.getBatsmanStats();  
    }  
    return {};  
  }  

  /**  
   * Get bowler stats.  
   */  
  getBowlerStats() {  
    if (this.fallbackProvider) {  
      return this.fallbackProvider.getBowlerStats();  
    }  
    return {};  
  }  

  /**  
   * Get match summary.  
   */  
  getMatchSummary() {  
    if (this.fallbackProvider) {  
      return this.fallbackProvider.getMatchSummary();  
    }  
    return "No match data available.";  
  }  

  /**  
   * Fetch list of current matches.  
   */  
  async fetchMatches() {  
    try {  
      const response = await fetch('/api/live-match', {  
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({ action: 'getMatches' })  
      });  

      if (!response.ok) {  
        throw new Error(`HTTP ${response.status}`);  
      }  

      const data = await response.json();  
      if (data.matches && data.matches.length > 0) {  
        // Select the first live match  
        const liveMatch = data.matches.find(m => m.status === 'live') || data.matches[0];  
        this.currentMatchId = liveMatch.id;  
        this.currentMatchInfo = {  
          team1: liveMatch.team1,  
          team2: liveMatch.team2,  
          venue: liveMatch.venue || 'Ground',  
          date: liveMatch.date,  
          type: liveMatch.name,  
          toss: liveMatch.toss || 'Toss pending'  
        };  
        return this.fetchMatchUpdates();  
      }  
    } catch (err) {  
      console.warn('[LivePollingProvider] Failed to fetch matches:', err);  
    }  
  }  

  /**  
   * Fetch latest match updates.  
   */  
  async fetchMatchUpdates() {  
    if (!this.hasLiveData()) {  
      if (this.fallbackProvider) {  
        this.fallbackProvider.start(this.onBallPlayed, this.onMatchEnd);  
      }  
      return;  
    }  

    try {  
      const response = await fetch('/api/live-match', {  
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({  
          action: 'getScore',  
          matchId: this.currentMatchId  
        })  
      });  

      if (!response.ok) {  
        throw new Error(`HTTP ${response.status}`);  
      }  

      const data = await response.json();  
      if (data.state) {  
        const newState = data.state;  
        // Compare with last known state  
        this.lastKnownScore = {  
          runs: newState.runs || this.lastKnownScore.runs,  
          wickets: newState.wickets || this.lastKnownScore.wickets,  
          overs: newState.overs || this.lastKnownScore.overs  
        };  

        this.liveMatchData = {  
          state: newState,  
          balls: data.balls || [],  
          commentary: data.commentary || []  
        };  

        // Notify if there's a new ball event  
        if (data.lastBall && typeof this.onBallPlayed === 'function') {  
          this.onBallPlayed(data.lastBall, this.liveMatchData.balls.length - 1);  
        }  

        // Update isLive flag based on auto-scroll  
        if (typeof this.onBallPlayed === 'function' && !this.isAutoScrollPaused) {  
          // Auto-scroll is active, so this is live  
        }  
      }  
    } catch (err) {  
      console.warn('[LivePollingProvider] Failed to fetch updates:', err);  
      // Fall back to demo if we're in live mode but API fails  
      if (this.isLiveMode && this.fallbackProvider && !this.fallbackProvider.isPlaying) {  
        this.fallbackProvider.start(this.onBallPlayed, this.onMatchEnd);  
      }  
    }  
  }  

  /**  
   * Get last N balls.  
   */  
  getLastNBalls(n = 6) {  
    const played = this.getBallsPlayed();  
    return played.slice(-n);  
  }  

  /**  
   * Get key moments.  
   */  
  getKeyMoments() {  
    return this.getBallsPlayed().filter(ball => Boolean(ball.isKeyMoment));  
  }  

  /**  
   * Get commentary log.  
   */  
  getCommentaryLog() {  
    return this.getBallsPlayed()  
      .map(b => `${b.overDisplay}: ${b.commentary}`)  
      .join('\n');  
  }  
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
    this.onBallPlayed = null;  
    this.onMatchEnd = null;  
  }  

  /**  
   * Switch to demo/simulated mode.  
   */  
  switchToDemo() {  
    this.stop();  
    this.mode = 'demo';  
    this.currentProvider = this.simulatedProvider;  
    this.currentProvider.currentBallIndex = -1;  
    console.log('[CricIQ] Switched to demo mode');  
  }  

  /**  
   * Switch to live mode.  
   */  
  switchToLive() {  
    this.stop();  
    this.mode = 'live';  
    this.currentProvider = this.liveProvider;  
    this.liveProvider.start(this.onBallPlayed.bind(this), this.onMatchEnd.bind(this));  
    console.log('[CricIQ] Switched to live mode');  
  }  

  /**  
   * Start auto-advancing balls or live polling.  
   */  
  play() {  
    if (this.currentProvider === this.simulatedProvider) {  
      this.simulatedProvider.start(this.onBallPlayed.bind(this), this.onMatchEnd.bind(this));  
    } else {  
      this.liveProvider.start(this.onBallPlayed.bind(this), this.onMatchEnd.bind(this));  
    }  
  }  

  /**  
   * Stop playback/polling.  
   */  
  pause() {  
    this.currentProvider.stop();  
  }  

  /**  
   * Toggle between play and pause.  
   */  
  togglePlayPause() {  
    this.currentProvider.togglePlayPause();  
  }  

  /**  
   * Advance simulation by one ball (or fetch live updates).  
   */  
  nextBall() {  
    return this.currentProvider.nextDelivery();  
  }  

  /**  
   * Update playback speed (demo mode only).  
   */  
  setSpeed(ms) {  
    this.currentProvider.setSpeed(ms);  
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
   * Get batsman stats.  
   */  
  getBatsmanStats() {  
    return this.currentProvider.getBatsmanStats();  
  }  

  /**  
   * Get bowler figures.  
   */  
  getBowlerStats() {  
    return this.currentProvider.getBowlerStats();  
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
}  

// Attach to window for global access  
if (typeof window !== 'undefined') {  
  window.MatchEngine = MatchEngine;  
  window.SimulatedProvider = SimulatedProvider;  
  window.LivePollingProvider = LivePollingProvider;  
}
