/**
 * CricIQ — Live Match Data Proxy (CricAPI · cricketdata.org)
 *
 * POST /api/live-match
 *   Actions:
 *     - { action: 'getMatches' }              → { ok, source, matches: [...] }
 *     - { action: 'getScore', matchId: '...' } → { ok, source, state, matchInfo }
 *
 * The CricAPI free tier needs  CRICAPI_API_KEY  in the environment
 * (Vercel Environment Variables — the key NEVER reaches the browser).
 *
 * Normalized match objects returned to the client:
 *   { id, name, team1, team2, short1, short2, venue, date,
 *     status: 'live' | 'upcoming' | 'completed',
 *     statusText, toss, score }        // score is a formatted string e.g. "CSK 48/3 (6.0)"
 *
 * getScore state object:
 *   { runs, wickets, overs, battingTeam, bowlingTeam, teams,
 *     batsmen: [{name, runs, balls, notOut}], bowler: {name, overs, runs, wickets} | null,
 *     statusText, matchId, lastUpdated }
 *
 * If no key is configured or CricAPI is unreachable, the endpoint responds with
 * { ok: false, source: 'none' } for getMatches (the client then shows its demo card
 * only) and { ok: false } for getScore (the client keeps whatever is rendered).
 * The client never falls back to fake "live" data — demo mode is explicit.
 */

export const maxDuration = 30;

const CRICAPI_BASE = 'https://api.cricapi.com/v1';

const LIVE_STATES = new Set([
  'in progress', 'live', 'innings break', 'stumps', 'drinks',
  'dessert break', 'rain delay', 'tea break', 'lunch break', 'powerplay'
]);
const DONE_STATES = new Set(['complete', 'completed', 'abandon', 'cancelled', 'canceled', 'result']);

function classify(state) {
  const s = String(state || '').toLowerCase();
  if (LIVE_STATES.has(s)) return 'live';
  for (const d of DONE_STATES) if (s.includes(d)) return 'completed';
  return 'upcoming';
}

function shortTeam(name) {
  if (!name) return '';
  return String(name).replace(/\s*\(.*\)\s*$/, ''); // CricAPI sometimes appends short name in parens
}

function shortCode(name) {
  if (!name) return '?';
  const map = {
    'india': 'IND', 'australia': 'AUS', 'england': 'ENG', 'pakistan': 'PAK',
    'south africa': 'SA', 'new zealand': 'NZ', 'sri lanka': 'SL',
    'bangladesh': 'BAN', 'west indies': 'WI', 'afghanistan': 'AFG',
    'zimbabwe': 'ZIM', 'ireland': 'IRE', 'scotland': 'SCO', 'netherlands': 'NL',
    'namibia': 'NAM', 'nepal': 'NEP', 'oman': 'OMA', 'united states': 'USA',
    'canada': 'CAN', 'uae': 'UAE'
  };
  const key = String(name).toLowerCase().trim();
  return map[key] || String(name).split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 3);
}

function fmtDate(m) {
  const d = m.date || m.dateTimeGMT;
  if (!d) return 'TBD';
  try { return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return String(d); }
}

function scoreLine(m) {
  if (!m.score || !m.score.length) return '';
  return m.score.map(s => `${shortTeam((s.inning || '').split(' v ')[0])} ${s.r || 0}/${s.w || 0}${s.o ? ` (${s.o})` : ''}`).join(' · ');
}

function mapMatch(m) {
  const teamInfo = Array.isArray(m.teamInfo) && m.teamInfo.length >= 2 ? m.teamInfo : null;
  const team1 = teamInfo ? teamInfo[0].name : (m.teams && m.teams[0]) || (Array.isArray(m.teams) ? m.teams[0] : 'Team 1');
  const team2 = teamInfo ? teamInfo[1].name : (m.teams && m.teams[1]) || 'Team 2';
  const status = classify(m.state || m.status || '');
  return {
    id: m.id || String(m.series_id || m.name || Math.random()).slice(-12),
    name: m.name || `${team1} vs ${team2}`,
    shortName: `${teamInfo ? teamInfo[0].shortname || shortCode(team1) : shortCode(team1)} vs ${teamInfo ? teamInfo[1].shortname || shortCode(team2) : shortCode(team2)}`,
    team1: shortTeam(team1), team2: shortTeam(team2),
    short1: shortCode(team1), short2: shortCode(team2),
    venue: m.venue || '',
    date: fmtDate(m),
    dateTimeGMT: m.dateTimeGMT || '',
    status,
    statusText: m.status || m.state || '',
    toss: (m.tossResults && `${m.tossResults.winner} won the toss and elected to ${m.tossResults.decision}`) || '',
    score: scoreLine(m),
    source: 'cricapi'
  };
}

