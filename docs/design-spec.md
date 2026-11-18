# BehaviorLens — Classroom Behavior Tracking & IEP Data Tool

> **Historical document.** This is the original design spec for the classroom version, which
> synced through Supabase (Postgres + Row Level Security) behind a login. This demo keeps the
> app and drops the backend: everything below about Supabase, auth, the outbox and sync does
> not apply here. See the [README](../README.md) for how the demo differs.

**Date:** 2026-07-05
**Status:** Approved design, pre-implementation
**Scope:** Prototype for real classroom use by a teacher/paraprofessionals sharing one account. Not mass-distributed.

## Purpose

A mobile-first web app for teachers and paraprofessionals to rapidly record behavior data (functional behavior analysis + IEP behavioral goal progress) for students with IEPs. The collected data drives:

1. In-app rich analytics (trends, ABC/function patterns, goal progress).
2. A **copy-out LLM prompt package** used to draft IEP present levels, Behavior Intervention Plans (BIPs), and progress report / report card narratives in an external LLM (Claude/ChatGPT). The app never calls an LLM itself.

The core UX target: **logging a behavior event takes two taps from the home screen.**

## Stack

- **Frontend:** Vite + React + TypeScript, Tailwind CSS, Recharts. PWA (manifest + service worker) so it installs to phone home screens and the shell loads offline.
- **Backend:** Supabase — email+password auth, Postgres, Row Level Security. No custom server.
- **Deploy:** Static hosting (Vercel or Netlify free tier).
- **Local persistence:** IndexedDB (via `idb`) for the offline cache, write outbox, and student photos.

## Users & Auth

- Single shared account (email + password) used by all staff for the prototype.
- Supabase session persists with auto-refresh and a long refresh-token lifetime — devices log in once and stay logged in.
- Every table has RLS: `authenticated` role only. Nothing is readable without a session.
- All rows carry a `user_id` column (defaulted to the authed user) so multi-user is an additive change later. Multi-user/roles are **out of scope** now.
- Optional free-text **recorder initials** on each event distinguish who logged it despite the shared login.

## Privacy posture

- Students are stored under a 4-letter pseudonym code: first two letters of first name + first two of last name (John Smith → `JoSm`). No full names, no DOB.
- **Student photos never leave the device.** Captured via camera/file picker, resized client-side (~256px), stored as blobs in IndexedDB keyed by student id. Not synced; each device sets its own. Fallback avatar = student color + code.
- The LLM prompt package uses the pseudonym code and instructs the LLM to write with a `[Student]` placeholder; real names are added by the user in the final document.

## Data model (Supabase Postgres)

All tables: `id uuid PK (client-generated)`, `user_id uuid default auth.uid()`, `created_at timestamptz`. RLS: authenticated-only for all operations.

- **students** — `code` (e.g. "JoSm"), `grade?`, `notes?`, `color` (avatar/UI), `active bool`.
- **behaviors** — `student_id`, `name`, `description?` (operational definition), `category` (`challenging` | `skill`), enabled measurement flags: `track_frequency`, `track_duration`, `track_rating` (bools), `requires_abc bool` — **defaults true on creation**; every recording captures ABC until the teacher toggles it off once the function is understood. `active bool`.
- **abc_presets** — `kind` (`antecedent` | `consequence` | `setting`), `label`, `sort_order`, `active`. Seeded with common defaults (demand placed, transition, denied access/item, peer conflict, attention given, escape/break provided, item given, redirected, planned ignoring, classroom, hallway, cafeteria, recess, specials…). Editable in Manage.
- **sessions** — device-level observation session: `activity` (e.g. "Math"), `setting?`, `started_at`, `ended_at?`, `note?`. Not student-scoped: all events from any student during the session are tagged with it.
- **events** — the core recording. `student_id`, `behavior_id`, `session_id?`, `occurred_at`, `count int default 1`, `duration_seconds?`, `rating? (1–5)`, `antecedent?`, `consequence?`, `setting?` (text, prefilled from presets/session), `note?`, `recorder?` (initials).
- **goals** — `student_id`, `title`, `description` (IEP goal text), `mode` (`linked` | `direct`), `active`, `baseline?`, `target_date?`, and criterion fields:
  - *linked*: `behavior_ids uuid[]`, `criterion_direction` (`at_most` | `at_least`), `criterion_value numeric`, `criterion_metric` (`count_per_day` | `minutes_per_day` | `avg_rating`), e.g. "≤ 2 aggressions/day".
  - *direct*: `criterion_percent` (e.g. 80 = "≥80% of opportunities").
