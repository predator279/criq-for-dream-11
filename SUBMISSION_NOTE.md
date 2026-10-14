# CricIQ — Assignment Submission

## 1. Working Artifact
- **Live Prototype URL:** [https://criq-for-dream-11.vercel.app/](https://criq-for-dream-11.vercel.app/)
- **Access & Authentication:** Zero setup / keyless evaluator access. Powered by serverless proxy with protected API keys.
- **Submission PDF:** [CricIQ_Assignment_Submission.pdf](file:///c:/Users/MANISH/Desktop/dream%2011%20assignment/CricIQ_Assignment_Submission.pdf)

---

## 2. Short Note (172 Words)

### Fan Problem
Cricket fans face severe cognitive overload during live T20 matches: missing pivotal game-changing moments (DRS reviews, dropped catches), struggling to decipher complex match regulations (DLS calculations, umpire's call, powerplay restrictions), and failing to evaluate live Dream11 fantasy point swings from static scorecards.

### How CricIQ Helps
CricIQ serves as an intelligent second-screen companion transforming raw feeds into contextual understanding:
- **Grounded AI Insights:** Explains key moments in plain English (*"What Happened?"*), catches up late joiners in seconds (*"Catch Me Up"*), and answers ad-hoc queries (*"Ask Anything"*).
- **Fantasy & Rules Grounding:** Real-time match data is strictly grounded with the Dream11 scoring matrix (batting/bowling/fielding bonus points) and cricket rulebooks to deliver clear captaincy guidance and momentum shifts.
- **Interactive Simulation:** Dynamic ball-by-ball timeline, live commentary, and multi-match coverage (live, upcoming, completed, and interactive demo).

### AI Tools Used
- **Google Gemini 3.1 Flash Lite:** Primary high-throughput inference engine for real-time explanations, summaries, and Q&A.
- **Groq (openai/gpt-oss-120b):** Automatic ultra-low-latency fallback if Gemini hits rate limits.
- **Vercel Serverless Architecture:** Secure server-side proxy guaranteeing zero client credential exposure.