/* ------------------------------ CricAPI fetchers ------------------------------ */

// Modest server-side cache so several open tabs / rapid polls don't burn the
// 100-hits/day free quota. Vercel may still spawn multiple instances, but every
// instance that does share memory gets the benefit.
const apiCache = new Map();   // key → { at, value }
const MATCHES_TTL = 30_000;   // list refreshes half a minute at most
const SCORE_TTL = 10_000;     // scorecard refreshes at most every 10 s

function cacheGet(key) {
  const hit = apiCache.get(key);
  if (!hit) return null;
  return (Date.now() - hit.at) < hit.ttl ? hit.value : null;
}

function cacheSet(key, ttl, value) {
  apiCache.set(key, { at: Date.now(), ttl, value });
}

/** CricAPI "success" responses have evolved: old docs say "success", newer
 *  responses use "ok". Accept both so a valid key isn't reported as failure. */
function cricapiOk(payload) {
  return payload && (payload.status === 'success' || payload.status === 'ok');
}

async function fetchCurrentMatches(apiKey) {
  const cached = cacheGet('matches');
  if (cached) return cached;

  try {
    const res = await fetch(`${CRICAPI_BASE}/currentMatches?apikey=${encodeURIComponent(apiKey)}&offset=0`);
    if (!res.ok) {
      console.warn('[LiveMatch] currentMatches HTTP', res.status);
      return { ok: false, reason: `CricAPI HTTP ${res.status} (bad/expired key or transient outage)` };
    }
    const data = await res.json();
    if (!cricapiOk(data) || !Array.isArray(data.data)) {
      console.warn('[LiveMatch] currentMatches rejected:', data.reason || data.status);
      return {
        ok: false,
        reason: data.reason
          ? `CricAPI said "${data.reason}" — usually quota used or invalid key`
          : `unexpected CricAPI status "${data.status ?? 'missing'}"`
      };
    }
    const value = { ok: true, matches: data.data };
    cacheSet('matches', MATCHES_TTL, value);
    return value;
  } catch (err) {
    console.warn('[LiveMatch] currentMatches error:', err.message);
    return { ok: false, reason: `network error talking to CricAPI: ${err.message}` };
  }
}

async function fetchScorecard(apiKey, matchId) {
  const key = `score:${matchId}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${CRICAPI_BASE}/match_scorecard?apikey=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(matchId)}`);
    if (!res.ok) {
      console.warn('[LiveMatch] scorecard HTTP', res.status);
      return { ok: false, reason: `CricAPI HTTP ${res.status} (bad/expired key or transient outage)` };
    }
    const data = await res.json();
    if (!cricapiOk(data) || !data.data) {
      console.warn('[LiveMatch] scorecard rejected:', data.reason || data.status);
      return {
        ok: false,
        reason: data.reason
          ? `CricAPI said "${data.reason}" — usually quota used or invalid key`
          : `unexpected CricAPI status "${data.status ?? 'missing'}"`
      };
    }
    const value = { ok: true, match: data.data };
    cacheSet(key, SCORE_TTL, value);
    return value;
  } catch (err) {
    console.warn('[LiveMatch] scorecard error:', err.message);
    return { ok: false, reason: `network error talking to CricAPI: ${err.message}` };
  }
}

/* --------------------------- Scorecard → state mapping --------------------------- */

