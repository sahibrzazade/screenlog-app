# Screenlog

A personal watch-logging app that keeps Letterboxd's movie logging and rating
experience while giving **TV shows full, equal support** — the same search, log,
and rate flow for shows and seasons as for films.

Search TMDB for movies and TV, mark something as watched with a 0.5–5 rating
(overall for a show, plus a separate rating per season), leave an optional
written review, record the watch date, and keep unwatched titles in a watchlist.
Your diary shows everything you've logged in chronological order. Every rating and
review is publicly readable and attributed by username under the relevant title —
that's the one social touch; there is no following, feed, or public profile page.

## Features

- **Auth** — email/password and Google OAuth via Supabase Auth; username chosen on
  first sign-in
- **Movie logging** — 0.5–5 star rating, optional review, watch date, rewatch flag
- **TV logging** — an overall show rating plus an independent rating and review for
  each season (no episode-level tracking)
- **Watchlist** — add/remove movies and shows, surfaced on the home page
- **Diary** — all your logs in reverse-chronological order by watch date
- **Public reviews** — any visitor, including logged-out guests, sees every user's
  rating + review under a movie, show, or season, attributed by username
- **Private profile** — a `/profile` dashboard summarising your own watchlist,
  diary, and logs; not visible to anyone else
- **Account settings** — change your username from `/settings`
- **TMDB proxy** — all TMDB calls go through server route handlers so the API key
  never reaches the client
- **Row Level Security** — every write is scoped to the logged-in user; no user can
  modify another user's data

## Tech Stack

| Area            | Choice                                                        |
| --------------- | ------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19                            |
| Language        | TypeScript (strict)                                          |
| Styling         | Tailwind CSS 4                                               |
| Backend / DB    | Supabase — Postgres, Auth, Row Level Security                |
| External data   | TMDB API (metadata, posters, cast, descriptions)            |
| Validation      | Zod                                                          |
| UI              | lucide-react / react-icons, sonner (toasts)                 |
| Unit tests      | Vitest + React Testing Library                              |
| E2E tests       | Playwright                                                   |
| Deployment      | Vercel                                                       |

> This repo runs Next.js 16, which may differ from older Next.js APIs and
> conventions. See `AGENTS.md` — consult `node_modules/next/dist/docs/` before
> writing framework code.

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [TMDB API](https://www.themoviedb.org/settings/api) key

### Setup

```bash
npm install
```

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
TMDB_API_KEY=your-tmdb-api-key
```

Apply the database schema by running the SQL files in `supabase/migrations/` in
order against your Supabase project (SQL editor or `supabase db push`).

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command             | Description                          |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Start the dev server                |
| `npm run build`     | Production build                    |
| `npm run start`     | Serve the production build          |
| `npm run lint`      | ESLint                              |
| `npm test`          | Vitest unit/component tests         |
| `npm run test:e2e`  | Playwright end-to-end tests         |

## Project Structure

```
src/
  app/                      Next.js routes (pages, layouts, route handlers)
    (auth)/                  Login / signup pages and auth server actions
    api/tmdb/               Route handlers proxying TMDB (keeps the key server-side)
    auth/callback/          OAuth callback handler
    movie/[id]/             Movie detail page + log actions
    tv/[id]/                Show detail page + season log actions
    diary/                  Chronological log history
    watchlist/             Watchlist page + actions
    profile/               Private dashboard
    settings/              Account settings
  components/               Reusable UI (forms, cards, rating stars, navbar…)
  lib/
    supabase/               Browser + server client setup, proxy helper
    tmdb/                   TMDB client, types, response mappers
    validation/             Zod schemas (movie/show/season logs, rating, username…)
    diary.ts, profile.ts, reviews.ts, watchlist.ts   Data-access helpers
supabase/
  migrations/               Ordered SQL migrations (tables + RLS policies)
tests/                      Vitest unit/component tests
e2e/                        Playwright e2e tests
spec.md                     Full product spec
```

## Testing

- **Unit / component** (`npm test`) — rating logic, TMDB mappers, Zod validation,
  and individual components.
- **E2E** (`npm run test:e2e`) — critical flows: auth, search, creating a log,
  season ratings, watchlist, public reviews.

## Deployment

Deploys to Vercel. Set the four environment variables above in the Vercel project
settings; the build command is `npm run build`.
