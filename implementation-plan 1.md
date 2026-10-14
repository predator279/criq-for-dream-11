# 🏏 CricIQ — Complete Build Specification

> **Purpose**: This document is a complete, self-contained spec. A coding agent should be able to read ONLY this file and produce a fully working application.

---

## 1. Project Overview

**CricIQ** is an AI-powered second-screen companion for cricket fans watching a live match. It runs alongside TV/streaming and helps fans:
1. **"What Happened?"** — Explains confusing moments (DRS, field changes, rules)
2. **"Catch Me Up"** — Summarizes the match for late joiners
3. **"Ask Anything"** — Free-form Q&A about the match

**Tech stack**: Vanilla HTML + CSS + JS. Gemini API (REST). No frameworks, no build tools.

---

## 2. Project Structure

```
dream 11 assignment/
├── index.html                 # Main app page
├── css/
│   └── style.css              # All styling (dark theme, mobile-first)
├── js/
│   ├── match-data.js          # Scripted ball-by-ball match data
│   ├── match-engine.js        # Match simulation engine
│   ├── ai-assistant.js        # Gemini API integration
│   └── app.js                 # Main app controller (wires everything)
└── README.md                  # 200-word submission note
```

**Script load order in index.html** (all at bottom of `<body>`):
```html
<script src="js/match-data.js"></script>
<script src="js/match-engine.js"></script>
<script src="js/ai-assistant.js"></script>
<script src="js/app.js"></script>
```

---

## 3. File Specifications

---

### FILE 1: `js/match-data.js`

A single global constant `MATCH_DATA`. No imports/exports.

#### 3.1.1 Top-Level Structure

```javascript
const MATCH_DATA = {
  match: {
    team1: { name: "Chennai Super Kings", short: "CSK", color: "#f9cd05" },
    team2: { name: "Mumbai Indians", short: "MI", color: "#004ba0" },
    venue: "Wankhede Stadium, Mumbai",
    date: "May 26, 2024",
    type: "IPL 2024 · Qualifier 1",
    toss: "CSK won the toss and elected to bat first"
  },
  players: {
    CSK: {
      batting: ["Ruturaj Gaikwad", "Devon Conway", "Shivam Dube", "MS Dhoni", "Ravindra Jadeja", "Moeen Ali"],
      bowling: ["Deepak Chahar", "Tushar Deshpande", "Matheesha Pathirana", "Ravindra Jadeja", "Moeen Ali"]
    },
    MI: {
      batting: ["Rohit Sharma", "Ishan Kishan", "Suryakumar Yadav", "Hardik Pandya", "Tim David", "Tilak Varma"],
      bowling: ["Jasprit Bumrah", "Jofra Archer", "Hardik Pandya", "Piyush Chawla", "Akash Madhwal"]
    }
  },
  innings: [
    {
      battingTeam: "CSK",
      bowlingTeam: "MI",
      balls: [ /* array of ball objects — see below */ ]
    }
  ]
};
```

#### 3.1.2 Ball Object Schema

Every ball in the `balls` array MUST have these exact fields:

```javascript
{
  id: Number,                    // Sequential, starts at 1
  over: Number,                  // 0-indexed over number (0 = first over)
  ballInOver: Number,            // 1–6 for legal deliveries
  overDisplay: String,           // "0.1", "0.2", ... "5.6"
  bowler: String,                // Bowler name
  batsmanOnStrike: String,       // Striker name
  batsmanNonStrike: String,      // Non-striker name
  runs: Number,                  // Total runs from this ball (batsman + extras)
  batsmanRuns: Number,           // Runs credited to batsman
  extras: Number,                // Extra runs (0 if none)
  extraType: String|null,        // null, "wide", "noball", "bye", "legbye"
  totalScore: Number,            // RUNNING total team score AFTER this ball
  totalWickets: Number,          // RUNNING total wickets AFTER this ball
  isWicket: Boolean,
  wicketType: String|null,       // null, "bowled", "caught", "lbw", "run_out", "stumped", "caught_behind"
  dismissedBatsman: String|null, // Name of dismissed batsman
  fielder: String|null,          // Fielder involved (catcher, etc.)
  isBoundary: Boolean,           // true if 4 runs (hit to boundary)
  isSix: Boolean,                // true if 6 runs
  isDot: Boolean,                // true if 0 runs scored
  commentary: String,            // Vivid, realistic commentary text
  isKeyMoment: Boolean,
  keyMomentType: String|null,    // null, "DRS", "dropped_catch", "big_wicket", "run_out_review"
  keyMomentDetail: String|null   // Detailed explanation if key moment
}
```

#### 3.1.3 Complete Ball-by-Ball Script

Script the CSK first innings powerplay (6 overs). **Running totals MUST be mathematically correct.**

##### Over 1: Bumrah to Gaikwad (Tight start) → 5 runs, 0 wickets

| id | ball | overDisplay | bowler | striker | non-striker | batsmanRuns | extras | runs | totalScore | totalWickets | type | commentary |
|----|------|-------------|--------|---------|-------------|-------------|--------|------|------------|--------------|------|------------|
| 1 | 1 | 0.1 | Jasprit Bumrah | Ruturaj Gaikwad | Devon Conway | 0 | 0 | 0 | 0 | 0 | dot | Good length just outside off stump, Gaikwad shoulders arms and lets it go through to the keeper. Bumrah finding his rhythm early. |
| 2 | 2 | 0.2 | Jasprit Bumrah | Ruturaj Gaikwad | Devon Conway | 0 | 0 | 0 | 0 | 0 | dot | Back of a length, rising into the body, Gaikwad ducks under it. Hostile stuff from Bumrah. |
| 3 | 3 | 0.3 | Jasprit Bumrah | Ruturaj Gaikwad | Devon Conway | 4 | 0 | 4 | 4 | 0 | FOUR | Overpitched on the pads! Gaikwad flicks it beautifully through midwicket, races away to the boundary. First runs on the board! |
| 4 | 4 | 0.4 | Jasprit Bumrah | Ruturaj Gaikwad | Devon Conway | 0 | 0 | 0 | 4 | 0 | dot | Brilliant yorker! Gaikwad just about digs it out, ball rolls to the off side. Top delivery. |
| 5 | 5 | 0.5 | Jasprit Bumrah | Ruturaj Gaikwad | Devon Conway | 1 | 0 | 1 | 5 | 0 | single | Worked off the pads to fine leg, they take a comfortable single. Conway on strike now. |
| 6 | 6 | 0.6 | Jasprit Bumrah | Devon Conway | Ruturaj Gaikwad | 0 | 0 | 0 | 5 | 0 | dot | Beauty! Nips away outside off, Conway pokes and misses. Bumrah beats the edge. End of a tidy first over — just 5 off it. |

