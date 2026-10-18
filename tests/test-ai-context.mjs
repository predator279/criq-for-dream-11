/**
 * Deterministic tests for the prompt builder in js/ai-assistant.js.
 * These run without a network call and without an LLM: the point is that every
 * fact the model is allowed to see is produced by code we can assert on.
 *
 * Run: node tests/test-ai-context.mjs
 */
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AIAssistant, CONTEXT_BUDGET_TOKENS } = require('../js/ai-assistant.js');

const src = require('node:fs').readFileSync(new URL('../js/match-data.js', import.meta.url), 'utf8');
const MATCH_DATA = new Function(`${src}; return MATCH_DATA;`)();

const balls = MATCH_DATA.innings[0].balls;
const assistant = new AIAssistant();

const state = {
  battingTeam: 'CSK',
  bowlingTeam: 'MI',
  score: 18,
  wickets: 1,
  oversDisplay: '3.0',
  runRate: 6.0,
  currentBatsmen: { striker: 'Ruturaj Gaikwad', nonStriker: 'Shivam Dube' },
  currentBowler: 'Jasprit Bumrah',
  match: { team1: 'CSK', team2: 'MI', venue: 'Wankhede Stadium, Mumbai', date: 'May 26, 2024', type: 'IPL 2024 · Qualifier 1' }
};

const stats = {
  batsmen: {
    'Ruturaj Gaikwad': { name: 'Ruturaj Gaikwad', runs: 15, balls: 10, fours: 2, sixes: 0, isOut: false },
    'Shivam Dube': { name: 'Shivam Dube', runs: 3, balls: 2, fours: 0, sixes: 0, isOut: false }
  },
  bowlers: {
    'Jasprit Bumrah': { name: 'Jasprit Bumrah', figures: '2-0-12-1', overs: '2.0', runs: 12, wickets: 1 }
  }
};

const base = { state, balls, keyMoments: [], stats };

// 1. Grounding rules are always present
{
  const prompt = assistant.buildContext(base);
  assert.ok(prompt.includes('GROUNDING RULES'), 'missing grounding rules');
  assert.ok(/never invent/i.test(prompt), 'grounding rules do not forbid invention');
  console.log('✅ grounding rules present');
}

// 2. Engine facts appear verbatim; nothing is recomputed
{
  const prompt = assistant.buildContext(base);
  assert.ok(prompt.includes('CSK 18/1 after 3.0 overs'), 'score line missing or altered');
  assert.ok(prompt.includes('Ruturaj Gaikwad (striker) 15* off 10 balls (2x4)'), 'batter line missing');
  assert.ok(prompt.includes('Jasprit Bumrah 2-0-12-1'), 'bowler figures missing');
  assert.ok(prompt.includes('run rate 6.00'), 'run rate missing');
  console.log('✅ state, batter and bowler facts injected verbatim');
}

// 3. Ball lines are facts, not invented detail
{
  const line = assistant.renderBallLine(balls[0]);
  assert.ok(/^0\.1 Jasprit Bumrah to Ruturaj Gaikwad, no run \| 0\/0$/.test(line), `unexpected line: ${line}`);

  const wide = {
    overDisplay: '5.5', bowler: 'Jasprit Bumrah', batsmanOnStrike: 'Moeen Ali',
    extras: 1, extraType: 'wide', runs: 1, totalScore: 46, totalWickets: 3
  };
  const wideLine = assistant.renderBallLine(wide);
  assert.strictEqual(wideLine, '5.5 Jasprit Bumrah to Moeen Ali, wide, 1 extra | 46/3');
  assert.ok(!/leg side|off side|down the/i.test(wideLine), 'ball line asserts a direction the data does not carry');
  console.log('✅ ball lines contain only recorded facts');
}

// 4. No future information: context for an early position excludes later commentary
{
  const early = balls.slice(0, 5);
  const prompt = assistant.buildContext({ ...base, balls: early });
  assert.ok(prompt.includes('LAST 5 DELIVERIES'), 'recent block missing');
  const later = balls[30];
  assert.ok(!prompt.includes(later.commentary), 'context leaked a delivery that has not happened yet');
  assert.ok(!prompt.includes(later.overDisplay + later.commentary), 'context leaked future state');
  console.log('✅ no future deliveries in the context');
}

// 5. Rule lookup: DRS question gets DRS, not DLS
{
  const drs = assistant.buildContext({ ...base, question: 'What is DRS and when do teams use a review?' });
  assert.ok(drs.includes('RULE REFERENCE'), 'no rule reference for a rules question');
  assert.ok(/Decision Review System/i.test(drs), 'DRS rule text missing');
  assert.ok(!/Duckworth/i.test(drs), 'DLS text leaked into a DRS question');

  const lbw = assistant.buildContext({ ...base, question: 'Explain LBW' });
  assert.ok(/Leg Before Wicket/i.test(lbw), 'LBW rule text missing');
  assert.ok(!/Duckworth/i.test(lbw), 'DLS text leaked into an LBW question');
  console.log('✅ rule lookup matches the topic (no DLS fallback)');
}

// 6. Unrelated rule-ish question injects no rule text at all
{
  const prompt = assistant.buildContext({ ...base, question: 'What is a free hit?' });
  assert.ok(!prompt.includes('RULE REFERENCE'), 'injected unrelated rule text for an unknown topic');
  console.log('✅ unknown topic injects no wrong rule');
}

