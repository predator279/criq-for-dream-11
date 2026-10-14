/**
 * CricIQ — Scripted Match Data
 * CSK vs MI, IPL 2024 Qualifier 1 — First-innings powerplay (6 overs, 37 balls).
 *
 * Verified programmatically (node tests/verify-data.js):
 *   Over 1: 5/0   Over 2: 12/1   Over 3: 18/1
 *   Over 4: 34/1  Over 5: 45/2   Over 6: 48/3
 * Batsman check: Gaikwad 21* (15, 4x4), Conway 1 (3), Dube 13 (9, 1x4 1x6, ro),
 *                Dhoni 12 (7, c Kishan b Bumrah), Moeen 0* (2)
 * Bowler check:  Bumrah 3-0-14-1, Archer 2-0-18-1, Hardik 1-0-16-0
 */

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
      batting: [
        "Ruturaj Gaikwad", "Devon Conway", "Shivam Dube",
        "MS Dhoni", "Ravindra Jadeja", "Moeen Ali"
      ],
      bowling: [
        "Deepak Chahar", "Tushar Deshpande", "Matheesha Pathirana",
        "Ravindra Jadeja", "Moeen Ali"
      ]
    },
    MI: {
      batting: [
        "Rohit Sharma", "Ishan Kishan", "Suryakumar Yadav",
        "Hardik Pandya", "Tim David", "Tilak Varma"
      ],
      bowling: [
        "Jasprit Bumrah", "Jofra Archer", "Hardik Pandya",
        "Piyush Chawla", "Akash Madhwal"
      ]
    }
  },

  innings: [
    {
      battingTeam: "CSK",
      bowlingTeam: "MI",
      balls: [
        // ---------------- Over 1: Jasprit Bumrah to Gaikwad (tight start, 5 runs) ----------------
        {
          id: 1, over: 0, ballInOver: 1, overDisplay: "0.1",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Devon Conway",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 0, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Good length just outside off stump, Gaikwad shoulders arms and lets it go through to the keeper. Bumrah finding his rhythm early.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 2, over: 0, ballInOver: 2, overDisplay: "0.2",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Devon Conway",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 0, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Back of a length, rising into the body, Gaikwad ducks under it. Hostile stuff from Bumrah.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 3, over: 0, ballInOver: 3, overDisplay: "0.3",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Devon Conway",
          runs: 4, batsmanRuns: 4, extras: 0, extraType: null,
          totalScore: 4, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: true, isSix: false, isDot: false,
          commentary: "Overpitched on the pads! Gaikwad flicks it beautifully through midwicket, races away to the boundary. First runs on the board!",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 4, over: 0, ballInOver: 4, overDisplay: "0.4",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Devon Conway",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 4, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Brilliant yorker! Gaikwad just about digs it out, ball rolls to the off side. Top delivery.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 5, over: 0, ballInOver: 5, overDisplay: "0.5",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Devon Conway",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 5, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Worked off the pads to fine leg, they take a comfortable single. Conway on strike now.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 6, over: 0, ballInOver: 6, overDisplay: "0.6",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Devon Conway", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 5, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Beauty! Nips away outside off, Conway pokes and misses. Bumrah beats the edge. End of a tidy first over — just 5 off it.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },

        // ---------------- Over 2: Jofra Archer (Conway falls at slip, 7 runs, 1 wicket) ----------------
        {
          id: 7, over: 1, ballInOver: 1, overDisplay: "1.1",
          bowler: "Jofra Archer", batsmanOnStrike: "Devon Conway", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 6, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Full and straight, Conway drives to mid-off and takes a quick single. Gaikwad on strike.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 8, over: 1, ballInOver: 2, overDisplay: "1.2",
          bowler: "Jofra Archer", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Devon Conway",
          runs: 4, batsmanRuns: 4, extras: 0, extraType: null,
          totalScore: 10, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: true, isSix: false, isDot: false,
          commentary: "Short and wide! Gaikwad pounces on it, pulls it through midwicket, races to the boundary. Poor ball, punished.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 9, over: 1, ballInOver: 3, overDisplay: "1.3",
          bowler: "Jofra Archer", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Devon Conway",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 11, totalWickets: 0,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Pushed to cover, they rotate the strike. Conway back on strike.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 10, over: 1, ballInOver: 4, overDisplay: "1.4",
          bowler: "Jofra Archer", batsmanOnStrike: "Devon Conway", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 11, totalWickets: 1,
          isWicket: true, wicketType: "caught", dismissedBatsman: "Devon Conway", fielder: "Rohit Sharma",
          isBoundary: false, isSix: false, isDot: false,
          commentary: "CAUGHT AT SLIP! Archer angles one across Conway, who pokes at it — thick outside edge flies to Rohit Sharma at first slip! Rohit takes it cleanly at chest height. Conway goes for 1 off 3 balls. Shivam Dube is the new batsman.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 11, over: 1, ballInOver: 5, overDisplay: "1.5",
          bowler: "Jofra Archer", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 11, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Dube plays and misses his first delivery! Full outside off, beats the edge. Nervy start.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 12, over: 1, ballInOver: 6, overDisplay: "1.6",
          bowler: "Jofra Archer", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 12, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Worked off the pads to deep square leg, easy single to get off the mark. Dube is away.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },

        // ---------------- Over 3: Bumrah — DRS drama over Gaikwad (6 runs, 18/1 after 3) ----------------
        {
          id: 13, over: 2, ballInOver: 1, overDisplay: "2.1",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Shivam Dube",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 12, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "A jaffa from Bumrah! Pitched on a length, moves away sharply, beats Gaikwad's outside edge. Outstanding delivery.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 14, over: 2, ballInOver: 2, overDisplay: "2.2",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Shivam Dube",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 12, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "DRS REVIEW! Full delivery angling in, strikes Gaikwad on the front pad. Massive LBW appeal! Umpire Nitin Menon says NOT OUT. Rohit Sharma takes the review immediately! Ball tracking shows it's hitting leg stump, BUT the impact is outside the line of off stump. Since the on-field decision was not out, it stays NOT OUT. MI lose their review!",
          isKeyMoment: true,
          keyMomentType: "DRS",
          keyMomentDetail: "Bumrah trapped Gaikwad on the pad with a full delivery angling in. Umpire Nitin Menon gave it not out. MI captain Rohit Sharma reviewed immediately. Ball tracking showed the ball WAS hitting leg stump, but the impact point was outside the line of off stump. Under DRS rules, when the impact is outside off and the on-field decision is not out, the decision stands. MI lose their only review!"
        },
        {
          id: 15, over: 2, ballInOver: 3, overDisplay: "2.3",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Shivam Dube",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 13, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Pushed to mid-on, quick single. Gaikwad survives and rotates strike.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 16, over: 2, ballInOver: 4, overDisplay: "2.4",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 13, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Bouncer! Dube sways out of the way just in time. Hostile bowling from Bumrah.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 17, over: 2, ballInOver: 5, overDisplay: "2.5",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 14, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Nudged to fine leg for a single. Strike rotated.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 18, over: 2, ballInOver: 6, overDisplay: "2.6",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Shivam Dube",
          runs: 4, batsmanRuns: 4, extras: 0, extraType: null,
          totalScore: 18, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: true, isSix: false, isDot: false,
          commentary: "Full and wide outside off, Gaikwad slashes hard over point! The ball races to the boundary. Gaikwad releasing the pressure after that DRS scare.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },

        // ---------------- Over 4: Hardik Pandya — Dube blitz + dropped catch (16 runs, 34/1) ----------------
        {
          id: 19, over: 3, ballInOver: 1, overDisplay: "3.1",
          bowler: "Hardik Pandya", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Shivam Dube",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 19, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Hardik offers the fuller length, Gaikwad tucks it off the pads to deep square for a comfortable single. Dube is the new man on strike — and he fancies the medium pace.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 20, over: 3, ballInOver: 2, overDisplay: "3.2",
          bowler: "Hardik Pandya", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 6, batsmanRuns: 6, extras: 0, extraType: null,
          totalScore: 25, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: true, isDot: false,
          commentary: "SMASHED! Short ball from Hardik, Dube gets under it and muscles it over deep midwicket! Massive six! The left-hander is flexing against the medium pace.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 21, over: 3, ballInOver: 3, overDisplay: "3.3",
          bowler: "Hardik Pandya", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 4, batsmanRuns: 4, extras: 0, extraType: null,
          totalScore: 29, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: true, isSix: false, isDot: false,
          commentary: "Width offered outside off, Dube throws his hands at it and smashes through cover! Four more, Dube is on fire!",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 22, over: 3, ballInOver: 4, overDisplay: "3.4",
          bowler: "Hardik Pandya", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 30, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Worked to leg side for a single. Gaikwad on strike.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 23, over: 3, ballInOver: 5, overDisplay: "3.5",
          bowler: "Hardik Pandya", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Shivam Dube",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 30, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "DROPPED! Gaikwad pokes at a delivery outside off and edges it chest-high to first slip! Suryakumar Yadav gets both hands to it... but it pops out! A regulation chance put down! Gaikwad survives on 16, huge let-off for CSK!",
          isKeyMoment: true,
          keyMomentType: "dropped_catch",
          keyMomentDetail: "Gaikwad pushed at a Hardik delivery outside off and got a thick outside edge. The ball flew to Suryakumar Yadav at first slip, chest height — a regulation catch. Surya got both hands to it but couldn't hold on, the ball popped out! Gaikwad survives on 16. A massive let-off that could prove costly for MI."
        },
        {
          id: 24, over: 3, ballInOver: 6, overDisplay: "3.6",
          bowler: "Hardik Pandya", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Shivam Dube",
          runs: 4, batsmanRuns: 4, extras: 0, extraType: null,
          totalScore: 34, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: true, isSix: false, isDot: false,
          commentary: "Reprieved, and he punishes! Gaikwad drives Hardik through extra cover on the up, the ball scorches to the boundary. A costly drop by Surya — 16 off this over!",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },

        // ---------------- Over 5: Archer — Dube run out, Dhoni's arrival (11 runs, 45/2) ----------------
        {
          id: 25, over: 4, ballInOver: 1, overDisplay: "4.1",
          bowler: "Jofra Archer", batsmanOnStrike: "Ruturaj Gaikwad", batsmanNonStrike: "Shivam Dube",
          runs: 1, batsmanRuns: 1, extras: 0, extraType: null,
          totalScore: 35, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Pushed to long-off, comfortable single.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 26, over: 4, ballInOver: 2, overDisplay: "4.2",
          bowler: "Jofra Archer", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 35, totalWickets: 1,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Back of a length, Dube defends solidly on the back foot.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 27, over: 4, ballInOver: 3, overDisplay: "4.3",
          bowler: "Jofra Archer", batsmanOnStrike: "Shivam Dube", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 35, totalWickets: 2,
          isWicket: true, wicketType: "run_out", dismissedBatsman: "Shivam Dube", fielder: "Suryakumar Yadav",
          isBoundary: false, isSix: false, isDot: false,
          commentary: "RUN OUT! Dube pushes to cover and calls for a risky single. Suryakumar Yadav swoops in, picks up cleanly and fires a direct hit at the striker's end! Third umpire checks — Dube is SHORT by inches! Run out for 13 off 9 balls. MS DHONI walks in at No.4! The Wankhede crowd erupts!",
          isKeyMoment: true,
          keyMomentType: "run_out_review",
          keyMomentDetail: "Dube pushed Archer towards cover and set off for a quick single. Suryakumar Yadav swooped in from cover, picked up cleanly and threw down the stumps with a direct hit at the striker's end. The third umpire was called for a review — replays showed Dube was just short of his ground by inches. OUT! That brings MS Dhoni to the crease at No. 4, and the Wankhede crowd is absolutely electric!"
        },
        {
          id: 28, over: 4, ballInOver: 4, overDisplay: "4.4",
          bowler: "Jofra Archer", batsmanOnStrike: "MS Dhoni", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 4, batsmanRuns: 4, extras: 0, extraType: null,
          totalScore: 39, totalWickets: 2,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: true, isSix: false, isDot: false,
          commentary: "First ball, vintage Dhoni! Short from Archer, Dhoni pulls it classically to the midwicket boundary. The stadium roars — Thala is here!",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 29, over: 4, ballInOver: 5, overDisplay: "4.5",
          bowler: "Jofra Archer", batsmanOnStrike: "MS Dhoni", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 39, totalWickets: 2,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Full and straight, Dhoni blocks it solidly. Respecting the good ball.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 30, over: 4, ballInOver: 6, overDisplay: "4.6",
          bowler: "Jofra Archer", batsmanOnStrike: "MS Dhoni", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 6, batsmanRuns: 6, extras: 0, extraType: null,
          totalScore: 45, totalWickets: 2,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: true, isDot: false,
          commentary: "HELICOPTER SHOT! Archer goes full, Dhoni launches it over long-on with that trademark flick of the wrists! The ball sails into the stands! Wankhede is rocking! 10 off the over.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },

        // ---------------- Over 6: Bumrah — Dhoni falls, powerplay ends (3 runs incl wide, 48/3) ----------------
        {
          id: 31, over: 5, ballInOver: 1, overDisplay: "5.1",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "MS Dhoni", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 45, totalWickets: 2,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Yorker from Bumrah, Dhoni digs it out smartly with a bent knee. Bumrah to Dhoni — the matchup everyone stayed for. Nothing given away.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 32, over: 5, ballInOver: 2, overDisplay: "5.2",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "MS Dhoni", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 45, totalWickets: 2,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Outside off again, Dhoni watches it through to the keeper. Patient reading of Bumrah's length.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 33, over: 5, ballInOver: 3, overDisplay: "5.3",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "MS Dhoni", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 2, batsmanRuns: 2, extras: 0, extraType: null,
          totalScore: 47, totalWickets: 2,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Punched to deep midwicket, Dhoni hustles through for TWO of his own! Keeps the strike — one more big moment brewing for the Wankhede faithful.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 34, over: 5, ballInOver: 4, overDisplay: "5.4",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "MS Dhoni", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 47, totalWickets: 3,
          isWicket: true, wicketType: "caught_behind", dismissedBatsman: "MS Dhoni", fielder: "Ishan Kishan",
          isBoundary: false, isSix: false, isDot: false,
          commentary: "CAUGHT BEHIND! Bumrah angles one across Dhoni who goes for a big drive. Thin edge! Ishan Kishan dives to his right and takes a sharp catch behind the stumps. Dhoni departs for 12 off just 7 balls. The Wankhede falls silent. Moeen Ali walks in.",
          isKeyMoment: true,
          keyMomentType: "big_wicket",
          keyMomentDetail: "The big one! Bumrah angled a delivery across MS Dhoni who was tempted into a cover drive. The ball took a thin outside edge and flew to wicketkeeper Ishan Kishan, who dived to his right and took a sharp catch. Dhoni departs for a quickfire 12 off 7 balls (4, 0, 6, 0, 0, 2, then out). The crowd goes silent — MI's premier bowler has removed the biggest threat."
        },
        {
          id: 35, over: 5, ballInOver: 5, overDisplay: "5.5",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Moeen Ali", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 1, batsmanRuns: 0, extras: 1, extraType: "wide",
          totalScore: 48, totalWickets: 3,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: false,
          commentary: "Wide! Bumrah strays down the leg side. Extra run. Still ball 5 of the over.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 36, over: 5, ballInOver: 5, overDisplay: "5.5",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Moeen Ali", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 48, totalWickets: 3,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Squeezed away to cover on the bounce, no run available — Moeen still can't get off the mark.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        },
        {
          id: 37, over: 5, ballInOver: 6, overDisplay: "5.6",
          bowler: "Jasprit Bumrah", batsmanOnStrike: "Moeen Ali", batsmanNonStrike: "Ruturaj Gaikwad",
          runs: 0, batsmanRuns: 0, extras: 0, extraType: null,
          totalScore: 48, totalWickets: 3,
          isWicket: false, wicketType: null, dismissedBatsman: null, fielder: null,
          isBoundary: false, isSix: false, isDot: true,
          commentary: "Full and straight, Moeen defends to end the powerplay. CSK 48/3 after 6 overs.",
          isKeyMoment: false, keyMomentType: null, keyMomentDetail: null
        }
      ]
    }
  ]
};

// Expose globally for MatchEngine / app.js (const doesn't auto-attach to window)
if (typeof window !== 'undefined') {
  window.MATCH_DATA = MATCH_DATA;
}