- **goal_entries** — direct-mode trial data: `goal_id`, `session_id?`, `occurred_at`, `successes int`, `opportunities int`, `note?`.

## Offline-first sync (recording path is local-first)

- **Read cache:** on load (and periodically), students, behaviors, goals, presets, open sessions, and events from the last 90 days are fetched and mirrored into IndexedDB. The UI reads from the cache; a fetch refreshes it.
- **Write outbox:** every write (event, goal entry, session start/end, undo/delete) is applied to the local cache immediately (optimistic UI) and appended to an IndexedDB outbox. A sync loop flushes the outbox to Supabase on reconnect / interval / app focus. Client-generated UUIDs make retries idempotent (upserts).
- **Fully offline you can:** open the app (service-worker-cached shell), see students + photos, start/end sessions, record all event types and goal trials, and view analytics computed from cached data (with a "local data" indicator).
- **Conflicts:** single account, few devices — last-write-wins. No merge UI.
- A subtle sync-status indicator shows pending-outbox count / offline state.

## UX (mobile-first, responsive to desktop)

- **Login** → only ever seen once per device.
- **Home:** grid of large student cards (photo or color avatar + code). Session banner at top: start a session (pick/type activity, optional setting) or shows the running one with elapsed time and an End button. Ending shows a **session summary** (per student: event counts, durations, trials logged).
- **Student → Record tab:** big buttons per active behavior.
  - Frequency behavior: tap → **+1 logged instantly**, undo toast (2 taps total from home).
  - Duration behavior: tap → start/stop timer; runs across navigation; logs duration on stop.
  - Rating-enabled: quick 1–5 chips on an expandable detail row (never required).
  - `requires_abc` behaviors: a bottom sheet appears — antecedent chip + consequence chip from presets (one tap each), optional note → save.
  - Optional detail expander on any event: note, rating, recorder initials, setting override.
  - Events inherit `session_id` + setting from the active session automatically.
- **Student → Goals tab:** direct goals show large ✓ / ✗ trial buttons with a running tally (e.g. 4/5 today); linked goals show live computed progress against the criterion (e.g. "2/2 max — at limit").
- **Student → Analytics tab** (rich; global date-range filter):
  - Frequency-over-time trend (per behavior, daily buckets).
  - Duration trend.
  - Goal progress vs. target line (both modes).
  - ABC pattern bars: top antecedents and consequences per behavior — the function-hypothesis view.
  - Time-of-day heatmap and day-of-week comparison.
  - **Session/activity comparison** (e.g. events per hour in Math vs. Recess).
  - Chart → PNG export for report embedding.
- **Student → Generate tab:** choose document type — *IEP present levels & behavior goals draft*, *BIP draft*, *progress report / report card narrative* — plus date range. The app assembles a structured prompt: role framing, operational behavior definitions, computed stats and trend directions, ABC/function pattern summary, session/activity patterns, goal progress vs. criteria, baselines, and placeholder-name instructions. One tap copies to clipboard.
- **Manage (desktop-friendly):** CRUD for students (incl. on-device photo), behaviors (incl. measurement flags + `requires_abc` toggle), ABC presets, goals; view/edit past sessions and events (fix mistakes, backfill).

## Error handling

- Writes cannot fail visibly in the classroom: they land in the outbox and sync later; sync errors surface only in the status indicator, never as blocking dialogs.
- Undo toast on every quick-log; full edit/delete in Manage.
- Auth expiry (rare) redirects to login without losing outbox contents.

## Testing (prototype level)

- Unit tests (Vitest) for the pure logic that must be right: analytics aggregation (bucketing, heatmap, goal-progress computation), prompt-package assembly, and outbox sync/idempotency logic.
- Manual verification checklist for UX flows (2-tap logging, offline record → reconnect sync, timer across navigation, photo persistence).

## Out of scope

- Multi-user accounts, roles, invites (schema-ready via `user_id`).
- In-app LLM calls / API keys.
- Interval or momentary time-sampling schedules.
- FERPA-grade audit logging; photo sync across devices; conflict-merge UI.
