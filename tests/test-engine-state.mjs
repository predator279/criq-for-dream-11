/**
 * Deterministic tests for the match engine's derived state.
 * Covers the two defects fixed in this pass:
 *   - "Next ball" stepped silently before Play had ever been pressed
 *   - overs were read off the ball label ("5.6") instead of legal deliveries ("6.0")
 *
 * Run: node tests/test-engine-state.mjs
 */
import assert from 'node:assert';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);

const dataSrc = fs.readFileSync(new URL('../js/match-data.js', import.meta.url), 'utf8');
const engineSrc = fs.readFileSync(new URL('../js/match-engine.js', import.meta.url), 'utf8');

const { MATCH_DATA, MatchEngine } = new Function(
  `${dataSrc}\n${engineSrc}\nreturn { MATCH_DATA, MatchEngine };`
)();

// 1. Stepping before Play must reach the UI callback
{
  const engine = new MatchEngine(MATCH_DATA);
  const seen = [];
  engine.onBallPlayed = (ball, index) => seen.push({ over: ball.overDisplay, index });

  const ball = engine.nextBall();

  assert.ok(ball, 'nextBall() returned no ball');
  assert.strictEqual(seen.length, 1, 'nextBall() did not fire onBallPlayed when Play was never pressed');
  assert.strictEqual(seen[0].over, '0.1');
  assert.strictEqual(seen[0].index, 0);
  console.log('✅ Next ball renders without pressing Play first');
}

// 2. Overs are derived from legal deliveries, not the ball label
{
  const engine = new MatchEngine(MATCH_DATA);

  for (let i = 0; i < 6; i++) engine.nextBall();
  assert.strictEqual(engine.getLegalBallsPlayed(), 6);
  assert.strictEqual(engine.getOversDisplay(), '1.0', 'six legal balls should read 1.0 overs');
  assert.strictEqual(engine.getMatchState().oversDisplay, '1.0');

  // Every delivery either adds exactly one legal ball or none (wide / no-ball).
  let wides = 0;
  while (engine.currentBallIndex < engine.totalBalls - 1) {
    const prev = engine.getLegalBallsPlayed();
    const ball = engine.nextBall();
    const now = engine.getLegalBallsPlayed();
    const shouldCount = ball.extraType !== 'wide' && ball.extraType !== 'noball';
    if (!shouldCount) wides += 1;
    assert.strictEqual(
      now - prev,
      shouldCount ? 1 : 0,
      `ball ${ball.overDisplay} (${ball.extraType || 'legal'}): legal count changed by ${now - prev}`
    );
  }

  assert.ok(wides > 0, 'fixture should contain at least one wide to prove the rule');
  assert.strictEqual(engine.getLegalBallsPlayed(), 36, '37 deliveries incl. 1 wide = 36 legal balls');
  console.log('✅ overs counted from legal deliveries (wides excluded)');
}

// 3. Playing to the end produces the verified final state
{
  const engine = new MatchEngine(MATCH_DATA);
  let ended = 0;
  engine.onMatchEnd = () => { ended += 1; };

  let guard = 0;
  while (engine.currentBallIndex < engine.totalBalls - 1 && guard < 200) {
    engine.nextBall();
    guard += 1;
  }

  const state = engine.getMatchState();
  assert.strictEqual(state.score, 48);
  assert.strictEqual(state.wickets, 3);
  assert.strictEqual(state.oversDisplay, '6.0', 'a completed six-over innings must read 6.0');
  assert.strictEqual(engine.getBallsPlayed().length, 37);
  assert.strictEqual(ended, 1, 'onMatchEnd should fire exactly once');

  const summary = engine.getMatchSummary();
  assert.ok(summary.includes('48/3 after 6.0 overs'), `summary overs wrong: ${summary.split('\n')[1]}`);
  console.log('✅ full replay ends at 48/3 after 6.0 overs');
}

// 4. Batter + extras must reconcile with the team score at every ball
{
  const engine = new MatchEngine(MATCH_DATA);
  let checked = 0;

  while (engine.currentBallIndex < engine.totalBalls - 1) {
    engine.nextBall();
    const stats = engine.getBatsmanStats();
    const batsmanRuns = Object.values(stats).reduce((sum, b) => sum + b.runs, 0);
    const extras = engine.getBallsPlayed().reduce((sum, b) => sum + (b.runs - (b.batsmanRuns || 0)), 0);
    const state = engine.getMatchState();
    assert.strictEqual(
      batsmanRuns + extras,
      state.score,
      `ball ${engine.currentBallIndex + 1}: bat ${batsmanRuns} + extras ${extras} != team ${state.score}`
    );
    checked += 1;
  }

  assert.strictEqual(checked, 37);
  console.log('✅ batter runs + extras reconcile with the team score on all 37 balls');
}

// 5. Live-style provider state still renders a usable overs string
{
  const engine = new MatchEngine(MATCH_DATA);
  engine.switchToLive('dummy-match-id');
  engine.liveProvider.liveMatchData = {
    state: {
      runs: 112, wickets: 3, overs: '12.4', battingTeam: 'India', bowlingTeam: 'Australia',
      batsmen: [], bowler: null, statusText: 'India need 54 off 44'
    },
    matchInfo: { name: 'India vs Australia', venue: 'MCG' }
  };
  assert.strictEqual(engine.getOversDisplay(), '12.4');
  assert.strictEqual(engine.getLegalBallsPlayed(), 0);

  // switchToLive() starts the poll timer; stop it so the test process can exit.
  engine.pause();
  console.log('✅ live provider falls back to the feed overs value');
}

// 6. State at any index is independent of how you got there
{
  const played = new MatchEngine(MATCH_DATA);
  for (let i = 0; i < 25; i++) played.nextBall();

  const fresh = new MatchEngine(MATCH_DATA);
  const rewindState = fresh.getStateAtIndex(24);
  const rewindStats = fresh.getBatsmanStats(24);

  assert.deepStrictEqual(rewindState, played.getMatchState(), 'rewound state differs from played state');
  assert.deepStrictEqual(rewindStats, played.getBatsmanStats(), 'rewound batter stats differ');
  assert.deepStrictEqual(fresh.getBowlerStats(24), played.getBowlerStats(), 'rewound bowler stats differ');

  // A rewound position must not see later wickets: ball 1.4 is wicket one,
  // ball 4.3 is wicket two, ball 5.4 is wicket three.
  assert.strictEqual(fresh.getStateAtIndex(8).wickets, 0, 'ball 1.3 should show no wicket');
  assert.strictEqual(fresh.getStateAtIndex(9).wickets, 1, 'ball 1.4 should show one wicket down');
  assert.strictEqual(fresh.getStateAtIndex(26).wickets, 2, 'ball 4.3 should show two wickets down');
  assert.strictEqual(fresh.getStateAtIndex(33).wickets, 3, 'ball 5.4 should show three wickets down');
  assert.strictEqual(played.getMatchState().wickets, 1, '25 deliveries means only the first wicket has fallen');
  assert.strictEqual(fresh.getStateAtIndex(-1).wickets, 0, 'pre-match has no wickets');

  // Before the first ball, the rewind is the pre-match state.
  const pre = fresh.getStateAtIndex(-1);
  assert.strictEqual(pre.score, 0);
  assert.strictEqual(pre.ballsPlayed, 0);
  assert.strictEqual(pre.oversDisplay, '0.0');

  // Out-of-range indexes clamp instead of throwing.
  assert.strictEqual(fresh.getStateAtIndex(9999).score, 48);
  console.log('✅ state at any ball index is deterministic and spoiler-free');
}

console.log('\n✅ all engine state tests passed');