##### Over 2: Jofra Archer to Conway (Wicket falls!) → 12 runs, 1 wicket

| id | ball | overDisplay | bowler | striker | non-striker | batsmanRuns | extras | runs | totalScore | totalWickets | type | commentary |
|----|------|-------------|--------|---------|-------------|-------------|--------|------|------------|--------------|------|------------|
| 7 | 1 | 1.1 | Jofra Archer | Devon Conway | Ruturaj Gaikwad | 1 | 0 | 1 | 6 | 0 | single | Full and straight, Conway pushes to mid-off and scurries through for a quick single. |
| 8 | 2 | 1.2 | Jofra Archer | Ruturaj Gaikwad | Devon Conway | 4 | 0 | 4 | 10 | 0 | FOUR | Short and wide from Archer! Gaikwad latches onto the pull shot, hammers it to the midwicket boundary. Poor ball, punished. |
| 9 | 3 | 1.3 | Jofra Archer | Ruturaj Gaikwad | Devon Conway | 0 | 0 | 0 | 10 | 0 | dot | Good length on off stump, Gaikwad defends solidly on the front foot. Respect shown. |
| 10 | 4 | 1.4 | Jofra Archer | Ruturaj Gaikwad | Devon Conway | 0 | 0 | 0 | 10 | 1 | WICKET | **CAUGHT!** Conway fishing at a full wide delivery from Archer — thick outside edge and it flies to Rohit Sharma at first slip! He takes it cleanly at chest height. Conway departs for 1(3). Shivam Dube is the new man in. |

> **Note**: On ball 10, even though Gaikwad is on strike, it's Conway who is dismissed. Actually, let me fix this. After ball 8 (Gaikwad hits 4), Gaikwad keeps strike. Ball 9 is Gaikwad defending (dot), Gaikwad still on strike. Ball 10 should be to Gaikwad. BUT we want Conway to get out. 
> 
> **Correction**: Let me re-script. After ball 7, Conway singles → Gaikwad on strike. Ball 8, Gaikwad hits 4 → Gaikwad on strike. Ball 9, Gaikwad dot → Gaikwad on strike. For Conway to get out, we need him on strike. Let me adjust:

**CORRECTED Over 2:**

| id | ball | overDisplay | bowler | striker | non-striker | batsmanRuns | extras | runs | totalScore | totalWickets | type | commentary |
|----|------|-------------|--------|---------|-------------|-------------|--------|------|------------|--------------|------|------------|
| 7 | 1 | 1.1 | Jofra Archer | Devon Conway | Ruturaj Gaikwad | 1 | 0 | 1 | 6 | 0 | single | Full and straight, Conway drives to mid-off and takes a quick single. Gaikwad on strike. |
| 8 | 2 | 1.2 | Jofra Archer | Ruturaj Gaikwad | Devon Conway | 4 | 0 | 4 | 10 | 0 | FOUR | Short and wide! Gaikwad pounces on it, pulls it through midwicket, races to the boundary. Poor ball, punished. |
| 9 | 3 | 1.3 | Jofra Archer | Ruturaj Gaikwad | Devon Conway | 1 | 0 | 1 | 11 | 0 | single | Pushed to cover, they rotate the strike. Conway back on strike. |
| 10 | 4 | 1.4 | Jofra Archer | Devon Conway | Ruturaj Gaikwad | 0 | 0 | 0 | 11 | 1 | WICKET | **CAUGHT AT SLIP!** Archer angles one across Conway, who pokes at it — thick outside edge flies to Rohit Sharma at first slip! Rohit takes it cleanly at chest height. Conway goes for 1 off 3 balls. Shivam Dube is the new batsman. |
| 11 | 5 | 1.5 | Jofra Archer | Shivam Dube | Ruturaj Gaikwad | 0 | 0 | 0 | 11 | 1 | dot | Dube plays and misses his first delivery! Full outside off, beats the edge. Nervy start. |
| 12 | 6 | 1.6 | Jofra Archer | Shivam Dube | Ruturaj Gaikwad | 1 | 0 | 1 | 12 | 1 | single | Worked off the pads to deep square leg, easy single to get off the mark. Dube is away. |

> **Note on wicket ball**: `isWicket: true, wicketType: "caught", dismissedBatsman: "Devon Conway", fielder: "Rohit Sharma"`. From ball 11 onward, batsmanOnStrike/NonStrike updates to reflect Dube replacing Conway.

##### Over 3: Bumrah to Gaikwad (DRS Drama!) → 18 runs, 1 wicket

