# 🏏 CricIQ — AI-Powered Live Match Companion

## What fan problem are you solving?

Cricket fans face three recurring frustrations during live matches: missing key moments
(a bathroom break during a crucial DRS review), not understanding complex decisions
(why was that LBW given not out?), and joining a match late with no quick way to catch up
beyond a dry scorecard. Existing tools like Cricbuzz show data but don't *explain* it.

## How does your solution help?

CricIQ is a second-screen AI companion that sits alongside your TV/stream. Three
buttons solve the three problems: **"What Happened?"** explains the last few balls
in plain language — including rules like DRS, free hits, and field restrictions.
**"Catch Me Up"** generates a conversational match summary covering score, key
moments, momentum, and standout performers. **"Ask Anything"** lets you ask any
match-related question naturally. The app processes ball-by-ball data through
an AI layer, making cricket accessible to casual fans and newcomers without
losing depth for hardcore followers.

## Which AI tools did you use?

Google Gemini (gemini-3.1-flash-lite, free tier) for natural language generation —
match explanations, summaries, and Q&A — with Groq (openai/gpt-oss-120b) as an
automatic fallback provider if Gemini rate-limits. Browser calls go through a
secure same-origin serverless proxy (Vercel Function), so API keys live only in
server-side environment variables — never in the shipped client code.

## Setup / Deployment (Vercel)

1. Import this repo into Vercel (Hobby/free tier — zero config, the static app
   and `/api` functions are detected automatically).
2. Project → Settings → Environment Variables → add:
   - `GEMINI_API_KEY` (free tier, ai.google.dev)
   - `GROQ_API_KEY` (free tier, console.groq.com — optional fallback)
3. Deploy. Keys stay server-side; evaluators need no key at all.

## Demo

[Live Demo](YOUR_DEPLOYMENT_URL_HERE) — works out of the box: AI is served by a
keyless server proxy. No signup, no pasting of keys required.
