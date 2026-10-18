#!/usr/bin/env node
/**
 * CricIQ — Cricsheet ingestion probe
 *
 * Proves the "replay a real, finished match as a live feed" path without any
 * API key. Downloads the public Cricsheet IPL archive once (cached in the OS
 * temp dir), extracts one match, normalizes every delivery into the SAME
 * event envelope the live API adapter will emit, and prints the replay
 * schedule that a feed server would hand to clients.
 *
 * Usage:
 *   node scripts/cricsheet-probe.mjs                 # 2026 IPL final
 *   node scripts/cricsheet-probe.mjs 1535465
 *   node scripts/cricsheet-probe.mjs 1535465 --emit data/matches/1535465.json
 *
 * Data: https://cricsheet.org — Open Data Commons Attribution (ODC-By) licence.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const run = promisify(execFile);

const ZIP_URL = 'https://cricsheet.org/downloads/ipl_json.zip';
const CACHE_DIR = join(tmpdir(), 'criciq-cricsheet');
const CACHE_ZIP = join(CACHE_DIR, 'ipl_json.zip');

/* ----------------------------- fetch + extract ----------------------------- */

async function ensureArchive() {
  if (existsSync(CACHE_ZIP)) return CACHE_ZIP;
  await mkdir(CACHE_DIR, { recursive: true });
  console.log(`downloading ${ZIP_URL} …`);
  const res = await fetch(ZIP_URL);
  if (!res.ok) throw new Error(`Cricsheet download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(CACHE_ZIP, buf);
  console.log(`cached ${(buf.length / 1e6).toFixed(1)} MB → ${CACHE_ZIP}`);
  return CACHE_ZIP;
}

async function loadMatch(matchId) {
  const zip = await ensureArchive();
  const outDir = join(CACHE_DIR, 'extract');
  const target = join(outDir, `${matchId}.json`);
  if (!existsSync(target)) {
    await mkdir(outDir, { recursive: true });
    await run('unzip', ['-o', '-q', zip, `${matchId}.json`, '-d', outDir]);
  }
  return JSON.parse(await readFile(target, 'utf8'));
}

/* -------------------------- Cricsheet → feed events -------------------------- */

const WICKET_DELAY_MS = 8000;
const SIX_DELAY_MS = 5000;
const FOUR_DELAY_MS = 3000;
const BASE_DELAY_MS = 24_000;   // T20 average gap between deliveries
const OVER_BREAK_MS = 20_000;
const INNINGS_BREAK_MS = 120_000;

function extrasOf(delivery) {
  const e = delivery.extras || {};
  const type = e.wides ? 'wide'
    : e.noballs ? 'noball'
      : e.byes ? 'bye'
        : e.legbyes ? 'legbye'
          : e.penalty ? 'penalty'
            : null;
  return { type, count: (e.wides || 0) + (e.noballs || 0) + (e.byes || 0) + (e.legbyes || 0) + (e.penalty || 0) };
}

/** Counts toward the 10 wickets in the scorecard (retired hurt does not). */
function isDismissal(wicket) {
  return Boolean(wicket) && wicket.kind !== 'retired hurt';
}

function commentaryLine(delivery, extras, runs) {
  const { bowler, batter, wickets } = delivery;
  const total = runs.total;
  if (wickets && wickets.length) {
    const w = wickets[0];
    const fielder = w.fielders && w.fielders[0] ? w.fielders[0].name : null;
    const how = {
      caught: `caught by ${fielder || 'a fielder'}`,
      bowled: 'bowled',
      lbw: 'lbw',
      'run out': `run out${fielder ? ` (${fielder})` : ''}`,
      stumped: `stumped${fielder ? ` by ${fielder}` : ''}`,
      'caught and bowled': 'caught and bowled',
      'hit wicket': 'hit wicket'
    }[w.kind] || w.kind;
    return `${bowler} to ${batter}, OUT! ${w.player_out} ${how}.`;
  }
  if (extras.type === 'wide') return `${bowler} to ${batter}, wide, ${total} extra.`;
  if (extras.type === 'noball') return `${bowler} to ${batter}, no ball, ${total} run${total === 1 ? '' : 's'}.`;
  if (extras.type === 'bye' || extras.type === 'legbye') return `${bowler} to ${batter}, ${extras.type}s, ${total} run${total === 1 ? '' : 's'}.`;
  if (total === 0) return `${bowler} to ${batter}, no run.`;
  if (total === 4) return `${bowler} to ${batter}, FOUR!`;
  if (total === 6) return `${bowler} to ${batter}, SIX!`;
  return `${bowler} to ${batter}, ${total} run${total === 1 ? '' : 's'}.`;
}

/**
 * Normalizes a Cricsheet match into the canonical feed envelope.
 * The `seq` is monotonic across the whole match, which is what clients resume from.
 */
export function normalizeMatch(raw, { matchId } = {}) {
  const info = raw.info || {};
  const events = [];
  let seq = 0;
  let elapsed = 0;         // virtual match clock, ms
  let score = 0;
  let wickets = 0;
  let lastOverKey = null;

  raw.innings.forEach((innings, inningsIndex) => {
    if (inningsIndex > 0) {
      elapsed += INNINGS_BREAK_MS;
      events.push({
        seq: ++seq,
        matchId,
        type: 'innings_start',
        innings: inningsIndex + 1,
        team: innings.team,
        atMs: elapsed,
        score: { runs: score, wickets }
      });
      score = 0;
      wickets = 0;
      lastOverKey = null;
    }

    for (const over of innings.overs || []) {
      for (const delivery of over.deliveries || []) {
        const overKey = `${inningsIndex}:${over.over}`;
        if (lastOverKey !== null && overKey !== lastOverKey) elapsed += OVER_BREAK_MS;
        lastOverKey = overKey;

        const extras = extrasOf(delivery);
        const runs = delivery.runs || { batter: 0, extras: 0, total: 0 };
        score += runs.total;
        const dismissals = (delivery.wickets || []).filter(isDismissal);
        wickets += dismissals.length;

        const isLegal = extras.type !== 'wide' && extras.type !== 'noball';
        let delay = BASE_DELAY_MS;
        if (dismissals.length) delay += WICKET_DELAY_MS;
        else if (runs.total === 6) delay += SIX_DELAY_MS;
        else if (runs.total === 4) delay += FOUR_DELAY_MS;
        elapsed += delay;

        const [overNo, ballNo] = String(delivery.actual_delivery || `${over.over}.1`).split('.');

        events.push({
          seq: ++seq,
          matchId,
          type: 'delivery',
          innings: inningsIndex + 1,
          team: innings.team,
          atMs: elapsed,
          over: {
            index: Number(overNo),
            ball: Number(ballNo),
            display: delivery.actual_delivery || null,
            legal: isLegal
          },
          acting: {
            batter: delivery.batter,
            nonStriker: delivery.non_striker,
            bowler: delivery.bowler
          },
          runs: {
            batter: runs.batter,
            extras: runs.extras,
            total: runs.total,
            extraType: extras.type
          },
          score: { runs: score, wickets },
          wickets: dismissals.map(w => ({
            playerOut: w.player_out,
            kind: w.kind,
            fielders: (w.fielders || []).map(f => f.name)
          })),
          text: commentaryLine(delivery, extras, runs),
          source: 'cricsheet'
        });
      }
    }
  });

  events.push({
    seq: ++seq,
    matchId,
    type: 'match_end',
    atMs: elapsed,
    score: { runs: score, wickets },
    outcome: info.outcome || null,
    source: 'cricsheet'
  });

  const teams = info.teams || [];
  return {
    match: {
      id: matchId,
      teams,
      venue: [info.venue, info.city].filter(Boolean).join(', '),
      date: (info.dates || [])[0] || null,
      event: (info.event && info.event.name) || info.match_type || '',
      eventStage: (info.event && (info.event.match_number || info.event.stage)) || null,
      oversPerInnings: info.overs || 20,
      ballsPerOver: info.balls_per_over || 6,
      outcome: info.outcome || null,
      playerOfMatch: info.player_of_match || []
    },
    events
  };
}

/* --------------------------------- CLI --------------------------------- */

const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`;

async function main() {
  const args = process.argv.slice(2);
  const matchId = args.find(a => /^\d+$/.test(a)) || '1535465';
  const emitAt = args.includes('--emit') ? args[args.indexOf('--emit') + 1] : null;

  const raw = await loadMatch(matchId);
  const feed = normalizeMatch(raw, { matchId });
  const deliveries = feed.events.filter(e => e.type === 'delivery');

  console.log(`\n${feed.match.teams.join(' vs ')} — ${feed.match.event} (${feed.match.date})`);
  console.log(`${feed.match.venue} · ${feed.match.outcome ? `winner: ${feed.match.outcome.winner || 'no result'}` : 'no result'}`);
  console.log(`events=${feed.events.length} deliveries=${deliveries.length} innings=${raw.innings.length}`);
  console.log(`replay duration at 1x = ${mmss(feed.events.at(-1).atMs)}`);

  console.log('\nfirst 8 feed events:');
  for (const e of feed.events.slice(0, 8)) {
    console.log(`  #${String(e.seq).padStart(3)} ${mmss(e.atMs)} ${e.type.padEnd(13)} ${e.score ? `${e.score.runs}/${e.score.wickets}` : ''} ${e.text || ''}`);
  }

  console.log('\nwicket + boundary events:');
  const highlights = feed.events.filter(e => e.type === 'delivery' && (e.wickets.length || e.runs.total >= 4));
  for (const e of highlights.slice(0, 10)) {
    console.log(`  #${String(e.seq).padStart(3)} ${mmss(e.atMs)} ${e.over.display} ${e.score.runs}/${e.score.wickets} ${e.text}`);
  }

  const final = feed.events.at(-2).score;
  console.log(`\nfinal: ${final.runs}/${final.wickets}`);

  if (emitAt) {
    await mkdir(join(emitAt, '..'), { recursive: true });
    await writeFile(emitAt, JSON.stringify(feed, null, 2));
    console.log(`wrote ${emitAt} (${(JSON.stringify(feed).length / 1024).toFixed(0)} KB)`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('cricsheet-probe.mjs')) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
