# CricIQ — Assignment Submission

## Fan Problem
Cricket fans face information overload during live T20 matches — hard to track key moments (DRS, dropped catches), fantasy-worthy players, complex rules (DLS, LBW, powerplay), and Dream11 point implications.

## How CricIQ Helps
CricIQ is an AI-powered match companion with:

1. **Ball-by-ball simulation** with timeline and commentary
2. **Multi-match selection** — live/upcoming/completed/demo cards
3. **AI features**: "What Happened?" explains key moments; "Catch Me Up" summarizes for late joiners; "Ask Anything" answers rules, fantasy points, and captain recommendations

AI is grounded with Dream11 scoring matrix (batting/bowling/fielding points), cricket rules glossary (DLS, powerplay, LBW, Super Over, DRS), and live match context (score, stats, key moments).

## AI Tools Used
- **Gemini 3.1 Flash Lite** (primary, Google Gemini API free tier)
- **Groq openai/gpt-oss-120b** (fallback, Groq API free tier)
- **Vercel serverless functions** for secure API proxy (keys never exposed)

## Live Demo
https://criq-for-dream-11.vercel.app/