| id | ball | overDisplay | bowler | striker | non-striker | batsmanRuns | extras | runs | totalScore | totalWickets | type | key moment |
|----|------|-------------|--------|---------|-------------|-------------|--------|------|------------|--------------|------|------------|
| 13 | 1 | 2.1 | Jasprit Bumrah | Ruturaj Gaikwad | Shivam Dube | 0 | 0 | 0 | 12 | 1 | dot | A jaffa from Bumrah! Pitched on a length, moves away sharply, beats Gaikwad's outside edge. Outstanding delivery. |
| 14 | 2 | 2.2 | Jasprit Bumrah | Ruturaj Gaikwad | Shivam Dube | 0 | 0 | 0 | 12 | 1 | dot, **DRS KEY MOMENT** | **DRS REVIEW!** Full delivery angling in, strikes Gaikwad on the front pad. Massive LBW appeal! Umpire Nitin Menon says NOT OUT. Rohit Sharma takes the review immediately! Ball tracking shows it's hitting leg stump, BUT the impact is outside the line of off stump. Since the on-field decision was not out, it stays NOT OUT. MI lose their review! High drama at the Wankhede! |
| 15 | 3 | 2.3 | Jasprit Bumrah | Ruturaj Gaikwad | Shivam Dube | 1 | 0 | 1 | 13 | 1 | single | Pushed to mid-on, quick single. Gaikwad survives and rotates strike. |
| 16 | 4 | 2.4 | Jasprit Bumrah | Shivam Dube | Ruturaj Gaikwad | 0 | 0 | 0 | 13 | 1 | dot | Bouncer! Dube sways out of the way just in time. Hostile bowling from Bumrah. |
| 17 | 5 | 2.5 | Jasprit Bumrah | Shivam Dube | Ruturaj Gaikwad | 1 | 0 | 1 | 14 | 1 | single | Nudged to fine leg for a single. Strike rotated. |
| 18 | 6 | 2.6 | Jasprit Bumrah | Ruturaj Gaikwad | Shivam Dube | 4 | 0 | 4 | 18 | 1 | FOUR | Full and wide outside off, Gaikwad slashes hard over point! The ball races to the boundary. Gaikwad releasing the pressure after that DRS scare. |

**DRS Key Moment (ball 14)**:
```javascript
isKeyMoment: true,
keyMomentType: "DRS",
keyMomentDetail: "Bumrah trapped Gaikwad on the pad with a full delivery angling in. Umpire Nitin Menon gave it not out. MI captain Rohit Sharma reviewed immediately. Ball tracking showed the ball WAS hitting leg stump, but the impact point was outside the line of off stump. Under DRS rules, when the impact is outside off and the on-field decision is not out, the decision stands. MI lose their only review!"
```

##### Over 4: Hardik Pandya to Dube (Big over + dropped catch!) → 33 runs, 1 wicket

| id | ball | overDisplay | bowler | striker | non-striker | batsmanRuns | extras | runs | totalScore | totalWickets | type | key moment |
|----|------|-------------|--------|---------|-------------|-------------|--------|------|------------|--------------|------|------------|
| 19 | 1 | 3.1 | Hardik Pandya | Shivam Dube | Ruturaj Gaikwad | 6 | 0 | 6 | 24 | 1 | SIX | **SMASHED!** Short ball from Hardik, Dube gets under it and muscles it over deep midwicket! Massive six! The left-hander is flexing against the medium pace. |
| 20 | 2 | 3.2 | Hardik Pandya | Shivam Dube | Ruturaj Gaikwad | 0 | 0 | 0 | 24 | 1 | dot | Full and straight, Dube defends back down the pitch. Good correction from Hardik. |
| 21 | 3 | 3.3 | Hardik Pandya | Shivam Dube | Ruturaj Gaikwad | 4 | 0 | 4 | 28 | 1 | FOUR | Width offered outside off, Dube throws his hands at it and smashes through cover! Four more, Dube is on fire! |
| 22 | 4 | 3.4 | Hardik Pandya | Shivam Dube | Ruturaj Gaikwad | 1 | 0 | 1 | 29 | 1 | single | Worked to leg side for a single. Gaikwad on strike. |
| 23 | 5 | 3.5 | Hardik Pandya | Ruturaj Gaikwad | Shivam Dube | 0 | 0 | 0 | 29 | 1 | dot, **DROPPED CATCH** | **DROPPED!** Gaikwad pokes at a delivery outside off and edges it chest-high to first slip! Suryakumar Yadav gets both hands to it... but it pops out! A regulation chance put down! Gaikwad survives on 15, huge let-off for CSK! |
| 24 | 6 | 3.6 | Hardik Pandya | Ruturaj Gaikwad | Shivam Dube | 4 | 0 | 4 | 33 | 1 | FOUR | **Reprieved, and he punishes!** Gaikwad drives Hardik through extra cover on the up, the ball scorches to the boundary. A costly drop by Surya — 15 off this over! |

**Dropped Catch Key Moment (ball 23)**:
```javascript
isKeyMoment: true,
keyMomentType: "dropped_catch",
keyMomentDetail: "Gaikwad pushed at a Hardik delivery outside off and got a thick outside edge. The ball flew to Suryakumar Yadav at first slip, chest height — a regulation catch. Surya got both hands to it but couldn't hold on, the ball popped out! Gaikwad survives on 15. A massive let-off that could prove costly for MI."
```

##### Over 5: Archer to Gaikwad (Run out! Dhoni arrives!) → 44 runs, 2 wickets

| id | ball | overDisplay | bowler | striker | non-striker | batsmanRuns | extras | runs | totalScore | totalWickets | type | key moment |
|----|------|-------------|--------|---------|-------------|-------------|--------|------|------------|--------------|------|------------|
| 25 | 1 | 4.1 | Jofra Archer | Ruturaj Gaikwad | Shivam Dube | 1 | 0 | 1 | 34 | 1 | single | Pushed to long-off, comfortable single. |
| 26 | 2 | 4.2 | Jofra Archer | Shivam Dube | Ruturaj Gaikwad | 0 | 0 | 0 | 34 | 1 | dot | Back of a length, Dube defends solidly on the back foot. |
| 27 | 3 | 4.3 | Jofra Archer | Shivam Dube | Ruturaj Gaikwad | 0 | 0 | 0 | 34 | 2 | WICKET, **RUN OUT** | **RUN OUT!** Dube pushes to cover and calls for a risky single. Suryakumar Yadav swoops in, picks up cleanly and fires a direct hit at the striker's end! Third umpire checks — Dube is SHORT by inches! Run out for 12 off 10 balls. **MS DHONI walks in at No.4!** The Wankhede crowd erupts! |
| 28 | 4 | 4.4 | Jofra Archer | MS Dhoni | Ruturaj Gaikwad | 4 | 0 | 4 | 38 | 2 | FOUR | **First ball, vintage Dhoni!** Short from Archer, Dhoni pulls it classically to the midwicket boundary. The stadium roars — Thala is here! |
| 29 | 5 | 4.5 | Jofra Archer | MS Dhoni | Ruturaj Gaikwad | 0 | 0 | 0 | 38 | 2 | dot | Full and straight, Dhoni blocks it solidly. Respecting the good ball. |
| 30 | 6 | 4.6 | Jofra Archer | MS Dhoni | Ruturaj Gaikwad | 6 | 0 | 6 | 44 | 2 | SIX | **HELICOPTER SHOT!** Archer goes full, Dhoni launches it over long-on with that trademark flick of the wrists! The ball sails into the stands! Wankhede is rocking! 11 off the over. |

