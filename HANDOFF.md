# Handoff: Uninote

Written 2026-10-28 for whoever (agent or person) continues. Read `PROJECT_STATUS.md` first, then this file. Rules for how the user wants agents to work are at the end (section 7).

## 1. What this project is
A Next.js app (course project, deadline **19 November 2026**) with seven connected features: Planner, Quiz generator, Progress tracker, AI chatbot, Roadmap, Notes vault, Resources. The product spec is `Uninote Workflow.docx`; only its Section 2 (product workflow) matters to the current work. The point of the product is that features share data, so a quiz result changes the Tracker, ticking a Roadmap topic changes readiness, and so on.

## 2. How the session got here
1. The user asked for a README so any agent breaks work into small tasks, shows the build order, and after each build asks about GitHub commit / local save and keeps `PROJECT_STATUS.md` current.
2. The agent started a Planner with Next.js + Supabase in its own workspace. That turned out to be a parallel start, because the user had separately built the full app (this folder) on their machine with a different agent. **That agent-side copy is abandoned.** The user's folder (`AI study Toolkit`, uploaded as a .rar) is the real project.
3. On 2026-10-27 the agent unpacked the rar, read the code, and listed the gaps (section 3). The user chose Gemini as the AI provider and confirmed the 19 November deadline.
4. The agent was about to write the AI route when the session was paused.

## 3. Verified state of the code (read, not run)
Works as screens with shared Zustand state, including the correct readiness formula (60% quiz score + 30% coverage + 10% on-time tasks) in `tracker/page.tsx`.

Placeholders / gaps:
| Area | Finding | File |
|---|---|---|
| Chat | Canned markdown template, 1.2 s `setTimeout`, two hard-coded keywords | `src/app/dashboard/chat/page.tsx` (~line 119) |
| Quiz generation | Four fixed physics-style questions for any subject/note | `src/app/dashboard/quiz/page.tsx` (`handleGenerateQuiz`) |
| Short-answer grading | Keyword + length heuristic | `quiz/page.tsx` (`handleNextOrFinish`) |
| Syllabus import | Splits pasted lines into topics, no AI | `roadmap/page.tsx` (`handleAIGenerateTopics`) |
| Reminders | `addNotification` stores a pending row; nothing sends it | `planner/page.tsx` (~line 127), `store/notifications.ts` |
| Push | Only `Notification.requestPermission()`; no service worker | `notifications/page.tsx` |
| Planner | Agenda + month only; one reminder per task; no drag/day/week buttons | `planner/page.tsx` |
| Auth/storage | None; no Supabase calls | whole app |
| PWA | `manifest.json` lists icons that are not in `public/` | `public/` |

## 4. The next task: real AI with Gemini (design already decided)
**Goal:** one server route, key never in the browser, every AI feature goes through one helper.

Files to add:
- `src/app/api/ai/route.ts` (POST). Body: `{ job, ...payload }`. Jobs: `explain`, `quiz`, `grade`, `roadmap`. Reads `process.env.GEMINI_API_KEY` and optional `GEMINI_MODEL`. Builds a prompt per job, asks Gemini for JSON where the feature needs it, validates the shape, retries once if invalid, returns `{ ok: true, data }` or `{ ok: false, error }` with a readable message. Add a simple per-day request cap and a size limit on the text sent.
- `src/lib/ai.ts`: typed client functions used by pages, e.g. `aiExplain`, `aiGenerateQuiz`, `aiGradeShortAnswer`, `aiExtractTopics`. Pages never call Gemini directly.

