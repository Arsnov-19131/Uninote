# Project Status

**Project name:** AI Study Toolkit
**Goal (1-2 lines):** One app where a student organises subjects, plans work, learns from AI-explained notes, quizzes themselves and sees how prepared they are. All seven features share one data set. ICT course project, deadline **19 November 2026**.
**Tech stack:** Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, Zustand with localStorage persistence, Lucide React, Supabase Auth and JSONB cloud snapshot sync (implemented; setup and browser verification pending). AI provider: Google Gemini.
**GitHub repo:** (not set yet)
**Last updated:** 2026-10-29 (Task F - Removed demo seed data)

## Current State
All 7 features and the shell exist as screens with shared client-side state (see list below), and the user reports the site runs. BUT several behaviours are placeholders (verified by reading the code on 2026-10-27):
- (Fixed in Task A, pending the user's test) chat replies, quiz questions, short-answer grading and the syllabus import were mocks and now call Gemini.
- Chat and quiz offer a "Resources" source, but it is not wired: it is treated as general knowledge. Only "Notes Vault" sends real source text.
- (Fixed in Task B, pending the user's test) reminders now fire while the app is open. STILL missing: reminders while the app is closed (needs a server) and email backup.
- (Task D built and build-verified, pending project setup and user's browser test) email/password Supabase sign-up and sign-in, account-isolated cloud snapshot sync for all Zustand collections, local/offline persistence, and a new RLS-protected migration. `npx tsc --noEmit` and `npm run build` pass. The user must run `002_user_app_data.sql` and add the public URL + anon key to `.env.local`.
- (Fixed in Task C, pending the user's test) Planner now has Agenda, Day, Week and Month views, several reminders per task, and drag to another day.
- (Fixed in Task B) `public/icon-192.png` and `icon-512.png` now exist (navy graph-paper tile, yellow square, navy "S").
- (Fixed in Task E, pending the user's test) dark mode, a Light/Dark/System toggle, device-timezone detection with a change banner, and basic offline page caching are now in place.
- (Fixed in Task F) Demo seed data removed from `src/lib/seed.ts` and `src/app/dashboard/layout.tsx`. All stores start clean and empty. Settings "Reset to Demo Data" changed to "Clear All Local Data".

**Just built (Task A, written but NOT yet run):** real AI through one server route. Chat replies and keywords, quiz generation, short-answer grading and the syllabus import now call Gemini via `/api/ai`. Only a type-check of `src/lib/ai.ts` and `src/app/api/ai/route.ts` and a syntax check of the project were possible in the agent's sandbox. The user must add the key, run the app and test (steps under Next Task).

**Just built (Task B, written but NOT yet run in a browser):**
- `src/lib/reminders.ts`: pure logic. Reminders are DERIVED from tasks (each not-done task with `reminderOffsets` gets one pending notification per offset). Each cycle it reconciles stored notifications with tasks, then fires the due ones. Editing, completing, un-completing, deleting or moving a task now updates reminders automatically. Reminders missed while the app was closed are delivered late with "was due ..." wording, never lost. Reminders whose time had already passed at creation are not invented. 16 behaviour checks on this logic passed in the agent's sandbox (Node).
- `src/components/ReminderEngine.tsx` (mounted in the dashboard layout): registers the service worker, checks every 30 s and on tab focus and on any task change, waits for saved data to load before reconciling, and shows a device notification when permission is granted and the reminder is less than 6 h late.
- `public/sw.js`: shows notifications, opens the app on click, and already understands server push messages for later.
- `src/lib/device-notifications.ts`: permission, registration, show-notification helpers.
- Notification Centre page rewritten: lists only reminders that have fired, shows a "N reminders scheduled, next at ..." line, real permission status, a clear "blocked" banner, an "unsupported browser" note, and a "Send a test alert" button.
- Bell badge now counts only fired, unread reminders (before, scheduled future reminders were counted as unread). "Mark all as read" only touches fired reminders.
- Planner no longer creates its own one-off notification (the engine does). `AppNotification` gained optional `offsetMinutes` and `dueAt`; old saved notifications still load (old pending ones are replaced, old sent ones kept).
- Checks possible in the sandbox: logic tests (16 pass), type-check of the non-React files, TypeScript syntax check of the whole project, `node --check` on `sw.js`. NOT possible: install, build, run in a browser, show a real notification.

**Just built (Task C, written but NOT yet run in a browser):**
- Views: Agenda, Day, Week, Month. Previous/Next/Today step by day, week or month depending on the view. Week = seven columns on desktop, stacked days on phones, Sunday first (same as the month grid). Day = that day's tasks in time order with done-toggle and an add button. No hourly time grid (deliberately left out).
- Drag to another day: drag a task chip onto a day in the Week or Month view. It keeps its local time and its reminders follow automatically (ReminderEngine). Phones cannot drag with this method: use the "+1 Day" button (Agenda) or change the date in Edit. Chips are keyboard-focusable (Enter opens the editor); there is no keyboard drag.
- Several reminders per task: the dropdown became toggle chips (15 min, 1 h, 3 h, 1 day, 2 days, 7 days before; non-standard existing ones such as 2 h stay visible). Turning a chip off deletes that reminder. Empty = no reminders. Agenda and Day rows show a reminder count.
- Bugs fixed on the way: (1) tasks were placed on the UTC date, so in UTC+5 a task before 5 am showed on the previous day in Month view and moved a day back when edited near midnight; (2) editing a task with no reminder silently gave it a 1-hour reminder; (3) the "add task here" button in Month view always opened on today; (4) orange subjects were coloured violet in Month view; (5) `moveToDate` mis-handled day strings in time zones behind UTC.
- New: `src/lib/calendar.ts` (local-day helpers), `src/components/planner/{TaskChip,DropCell,WeekView,DayView,ReminderPicker}.tsx`. Changed: `src/app/dashboard/planner/page.tsx` (rewritten), `src/store/tasks.ts` (`moveToDate` now uses local days).
- Checks possible in the sandbox: 8 date-helper checks passed in 5 time zones (Karachi, UTC, New York, Auckland, Kolkata); type-check of the whole `src` tree against small stand-ins for React/zustand (no real errors; the only leftovers were artifacts of the stand-ins); syntax check. NOT possible: install, build, run, or any drag in a real browser.

**Just built (Task E, written but NOT yet run in a browser):**
- **Dark mode.** `src/app/globals.css` gained a token layer (`--color-ink`, `-ink-light`, `-ink-faint`, `-paper`, `-surface`, `-surface-soft`, `-border`, `-brand`, `-brand-hover`, `-brand-active`, `-focus`, `-sidebar`), each with a `.dark` override. All 450 hard-coded hex Tailwind classes (`text-[#1a2332]` etc.) across 15 files and all 68 `bg-white` cards were mechanically replaced with the matching token class (`text-ink`, `bg-surface`, ...) by a checked script — no hand-editing, so nothing was missed or mistyped; confirmed 0 hex classes remain. Tailwind named-colour status badges (sky/red/emerald/amber/rose, used for pills and links) were deliberately left alone — they're self-contained colour pairs that should stay legible on a dark card, but look at them once in dark mode in case any read as too dim. `ThemeToggle` (`src/components/ThemeToggle.tsx`) is a Light/Dark/System control wired into a new "Appearance" card in Settings; it persists to `localStorage` under `ast-theme` (so it's swept up by the existing Export Backup / Reset to Demo Data tools for free) and follows OS changes live while "System" is selected. An inline script in `src/app/layout.tsx` applies the saved/system theme before first paint, so there's no light-then-dark flash. `viewport.themeColor` now has separate light/dark values.
- **Time zones.** No per-user timezone setting was added — every date already comes from the device's own clock (`src/lib/calendar.ts`), which is the right default for a single-device planner this close to the deadline; building full custom-timezone support was judged too large and risky to do untested before 19 November. Instead: `src/lib/timezone.ts` + `src/components/TimezoneBanner.tsx` detect the device's IANA zone, remember it (`ast-timezone`), and show a dismissible banner across the dashboard the first time it differs from what was last seen (e.g. after travel), explaining that task days/reminders now follow the new zone. The dead, non-functional "Timezone" text field in Settings (it was free-text, never read or saved anywhere) is now a read-only display of the detected zone instead, and no longer risks a server/client hydration mismatch (it used to read `Intl.DateTimeFormat()` during render, which runs on the server too).
- Fixed the known Dashboard quick-add bug: the "Add Task" date field defaulted to `new Date().toISOString().slice(0, 10)` (the **UTC** date), so between midnight and 5 am in UTC+5 it silently proposed yesterday. Now uses `todayKey()` from `calendar.ts`, and re-reads it each time the modal opens (in case the tab's been open since before midnight).
- **Offline polish.** `public/sw.js` now caches pages and static assets as they're visited (network-first for pages so you never see a stale screen while online, falling back to the cache when offline; cache-first for build assets, which are safe to cache immediately because Next.js names them with a content hash). `public/offline.html` is a plain, framework-free fallback shown for a page you haven't opened before. `/api/*` (the Gemini calls) is deliberately never cached — a stale AI answer would be worse than a clear error. `OfflineBanner` (`src/components/OfflineBanner.tsx`, via `useOnlineStatus`) shows a banner across the dashboard while `navigator.onLine` is false; `src/lib/ai.ts`'s `call()` now checks `navigator.onLine` first and fails immediately with "You're offline..." instead of waiting on a doomed request. Per-button disabling of the AI buttons themselves was left out of scope (the clear, immediate error message was judged enough; disabling each button individually across 3 pages risked introducing bugs that can't be tested in this sandbox).
- **Edge-case testing.** `scripts/edge-case-tests.mjs`: a standalone Node test file (plain JS, no build step — the real `.ts` logic is copied in, so re-copy it if `calendar.ts`/`reminders.ts` change) covering leap day (Feb 29 2028), Feb 30 rejection, year-end rollover, `moveToDay` keeping local time-of-day and rejecting bad dates, week-grouping and sorting, and reminder-cycle rules (DST does not shift absolute send time, a past-due reminder is never invented, a late reminder still delivers with "was due" wording, editing a task's reminders removes the stale one with no duplicate, completing a task drops its pending reminders). 29 checks, run and passing in **7** time zones: Karachi, UTC, New York, Auckland, Kolkata, and two unusual-offset DST zones (Lord Howe Island UTC+10:30/+11, Chatham Islands UTC+12:45/+13:45). Run it with `node scripts/edge-case-tests.mjs`, or `TZ="America/New_York" node scripts/edge-case-tests.mjs` for a specific zone. A manual checklist for what can't be tested headlessly (dark mode visually, offline in a real browser, storage edge cases) is under Next Task below.
- Checks possible in the sandbox: the 29-check test file above, syntax/shape review of every changed file, a scripted audit confirming 0 hex-colour classes and 0 `bg-white` remain. NOT possible: install, build, run in a browser, see dark mode rendered, or actually go offline in a browser.

## Build Order / Task List
Done (screens and state, with the placeholders noted above):
- [x] 1. Project setup, design tokens, graph-paper styling, manifest
- [x] 2. Shared types and utilities (`src/types/index.ts`, `src/lib/utils.ts`)
- [x] 3. Zustand stores (subjects, topics, tasks, notes, quizzes, chat, notifications, progress, resources)
- [x] 4. Shared UI library (`src/components/ui/index.tsx`)
- [x] 5. App shell and responsive navigation
- [x] 6. Seed demo data (`src/lib/seed.ts`)
- [x] 7. Home dashboard
- [x] 8. Planner (agenda + month, one reminder per task)
- [x] 9. Roadmap (folders, nested topics, coverage)
- [x] 10. Notes Vault (Markdown, search, tags, Trash, import/export)
- [x] 11. Chatbot UI (levels, source picker, keywords tab, save as note) - replies are canned
- [x] 12. Quiz UI (setup, taking, results, override) - questions and short-answer grading are canned
- [x] 13. Tracker (60/30/10 readiness, weak topics, suggestions)
- [x] 14. Resources (folder picker, excerpts, website link)
- [x] 15. Notification centre and settings (history only; nothing fires reminders)
- [x] 16. Supabase SQL migration written (not run, not connected)

To do, in agreed order (update after every build):
- [x] A. Real AI via one server route `/api/ai` using Gemini; chat, quiz generation, short-answer grading and syllabus parser connected. Key stays on the server. WRITTEN, NOT YET RUN by anyone. Mark as verified only after the user's test.
- [x] B. Working reminders: service worker + due-reminder engine while the app is open; icons added. WRITTEN, NOT YET RUN in a browser. (Background push and email backup remain future server-side work.)
- [x] C. Planner: day and week views, multiple reminders per task, drag to another day. WRITTEN, NOT YET RUN in a browser.
- [x] D. Supabase login and cloud storage: browser sign-up/sign-in and account-scoped cloud snapshot sync written, with RLS migration `002_user_app_data.sql`. TypeScript and production build pass. NOT YET RUN against Supabase or in a browser.
- [x] E. Time zones, dark mode, offline polish, edge-case testing. WRITTEN, NOT YET RUN in a browser. Mark as verified only after the user's test.
- [x] F. Remove mock/demo seed data (`src/lib/seed.ts`, "Clear All Local Data" in Settings). DONE.

## Next Task
1. USER: set up Supabase and test Task D: run `supabase/migrations/002_user_app_data.sql` in the Supabase SQL Editor; set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`; restart the app; create an account or sign in; confirm first sign-in merges local data, edits sync, and data returns on a second browser/device. Confirm email if Supabase email confirmation is enabled. The old `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported as a fallback; never put a secret/service-role key in the browser.
2. USER: test Tasks A, B, C, E, and F on the real machine (the user said they test on their own; none of A, B, C, or E have been run in a browser yet). Task A/B/C checklist (unchanged from before):
   - Planner: switch between Agenda / Day / Week / Month; use Previous, Today, Next in each; headings should read correctly.
   - Add a task for tomorrow at 01:00 (after midnight). It must appear on tomorrow's column or cell, and still on tomorrow after you open Edit and Save.
   - Week or Month view on a computer: drag a task onto another day. It should move, keep its time, and the Notification Centre should show the reminder at the new time.
   - Edit a task: turn several reminder chips on and off, save, reopen. A task saved with no chips must still have none after editing.
   - Day view: tick a task done, open it by clicking the title, add a task for that day.
   - Phone-width window: Week view should stack the days; use "+1 Day" or Edit to move tasks.
   - Chat / Quiz / Roadmap: confirm real Gemini replies (not canned text), and that a bad/missing API key shows a clear error banner instead of crashing.

   Task E checklist:
   - Settings → Appearance: click Light, Dark, System. Every screen should recolour (background, text, cards, buttons) with good contrast in both themes — look closely at Chat, Quiz and the Planner views, which have the most custom colour. Reload the page in Dark: it should open in dark immediately, no white flash.
   - If your device is set to "System" and you switch your OS to dark/light, the app should follow without a reload.
   - Settings → the Timezone field should show your real zone (e.g. `Asia/Karachi`) and not be editable.
   - Turn off Wi-Fi/data, reload a page you've already opened: it should still load, with an "You're offline" banner near the top. Try Chat or Quiz while offline: it should show an immediate, clear error, not a long hang. Reload a page you've *never* opened before while offline: you should see the plain "You're offline" fallback page, not a browser error screen. Turn the network back on and confirm the banner disappears and AI features work again.
   - Empty states: a subject/day/folder with nothing in it should show a sensible message, not a blank area or an error (spot-check Planner Day view on an empty day, Vault with no notes).
   - A very long task title or note title: it should truncate or wrap, not break the layout.
   - Deny the notification permission (or leave it denied): the Notification Centre should show the "blocked" banner, not throw an error anywhere else.
   - Storage edge cases: try "Export Data Backup" and "Clear All Local Data" in Settings.

   Task F checklist:
   - Fresh state: new browsers / users start with an empty state (no pre-seeded Maths, Physics, CS, Bio).
   - In Settings, clicking "Clear All Local Data" prompts for confirmation and clears local storage, leaving a clean slate on reload.
3. AGENT: fix whatever the browser test finds. Awaiting user's checkpoint choice: commit-to-GitHub/save-locally/both/skip for the work delivered so far.

## Code Review Follow-ups (2026-10-30, written, NOT yet run)
- DONE: `public/sw.js` (v2: no RSC/dynamic caching, only `/_next/static/` + icons cache-first, error pages not cached), `src/lib/device-notifications.ts` (no SW in dev; removes old SW + cache), `chat/page.tsx` (Markdown rendering, input restored on AI failure, question saved only after reply).
- DONE (written, NOT yet run): `/api/ai` hardening. In production it needs a signed-in Supabase account (bearer token checked on the server); in dev it stays open unless `AI_REQUIRE_LOGIN=true`. Limits per user: 150 model calls/day, 12/min, retries counted. 30 s Gemini timeout, 100 KB body cap, `<source>` tag break-out blocked. `src/lib/ai.ts` sends the session token. New env var `AI_REQUIRE_LOGIN` in `.env.example`. Limits are in memory (reset on restart).
- DONE (written, NOT yet run in a browser/Supabase): cloud sync no longer overwrites other devices. Each save first reads the cloud copy, merges it (deletions respected), applies the result locally, and writes only if `updated_at` is unchanged (otherwise re-merges, up to 4 tries). No write when nothing is new. Saves are queued. Tabs also pull every 60 s and when they become visible. A 10-check simulation with a fake two-device Supabase passed in the agent sandbox (stale device adds an item without dropping the other's, deletions propagate, conflict retry, no-op writes nothing). Changed: `src/lib/cloud-sync.ts`, `src/components/CloudSync.tsx`.
- OPEN: "Resources" source not wired; remove `ai-study-toolkit-task-d-files.zip` from git; `next lint` removed in Next 16; unused deps.
- Git: local commit fbf22c1 exists, no remote.

## Last Commit
Local commit `fbf22c1` on `main` (feat: AI route, reminders, planner views, cloud sync, dark mode, clean data). No remote yet, nothing pushed. Planned cleanup (user runs it): remove `ai-study-toolkit-task-d-files.zip` from the commit and ignore `*.zip`, restore `README.md` (agent instructions), commit the review fixes as `fix: service worker, chat markdown/retry, AI route hardening, cross-device cloud sync`, add the GitHub remote, push. Confirm here once pushed.

## Important Files
- `PROJECT_STATUS.md`: this file. `HANDOFF.md`: detailed notes for the next agent session.
- `AI Study Toolkit Workflow.docx`: the product spec (Section 2 is the one in use).
- `src/types/index.ts`: all shared types.
- `src/store/*.ts`: Zustand stores, one per area, persisted with keys like `ast-progress`.
- `src/lib/seed.ts`: demo seed data removed (clean empty state). `src/lib/utils.ts`: ids, dates, formatting.
- `src/app/dashboard/layout.tsx`: shell. `src/app/dashboard/{page,planner,roadmap,vault,chat,quiz,tracker,resources,notifications,settings}`: screens.
- `src/lib/ai.ts`: the helper pages use for AI (types + `aiExplain`, `aiGenerateQuiz`, `aiGradeShortAnswer`, `aiExtractTopics`).
- `src/app/api/ai/route.ts`: server route holding the Gemini key, prompts, JSON validation, one retry, per-client daily cap (150, in memory).
- `src/app/dashboard/chat/page.tsx`, `quiz/page.tsx`, `roadmap/page.tsx`: now call the AI helper (edited in Task A).
- `src/lib/reminders.ts`, `src/lib/device-notifications.ts`, `src/components/ReminderEngine.tsx`, `public/sw.js`, `public/icon-*.png`, `public/manifest.json`: reminders (Task B). `src/store/notifications.ts` gained `update`; `src/app/dashboard/layout.tsx` mounts the engine; `notifications/page.tsx` was rewritten.
- `src/lib/calendar.ts`, `src/components/planner/*`: Planner calendar views, drag and drop, reminder chips (Task C). Use `dayKeyOf(task.dueAt)` for a task's calendar day, never `dueAt.slice(0, 10)`.
- `supabase/migrations/001_core_tables.sql`: schema + Row Level Security, not run.
- `src/lib/theme.ts`, `src/components/ThemeToggle.tsx`: dark mode (Task E). `src/app/globals.css` holds the colour tokens; `src/app/layout.tsx` has the no-flash init script.
- `src/lib/timezone.ts`, `src/components/TimezoneBanner.tsx`: timezone-change detection (Task E).
- `src/lib/supabase.ts`, `src/lib/cloud-sync.ts`, `src/components/CloudSync.tsx`, `src/components/CloudAccount.tsx`: Task D browser auth and private snapshot sync.
- `supabase/migrations/002_user_app_data.sql`: Task D per-account JSONB table and RLS policy; run after the original schema migration.
- `src/lib/use-online-status.ts`, `src/components/OfflineBanner.tsx`, `public/offline.html`: offline polish (Task E). `public/sw.js` now caches pages/assets, not just notifications.
- `scripts/edge-case-tests.mjs`: standalone edge-case test harness (Task E). Run with `node scripts/edge-case-tests.mjs`.
- `AGENTS.md`: written by Next.js. It says this Next.js version has breaking changes and to read `node_modules/next/dist/docs/` before writing Next code. Do that when making route-handler or config changes.

## Decisions Made
- Design: "marked-up graph paper", highlighter colours per subject (yellow, mint, pink, sky, violet, orange).
- Offline-first with Zustand + localStorage remains the base; signed-in accounts sync one RLS-protected JSONB snapshot through Supabase. The service-role key is never used in the browser.
- AI provider: Gemini (user's choice, 2026-10-27). One AI service layer so the provider can be swapped by changing one file.
- Deadline is 19 November 2026 (user confirmed). The Claude project description still says 9 November; ignore that.
- Update this file after every build, and after the AI build ask whether to keep the mock data.
- Do not tell the user the app works unless it was actually run. Task D type-check and production build now pass in the workspace; live Supabase and browser checks remain for the user.

## Known Issues / Notes
- The Supabase migration and live auth/cloud sync still need verification in the user's project and browser.
- The Gemini request format in `route.ts` (`POST .../v1beta/models/{model}:generateContent`, header `x-goog-api-key`, `responseMimeType: application/json`) is from memory and unverified because the reference page could not be fetched. If calls fail with 400/404, check current docs.
- Short answers that cannot be graded (AI error) keep the student on the question and record nothing, so a failed call never records a wrong score.
- The daily cap is per server process and resets on restart; it is a safety net, not real cost control. Check quota in Google AI Studio.
- Gemini details NOT yet confirmed: the official generateContent reference page could not be fetched. A docs page showed current models `gemini-3.5-flash-lite` (recommended low-cost), `gemini-3.8-flash`, `gemini-4-argon`, and said 2.5 models have limited access. The docs also showed a newer "Interactions API". The user must check the model name and free-tier limits in Google AI Studio. Make the model name an env var (`GEMINI_MODEL`).
- A separate, abandoned Supabase-based Planner start exists in the agent's workspace (`study-toolkit`, not the user's project). Do not merge it into this project.
- Reminders only fire while the app is open in a browser tab or an installed window (and the computer is awake). True background push and email delivery remain unbuilt and need server-side work. The Notification Centre text says "while the app is open" so users are not misled.
- The Planner form still offers one reminder per task (None, 15 min, 1 hour, 1 day); the engine already supports several offsets (seed tasks use them). Multiple reminders in the form come in Task C. Offset 0 means "None".
- Device notifications need https or localhost, and the user's permission; on iPhone the app must be added to the Home Screen. Not tested on any device yet.
- Notification and task timestamps are compared in absolute time, so reminders fire at the right moment in any time zone; display formatting uses the browser's local time. Explicit time-zone setting is still Task E.
- Drag and drop uses the browser's built-in drag (HTML5): works with a mouse on desktop browsers, not on most phones and tablets. If touch drag is needed later, add a pointer-events version or a "Move to..." menu.
- Same UTC-date bug elsewhere, NOT fixed (outside the approved Task C scope): `src/app/dashboard/page.tsx` line ~62 defaults the quick-add due date with `new Date().toISOString().slice(0, 10)`, so between midnight and 5 am in UTC+5 it proposes yesterday. Use `todayKey()` from `src/lib/calendar.ts`. `settings/page.tsx` uses the same expression only for a backup file name (harmless).
- Day view has no hourly grid and tasks have only a due time, no duration block. Week starts on Sunday; changing it means editing `startOfWeek` and the weekday headers in the month view.
- Dark mode (Task E) covers the app's own `text-[#hex]`/`bg-[#hex]`/`bg-white` classes (all 450 + 68 replaced). It does NOT touch Tailwind's named-colour utilities (`text-sky-600`, `bg-amber-100`, etc.) used for status badges, chips and links — left as-is because they're self-contained colour pairs, likely fine, but worth a visual check in Dark mode.
- Timezone handling (Task E) is "detect the device's zone and tell the user when it changes", not a per-user custom timezone the student can set independently of their device. If the course spec requires picking an arbitrary timezone unrelated to the device, that is unbuilt.
- Offline polish (Task E) caches pages you've actually visited; a page never opened while online will show the plain offline fallback instead. AI features (chat/quiz/roadmap) cannot work offline by nature — they need the Gemini API — so going offline always disables them, this was not a bug to "fix" further.
- Task D has not yet been run against the user's Supabase project or browser. The client merges same-account local/cloud records by ID and latest timestamp at sign-in/reconnect, then debounces writes. Switching accounts archives the previous local snapshot and does not merge it into the new account. This snapshot design syncs the existing Zustand collections but does not yet populate the normalized feature tables in `001_core_tables.sql`.
- Supabase requires `002_user_app_data.sql` to be run and `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to be set in the user's ignored `.env.local`. The workspace copy intentionally does not include `.env.local`. Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted temporarily for compatibility.