**Run Out Key Moment (ball 27)**:
```javascript
isKeyMoment: true,
keyMomentType: "run_out_review",
keyMomentDetail: "Dube pushed Archer towards cover and set off for a quick single. Suryakumar Yadav swooped in from cover, picked up cleanly and threw down the stumps with a direct hit at the striker's end. The third umpire was called for a review — replays showed Dube was just short of his ground by inches. OUT! That brings MS Dhoni to the crease at No. 4, and the Wankhede crowd is absolutely electric!"
```

##### Over 6: Bumrah to Gaikwad (Tense finish, Dhoni falls!) → 49 runs, 3 wickets

| id | ball | overDisplay | bowler | striker | non-striker | batsmanRuns | extras | runs | totalScore | totalWickets | type | key moment |
|----|------|-------------|--------|---------|-------------|-------------|--------|------|------------|--------------|------|------------|
| 31 | 1 | 5.1 | Jasprit Bumrah | Ruturaj Gaikwad | MS Dhoni | 0 | 0 | 0 | 44 | 2 | dot | Yorker from Bumrah, Gaikwad just digs it out. Brilliant death bowling in the powerplay. |
| 32 | 2 | 5.2 | Jasprit Bumrah | Ruturaj Gaikwad | MS Dhoni | 0 | 0 | 0 | 44 | 2 | dot | Just outside off, Gaikwad leaves it alone. Good judgement. |
| 33 | 3 | 5.3 | Jasprit Bumrah | Ruturaj Gaikwad | MS Dhoni | 1 | 0 | 1 | 45 | 2 | single | Worked off the pads to fine leg. Single taken. Dhoni on strike for the big moment. |
| 34 | 4 | 5.4 | Jasprit Bumrah | MS Dhoni | Ruturaj Gaikwad | 0 | 0 | 0 | 45 | 3 | WICKET, **BIG WICKET** | **CAUGHT BEHIND!** Bumrah angles one across Dhoni who goes for a big drive. Thin edge! Ishan Kishan dives to his right and takes a sharp catch behind the stumps. Dhoni departs for 10 off just 3 balls. The Wankhede falls silent. Moeen Ali walks in. |
| 35 | 5 | 5.5 | Jasprit Bumrah | Moeen Ali | Ruturaj Gaikwad | 0 | 1 | 1 | 46 | 3 | WIDE | **Wide!** Bumrah strays down the leg side. Extra run. Still ball 5 of the over. |
| 36 | 5 | 5.5 | Jasprit Bumrah | Moeen Ali | Ruturaj Gaikwad | 2 | 0 | 2 | 48 | 3 | two | Flicked off the pads to deep midwicket, they come back for two. Moeen getting off the mark under pressure. |
| 37 | 6 | 5.6 | Jasprit Bumrah | Moeen Ali | Ruturaj Gaikwad | 0 | 0 | 0 | 48 | 3 | dot | Full and straight, Moeen defends to end the powerplay. CSK 48/3 after 6 overs. |

**Big Wicket Key Moment (ball 34)**:
```javascript
isKeyMoment: true,
keyMomentType: "big_wicket",
keyMomentDetail: "The big one! Bumrah angled a delivery across MS Dhoni who was tempted into a cover drive. The ball took a thin outside edge and flew to wicketkeeper Ishan Kishan, who dived to his right and took a sharp catch. Dhoni departs for a quickfire 10 off 3 balls (4, 0, 6 before this). The crowd goes silent — MI's premier bowler has removed the biggest threat."
```

**Wide ball (ball 35)**: `extraType: "wide", extras: 1, batsmanRuns: 0, runs: 1`. Note: this is NOT a legal delivery, so the next ball (36) has `ballInOver: 5` again (the retry). The `id` still increments. The `overDisplay` for both ball 35 and 36 is "5.5".

#### 3.1.4 Running Totals Verification

```
After Over 1: 5/0  ✓ (0+0+4+0+1+0 = 5)
After Over 2: 12/1 ✓ (5 + 1+4+1+0+0+1 = 12)
After Over 3: 18/1 ✓ (12 + 0+0+1+0+1+4 = 18)
After Over 4: 33/1 ✓ (18 + 6+0+4+1+0+4 = 33)
After Over 5: 44/2 ✓ (33 + 1+0+0+4+0+6 = 44)
After Over 6: 48/3 ✓ (44 + 0+0+1+0+1+2+0 = 48) (includes wide)
```

#### 3.1.5 Individual Batsman Scores (for verification)

| Batsman | Runs | Balls | 4s | 6s | Status |
|---------|------|-------|----|----|--------|
| Ruturaj Gaikwad | 20 | 19 | 3 | 0 | Not out |
| Devon Conway | 1 | 3 | 0 | 0 | c Rohit b Archer |
| Shivam Dube | 12 | 10 | 1 | 1 | run out (Suryakumar) |
| MS Dhoni | 10 | 3 | 1 | 1 | c †Kishan b Bumrah |
| Moeen Ali | 2 | 2 | 0 | 0 | Not out |

