/**
 * Throws if the scripted MATCH_DATA is internally inconsistent.
 * Run with: node tests/verify-data.js
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'match-data.js'), 'utf8');
const MATCH_DATA = new Function(`${src}; return MATCH_DATA;`)();

const balls = MATCH_DATA.innings[0].balls;
const errors = [];

// 1. Sequential ids
balls.forEach((b, i) => {
  if (b.id !== i + 1) errors.push(`Ball at index ${i} has id ${b.id}, expected ${i + 1}`);
});

// 2. Running totals recompute (extras: wide = 1, noball ≥1 penalty, others use b.extras)
let score = 0, wickets = 0;
balls.forEach(b => {
  let expectedRuns = b.batsmanRuns;
  if (b.extraType === 'wide') expectedRuns = 1;
  else if (b.extraType) expectedRuns += b.extras;
  if (b.runs !== expectedRuns) {
    errors.push(`Ball ${b.id}: runs ${b.runs} != expected ${expectedRuns} (batsmanRuns+extras)`);
  }

  score += b.runs;
  if (b.isWicket) wickets += 1;
  if (b.totalScore !== score) errors.push(`Ball ${b.id}: totalScore ${b.totalScore} != recomputed ${score}`);
  if (b.totalWickets !== wickets) errors.push(`Ball ${b.id}: totalWickets ${b.totalWickets} != recomputed ${wickets}`);

  const isBoundary = b.batsmanRuns === 4 && !b.extraType;
  const isSix = b.batsmanRuns === 6 && !b.extraType;
  if (b.isBoundary !== isBoundary) errors.push(`Ball ${b.id}: isBoundary flag mismatch`);
  if (b.isSix !== isSix) errors.push(`Ball ${b.id}: isSix flag mismatch`);
  const isDot = b.batsmanRuns === 0 && !b.extraType && !b.isWicket;
  if (b.isDot !== isDot) errors.push(`Ball ${b.id}: isDot flag mismatch (${b.isDot} vs ${isDot})`);
  if (wickets > 3) errors.push(`Ball ${b.id}: more than 3 wickets`);
});

// 3. Wicket coherence
balls.forEach(b => {
  if (b.isWicket && !b.dismissedBatsman) errors.push(`Ball ${b.id}: wicket without dismissedBatsman`);
  if (!b.isWicket && (b.wicketType || b.dismissedBatsman)) errors.push(`Ball ${b.id}: dismissal fields on non-wicket ball`);
});

// 4. Strike rotation (pairwise): odd batsmanRuns swap ends; wickets rotate per end rule:
//    dismissed striker -> replacement takes striker's end (must appear as next striker);
//    dismissed non-striker -> striker retains strike; wide balls skip (no rotation).
for (let i = 1; i < balls.length; i++) {
  const prev = balls[i - 1], cur = balls[i];
  if (prev.extraType === 'wide' || prev.extraType === 'noball') continue; // retried balls, no change
  if (prev.isWicket && prev.dismissedBatsman === prev.batsmanOnStrike) continue; // dismissed striker: replacement takes the striker's end, resync
  if (prev.isWicket && prev.dismissedBatsman === prev.batsmanNonStrike) {
    // new batsman replaces at the dismissed end; striker KEEPS strike
    if (cur.batsmanOnStrike !== prev.batsmanOnStrike) {
      errors.push(`Ball ${cur.id}: after non-striker ${prev.dismissedBatsman} out, striker should stay ${prev.batsmanOnStrike}, got ${cur.batsmanOnStrike}`);
    }
    continue;
  }
  const swap = prev.batsmanRuns % 2 === 1;
  const expectedStriker = swap ? prev.batsmanNonStrike : prev.batsmanOnStrike;
  if (cur.batsmanOnStrike !== expectedStriker) {
    errors.push(`Ball ${cur.id}: rotation after ball ${prev.id} wrong (expected striker ${expectedStriker}, got ${cur.batsmanOnStrike})`);
  }
}

// 5. First pair sanity
if (balls[0].batsmanOnStrike !== 'Ruturaj Gaikwad' || balls[0].batsmanNonStrike !== 'Devon Conway') {
  errors.push(`Opening pair wrong: ${balls[0].batsmanOnStrike}, ${balls[0].batsmanNonStrike}`);
}

// 6. Batsman stats (wide does not count as ball faced)
const stats = {};
balls.forEach(b => {
  if (b.extraType === 'wide') return;
  const s = stats[b.batsmanOnStrike] || (stats[b.batsmanOnStrike] = { runs: 0, balls: 0, fours: 0, sixes: 0 });
  s.runs += b.batsmanRuns;
  s.balls += 1;
  if (b.isBoundary) s.fours += 1;
  if (b.isSix) s.sixes += 1;
});
const expect = {
  'Ruturaj Gaikwad': { runs: 21, balls: 15, fours: 4, sixes: 0 },
  'Devon Conway':    { runs: 1,  balls: 3,  fours: 0, sixes: 0 },
  'Shivam Dube':     { runs: 13, balls: 9,  fours: 1, sixes: 1 },
  'MS Dhoni':        { runs: 12, balls: 7,  fours: 1, sixes: 1 },
  'Moeen Ali':       { runs: 0,  balls: 2,  fours: 0, sixes: 0 }
};
for (const name in expect) {
  const got = stats[name] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  for (const k in expect[name]) {
    if (got[k] !== expect[name][k]) errors.push(`${name}: ${k} ${got[k]} != expected ${expect[name][k]}`);
  }
}

// 7. Bowler figures (byes/legbyes excluded; run outs not credited; entity match engine format "o-m-r-w")
const bowlers = {};
balls.forEach(b => {
  const s = bowlers[b.bowler] || (bowlers[b.bowler] = { legalBalls: 0, runs: 0, wickets: 0 });
  const isLegal = b.extraType !== 'wide' && b.extraType !== 'noball';
  if (isLegal) s.legalBalls += 1;
  s.runs += (b.extraType === 'bye' || b.extraType === 'legbye') ? 0 : b.runs;
  if (b.isWicket && b.wicketType !== 'run_out') s.wickets += 1;
});
const expectBowler = {
  'Jasprit Bumrah': '3-0-14-1',
  'Jofra Archer':   '2-0-18-1',
  'Hardik Pandya':  '1-0-16-0'
};
for (const name in expectBowler) {
  const s = bowlers[name];
  if (!s) { errors.push(`Bowler ${name} missing`); continue; }
  const full = Math.floor(s.legalBalls / 6), part = s.legalBalls % 6;
  const figures = `${full}${part ? '.' + part : ''}-${0}-${s.runs}-${s.wickets}`;
  if (figures !== expectBowler[name]) {
    errors.push(`Bowler ${name}: figures ${figures} != expected ${expectBowler[name]}`);
  }
}

// 8. Innings ends at exactly 48/3
const last = balls[balls.length - 1];
if (last.totalScore !== 48 || last.totalWickets !== 3) {
  errors.push(`Final score ${last.totalScore}/${last.totalWickets} != 48/3`);
}

if (errors.length) {
  console.error('❌ MATCH_DATA verification FAILED:');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
} else {
  console.log(`✅ MATCH_DATA verified: ${balls.length} balls, final ${last.totalScore}/${last.totalWickets}, rotation OK, stats OK, bowlers OK.`);
}
