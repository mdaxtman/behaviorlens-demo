# BehaviorLens (demo)

A mobile-first app for special education teachers and paraprofessionals. It records classroom
behavior data in two taps, then turns it into charts and IEP-ready writing prompts.

**This is a demo.** It opens on a made-up classroom of four students with six weeks of data.
Everything you add or change is stored in your browser only: there is no server, no login, and
it works offline.

## Why it exists

Students with IEPs often have behavior goals and, after a functional behavior assessment (FBA),
a behavior intervention plan (BIP). The data behind both is usually tally marks on paper,
transcribed later, if at all. BehaviorLens was built for a real classroom team to capture that
data in the moment, on their phones, and get it back out in a form that's ready for the IEP
meeting.

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

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test -- --run    # unit tests
npm run build        # typecheck + production build
```

No environment variables are needed.

## Deploy

`netlify.toml` builds with `npm ci && npm test -- --run && npm run build` and publishes `dist/`,
so a failing test blocks the deploy. Any static host works; the SPA fallback is in
`public/_redirects`.