> Note: Verify these totals when implementing. Gaikwad: balls 1-6 (0,0,4,0,1,0), 8(4), 9(1), 13(0), 14(0), 15(1), 17(1), 18(4), 22(stays non-striker - nope let me recount). Just double check the data is self-consistent.

---

### FILE 2: `index.html`

#### 3.2.1 Document Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CricIQ — AI Match Companion</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏏</text></svg>">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- All sections described below -->
  
  <script src="js/match-data.js"></script>
  <script src="js/match-engine.js"></script>
  <script src="js/ai-assistant.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

#### 3.2.2 UI Sections (top to bottom)

**Section 1: Header**
```
id="app-header"
├── h1: "🏏 CricIQ"
├── p.subtitle: "AI-Powered Match Companion"
└── span.live-badge: 🔴 dot (CSS pulse) + "LIVE" text
```

**Section 2: Match Info Bar**
```
id="match-info"
├── span: venue + date
└── span: match type (e.g., "IPL 2024 · Qualifier 1")
```

**Section 3: Scorecard**
```
id="scorecard"
├── div.team-score
│   ├── span.team-name: "CSK" (with team color accent)
│   ├── span.score: "48/3" (id="team-score")
│   └── span.overs: "(6.0 ov)" (id="team-overs")
├── div.batsmen-info
│   ├── div.batsman (id="batsman-strike"): "R Gaikwad 20* (19)" with ● marker
│   └── div.batsman (id="batsman-nonstrike"): "Moeen Ali 2 (2)"
└── div.bowler-info (id="bowler-info"): "J Bumrah 3-0-17-2"
```

**Section 4: Ball Timeline**
```
id="ball-timeline"
├── Horizontal scrolling container
├── Ball circles: <div class="ball-circle {type}">{display}</div>
│   Classes: dot, single, two, three, boundary, six, wicket, extra
│   Display text: "0", "1", "2", "3", "4", "6", "W", "wd"
├── Over separators: <div class="over-separator"></div>
└── Auto-scrolls to latest ball
```

**Section 5: Commentary Feed**
```
id="commentary-feed"
├── Latest ball at TOP (prepend new entries)
├── Max ~6-8 visible entries
├── Each entry:
│   <div class="commentary-entry {key-moment-class}">
│     <div class="commentary-header">
│       <span class="over-badge">0.3</span>
│       <span class="runs-badge {type}">4</span>
│     </div>
│     <p class="commentary-text">Overpitched on the pads...</p>
│     <p class="key-moment-detail">DRS explanation...</p>  ← only if key moment
│   </div>
```

**Section 6: Playback Controls**
```
id="playback-controls"
├── button#btn-play-pause: "▶ Play" / "⏸ Pause"
├── button#btn-next-ball: "⏭ Next Ball"
├── select#speed-selector: options 3000, 5000, 8000(default), 10000
└── span#ball-counter: "Ball 15 of 37"
```

**Section 7: AI Assistant Panel**
```
id="ai-panel"
├── div.ai-buttons
│   ├── button#btn-what-happened.ai-btn.ai-btn-blue: "⚡ What Happened?"
│   ├── button#btn-catch-up.ai-btn.ai-btn-green: "📺 Catch Me Up"
│   └── button#btn-ask.ai-btn.ai-btn-purple: "💬 Ask Anything"
├── div#ask-input-container (hidden by default)
│   ├── input#ask-input (placeholder="Ask about the match...")
│   └── button#btn-send-ask: "Send"
├── div#ai-response
│   ├── div#ai-loading (hidden): spinner + "Thinking..."
│   └── div#ai-response-text: response content
```

**Section 8: Footer**
```
id="app-footer"
├── p: "📡 Data Source: Simulated Demo"
├── p: "Built for Dream11 · Powered by Gemini AI"
```

**Section 9: API Key Modal (overlay)**
```
div#api-key-modal (full-screen overlay, shown if no key in localStorage)
├── div.modal-content
│   ├── h2: "🔑 Enter Gemini API Key"
│   ├── p: "Your key is stored locally in your browser."
│   ├── input#api-key-input (type="password", placeholder="AIza...")
│   ├── button#btn-save-api-key: "Save & Start"
│   └── p.small: "Get a free key at ai.google.dev"
```

---

### FILE 3: `css/style.css`

#### 3.3.1 Design System (CSS Variables)

```css
:root {
  /* Background */
  --bg-primary: #0a0e17;
  --bg-card: #141b2d;
  --bg-card-hover: #1a2340;
  --bg-input: #1e2a45;

  /* Text */
  --text-primary: #e8e8e8;
  --text-secondary: #8899aa;
  --text-muted: #556677;

  /* Accents */
  --accent-blue: #4a90d9;
  --accent-green: #2ecc71;
  --accent-yellow: #f1c40f;
  --accent-red: #e74c3c;
  --accent-purple: #9b59b6;
  --accent-orange: #e67e22;

  /* Team Colors */
  --csk-yellow: #f9cd05;
  --mi-blue: #004ba0;

  /* Ball Colors */
  --ball-dot: #444;
  --ball-single: #888;
  --ball-boundary: #2ecc71;
  --ball-six: #f1c40f;
  --ball-wicket: #e74c3c;
  --ball-extra: #9b59b6;

  /* Sizing */
  --max-width: 500px;
  --radius: 12px;
  --radius-sm: 8px;
}
```

#### 3.3.2 Key Styling Rules