function mapScorecardToState(match, matchId) {
  const scorecard = Array.isArray(match.scorecard) ? match.scorecard : [];
  if (!scorecard.length) return null;

  // The most recently started innings is the last one with any overs bowled.
  let innings = null;
  for (const inn of scorecard) {
    const overs = parseFloat(inn.overs) || 0;
    if (overs > 0) innings = inn;
  }
  innings = innings || scorecard[scorecard.length - 1];

  const battingTeam = innings.batting_team || '';
  const bowlingTeam = findBowlingTeam(scorecard, battingTeam, match);

  const runs = innings.runs || 0;
  const wicketsNumber = innings.wickets ?? innings.wkts ?? 0;
  const overs = innings.overs != null ? String(innings.overs) : '0.0';

  // Active batsmen: the listed batters who are not yet out (CricAPI marks with out/dismissal or "?")
  const batters = Array.isArray(innings.batters) ? innings.batters.filter(b => {
    const outFlag = b['out'] ?? b.dismissed;
    const shownOut = outFlag === true || (outFlag && outFlag !== 'no' && outFlag !== 'not out');
    return !shownOut;
  }) : [];

  const batsmen = batters.slice(0, 2).map(b => ({
    name: b.name || b.player || '',
    runs: b.r || 0,
    balls: b.b || 0,
    notOut: true
  }));

  // Active bowler heuristic: the bowler on the bowling list with the most overs so far is
  // most likely still in the attack (CricAPI scorecards have no "current bowler" field).
  let bowler = null;
  const bowlingInnings = scorecard.find(i => (i.batting_team || '') === bowlingTeam) || null;
  const bowlers = bowlingInnings && Array.isArray(bowlingInnings.bowlers) ? bowlingInnings.bowlers : [];
  if (bowlers.length) {
    const best = bowlers.reduce((a, b) => (parseFloat(b.o) || 0) > (parseFloat(a.o) || 0) ? b : a, bowlers[0]);
    bowler = {
      name: best.name || best.player || '',
      overs: best.o || '0.0',
      runs: best.r || 0,
      wickets: best.w || 0
    };
  }

  const teams = Array.isArray(match.teams) ? match.teams : (match.teamInfo || []).map(t => t.name);

  return {
    runs, wickets: wicketsNumber, overs,
    battingTeam, bowlingTeam,
    teams,
    batsmen, bowler,
    statusText: match.status || match.state || '',
    matchId,
    lastUpdated: new Date().toISOString()
  };
}

function findBowlingTeam(scorecard, battingTeam, match) {
  const inn = scorecard.find(i => (i.batting_team || '') === battingTeam);
  if (inn && inn.bowling_team) return inn.bowling_team;
  const teams = Array.isArray(match.teams) ? match.teams : (match.teamInfo || []).map(t => t.name);
  return teams.find(t => t !== battingTeam) || '';
}

/* --------------------------------- Handler --------------------------------- */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch { body = {}; }

  const action = body.action || 'getMatches';
  const apiKey = (process.env.CRICAPI_API_KEY || body.apiKey || '').trim();

  if (action === 'getMatches') {
    if (!apiKey) {
      return res.status(200).json({ ok: false, source: 'none', matches: [], reason: 'CRICAPI_API_KEY not set on the server' });
    }
    const result = await fetchCurrentMatches(apiKey);
    if (!result.ok) {
      return res.status(200).json({ ok: false, source: 'cricapi', matches: [], reason: result.reason });
    }
    // Popular leagues first, so the ribbon stays focused during world-cup noise.
    const PRIORITY = /(indian premier league|ipl|world cup|wpl|t20blast|big bash|psl|twenty20 international|t20i)/i;
    const raw = result.matches;
    raw.sort((a, b) => {
      const pa = PRIORITY.test(a.name || '') ? 0 : 1;
      const pb = PRIORITY.test(b.name || '') ? 0 : 1;
      return pa - pb;
    });
    return res.status(200).json({
      ok: true, source: 'cricapi',
      matches: raw.map(mapMatch)
    });
  }

  if (action === 'getScore') {
    const matchId = body.matchId;
    if (!matchId) return res.status(400).json({ error: 'matchId is required' });
    if (!apiKey) return res.status(200).json({ ok: false, source: 'none', reason: 'CRICAPI_API_KEY not set on the server' });

    const result = await fetchScorecard(apiKey, matchId);
    if (!result.ok) {
      return res.status(200).json({ ok: false, source: 'cricapi', matchId, reason: result.reason });
    }

    const state = mapScorecardToState(result.match, matchId);
    if (!state) return res.status(200).json({ ok: false, source: 'cricapi', matchId, reason: 'scorecard parsed but no innings data yet (match may not have started)' });

    return res.status(200).json({
      ok: true, source: 'cricapi', matchId, state,
      matchInfo: {
        name: match.name,
        venue: match.venue,
        date: fmtDate(match),
        statusText: match.status || match.state
      }
    });
  }

  return res.status(400).json({ error: 'Invalid action. Use getMatches or getScore.' });
}
