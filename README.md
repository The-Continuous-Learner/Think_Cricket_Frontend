# Think Cricket — Frontend

Web frontend for the Think Cricket cricket scoring and match management application.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4**
- **shadcn/ui v4** (Base UI primitives)
- **TanStack Query** — server state, caching, mutations
- **Sonner** — toast notifications

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

### Authentication

Sessions are stored in `localStorage` (`sessionToken`, `userId`, `username`). The token is sent in the request body of every API call.

### Key Conventions

- `lib/api.ts` — all API functions; GET requests automatically convert body to query params
- `lib/types.ts` — shared TypeScript interfaces matching backend DTOs and models
- `lib/auth.ts` — session token read/write helpers
- Backend model classes use `id`; DTO classes use descriptive names (`playerId`, `teamId`, etc.)

## Features

- **Auth** — register, login, logout with session validation
- **Players** — create and search players
- **Teams** — create, modify, delete teams; add/remove players
- **Matches** — host matches, conduct toss, record innings ball-by-ball, track live score
- **Scorecard** — batting/bowling stats, fall of wickets, match result
- **Dashboard** — My Matches and Recent Matches overview