1. **Layout**: `body` centered, `max-width: var(--max-width)`, `margin: 0 auto`, `padding: 0 16px`
2. **Font**: `system-ui, -apple-system, 'Segoe UI', sans-serif`
3. **Cards**: `background: var(--bg-card)`, `border-radius: var(--radius)`, `padding: 16px`, `margin-bottom: 12px`
4. **LIVE badge**: Red dot `8px` circle with pulse animation (opacity 1→0.4→1, 1.5s infinite)
5. **Score text**: `font-size: 2.5rem`, `font-weight: 700`
6. **Ball circles**: `width: 36px`, `height: 36px`, `border-radius: 50%`, `display: inline-flex`, `align-items: center`, `justify-content: center`, `font-weight: 700`, `font-size: 0.85rem`
7. **Ball timeline**: `overflow-x: auto`, `white-space: nowrap`, hide scrollbar with `-webkit-scrollbar` and `scrollbar-width: none`
8. **Commentary feed**: `max-height: 300px`, `overflow-y: auto`
9. **Commentary key moments**: left border `3px solid var(--accent-yellow)`, subtle background glow
10. **AI buttons**: full-width stack on mobile, `padding: 14px`, `border-radius: var(--radius-sm)`, `font-weight: 600`, `cursor: pointer`, `border: none`, `color: white`
11. **AI response area**: `border-left: 3px solid var(--accent-blue)`, `padding: 16px`, `background: var(--bg-card)`, `line-height: 1.6`
12. **Modal**: `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.8)`, `backdrop-filter: blur(10px)`, `display: flex`, `align-items: center`, `justify-content: center`, `z-index: 1000`
13. **Animations**:
    - `.ball-circle` entrance: `@keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }` 0.3s
    - `.commentary-entry` entrance: `@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }` 0.3s
    - `.score-flash`: brief color change on score update
14. **Disabled buttons**: `opacity: 0.5`, `cursor: not-allowed`
15. **Loading spinner**: CSS-only, `border` spinner technique, `24px` diameter
16. **Responsive**: Works well from 320px to 1200px. On desktop, content is centered in a phone-width column.

---

### FILE 4: `js/match-engine.js`

#### 3.4.1 Class: `MatchEngine`

```javascript
class MatchEngine {
  constructor(matchData) {
    this.matchData = matchData;
    this.currentBallIndex = -1;       // -1 = match not started
    this.balls = matchData.innings[0].balls;
    this.totalBalls = this.balls.length;
    this.isPlaying = false;
    this.playbackInterval = null;
    this.playbackSpeed = 8000;        // ms between balls
    this.onBallPlayed = null;         // callback(ball, index)
    this.onMatchEnd = null;           // callback()
  }
```

#### 3.4.2 Methods to Implement

| Method | Signature | Description |
|--------|-----------|-------------|
| `play()` | `→ void` | Start auto-advancing. Sets interval using `playbackSpeed`. Calls `nextBall()` on each tick. Sets `isPlaying = true`. |
| `pause()` | `→ void` | Clear interval. Sets `isPlaying = false`. |
| `togglePlayPause()` | `→ void` | If playing, pause. If paused, play. |
| `nextBall()` | `→ ball\|null` | Advance by one ball. If at end, call `onMatchEnd` and return null. Otherwise increment `currentBallIndex`, fire `onBallPlayed(ball, index)`, return ball. |
| `setSpeed(ms)` | `(Number) → void` | Update `playbackSpeed`. If currently playing, restart interval with new speed. |
| `getMatchState()` | `→ Object` | Return `{ score, wickets, oversDisplay, battingTeam, bowlingTeam, currentBatsmen, currentBowler, ballsPlayed }` derived from latest ball. If no balls played, return initial state. |
| `getBallsPlayed()` | `→ Array` | `this.balls.slice(0, this.currentBallIndex + 1)` |
| `getLastNBalls(n)` | `(Number) → Array` | Last n balls from played balls. |
| `getKeyMoments()` | `→ Array` | Filter played balls where `isKeyMoment === true`. |
| `getMatchSummary()` | `→ String` | Human-readable match summary text (see below). |
| `getCommentaryLog()` | `→ String` | All played balls as `"overDisplay: commentary"` joined by newlines. |

#### 3.4.3 `getMatchSummary()` Output Format

```
Match: CSK vs MI — IPL 2024 · Qualifier 1 at Wankhede Stadium, Mumbai
CSK are batting first: 33/1 after 4.0 overs

Current batsmen:
• Ruturaj Gaikwad 19* (15 balls) — 3 fours
• Shivam Dube 12* (8 balls) — 1 four, 1 six

Current bowler: Hardik Pandya — figures: 1-0-15-0

Key events so far:
• Over 1.4: Devon Conway caught by Rohit Sharma off Jofra Archer (1 off 3 balls)
• Over 2.2: DRS review — LBW appeal against Gaikwad — NOT OUT (impact outside off)
• Over 3.5: DROPPED CATCH — Suryakumar dropped Gaikwad at slip off Hardik (on 15)

Recent 6 balls: 6, 0, 4, 1, 0, 4
Run rate: 8.25
```

This method needs to **dynamically compute** batsman stats and bowler stats from the balls played. It should:
1. Track runs per batsman and balls faced
2. Track bowler figures (overs-maidens-runs-wickets)
3. List key moments chronologically
4. Show recent balls
5. Calculate current run rate

---

### FILE 5: `js/ai-assistant.js`

#### 3.5.1 Class: `AIAssistant`

```javascript
class AIAssistant {
  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
    this.model = 'gemini-2.0-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }
```

#### 3.5.2 Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setApiKey(key)` | `(String) → void` | Store in `this.apiKey` and `localStorage`. |
| `hasApiKey()` | `→ Boolean` | Returns true if key exists and is non-empty. |
| `callGemini(prompt)` | `async (String) → String` | POST to Gemini REST API. Returns generated text. Throws on error with user-friendly message. |
| `whatHappened(matchState, lastNBalls, keyMoments)` | `async → String` | Feature 1 prompt (see below). |
| `catchMeUp(matchSummary, allBalls, keyMoments)` | `async → String` | Feature 2 prompt (see below). |
| `askAnything(question, matchSummary, allBalls, keyMoments)` | `async → String` | Feature 3 prompt (see below). |

#### 3.5.3 Gemini API Call

```javascript
async callGemini(prompt) {
  const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.9
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get AI response');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
```

