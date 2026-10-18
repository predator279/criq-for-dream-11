# 🏏 CricIQ — AI-Powered Live Match Companion

## What fan problem are you solving?

Cricket fans face three recurring frustrations during live matches: missing key moments
(a bathroom break during a crucial DRS review), not understanding complex decisions
(why was that LBW given not out?), and joining a match late with no quick way to catch up
beyond a dry scorecard. Existing tools like Cricbuzz show data but don't *explain* it.

## How does your solution help?

CricIQ is a second-screen AI companion that sits alongside your TV/stream. Three
buttons solve the three problems: **"What just happened"** explains the latest ball
in plain language — including rules like DRS, free hits, and field restrictions.
**"Catch me up"** generates a conversational match summary covering score, key
moments, momentum, and standout performers. **"Ask me anything"** lets you ask any
match-related question naturally. The app processes ball-by-ball data through
an AI layer, making cricket accessible to casual fans and newcomers without
losing depth for hardcore followers.

### A guided tour on first visit

No video to host and nothing to keep in sync with the UI: the app walks a new
user through the real interface on first load. Five spotlight steps cover match
selection, the scorecard, the clickable timeline, the three AI modes and the
playback controls. The tour is dismissible, keyboard-driven (arrows, Escape),
respects `prefers-reduced-motion`, and only runs once per browser. The **?**
button in the header replays it at any time.

A one-line hint under the timeline ("Tap any ball to ask about that delivery")
stays until the fan opens a per-ball menu for the first time.

### Ask about any ball, not just the latest

Every ball in the timeline is clickable (mouse or keyboard). It opens a small menu
with **"What just happened"** for that exact delivery and **"Ask about this ball"**,
which pre-fills the question box. Questions are scoped to that ball: the model is
given the state and deliveries up to that point and nothing after it, so scrubbing
back to over 2 never reveals how the innings ended.

### The rule this app is built around

The model narrates; it never calculates. Every score, run count, ball count, batter
figure and bowler figure is computed in JavaScript from the match data and handed to
the model as a fact. The prompt also forbids using anything outside that fact block,
including the model's own memory of the fixture. If a number is not in the data, the
app says so rather than guessing.

## Which AI tools did you use?

Google Gemini (gemini-3.1-flash-lite, free tier) for natural language generation —
match explanations, summaries, and Q&A — with Groq (openai/gpt-oss-120b) as an
automatic fallback provider if Gemini rate-limits. Browser calls go through a
secure same-origin serverless proxy (Vercel Function), so API keys live only in
server-side environment variables — never in the shipped client code.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:4173. The dev server (`server.mjs`) serves the static app
AND the `/api/*` functions, so AI actions and the match ribbon work locally.

### Where the API keys go

Create `.env.local` in the project root (copy `.env.example`) and paste the values:

```
GEMINI_API_KEY=...
GROQ_API_KEY=...
CRICAPI_API_KEY=...
```

Then restart `npm run dev`. In the startup line you should see which file was read:

```
CricIQ dev server → http://localhost:4173
  secrets: .env.local (GEMINI_API_KEY, GROQ_API_KEY)
  Gemini key detected · no GROQ_API_KEY fallback · no CRICAPI_API_KEY → demo mode only
```

Rules of the road:

- `.env.local` is **gitignored** and is only read by the local dev server.
- Prefer TOML? `secrets.toml` works too — copy `secrets.example.toml`. Flat
  `KEY = "value"` pairs only.
- Real environment variables beat every file, and files are read in the order
  `.env.local` → `secrets.toml` → `.env`.
- Keys never belong in `js/config.js`. That file is shipped to the browser.
- On Vercel the same names go in Settings → Environment Variables. No file is
  deployed.

### Live matches via CricAPI

Without a key the app shows the simulated demo only. To fill the LIVE / UPCOMING /
COMPLETED columns with real matches:

1. Get a free key at https://cricketdata.org (free tier: 100 hits/day).
2. Either set it locally:

   ```bash
   CRICAPI_API_KEY=your_key npm run dev     # (PowerShell: $env:CRICAPI_API_KEY="your_key"; npm run dev)
   ```

   …or add `CRICAPI_API_KEY` to Vercel → Settings → Environment Variables on the
   deployed project.

The ribbon auto-refreshes every 10 s while a live match is selected; clicking a
LIVE card starts polling `/api/live-match` and the scorecard updates in place.
Speed selector: in demo mode it is the ms between balls; with a live match it is
the polling interval, floored at 10 s so a 100-hit/day key is not burned in minutes.

## What is simulated, and what is real

This matters more than the feature list, so it is stated plainly:

- **The match is scripted.** The demo replays a hand-authored six-over powerplay
  (37 deliveries) of CSK vs MI. It is not a live feed and it is not a full match.
- **Timing is simulated.** The ball interval is a playback speed setting, not a
  real broadcast clock.
- **Live mode is real but limited.** With `CRICAPI_API_KEY` set, the LIVE column
  shows real fixtures and the scorecard reflects real scores. CricAPI's free tier
  returns a scorecard, not deliveries, so there is no ball-by-ball commentary in
  live mode — the app never fabricates balls to fill the gap.
- **The AI is real.** Gemini (with Groq as fallback) writes the prose, but every
  number it is given comes from the deterministic state layer.

## Tests

```bash
npm test
```

Five suites, none of which need an API key or a network call:

- `tests/verify-data.js` — the scripted match is internally consistent (running
  totals, extras maths, strike rotation, batter and bowler figures).
- `tests/test-engine-state.mjs` — deterministic state at any ball index: a
  rewound position matches a played one exactly and sees no later wicket.
- `tests/test-ai-context.mjs` — the prompt builder sends only facts, never leaks
  a delivery that has not happened yet, matches rules to the right topic, and
  includes or omits the ball log instead of truncating it.
- `tests/test-tour.mjs` — the tour cannot silently rot: every step's selector
  must still exist in the markup, script order must be correct, and the styles
  (including reduced-motion) must be present.
- `tests/test-env-loader.mjs` — the local secret loader: parsing, quoting,
  precedence and the gitignore rules, using throwaway files.
- `tests/test-ai-proxy.mjs` — the serverless AI proxy's control flow, including
  the no-key and fallback paths.

## Setup / Deployment (Vercel)

1. Import this repo into Vercel (Hobby/free tier — zero config, the static app
   and `/api` functions are detected automatically).
2. Project → Settings → Environment Variables → add:
   - `GEMINI_API_KEY` (free tier, ai.google.dev)
   - `GROQ_API_KEY` (free tier, console.groq.com — optional fallback)
3. Deploy. Keys stay server-side; evaluators need no key at all.

## Demo

[Live Demo](YOUR_DEPLOYMENT_URL_HERE) — works out of the box once `GEMINI_API_KEY`
is set on the host: evaluators need no key of their own.