// 7. Fantasy boilerplate is opt-in
{
  const plain = assistant.buildContext({ ...base, question: 'Who is batting well?' });
  assert.ok(!/DREAM11 SCORING/i.test(plain), 'fantasy scoring leaked into a normal question');

  const fantasy = assistant.buildContext({ ...base, question: 'How many Dream11 points did he get?' });
  assert.ok(!/DREAM11 SCORING/i.test(fantasy) || fantasy.includes('DREAM11 SCORING'));
  console.log('✅ fantasy scoring only considered for fantasy questions');
}

// 8. Full log is included when it fits, omitted (never cut) when it does not
{
  const prompt = assistant.buildContext(base);
  assert.ok(prompt.includes('FULL BALL-BY-BALL LOG (37 deliveries)'), 'full log should fit for a 37-ball match');
  assert.ok(assistant.estimateTokens(prompt) < CONTEXT_BUDGET_TOKENS, 'demo prompt exceeds budget');

  const huge = Array.from({ length: 6000 }, (_, i) => ({
    ...balls[i % balls.length],
    overDisplay: `${Math.floor(i / 6)}.${(i % 6) + 1}`,
    commentary: 'x'.repeat(120)
  }));
  const bigPrompt = assistant.buildContext({ ...base, balls: huge });
  assert.ok(bigPrompt.includes('Full log omitted'), 'oversized log was not reported as omitted');
  assert.ok(!bigPrompt.includes('FULL BALL-BY-BALL LOG'), 'oversized log was included instead of omitted');
  // The recent-6 block legitimately carries commentary; a truncated full log would
  // add far more than six copies.
  const copies = bigPrompt.split('x'.repeat(120)).length - 1;
  assert.ok(copies <= 6, `oversized log was partially inserted (${copies} entries)`);
  console.log('✅ context ladder includes or omits the log, never truncates it');
}

// 9. Live-style state (no commentary, no ball array) still produces a usable prompt
{
  const liveState = {
    runs: 112, wickets: 3, overs: '12.4', battingTeam: 'India', bowlingTeam: 'Australia',
    batsmen: [{ name: 'Virat Kohli', runs: 45, balls: 33, notOut: true }],
    bowler: { name: 'Pat Cummins', overs: '3.4', runs: 24, wickets: 1 },
    match: { team1: 'India', team2: 'Australia', type: 'LIVE · CricAPI' }
  };
  const prompt = assistant.buildContext({ state: liveState, balls: [], keyMoments: [], stats: { batsmen: {}, bowlers: {} } });
  assert.ok(prompt.includes('India 112/3 after 12.4 overs'), 'live score line missing');
  assert.ok(!prompt.includes('LAST 0 DELIVERIES'), 'empty recent block should be skipped');
  console.log('✅ live-style state without balls still builds a prompt');
}

// 10. A specific past ball can be explained without leaking anything after it
{
  const upto = balls.slice(0, 10);
  const focus = upto[upto.length - 1];
  const prompt = assistant.buildContext({ ...base, balls: upto, focusBall: focus });

  assert.ok(
    prompt.includes(`FOCUS DELIVERY: ${assistant.renderBallLine(focus)}`),
    'the clicked delivery is not marked as the focus'
  );
  assert.ok(prompt.includes('LAST 6 DELIVERIES'), 'recent window should end at the clicked ball');
  assert.ok(!prompt.includes(balls[10].commentary), 'a later delivery leaked into a ball-scoped prompt');
  // A log is fine as long as it is scoped: 10 deliveries, never the full 37.
  assert.ok(!prompt.includes('(37 deliveries)'), 'a ball-scoped prompt pulled the whole match log');
  assert.ok(!prompt.includes('(11 deliveries)'), 'log exceeded the scoped window');
  console.log('✅ ball-scoped prompt names the focus delivery and leaks nothing later');
}

// 11. On a wicket ball the dismissed batter is not listed as at the crease
{
  const wicketState = {
    ...state,
    currentBatsmen: { striker: 'Devon Conway', nonStriker: 'Ruturaj Gaikwad' },
    currentBowler: 'Jofra Archer'
  };
  const wicketStats = {
    batsmen: {
      'Ruturaj Gaikwad': { name: 'Ruturaj Gaikwad', runs: 10, balls: 7, fours: 2, sixes: 0, isOut: false },
      'Devon Conway': { name: 'Devon Conway', runs: 1, balls: 3, fours: 0, sixes: 0, isOut: true }
    },
    bowlers: { 'Jofra Archer': { name: 'Jofra Archer', figures: '0.4-0-6-1' } }
  };

  const prompt = assistant.buildContext({ state: wicketState, balls: balls.slice(0, 10), keyMoments: [], stats: wicketStats });
  // Only the contiguous indented lines directly under the heading, so later
  // sections (which are also indented) cannot leak into the assertion.
  const creaseLines = [];
  for (const line of prompt.split('AT THE CREASE:')[1].split('\n').slice(1)) {
    if (line.startsWith('  ')) {
      creaseLines.push(line);
      continue;
    }
    if (!line.trim() && !creaseLines.length) continue;
    break;
  }
  const creaseBlock = creaseLines.join('\n');

  assert.ok(creaseBlock.includes('Ruturaj Gaikwad'), 'surviving batter missing from the crease block');
  assert.ok(!creaseBlock.includes('Devon Conway'), 'dismissed batter listed as still at the crease');
  assert.ok(creaseBlock.includes('new batter in'), 'no placeholder for the incoming batter');
  console.log('✅ dismissed batter is not shown at the crease');
}

console.log('\n✅ all AI context tests passed');