#### 3.5.4 Prompt Templates

**"What Happened?" Prompt:**
```
You are a friendly, knowledgeable cricket expert helping a fan understand what just happened during a live IPL match.

Current match situation:
{matchState}

Here are the last few balls:
{for each ball: "overDisplay | bowler to striker | runs run(s) | commentary [KEY MOMENT: type - detail if applicable]"}

Explain what just happened in 3-4 sentences. Be conversational and engaging — like explaining to a friend. If there was a key moment (DRS, dropped catch, run out, big wicket), focus on explaining it clearly, including any rules involved. Use cricket terminology but explain it simply.

Don't start with "Sure!" or "Here's what happened". Just dive right in.
```

**"Catch Me Up" Prompt:**
```
You are a friendly cricket expert giving a quick update to a fan who just tuned in.

Match data:
{matchSummary}

Key moments:
{for each: "overDisplay: type - detail"}

Full commentary log:
{for each ball: "overDisplay: commentary"}

Give a 4-5 sentence summary as if catching up a friend who just sat down. Cover:
1. Who's batting, score, overs
2. Key moments and turning points
3. Impressive players
4. Current momentum/situation

Be conversational and enthusiastic. Don't start with "Sure!" — just dive in.
```

**"Ask Anything" Prompt:**
```
You are a friendly cricket expert. A fan watching this live IPL match has a question.

Match situation:
{matchSummary}

Key moments:
{list}

Ball-by-ball log:
{for each: "overDisplay | bowler to striker | Runs: runs | commentary [WICKET!/FOUR!/SIX! if applicable]"}

Fan's question: "{question}"

Answer based on the match data. Be helpful, accurate, conversational. If about rules, explain simply. If about stats, be precise. If you can't answer, say so.

Keep to 2-4 sentences. Don't start with "Sure!" or "Great question!" — just answer.
```

---

### FILE 6: `js/app.js`

#### 3.6.1 Class: `CricIQApp`

The main controller that wires MatchEngine + AIAssistant + DOM together.

#### 3.6.2 Initialization Flow

```
1. new CricIQApp()
2. constructor:
   a. Create MatchEngine(MATCH_DATA)
   b. Create AIAssistant()
   c. Call init()
3. init():
   a. bindDOM() — cache all element references
   b. bindEvents() — attach click/change handlers
   c. checkApiKey() — show modal if no key
   d. updateMatchInfo() — set venue, teams, toss info
   e. showInitialState() — "Press Play to start the match" in commentary
```

#### 3.6.3 Event Bindings

| Element | Event | Handler |
|---------|-------|---------|
| `#btn-play-pause` | click | `engine.togglePlayPause()`, update button text |
| `#btn-next-ball` | click | `engine.nextBall()` |
| `#speed-selector` | change | `engine.setSpeed(value)` |
| `#btn-what-happened` | click | `handleWhatHappened()` |
| `#btn-catch-up` | click | `handleCatchMeUp()` |
| `#btn-ask` | click | Toggle `#ask-input-container` visibility |
| `#btn-send-ask` | click | `handleAskAnything()` |
| `#ask-input` | keydown (Enter) | `handleAskAnything()` |
| `#btn-save-api-key` | click | Save key, hide modal |

#### 3.6.4 Ball Played Callback

Wire `engine.onBallPlayed = (ball, index) => { ... }` to:
1. `updateScorecard(ball)` — update score, overs, batsmen, bowler display
2. `addBallToTimeline(ball)` — create color-coded circle, add over separator if new over, auto-scroll
3. `addCommentaryEntry(ball)` — prepend new entry (latest first), highlight key moments, limit visible entries to ~8
4. `updatePlaybackControls()` — update ball counter text

#### 3.6.5 UI Update Logic

**`updateScorecard(ball)`**:
- Set `#team-score` text to `"{totalScore}/{totalWickets}"`
- Set `#team-overs` text to `"({overDisplay} ov)"`
- Set `#batsman-strike` to striker name + runs + balls (with ● marker)
- Set `#batsman-nonstrike` to non-striker name + runs + balls
- Set `#bowler-info` to bowler name + figures
- If wicket: briefly add a `.wicket-flash` class (red flash, remove after 500ms)
- If boundary/six: briefly add `.boundary-flash` class (green/gold flash)

**`addBallToTimeline(ball)`**:
- Create `<div class="ball-circle {type}">{display}</div>`
- Type classes: `dot`(0), `single`(1), `two`(2), `three`(3), `boundary`(4), `six`(6), `wicket`(W), `extra`(wd/nb)
- If ball is first of a new over (and not first ball of match), insert `<div class="over-separator"></div>` before it
- Append to `#ball-timeline`, then `scrollLeft = scrollWidth`
- Add entrance animation (popIn)

**`addCommentaryEntry(ball)`**:
- Create the commentary card HTML
- Add `.key-moment` class if `ball.isKeyMoment`
- Show `keyMomentDetail` in a sub-paragraph if applicable
- Prepend (not append) to `#commentary-feed`
- Remove oldest entry if more than 8 visible

**`updatePlaybackControls()`**:
- `#btn-play-pause` text: "▶ Play" if paused, "⏸ Pause" if playing
- `#ball-counter` text: "Ball {currentIndex+1} of {totalBalls}"

#### 3.6.6 AI Interaction Flow

All three AI handlers follow this pattern:
```
1. Check if any balls have been played. If not, show "Start the match first!"
2. showAILoading() — show spinner, hide response text
3. disableAIButtons() — prevent double-clicks
4. try:
   a. Build context from engine methods
   b. Call appropriate AI method
   c. showAIResponse(text, type)
5. catch (error):
   a. showAIError(error.message)
6. finally:
   a. enableAIButtons()
```

#### 3.6.7 Edge Cases to Handle

