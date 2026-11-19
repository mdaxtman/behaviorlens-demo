# BehaviorLens (demo)

A mobile-first app for special education teachers and paraprofessionals. It records classroom
behavior data in two taps, then turns it into charts and IEP-ready writing prompts.

**Live demo: [behaviorlens-demo.netlify.app](https://behaviorlens-demo.netlify.app)** (best on a phone; installable as an app).

**This is a demo.** It opens on a made-up classroom of four students with six weeks of data.
Everything you add or change is stored in your browser only: there is no server, no login, and
it works offline.

**Contents:** [Purpose](#purpose) · [Goals](#goals) · [What it does](#what-it-does) ·
[Tech](#tech) · [Portfolio notes](#portfolio-notes) · [Run it](#run-it)

## Purpose

Students with IEPs (Individualized Education Programs) often have behavior goals. After a
functional behavior assessment (FBA), many also have a behavior intervention plan (BIP). Both
are only as good as the data behind them, and in most classrooms that data is tally marks on
paper or a clipboard. It gets transcribed later, if at all, and then someone summarizes it by
hand before every IEP meeting and progress report.

The adults collecting that data are busy managing the behavior itself: a teacher and
paraprofessionals moving between students all day. Anything slower than a glance and a tap
doesn't get used.

BehaviorLens was built for a real special education classroom team. It has two jobs:

1. **Capture behavior data in the moment** on the phone already in an aide's pocket, fast
   enough that recording never competes with the student.
2. **Turn that data into the documents the team already has to write.** That means IEP present
   levels, BIPs and parent progress reports, without retyping or hand-counting.

## Goals

These were the requirements the app was designed against:

| Goal | How the app meets it |
|------|----------------------|
| Recording costs at most two taps | Home → student → one control per behavior; Undo instead of a confirmation dialog |
| Works with no signal (gyms, playgrounds, buses) | Local-first. Every write lands on the device first, and the app installs as a PWA |
| Collects the data an FBA actually needs | Count, duration and intensity, ABC chips (antecedent → consequence), and sessions with activity and setting |
| Progress numbers are fair to the student | Goal rates average over days the student was actually observed, so absences and untracked days don't count against them |
| Protects student privacy | Pseudonym codes instead of names; photos never leave the device; prompts use a `[Student]` placeholder |
| Shortens the paperwork, not just the data entry | One-tap prompt packages with computed statistics, ready to paste into any LLM |
| Usable by non-technical staff on their own phones | Mobile-first layout, labeled forms, large tap targets, deep links from a student straight to the right editor |

## What it does

- **Two-tap recording.** Tap a student, then tap a behavior. Each behavior has exactly one
  recording control: +1 for a count, a start/stop timer for duration, or a 1–5 intensity tap.
  One incident always means one entry. Undo stays visible for 6 seconds.
- **ABC data where it matters.** A behavior can require antecedent and consequence chips on
  every entry, the core of an FBA. The chips come from editable class-wide presets.
- **Observation sessions.** Start "Math · Classroom", and every entry until you end it is
  tagged with that activity and setting. This makes per-hour rates by activity possible.
- **IEP goals.** A goal is either linked to behavior data ("1 or fewer aggressions per day")
  or measured with direct trials (✓/✗ taps against an 80% criterion). Progress is averaged
  over the days the student was actually observed, so absences don't count against them.
- **Analytics.** Frequency and duration trends, goal progress against the criterion, ABC
  patterns, a day × hour heatmap, and rates per activity. The dashboard exports as a PNG.
- **LLM prompt packages.** One tap builds a prompt for an IEP present-levels draft, a BIP, or a
  parent-friendly progress report. It contains the student's computed statistics and refers
  to the student only by a pseudonym. Paste it into the LLM of your choice; the app never calls
  one itself.
- **Privacy by design.** Students are 4-letter codes (John Smith → `JoSm`). Photos are resized
  on-device and never leave it.
- **Installable and offline.** It's a PWA: add it to a home screen and it runs without a
  connection. When a new version is deployed, a banner offers to refresh.
- **Backup.** Export everything, optionally including photos, to a JSON file, and import it
  back (merge or replace). **Reset sample data** restores the demo classroom at any time.

## Tech

- **React 19 + TypeScript + Vite**, Tailwind CSS v4, Recharts (lazy-loaded with the Analytics
  tab), React Router.
- **IndexedDB** (via `idb`) is the only store. The state layer (`src/lib/store.tsx`) updates
  React state first for an instant UI, then persists. Deletes cascade through
  `src/lib/cascade.ts`, which mirrors the foreign keys of the original Postgres schema.
- **vite-plugin-pwa / Workbox** for the service worker, with a prompt-to-refresh update flow.
- **Vitest** with `fake-indexeddb`: 60+ tests covering analytics, goal math, the recording
  model, the prompt builder, cascades, backup validation and the sample-data generator.
- **Strict security headers** (`public/_headers`): a CSP with `connect-src 'self'`, since the
  demo talks to no server, plus `frame-ancestors 'none'`, nosniff and no-referrer.

Domain logic lives in `src/lib` as plain, DOM-free TypeScript (`analytics.ts`, `prompt.ts`,
`recording.ts`, `sessions.ts`). The React components stay thin.

### The full version

The classroom version this demo comes from adds a backend:

- Supabase Postgres with Row Level Security behind an allowlist, so a valid login alone grants
  nothing.
- Server-stamped recorder identity.
- A local-first write outbox: FIFO, gated on a live session, and it classifies permanent
  versus transient errors.
- RLS tests that run the real migrations in-process with PGlite.

The demo removes the backend and keeps the same UI and domain code. The original design spec
is in [`docs/design-spec.md`](docs/design-spec.md).

## Portfolio notes

### At a glance

- **Problem:** Classroom behavior data is slow to collect and slower to use.
- **Users:** A special education teacher and paraprofessionals, each recording on their own
  phone during the school day.
- **Role:** Product design, requirements gathering with the classroom team, and full-stack
  development (built with AI pair-programming in Claude Code).
- **Stack:** React, TypeScript, Vite, Tailwind, IndexedDB, Workbox PWA. The full version also
  ran on Supabase (Postgres + Row Level Security) and was deployed on Netlify with test-gated CD.
- **Status:** The classroom version was deployed and staff accounts were set up. Adoption is
  paused pending district approval for a third-party tool that holds student data. This demo
  is the public edition.

### How it was built

1. **Requirements from the people doing the work.** The design started from the classroom:
   what gets recorded, who records it, and what it has to become. Several early assumptions
   changed after talking to the teacher. A single shared login became per-person accounts once
   it was clear each aide would use their own phone. ABC data became required by default for
   new behaviors, because that is what an FBA needs.
2. **A written spec before code.** The data model, privacy posture, offline behavior and
   prompt format were agreed up front. The spec is in [`docs/design-spec.md`](docs/design-spec.md).
3. **Iterating on real-phone testing.** Each round of hands-on testing turned into a short list
   of fixes, shipped through the test-gated deploy pipeline.

### Decisions and trade-offs

- **Local-first over online-first.** Classrooms have dead zones, and a lost recording is worse
  than a late one. Writes go to IndexedDB immediately and sync from an ordered outbox. The cost
  was real complexity: ordering, retries, and telling "offline" apart from "rejected".
- **One recording control per behavior.** An early version let a behavior be counted, timed
  *and* rated, and one incident could end up logged twice. The fix was a recording model:
  each behavior gets exactly one primary control (timer, then rating, then count), and one
  incident is always one entry. Testing showed the extra flexibility wasn't worth the
  confusion.
- **Fair goal math.** A goal like "1 or fewer aggressions per day" was first averaged over
  calendar days. Weekends, absences and untracked days then made a student look better or
  worse than they were. Rates now average over days the student was actually observed.
- **No LLM calls from the app.** The app builds a prompt package and the teacher pastes it
  into whichever LLM their school allows. This keeps student data out of yet another vendor's
  API, costs nothing, and leaves the final wording to a person.
- **Pseudonyms and on-device photos.** Names never enter the system, so a leak exposes codes,
  not children. Photos exist only on the device that took them, because a recognizable face is
  the most sensitive thing the app could hold.

### Challenges worth mentioning

- **Security for student data.** A full audit of the classroom version led to several
  hardening steps:
  - Row Level Security behind an allowlist, so a valid login alone grants nothing.
  - A server-stamped recorder identity that a client can't spoof.
  - Sign-out that wipes the device.
  - Sync that refuses to run without a live session. Otherwise an expired session could
    silently drop queued deletes.
  - A strict CSP.

  Database rules are tested by running the real migrations in an in-process Postgres (PGlite).
- **A bug only production could show.** Profile edits failed on the live database because
  Postgres checks the INSERT policy even when an upsert resolves to an update. The failed write
  then blocked that phone's sync queue. The fix shipped as a migration, along with a regression
  test that reproduces the exact upsert.
- **Updating an installed app.** A PWA keeps serving the old version until it relaunches. A
  refresh banner now detects a waiting service worker and hands over cleanly mid-day without
  losing a running timer.
- **Making the demo honest.** Removing the backend meant the app had to do what Postgres used
  to: cascading deletes now mirror the original foreign keys, and seeding runs exactly once. A
  React StrictMode double-run first duplicated the sample classroom.

### What I'd do next

- Multi-classroom support: tenant isolation by team, admin roles and invite-based onboarding.
- An offline-only mode for schools that can't approve a cloud tool. This demo is most of the
  way there.
- Native iOS/Android, most likely Capacitor first. The domain logic in `src/lib` is DOM-free,
  so it can move to a native app unchanged.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test -- --run    # unit tests
npm run build        # typecheck + production build
```

No environment variables are needed.

## Deploy

The live demo deploys from `main` on Netlify. `netlify.toml` builds with
`npm ci && npm test -- --run && npm run build` and publishes `dist/`, so a failing test blocks
the deploy. Any static host works; the SPA fallback is in
`public/_redirects`.
