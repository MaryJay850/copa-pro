# ProductNotes: BracketMaker.app Features → CopaPro Modules

## Overview

CopaPro adapts the UX simplicity and "tournament builder" flow of bracketmaker.app
to a padel league system with Round Robin scheduling, teams of 2, court assignment,
and season-based individual rankings.

---

## Feature Mapping

| BracketMaker Feature | CopaPro Module | Notes |
|---|---|---|
| **Tournament type selection** | Liga → Epoca → Torneio wizard | BracketMaker offers 5 bracket types. CopaPro simplifies to one: Round Robin with teams of 2. Format selection (single/double RR) in Step 1 of wizard. |
| **Participant entry** | Wizard Step 2 (Jogadores) | Quick-add + bulk paste (one per line). Players are reusable across tournaments. |
| **Seeded/random/manual pairings** | Wizard Step 3 (Equipas) | Fixed teams = manual pairing; Random teams = seeded shuffle with regeneration option. |
| **Auto bracket generation** | `generateSchedule()` + circle method | Classic polygon/circle method for Round Robin pairings, with court allocation respecting "no team twice per time block". |
| **Live bracket view** | Tournament page with Rounds/Courts grid | Each round is a card containing match cards. Court-based layout within rounds. |
| **Inline score editing** | MatchCard component | Three set score inputs per match. Auto-compute winner. Save/Reset buttons. Inline validation with Portuguese error messages. |
| **Automatic standings** | Season ranking table + `recomputeSeasonRanking()` | Individual player rankings aggregated across all tournaments in a season. Transactional updates on score changes. |
| **Share/link access** | URL-based routing | All pages are linkable. No auth required. |
| **Print/Export** | `window.print()` with CSS @media print | Print-friendly layout hides nav/buttons. Page-break avoidance per round. BracketMaker offers PDF; CopaPro uses browser print (which generates PDF). |
| **Sport-specific templates** | Padel-focused domain | Fixed to padel: teams of 2, set-based scoring (0-7), best-of-3 sets. |
| **Multiple bracket formats** | Round Robin only (single + double) | BracketMaker supports single/double elimination, RR, Swiss. CopaPro focuses exclusively on Round Robin for padel leagues. |

---

## UX Patterns Replicated

### 1. Minimal-click creation flow
BracketMaker: Select type → Enter participants → Generate.
CopaPro: 4-step wizard with progress bar. Each step is focused and clear.

### 2. Clean, card-based layout
Both apps use white cards with subtle borders and shadows.
CopaPro adds a consistent color system: blue (primary), amber (accent/warning),
green (success), red (danger).

### 3. Inline editing
BracketMaker: Click on match to edit score.
CopaPro: Score inputs directly visible in each match card. No modal needed.

### 4. Responsive design
Both work on desktop and mobile. CopaPro uses Tailwind responsive grid
(1 col mobile → 2 col tablet → 3 col desktop).

### 5. Breadcrumb navigation
CopaPro adds breadcrumbs (Ligas → Liga → Epoca → Torneio) for deep navigation,
matching BracketMaker's clean header approach.

---

## Domain Adaptations (BracketMaker → CopaPro)

| Concept | BracketMaker | CopaPro |
|---|---|---|
| Participants | Individual players | Teams of 2 players |
| Bracket format | Single/Double elimination, RR, Swiss | Round Robin only |
| Scoring | Simple win/loss or points | Set-based (0-7 per set, best of 3) |
| Rankings | Per-tournament standings | Season-based individual rankings |
| Organization | Flat tournament list | Liga → Epoca → Torneio hierarchy |
| Courts | Not applicable | Court assignment per round |
| Draw handling | Not applicable | Configurable per season |

---

## Point System Implementation

```
For each FINISHED match:

  Set Points:
    +2 per set won (awarded to EACH player on the team)

  Match Result Points:
    Win:  +3 per player on winning team
    Draw: +1 per player on both teams (if allowDraws=ON)
    Loss: +0

  Total = setPoints + matchResultPoints
```

### Tie-breaker Order
1. `pointsTotal` (higher is better)
2. `wins` (more wins)
3. `setsDiff` (setsWon - setsLost)
4. `setsWon` (more sets won)
5. `draws` (more draws, only if all above tied)

---

## Scheduling Algorithm

Uses the **circle/polygon method** for Round Robin generation:

1. Fix team[0] in position. Rotate all other teams clockwise.
2. Each rotation produces one logical round of pairings.
3. For double RR (matchesPerPair=2), duplicate all rounds with swapped sides.
4. Allocate pairings to time-block rounds respecting:
   - Max `courtsCount` matches per round
   - No team plays twice in the same round
5. Optional seed for deterministic shuffling of round order.

---

## Key Technical Decisions

1. **Next.js App Router + Server Actions**: Keeps the stack simple. No separate API layer.
   Server actions handle all CRUD and business logic.

2. **Prisma 7 + PostgreSQL**: Type-safe ORM with the new adapter pattern.
   Uses `@prisma/adapter-pg` for the connection.

3. **Tailwind CSS 4**: Utility-first styling with custom theme tokens.
   Print styles via `@media print` in globals.css.

4. **Pure functions for scoring/ranking**: `computeMatchContribution()` and
   `sortRankings()` are pure functions with 44 unit tests. No database dependency
   in the core logic.

5. **No auth**: Intentionally simple. Can be added later with NextAuth or similar.

6. **Portuguese UI**: All labels, messages, and error states in PT-PT.
