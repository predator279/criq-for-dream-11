# 🏏 CricIQ — Final Build Specification (post-discussion, Oct 2026)

> **Status**: review draft. Not yet built. One working local site to come next.

---

## 1. What this document is

The ruling plan for what we actually build now. It resolves the discussion Manish and the agent had about:
- real-time ingestion shape,
- win-probability as non-core,
- Tavily as deferred,
- latency perf features as deferred,
- "What just happened" as the exact mode name,
- and build a working local site first, *then* push to GitHub and deploy to Vercel.

Read this file, then review it with Manish. Once reviewed, the first build pass starts here.

---

## 2. What we are building (now)

Three modes, exactly these names:

1. **"What just happened"** — explains the latest ball in 3–4 sentences, including rules.
2. **"Catch me up"** — conversational match summary for a fan who just tuned in.
3. **"Ask me anything"** — free-form Q&A about the match (and, later, outside cricket only when the app can't answer and the query is genuinely relevant).

No win-probability mode now. No Tavily now. No advanced latency engineering now. Those stay in the open-items list and can be picked later.

---

## 3. Guiding principles (short, because we agreed)

1. **Deterministic first, LLM second.** Score, overs, runs, wickets, strike rotation, bowler figures — all computed in code. LLM narrates; it does not invent numbers.
2. **One data path.** Scripted demo now; replay-from-Cricsheet later behind the same interface. AI layer sees the same shape either way.
3. **Fail loudly on bad data, gracefully on bad models.** Invalid ball data is caught and logged before it reaches the AI; if an LLM call fails, show the error and let the user retry or use the other provider.
4. **Honest in the UI and docs.** This demo is scripted. If we add Cricsheet replay later, say clearly that timing is simulated. If we add a live API later, say clearly what it can and cannot do.

---

## 4. Scope for this build

### In scope

- A working local site with:
  - match selection (at least a couple of scripted matches),
  - a ball-by-ball timeline,
  - a scorecard that updates from the data,
  - playback controls,
  - the three AI modes wired to real Gemini + Groq calls (or a working offline fallback if no key is available),
  - an API-key entry flow that works locally.
- Correct, dynamically computed match state. No hardcoded figures in the AI prompts or the scorecard.
- A README that explains what is simulated and what is real.

### Out of scope for this build

- Win-probability model and its hosting/inference story.
- Tavily web search.
- Eager background generation, provider hedging on first-token timing, cache warming, reduced-latency engineering.
- Claiming live ball-by-ball from a free API.
- A mobile app or any framework beyond what the project already uses.

---

## 5. Stack (what the project already uses)

- Static site: `index.html`, `css/style.css`, `js/*.js`.
- Server: `server.mjs` + `api/*.mjs` for the AI proxy (so keys are not in the page).
- Package: `package.json` (Node scripts, local dev).
- The project is already set up for local use; this plan keeps that shape.

If something in the existing project conflicts with this plan, fix the plan to fit the project, not the other way around.

---

## 6. Data and ingestion

### 6.1 For this build: scripted demo data

We start with scripted match data that is:
- internally consistent (running totals correct, strike rotation correct through wides/noballs/wickets),
- verified by a small script,
- easy to replace later with a replay adapter.

### 6.2 The interface we won't break

Even though this build is scripted, the AI layer and UI should read from a normalized match state, not from raw script arrays shaped one way today and another way later. That means:
- a single "current match state" object,
- a single "last N events" view,
- a single way to get key moments.

### 6.3 Live and replay are still future work, but shaped correctly

- The live adapter is **not built now**. If someone wants live later, it starts as a thin stub with a documented mapping to the real API, and it is only called live-ready after a real free key is tested.
- The replay-from-Cricsheet path is the realistic "real data" option and stays in the plan's longer-term backlog. It is not part of this first working site.

So the app can look alive and useful now without pretending to be something it is not.

---

## 7. Match state and what the AI actually receives

### 7.1 Deterministic state

The app computes, at least:

- current score and wickets,
- overs played,
- batting team and bowling team,
- current striker and non-striker with individual runs and balls,
- current bowler figures,
- recent balls,
- key moments so far.

These are computed from the match data every time the state is needed. Not pasted in by hand.

### 7.2 What the LLM sees

For each mode, the prompt should include:
- a compact current state,
- a short recent-ball log as readable lines, not as raw JSON,
- key moments, if any,
- and nothing that should not be known yet.

The point of the earlier token discussion was not that we must compress aggressively. It was that sending the same facts as structured JSON can be much more token-heavy than sending them as readable lines, and that we should prefer readable lines. So: render the log as natural lines; do not dump big JSON blobs into the prompt just because it is easy.

### 7.3 No future information in replay-like use

When the user is moving through a match sequentially, the app should not reveal things that happen later in the match. That is the "no spoilers" rule from the earlier discussion, kept here as a real constraint on what the AI is told.

---

## 8. Modes in detail

### 8.1 "What just happened"

Trigger: the button, or a click on any ball in the timeline. Clicking a ball opens
options for that delivery ("What just happened" / "Ask about this ball"), and the
context handed to the model stops at that ball — state, deliveries and key moments
up to that index only. This is the no-spoilers rule applied per ball, and it is
tested (`tests/test-engine-state.mjs`, `tests/test-ai-context.mjs`).

Input to the LLM:
- current state,
- the last ball and a couple of balls before it,
- any key moment on those balls.

Output:
- 3–4 sentences,
- conversational,
- explains the ball and any rule involved,
- does not invent runs, wickets, or who is on strike.

If there is no ball yet, the app says to play the match first.

### 8.2 "Catch me up"

Input to the LLM:
- a compact summary of the match so far,
- key moments,
- enough recent context to make the summary sound current.

Output:
- a short conversational summary,
- who is batting, score, overs,
- notable moments and momentum,
- players who have stood out,
- no invented stats.

### 8.3 "Ask me anything"

Input to the LLM:
- current match context,
- the user's question.

Behavior:
- answer from the match when possible,
- if the question is about something the app cannot know, say so,
- defer outside-web search for now; if a question truly needs outside context and the LLM genuinely cannot answer it, we can revisit a search tool later. For this build, the app answers what it can and is honest about the rest.

---

## 9. AI layer

### 9.1 Providers

This build uses:
- primary: Gemini,
- fallback: Groq,

with the keys kept on the server side where the project already supports that. If no key is configured, the app should still open and let the user enter a key locally, or clearly say AI is unavailable.

### 9.1.1 Where keys live

- Local development: `.env.local` in the project root (gitignored). `secrets.toml`
  (flat TOML) is supported as an alternative. `.env.example` and
  `secrets.example.toml` are committed as templates with no values.
- Production: the same variable names as environment variables on the host.
- Keys never go in `js/config.js`, which is shipped to the browser.

### 9.2 What "working local site" means for AI

A working local site does not require every call to succeed. It requires:
- the UI to load,
- the match to play,
- the AI buttons to attempt a call,
- and errors to be shown cleanly instead of silently failing.

So the local site is usable even if someone has not plugged in a key yet.

---

## 10. UI

### 10.1 Must have

- match selector,
- score display,
- batting/bowling info,
- ball timeline,
- commentary area,
- playback controls,
- three AI mode buttons with the exact names above,
- an Ask input for the third mode,
- a place to enter or switch the API key locally.

### 10.1.1 First-run guidance

A five-step spotlight tour (`js/tour.js`) introduces the interface in place on
first visit: match selection, scorecard, the clickable timeline, the three AI
modes, and playback controls. It is dependency-free, non-blocking, keyboard
accessible (arrows/Escape), honours `prefers-reduced-motion`, runs once per
browser, and is replayable from the header "?" button. A one-line hint under the
timeline remains until the first per-ball menu is opened.

No video: it would need hosting and would be stale the moment the UI changes. The
tour anchors to live selectors instead, and `tests/test-tour.mjs` fails if a
selector or the script order drifts.

### 10.2 Should feel like a working app

Even if the data is scripted, the app should feel like a real second-screen companion:
- the score updates,
- the timeline grows,
- the AI responses arrive and are readable,
- errors are clear.

---

## 11. Local site first, then GitHub, then Vercel

Order:

1. Make the local site work.
2. Review it and shape it.
3. Push to the GitHub repo.
4. Then deploy/host on Vercel.

This order matters because we want to see and feel the changes locally before anything is published.

---

## 12. Open items (not blockers for this build)

- Win-probability model: implementation approach, hosting, and continuous inference on Vercel. Deferred.
- Tavily: deferred; only reconsider if a question comes up that is genuinely outside what the app can answer.
- Latency perf features: deferred.
- Live free API verification: still pending; not claimed now.
- Cricsheet replay adapter: future; not part of this first working site.
- Final match list and final visual polish: shape them on the local site.

---

## 13. Definition of done for this build

- The local site opens and runs.
- You can pick a match and watch it ball by ball.
- The scorecard and timeline update correctly.
- "What just happened", "Catch me up", and "Ask me anything" all work end to end, with real AI calls when keys are present and clean handling when they are not.
- The app does not invent numbers.
- The README says what is simulated and what is real.
- We have something we can review, shape, push, and then put on Vercel.

---

## 14. What happens next

1. Manish reviews this final plan.
2. If it looks right, the next step is building the working local site from it.
3. After local review, push to GitHub and then deploy on Vercel.
