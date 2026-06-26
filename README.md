# Think Cricket — Frontend

Web frontend for the Think Cricket cricket scoring and match management application.

## Live App

**[https://think-cricket-frontend.vercel.app/](https://think-cricket-frontend.vercel.app/)**

The app opens on a public landing page. From there:
- Click **Get Started for Free** to create an account
- Click **Login** to sign in to an existing account
- Once logged in you land on the match dashboard

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **shadcn/ui v4** (Base UI primitives)
- **TanStack Query** — server state, caching, mutations
- **Sonner** — toast notifications
- **tw-animate-css** — animation utilities (`animate-in`, `fade-in`, `zoom-in-75`)

## Prerequisites

The Spring Boot backend must be running and accessible. All API requests are proxied through `app/api/[...path]/route.ts` using Node.js `http` to support GET requests with JSON bodies (non-standard backend design).

Set the `BACKEND_URL` environment variable to point at the backend. Defaults to `http://localhost:8080` for local development.

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

## Deployment (Vercel)

1. Push the repo to GitHub and import it into Vercel.
2. Add the environment variable `BACKEND_URL` in Vercel project settings pointing to your hosted backend (e.g. `http://your-server-ip:8080`).
3. Vercel auto-deploys on every push to `main`.

## Architecture Notes

### API Proxy

Browser requests go to `/api/*` (Next.js route handler at `app/api/[...path]/route.ts`) which forwards them to the backend using Node.js `http`/`https`.

- **GET requests**: query params are extracted and re-serialized as a JSON body — required because the Spring Boot backend uses `@RequestBody` on all GET endpoints. Numeric string values (e.g. `"0"`, `"15"`) are coerced back to numbers before serialization so Spring Boot receives the correct types.
- **POST / PUT / DELETE**: the request body is forwarded as-is.
- The proxy does **not** forward browser request headers; only a `Content-Type: application/json` header is sent.

### Authentication

Sessions are stored in `localStorage` (`sessionToken`, `userId`, `username`). The token is sent in the request body of every API call. On any 401 response, `lib/api.ts` automatically clears the session and redirects to `/login`.

### Teams Cache

Teams are stored in `localStorage` under the key `tc_teams` (`lib/teams-cache.ts`) for instant rendering without a loading state. On every page load of the Teams page and the Host Match page, `GET /teams/my` is called and the cache is overwritten with the server response — ensuring a fresh browser or a different device always sees the correct team list.

### Key Conventions

- `lib/api.ts` — all API functions; GET requests automatically convert body to query params; global 401 handler auto-redirects to login
- `lib/types.ts` — shared TypeScript interfaces matching backend DTOs and models
- `lib/auth.ts` — session token read/write helpers
- `lib/teams-cache.ts` — localStorage cache for user teams
- Backend model classes use `id`; DTO classes use descriptive names (`playerId`, `teamId`, etc.)

### Match Page State Machine

The match page (`app/(protected)/matches/[id]/page.tsx`) drives a phase state machine:

```
loading → not_started → declare_squad → toss → start_innings
       → start_over → recording → over_complete → innings_complete
       → complete_result → completed
```

`computePhase()` determines the correct phase from backend state on load and after mutations. Multiple ref guards prevent `computePhase()` from overwriting locally-managed UI state:

| Ref | Purpose |
|-----|---------|
| `inSquadPhaseRef` | Blocks recompute while squad declaration is active |
| `isComputingPhaseRef` | Prevents concurrent `computePhase()` runs |
| `pendingWicketRef` | Holds phase in `recording` while wicket flow is in progress |
| `overrideComputePhaseRef` | Blocks recompute after an explicit `over_complete` or `innings_complete` phase set |

#### Test Match vs Limited-Overs

Test matches are detected by `match.totalOvers === 0`. Key differences:

- After every innings ends in a Test, the app goes directly to `start_innings` (batting team selector always visible) — the `innings_complete` intermediate screen is skipped.
- In limited-overs formats (T20, ODI, etc.), after 2 innings the `innings_complete` screen shows **"Complete Match & View Result"** instead of offering another innings.

## Features

### Landing Page
- Public intro page at `/` with cricket history, app features, and how-to-use guide
- Sticky header and bottom section with Login / Register links
- Scroll-triggered reveal animations throughout
- No login required to view

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
- Team list synced from server on every page load (works across browsers and devices)

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

### Undo Ball
- Available during `recording`, `over_complete`, and `innings_complete` phases
- Also available mid-wicket-flow (inside the wicket recording form)
- Calls `POST /balls/undo`; syncs batsmen from server via `GET /innings/current-batsmen` after every undo
- Handles all three response flags: `wicketReversed` (clears pending wicket state), `overReopened`, `inningsReopened`
- Repeatable — can undo multiple balls in sequence

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