Wire-up:
- **Chat** (`chat/page.tsx`): send the question, reading level, subject, and the chosen note text when the source is the vault. Reply must say which source it used. Return the reply plus 2 to 4 keywords with short definitions (feeds `addKeyword`). Show an error message and keep the user's text if the call fails.
- **Quiz** (`quiz/page.tsx`): when a vault note is the source, questions must come only from that note and each question's `sourceReference` must name it; otherwise use general topic knowledge. Output matches `QuizQuestion` (mcq with 4 options, true_false, short with `keyPoints` and a model answer). Honour `questionCount` and `difficulty`.
- **Short-answer grading:** call `grade` with question, key points, model answer and the student's answer; get score 0 to 1 and feedback; keep the existing override.
- **Roadmap** (`roadmap/page.tsx`): send the pasted syllabus text, get a parent/child topic list back, then call `addTopic` as the current code does.
- Keep loading states. Add a clear message if `GEMINI_API_KEY` is missing.
- Add `GEMINI_API_KEY=` and `GEMINI_MODEL=` to `.env.example`. The user puts the real key in `.env.local` on their machine.

**Open uncertainty about Gemini (check before relying on it):**
- The official generateContent reference could not be fetched (not on the session's allowlist). The expected shape is `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with header `x-goog-api-key`, body `contents`, `systemInstruction`, `generationConfig.responseMimeType = "application/json"`, and text at `candidates[0].content.parts[].text`. This is from memory and is unconfirmed. A docs page also showed a newer "Interactions API" (`/v1beta/interactions`). If the first call fails, check the current docs and adjust.
- Model names seen in the docs: `gemini-3.5-flash-lite` (recommended cheap), `gemini-3.8-flash`, `gemini-4-argon`; 2.5 models said to be limited. Default `GEMINI_MODEL` to `gemini-3.5-flash-lite` and tell the user to confirm the name and free-tier limits in Google AI Studio.
- Next.js here is v16 and `AGENTS.md` says its conventions differ from older versions. Read `node_modules/next/dist/docs/` (route handlers) before writing the route; the agent could not see `node_modules` because it cannot install packages.

## 5. Current state and next steps
The project status file is the current source of truth. Tasks A, B, C, D, and E have code written, but A, B, C, D, and E still need the user's browser verification. Task D's TypeScript check and production build pass; it still needs the Supabase migration and public client credentials configured.

For Task D, run `supabase/migrations/002_user_app_data.sql`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the ignored `.env.local`, restart the app, then create/sign into an account and verify sync on a second browser/device. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains a fallback. A secret/service-role key must never be placed in the browser. Task D stores all current Zustand collections in one private RLS-protected JSONB row; it does not populate the normalized feature tables from migration 001.

After user testing, fix reported issues. Task F (removing demo seed data) has been completed. The GitHub/local-save checkpoint for delivered changes is pending.
## 6. Constraints and cautions
- The agent sandbox cannot reach npm, so it cannot run `npm install`, type-check, or build. Say so plainly. The user runs the app and pastes errors back. Never claim "it works" without that.
- Work on a copy; send back only changed files plus `PROJECT_STATUS.md`. Do not rewrite the user's project wholesale.
- Secrets: API keys go in `.env.local` only (git-ignored). The Supabase URL and publishable key were pasted in chat on 2026-10-26; they are in the agent-side copy's `.env.local`, not in this project.
- The workspace has no access to the user's computer; files come by attachment (zip without `node_modules` and `.next`).
- The .rar was extracted with a small libarchive script because no unrar tool was installed.

## 7. How the user wants agents to work (from the README they upload)
1. At session start read `PROJECT_STATUS.md`, summarise in 3 to 5 lines, continue from "Next Task".
2. Break work into small buildable tasks, show the build order, build one task at a time.
3. After every build: update `PROJECT_STATUS.md`, then ask: commit to GitHub? save locally? (`both`, `github`, `local`, `skip`). Never commit or push without a yes. Commit style: `feat: short description (Task N)`.
4. The user may run out of credits mid-session, so keep the status file current enough to resume from.
5. Keep explanations short; be honest about what is finished, partial or broken.
6. Extra instruction given 2026-10-27: update the status file after every build, and after the AI build ask whether to keep the mock data.
