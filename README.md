# Life Tracker

A personal all-in-one life management web app (installable as a PWA) for tracking habits, finances, food, todos and journaling, with an AI assistant and social features.

## Features

- **Habits** – streaks, gamification, bento-grid layout, reordering, pause/active-day scheduling, shareable cards, and "duo pacts" with friends.
- **Finances** – expenses with category cards, budgets, recurring expenses, bank accounts, shopping lists and analytics. Includes a bill splitter.
- **Calories** – food log, nutrition details, saved foods, an Indian food catalogue, and nutrition-label scanning (Tesseract OCR + Groq LLM).
- **Todos** – tasks with deadlines and difficulty levels.
- **Journal** – journal entries.
- **Assistant** – Groq-powered chat that knows the app and can query your data (read-only SQL).
- **Friends** – usernames, invites, friend requests, leaderboard and comparisons.
- **Dashboard** – daily whisper, daily report and shareable report card.
- **Privacy** – client-side encryption with a vault unlock flow (`src/lib/crypto.js`).

## Tech stack

React 18, Vite, Tailwind CSS 4, Framer Motion, Recharts, React Router, Supabase (auth, Postgres, RLS), Groq API, vite-plugin-pwa, deployed on Vercel.

## Getting started

```bash
npm install
cp .env.example .env   # or create .env manually (see below)
npm run dev
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_GROQ_API_KEY` | Groq API key for the assistant and food lookup/scan |

### Database setup

Run the SQL files in `src/lib/` in your Supabase SQL editor, starting with `schema.sql`, then the feature schemas (`social-schema.sql`, `calories_schema.sql`, `journal_entries_schema.sql`, `create_ai_tables.sql`, etc.) and the `add_*` migrations as needed.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
  pages/        Route-level pages (Habits, Finances, Calories, Todos, ...)
  components/   UI components grouped by feature
  hooks/        Data hooks, one per feature (useHabits, useExpenseCards, ...)
  contexts/     Auth, encryption, theme and app-update contexts
  lib/          Supabase client, Groq integration, crypto, SQL schemas/migrations
  utils/        Gamification and share-card helpers
public/         Static assets, version.json (used for update prompts)
```

## Other docs

- [`UPI_SYNC_GUIDE.md`](UPI_SYNC_GUIDE.md) – design options for auto-syncing UPI/bank transactions into the app.