1. **No balls played yet** → "Press ▶ Play or ⏭ Next Ball to start the match before using AI features."
2. **Empty ask input** → Don't send, show subtle visual hint
3. **API error** → Show "❌ Error: {message}" with red styling
4. **Match ended** → Disable Next Ball, show "End of powerplay" in commentary
5. **Ask input visibility** → Clicking "Ask Anything" toggles the input. Clicking "What Happened?" or "Catch Me Up" hides the ask input.

---

### FILE 7: `README.md`

```markdown
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

Google Gemini 2.0 Flash (via REST API) for natural language generation —
match explanations, summaries, and Q&A. Prompt engineering designed for
cricket-specific context with match state, commentary logs, and key moments
as structured input.

## Demo

[Live Demo](YOUR_DEPLOYMENT_URL_HERE) — Enter your free Gemini API key to try.
```

---

## 4. Cross-File Interface Contracts

### 4.1 Data Flow

```
MATCH_DATA (global const)
    │
    ├──→ MatchEngine (reads balls array)
    │       │
    │       ├──→ getMatchSummary() ──→ AIAssistant prompts
    │       ├──→ getLastNBalls() ───→ AIAssistant prompts
    │       ├──→ getKeyMoments() ──→ AIAssistant prompts
    │       └──→ onBallPlayed callback ──→ CricIQApp UI updates
    │
    └──→ CricIQApp (orchestrates everything)
            ├──→ MatchEngine (playback control)
            ├──→ AIAssistant (AI features)
            └──→ DOM (UI rendering)
```

### 4.2 DOM Element IDs (shared between HTML and app.js)

```
Header:        app-header
Match info:    match-info
Scorecard:     scorecard, team-score, team-overs, batsman-strike, batsman-nonstrike, bowler-info
Timeline:      ball-timeline
Commentary:    commentary-feed
Controls:      playback-controls, btn-play-pause, btn-next-ball, speed-selector, ball-counter
AI Panel:      ai-panel, btn-what-happened, btn-catch-up, btn-ask,
               ask-input-container, ask-input, btn-send-ask,
               ai-response, ai-loading, ai-response-text
Footer:        app-footer, data-source-info
Modal:         api-key-modal, api-key-input, btn-save-api-key
```

### 4.3 CSS Class Names (shared between HTML/JS and style.css)

```
Ball types:    ball-circle, dot, single, two, three, boundary, six, wicket, extra
Commentary:    commentary-entry, commentary-header, over-badge, runs-badge, commentary-text, key-moment, key-moment-detail
AI:            ai-btn, ai-btn-blue, ai-btn-green, ai-btn-purple, ai-response-content
State:         active, disabled, show, hidden
Animation:     wicket-flash, boundary-flash, pop-in, slide-down
UI:            live-badge, modal-content, over-separator
```

---

## 6. Build Addendum (October 2026) — FINAL DECISIONS + DATA CORRECTIONS

### 6.1 Decisions locked with Manish

1. **AI providers**: Embedded free-tier keys so evaluators get working AI out of the box.
   - **Primary**: `gemini-3.1-flash-lite` (current free-tier Gemini ID on `/v1beta/models/...:generateContent`)
   - **Fallback**: Groq `openai/gpt-oss-120b` via `https://api.groq.com/openai/v1/chat/completions` (OpenAI-compatible)
   - Keys live in `js/config.js`; visiting users can override with their own key (localStorage).
   - Security limits of a static site are acknowledged: set a **website restriction** on the Gemini key
     to the GitHub Pages origin in Google Cloud Console (check key type — post-May-2026 AI Studio keys
     default to "authorization keys" which may not support referrer restrictions). Groq key has no
     origin restriction support; keep it on a separate, rotatable project.
2. **No fantasy lens** — ship exactly: What Happened / Catch Me Up / Ask Anything.
3. **Hosting**: GitHub Pages.

### 6.2 Data corrections (the §3.1 script contained impossible rotation)

The original over-3→over-4 border could not work: over 3 ends with Gaikwad on strike
after his four (6 runs, even over total ⇒ odd number of odd-runnings impossible), so
over 4 CANNOT open with Dube. Overs 4–6 were re-scripted preserving all drama beats.
Verified programmatically by `node tests/verify-data.js` (run it after any data edit):

```
Final: CSK 48/3 after 6 overs (37 balls incl. 1 wide)
Gaikwad 21* (15, 4x4) · Conway 1 (3) c Rohit b Archer · Dube 13 (9, 1x4 1x6) run out
Dhoni 12 (7, 1x4 1x6) c Kishan b Bumrah · Moeen 0* (2)
Bumrah 3-0-14-1 · Archer 2-0-18-1 · Hardik 1-0-16-0
```

The §3.1.5 batsman table, §3.4.3 sample summary, and all "X off Y balls" phrases in
commentary were superseded by the above. Engine computes ALL stats dynamically from
the balls array — never hardcode figures.

### 6.3 Implementation notes

- `const MATCH_DATA` in a classic script does not attach to `window` — `match-data.js`
  explicitly sets `window.MATCH_DATA` (same pattern as the class files).
- `ai-assistant.js` exposes `callAI(prompt)` (Gemini first, Groq fallback on
  429/403/500/503/network/empty responses) and `getActiveProvider()`.
- Verification: `tests/verify-data.js` checks ids, running totals, extras math,
  strike rotation (incl. wide retries + replacement-at-striker-end rules),
  batsman stats, bowler figures, and the final 48/3.


For reference when pitching or expanding later:

1. **YouTube Transcript API** (`youtube-transcript-api` Python lib) — extract commentary audio as text from YouTube highlight videos
2. **cricket-mcp-server** (`tarun7r/cricket-mcp-server`) — scrape live Cricbuzz ball-by-ball commentary into JSON
3. **CricketData.org** — free tier REST API for live match data (100 req/day)
4. **Gemini Vision** — analyze short video clips of confusing moments
5. **Highlightly Cricket API** — highlight clip metadata on RapidAPI (100 free req/day)
6. **Data Adapter Pattern** — the app should be architected so `MatchEngine` can accept data from either the simulated JSON or a live API adapter, with identical interface
