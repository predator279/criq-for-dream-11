/**
 * CricIQ — Match Simulation Engine
 * Manages ball-by-ball playback, state calculation, and dynamic match statistics.
 */

class MatchEngine {
  /**
   * @param {Object} matchData - Global MATCH_DATA object
   */
  constructor(matchData) {
    this.matchData = matchData;
    this.currentBallIndex = -1; // -1 = match not started
    this.balls = (matchData && matchData.innings && matchData.innings[0] && matchData.innings[0].balls)
      ? matchData.innings[0].balls
      : [];
    this.totalBalls = this.balls.length;
    this.isPlaying = false;
    this.playbackInterval = null;
    this.playbackSpeed = 8000; // ms between balls
    this.onBallPlayed = null; // callback(ball, index)
    this.onMatchEnd = null; // callback()
  }

  /**
   * Start auto-advancing balls.
   */
  play() {
    if (this.isPlaying) return;

    if (this.currentBallIndex >= this.totalBalls - 1) {
      if (typeof this.onMatchEnd === 'function') {
        this.onMatchEnd();
      }
      return;
    }

    this.isPlaying = true;
    this.playbackInterval = setInterval(() => {
      this.nextBall();
    }, this.playbackSpeed);
  }

  /**
   * Pause auto-advancing.
   */
  pause() {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    this.isPlaying = false;
  }

  /**
   * Toggle between play and pause.
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Advance simulation by one ball.
   * @returns {Object|null} The ball played or null if at end of match.
   */
  nextBall() {
    if (this.currentBallIndex >= this.totalBalls - 1) {
      this.pause();
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

    // If this was the last ball, auto-pause and trigger onMatchEnd
    if (this.currentBallIndex >= this.totalBalls - 1) {
      this.pause();
      if (typeof this.onMatchEnd === 'function') {
        this.onMatchEnd();
      }
    }

    return ball;
  }

  /**
   * Update playback speed.
   * @param {number} ms - Milliseconds per ball
   */
  setSpeed(ms) {
    const speed = Number(ms) || 8000;
    this.playbackSpeed = speed;

    if (this.isPlaying) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = setInterval(() => {
        this.nextBall();
      }, this.playbackSpeed);
    }
  }

  /**
   * Get current match state derived from latest ball.
   * @returns {Object}
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
        ballsPlayed: 0
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
      ballsPlayed: this.currentBallIndex + 1
    };
  }

  /**
   * Get all balls played so far.
   * @returns {Array<Object>}
   */
  getBallsPlayed() {
    if (this.currentBallIndex < 0) return [];
    return this.balls.slice(0, this.currentBallIndex + 1);
  }

  /**
   * Get last N balls from played deliveries.
   * @param {number} n
   * @returns {Array<Object>}
   */
  getLastNBalls(n = 6) {
    const played = this.getBallsPlayed();
    return played.slice(-n);
  }

  /**
   * Filter played balls for key moments.
   * @returns {Array<Object>}
   */
  getKeyMoments() {
    return this.getBallsPlayed().filter(ball => Boolean(ball.isKeyMoment));
  }

  /**
   * Get formatted commentary log string of all played balls.
   * @returns {String}
   */
  getCommentaryLog() {
    return this.getBallsPlayed()
      .map(b => `${b.overDisplay}: ${b.commentary}`)
      .join('\n');
  }

  /**
   * Dynamically compute batsman stats (runs, balls faced, 4s, 6s) from played balls.
   * @returns {Object} Map of batsman name to stats
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

      // Striker gets batsman runs
      if (b.batsmanOnStrike) {
        stats[b.batsmanOnStrike].runs += (b.batsmanRuns || 0);

        // Wides do NOT count as balls faced by batsman
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

      // Check wicket dismissal
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
   * Dynamically compute bowler figures (overs-maidens-runs-wickets) from played balls.
   * @returns {Object} Map of bowler name to bowler stats
   */
  getBowlerStats() {
    const stats = {};
    const played = this.getBallsPlayed();
    const bowlerOvers = {}; // `${bowler}_${over}` -> { legalBalls: 0, runs: 0 }

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

      // Runs conceded: byes and legbyes are not bowler's runs
      const runsConceded = (b.extraType === 'bye' || b.extraType === 'legbye') ? 0 : (b.runs || 0);
      stats[b.bowler].runs += runsConceded;
      bowlerOvers[overKey].runs += runsConceded;

      // Bowler wickets (run outs do not count toward bowler's wickets)
      if (b.isWicket && b.wicketType !== 'run_out') {
        stats[b.bowler].wickets += 1;
      }
    }

    // Maidens: Completed 6 legal balls in an over with 0 runs conceded
    for (const key in bowlerOvers) {
      const o = bowlerOvers[key];
      const bowlerName = key.substring(0, key.lastIndexOf('_'));
      if (o.legalBalls === 6 && o.runs === 0) {
        if (stats[bowlerName]) {
          stats[bowlerName].maidens += 1;
        }
      }
    }

    // Format overs and figures
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
   * Human-readable match summary text matching Section 3.4.3.
   * @returns {String}
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

    // Helper for formatting boundary counts
    const formatBoundaries = (fours, sixes) => {
      const parts = [];
      if (fours > 0) parts.push(`${fours} four${fours > 1 ? 's' : ''}`);
      if (sixes > 0) parts.push(`${sixes} six${sixes > 1 ? 'es' : ''}`);
      return parts.length > 0 ? ` — ${parts.join(', ')}` : '';
    };

    // Batsmen details
    const strikerName = latestBall.batsmanOnStrike;
    const nonStrikerName = latestBall.batsmanNonStrike;

    const striker = batsmanStats[strikerName] || { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    const nonStriker = batsmanStats[nonStrikerName] || { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };

    const strikerAsterisk = striker.isOut ? '' : '*';
    const nonStrikerAsterisk = nonStriker.isOut ? '' : '*';

    const strikerLine = `• ${strikerName} ${striker.runs}${strikerAsterisk} (${striker.balls} balls)${formatBoundaries(striker.fours, striker.sixes)}`;
    const nonStrikerLine = `• ${nonStrikerName} ${nonStriker.runs}${nonStrikerAsterisk} (${nonStriker.balls} balls)${formatBoundaries(nonStriker.fours, nonStriker.sixes)}`;

    // Current bowler
    const bowler = bowlerStats[latestBall.bowler] || { figures: '0-0-0-0' };
    const bowlerLine = `Current bowler: ${latestBall.bowler} — figures: ${bowler.figures}`;

    // Key events so far
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
          keyEvents.push(`• Over ${b.overDisplay}: DROPPED CATCH — Suryakumar dropped ${b.batsmanOnStrike} at slip off ${b.bowler} (on ${runsAtDrop})`);
        } else {
          const detail = b.keyMomentDetail ? b.keyMomentDetail.split('.')[0] : (b.keyMomentType || 'Key moment');
          keyEvents.push(`• Over ${b.overDisplay}: ${detail}`);
        }
      }
    }

    // Recent 6 balls
    const recent6 = this.getLastNBalls(6).map(b => {
      if (b.isWicket) return 'W';
      if (b.extraType === 'wide') return 'wd';
      if (b.extraType === 'noball') return 'nb';
      return `${b.runs}`;
    });

    // Run rate calculation based on legal balls
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

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.MatchEngine = MatchEngine;
}
