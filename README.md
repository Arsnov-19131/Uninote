# Uninote

A study app for students. Plan your work, keep notes, ask an AI tutor to explain things, quiz yourself, and see how ready you are for your exams, all in one place. Your data stays on your device and syncs to your account when you sign in.

> Built as an ICT course project.

## Features

| Area | What it does |
|---|---|
| **Home** | Overview of today's tasks, progress and shortcuts. |
| **Planner** | Agenda, Day, Week and Month views. Drag a task to another day, and set several reminders per task. |
| **Roadmap** | Subjects with nested topics and a coverage checklist. Paste a syllabus and the AI turns it into topics. |
| **Chat** | AI tutor with three explanation levels (simple, normal, detailed). Pull in a note as the source, see the key terms, and save answers as notes. |
| **Vault** | Markdown notes with folders, search, tags, Trash, import and export. |
| **Quiz** | AI-generated multiple-choice, true/false and short-answer questions. Short answers are graded by the AI. |
| **Tracker** | Readiness score built from your quizzes and topic coverage, weak topics and suggestions. |
| **Resources** | Folders of study material and links. |
| **Notifications** | Reminders that fire while the app is open, plus device notifications if you allow them. |
| **Settings** | Light, Dark or System theme, timezone display, cloud account, local backup. |

Also included: offline support for pages you have already opened, an install-to-home-screen manifest, and a banner when your device's timezone changes.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, Lucide icons
- Zustand stores saved in `localStorage`
- [Supabase](https://supabase.com) for sign-in and cloud sync
- Google Gemini for the AI features, called only from the server

## Getting started

You need Node.js 20 or newer.

```bash
git clone https://github.com/Arsnov-19131/uninote.git
cd uninote
npm install
cp .env.example .env.local
```

Open `.env.local` and fill in the values below, then start the app:

```bash
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For accounts and sync | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For accounts and sync | Your Supabase publishable key. (`NEXT_PUBLIC_SUPABASE_ANON_KEY` still works as a fallback.) |
| `GEMINI_API_KEY` | For AI features | Your Google Gemini key. Keep it in `.env.local` only. |
| `GEMINI_MODEL` | No | Model name from Google AI Studio. Default: `gemini-3.5-flash-lite`. |
| `AI_REQUIRE_LOGIN` | No | In production the AI route needs a signed-in account by default. Set to `true` to require login in development too. |
| `NEXT_PUBLIC_RESOURCES_WEBSITE_URL` | No | Link shown in the Resources screen. |

Never put a Supabase secret or service-role key in these variables. The app only ever needs the publishable key in the browser.

Without Supabase keys the app still works fully on one device. Without `GEMINI_API_KEY` the AI screens show a clear error instead of crashing.

### Set up Supabase (for accounts and sync)

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run these files from `supabase/migrations/`, in order:
   - `001_core_tables.sql`
   - `002_user_app_data.sql` (the table the app syncs to, protected by Row Level Security)
   - `003_limit_app_data_size.sql` (caps each account's synced data at about 5 MB)
3. In **Authentication**, set a minimum password length of 8 or more, and set the email link expiry for password reset (OTP expiry) to a short time such as 1 hour.
4. Add your site URL and `/auth/reset-password` to the allowed redirect URLs.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server. |
| `npm run build` | Build for production. |
| `npm start` | Run the production build. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the date and reminder edge-case tests (needs Node 22.6 or newer). Try other zones with `TZ="Asia/Karachi" npm test`. |

## How it works

- **Local first.** Everything is stored in your browser, so the app works offline. Signing in adds cloud sync on top.
- **Cloud sync.** Each account has one row in `user_app_data`. Before saving, the app reads the cloud copy, merges it with the device (newest edit per item wins, deletions are respected), and writes only if nobody else changed it in the meantime. Row Level Security means a user can only read and write their own row.
- **AI.** Pages call `/api/ai`, which holds the Gemini key. In production it requires a signed-in account, enforces per-user daily and per-minute limits, times out after 30 seconds, and treats pasted note text as data, not instructions. Limits are kept in server memory, so they reset on restart. Use your Google AI Studio quota for real cost control.
- **Reminders.** Reminders are worked out from your tasks, so editing, moving or completing a task updates them automatically. They fire while the app is open. Reminders missed while it was closed are delivered late, with "was due" wording.

## Project structure

```
src/
  app/            Pages (dashboard screens, auth) and the /api/ai route
  components/     Planner views, cloud sync, theme, offline and timezone banners
  lib/            AI client, calendar helpers, reminders, cloud sync, Supabase client
  store/          One Zustand store per area (subjects, tasks, notes, quizzes, ...)
  types/          Shared TypeScript types
public/           Service worker, manifest, icons, offline page
supabase/         SQL migrations
scripts/          Edge-case tests
```

## Known limitations

- Reminders do not fire while the app is closed. Background push and email delivery need a server and are not built.
- Drag to another day works with a mouse. On phones use "+1 Day" or edit the task's date.
- The AI limits are per server instance, not shared across instances.
- There is no Content-Security-Policy header yet. Other security headers are set in `next.config.ts`.

## License

No license has been chosen yet. All rights reserved by the author until one is added.
