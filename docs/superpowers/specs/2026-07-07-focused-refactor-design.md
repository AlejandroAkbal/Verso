# Focused Refactor — Design

**Date:** 2026-07-07
**Status:** Approved (approach), executing
**Scope:** Pay down the highest-value tech debt before the library-UX feature work. Pre-production — no backwards-compat/migrations (per `AGENTS.md`).

## Goals

Refactor the most important parts first until the project "feels good": untangle the download-state domain, break the require cycle, split the two god-screens, remove dead code/duplication, and unify the display name. Each workstream ships as its own verified commit.

## Decisions (locked)

- **Refactor scope:** focused (high-traffic areas the features will touch), not whole-app.
- **Download-state:** full re-layer (data / subscription / presentation), not conservative.
- **Identity:** unify **display name only** → "Verso". Leave `bundleId` (`dev.akbal.opdsreader`), DB name, deep-link scheme, SecureStore keys unchanged. No native rebuild, no local-data reset.
- **Review cadence:** commit per workstream, keep going; only stop for decisions or behavior changes.

## Evidence (pre-refactor scan)

- Download domain spread across 8 files: `db/hooks/useDownloads.ts` (82), `hooks/useBackgroundDownload.ts` (51), `hooks/useDownloadPresentation.ts` (299), `services/downloads/presentationSession.ts` (18), `services/downloads/changes.ts` (17), `lib/downloadVisibility.ts` (39), `services/downloads/queue.ts` (224), `services/downloads/manage.ts` (150).
- Blanket 300ms polling in `useDownloads`/`useDownloadStatus` — root cause of the settle-timer bug fixed earlier.
- Require cycle: `queue.ts:22` → `syncBook.ts` → `manage.ts:17` → `queue.ts` (runtime `Require cycle` warning).
- God-screens: `app/(tabs)/index.tsx` (470 lines, 17 memo/effect hooks), `app/reader/[id].tsx` (356 lines, 24 hooks).
- Duplication: cover-frame styling in `BookCard` + book detail; progress formatting; download-status resolution.

## Workstreams (execution order)

Ordered to clear noise and enablers before the risky core, then the screens.

### W1 — Identity: displayName → "Verso"
`appIdentity.js` `displayName: 'Reader'` → `'Verso'`. Verify `app.config.ts` + i18n `{{appName}}` pick it up. No other identifiers change.

### W2 — Dead code + duplication + i18n drift sweep
Remove orphaned/superseded code and references to deleted files. Extract shared helpers for the duplicated cover-frame style, progress formatting, and download-status resolution. Verify all 5 locales share an identical key set.

### W3 — Break the require cycle
Extract dependency-free leaf helpers (`resolveDownloadLocalUri`, path/document-id resolution) into `services/downloads/paths.ts`. Rewire `queue`, `manage`, `syncBook` to depend on the leaf, not each other. Confirm the runtime cycle warning is gone.

### W4 — Download-state full re-layer
- **Data layer:** `queue.ts` (execution), `manage.ts` (DB mutations + URI), `changes.ts` (pub/sub).
- **Subscription layer:** one store feeding `useDownloads()` (all) and `useDownloadStatus(bookId)` (one). Event-driven via `changes.ts`; poll **only while a download is actively in-flight**.
- **Presentation layer:** keep the phase machine; expose a single `useDownloadController(bookId)` composing data + presentation so components stop wiring 3 hooks. Fold in `presentationSession` + `downloadVisibility`.
- Re-verify on-device: grid cloud visibility, progress ring → fill → checkmark → fade settle, cancel/remove, recycle.

### W5 — Split the library screen
`app/(tabs)/index.tsx` → thin composition. Extract `useLibraryData` (compose books + downloads + progress), `useLibraryFilters` (search/category/sort state), `LibraryHeader`, `LibraryFilterBar`. This is the seam the later sort/filter/search features slot into.

### W6 — Split the reader screen
`app/reader/[id].tsx` → layout only. Extract `useReaderSession` (load book/file/sync/conflict) and `useReaderProgress` (persist + KOReader push); move the TOC modal to its own component.

## Verification

Per workstream: `pnpm exec tsc --noEmit` clean, `pnpm lint` clean, and a targeted Maestro smoke on the iOS simulator (library render, download→read, sync round-trip where relevant). Commit only when green. No behavior regressions — the download and reader flows verified earlier this session must still pass.

## Non-goals

- Library-UX features (sort/filter menu/collapsing search) — next project, on the cleaned base.
- Download cancel — later workstream.
- Whole-app refactor of modules the features won't touch.
- Renaming bundleId/DB/scheme/storage keys.
