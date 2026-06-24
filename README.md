# Think Cricket — Frontend

Web frontend for the Think Cricket cricket scoring and match management application.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **shadcn/ui v4** (Base UI primitives)
- **TanStack Query** — server state, caching, mutations
- **Sonner** — toast notifications
- **tw-animate-css** — animation utilities (`animate-in`, `fade-in`, `zoom-in-75`)

## Prerequisites

The Spring Boot backend must be running before starting the frontend. All API requests are proxied through `app/api/[...path]/route.ts` using Node.js `http` to support GET requests with JSON bodies (non-standard backend design).

The backend URL is configured in `app/api/[...path]/route.ts`.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To kill the dev server:

```bash
npx kill-port 3000
```

## Architecture Notes

### API Proxy

Browser requests go to `/api/*` (Next.js route handler) which forwards them to the backend. GET requests are sent as query params by the browser and reconstructed as JSON bodies by the proxy — required because the Spring Boot backend uses `@RequestBody` on all GET endpoints.

The proxy does **not** forward request headers — only the body. The `Session-Token` header is not forwarded; the session token is sent in every request body instead.

### Authentication

Sessions are stored in `localStorage` (`sessionToken`, `userId`, `username`). The token is sent in the request body of every API call. On any 401 response, `lib/api.ts` automatically clears the session and redirects to `/login`.

### Key Conventions

- `lib/api.ts` — all API functions; GET requests automatically convert body to query params; global 401 handler auto-redirects to login
- `lib/types.ts` — shared TypeScript interfaces matching backend DTOs and models
- `lib/auth.ts` — session token read/write helpers
- Backend model classes use `id`; DTO classes use descriptive names (`playerId`, `teamId`, etc.)

### Match Page State Machine

The match page (`app/(protected)/matches/[id]/page.tsx`) drives a phase state machine:

```
loading → not_started → declare_squad → toss → start_innings
       → start_over → recording → over_complete → innings_complete
       → complete_result → completed
```

`computePhase()` determines the correct phase from backend state on load and after mutations. Ref guards (`inSquadPhaseRef`, `isComputingPhaseRef`, `pendingWicketRef`) prevent `computePhase()` from overwriting locally-managed UI state.

## Features

### Auth
- Register, login, logout
- Session token persisted in `localStorage`; cleared automatically on 401

### Players
- Create, update, delete players
- Search players by name
- View teams a player belongs to

### Teams
- Create, modify, delete teams
- Add and remove players from teams

### Matches
- Host matches (format, overs, teams, start time)
- Dashboard with My Matches and Recent Matches

### Squad Declaration
- Select Playing XI and substitutes for each team before the toss
- Assign captain and vice-captain
- Validation: both squads must be declared before proceeding to toss

### Toss
- Animated coin flip with head/tail result display
- Select toss winner and bat/bowl decision
- "Complete Toss" button only active after the coin has settled

### Live Scoring — Ball by Ball
- Select batsman, non-striker, runs, extras, boundaries, and wicket flag per ball
- Auto-swap of striker/non-striker on odd runs and at the start of each new over
- Live score updates after every delivery

### Wicket Recording
- Select dismissal type, bowler, and fielder
- Dismissed batsmen are tracked locally and excluded from the New Batsman dropdown
- Fielder dropdown correctly populated even when the wicket falls on the last ball of an innings

### Player Substitutions
- Record substitutions (Impact/Concussion/Retired Hurt) during an active innings
- Substituted-in player appears in fielder/batsman dropdowns; substituted-out player is removed
- Substitution state is maintained locally so backend squad re-fetches do not overwrite it

### Scorecard
- Ball-by-ball batting stats: runs, balls, 4s, 6s, strike rate, dismissal type
- Bowling stats: overs, maidens, runs, wickets, economy
- Fall of wickets
- View full squad for each team (all declared players, not just those who scored)
- Available from the match page during an active innings; also accessible from the result page

### Match Result
- Win/loss result with margin text
- Full scorecard for both innings
- Toggle to view complete squad (Playing XI + substitutes) per team

### Ball Flash Animation
- Animated badge appears to the right of the Record Ball card after each delivery
- Shows outcome: dot ball (•), runs (1–6), boundary (4/6), wide (Wd), no ball (NB), bye, leg bye, or wicket (W!)
- Stays visible for 1 second then fades
- Animation is positioned at the card edge using `getBoundingClientRect()` captured before the card transitions

### Light / Dark Mode
- Toggle between light and dark themes from the navigation bar (sun/moon icon)
- Preference persisted in `localStorage` under the key `theme`
- Defaults to dark mode
