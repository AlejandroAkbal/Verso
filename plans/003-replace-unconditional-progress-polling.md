# Plan 003: Replace unconditional progress polling

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- src/hooks/useReadingProgress.ts src/hooks/useBookReadingProgress.ts src/hooks/useDownloadStorage.ts src/services/downloads/store.ts src/services/downloads/changes.ts`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-data-layer-characterization-tests.md
- **Category**: perf
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

Some hooks poll SQLite every 3 seconds even when nothing changes. This wastes foreground battery and DB work, especially for large libraries. The app already has a better pattern for downloads: mutation notifications plus active polling only when necessary.

## Current state

Relevant files:
- `src/hooks/useReadingProgress.ts` — polling map of all reading progress rows every 3s.
- `src/hooks/useBookReadingProgress.ts` — per-book progress polling.
- `src/hooks/useDownloadStorage.ts` — storage stats polling despite download change notifications.
- `src/services/downloads/changes.ts` — simple pub/sub (`subscribeDownloadsChanged`, `notifyDownloadsChanged`).
- `src/services/downloads/store.ts` — good exemplar: uses `subscribeDownloadsChanged` and only polls while active downloads exist.

Known exemplar excerpt:
- `src/services/downloads/store.ts:59-68` starts/stops polling based on `rows.some(isActive)`.
- `src/services/downloads/changes.ts:6-16` exposes a tiny listener set pattern.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| Tests | `pnpm test` | exits 0 if plan 001 added tests |
| E2E | `maestro test .maestro/library-smoke.yaml .maestro/book-detail.yaml .maestro/download-book.yaml` | flows pass |

## Scope

**In scope**:
- `src/hooks/useReadingProgress.ts`
- `src/hooks/useBookReadingProgress.ts`
- `src/hooks/useDownloadStorage.ts`
- new small progress change pub/sub file if needed, e.g. `src/services/readingProgress/changes.ts`
- call sites that write reading progress and need to notify, e.g. `src/db/queries.ts` only if no better service layer exists

**Out of scope**:
- Rewriting all DB queries.
- Reader UI redesign.
- Changing download queue polling while downloads are active.

## Git workflow

- Branch suggestion: `advisor/003-remove-progress-polling`.
- Commit message: `perf: replace idle progress polling with change signals`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Add reading-progress change notification

Create a tiny pub/sub modeled after `src/services/downloads/changes.ts`, e.g. `src/services/readingProgress/changes.ts`:

- `subscribeReadingProgressChanged(listener): () => void`
- `notifyReadingProgressChanged(): void`

Keep it framework-free.

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Notify after reading progress writes

Find the single write path for reading progress, likely `upsertReadingProgress` in `src/db/queries.ts` and any wrapper service using it.

After successful write, call `notifyReadingProgressChanged()`. Do not notify before write succeeds.

**Verify**: `grep -n "notifyReadingProgressChanged" src/db/queries.ts src/services -R` → at least one write-side call exists.

### Step 3: Replace all-progress polling

In `src/hooks/useReadingProgress.ts`, remove unconditional `setInterval(..., 3000)`. Subscribe to `subscribeReadingProgressChanged` and refresh on mount/focus if existing pattern uses focus.

Keep initial load on mount.

**Verify**: `grep -n "setInterval" src/hooks/useReadingProgress.ts` → no matches.

### Step 4: Replace per-book progress polling

In `src/hooks/useBookReadingProgress.ts`, remove unconditional 3s polling. Subscribe to reading-progress changes and refresh only when the changed book might matter. If notification does not carry book id, refresh on any progress change; this is still better than idle polling.

**Verify**: `grep -n "setInterval" src/hooks/useBookReadingProgress.ts` → no matches.

### Step 5: Remove redundant storage polling

In `src/hooks/useDownloadStorage.ts`, keep `subscribeDownloadsChanged` refresh and initial refresh, remove 3s interval. If there is no subscription currently, add it using `src/services/downloads/changes.ts`.

**Verify**: `grep -n "setInterval" src/hooks/useDownloadStorage.ts` → no matches.

### Step 6: Run verification

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Then, with simulator available:

```bash
maestro test .maestro/library-smoke.yaml .maestro/book-detail.yaml .maestro/download-book.yaml
```

Expected: all pass.

## Test plan

- Unit if available: notification subscribers fire once per progress write and unsubscribe cleanly.
- E2E: library progress indicators still render; book detail still opens; downloads still update storage UI after download/remove.

## Done criteria

- [ ] No unconditional 3s `setInterval` remains in the three target hooks.
- [ ] Reading progress writes notify listeners after success.
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass.
- [ ] Relevant Maestro flows pass or skipped reason recorded.
- [ ] `plans/README.md` row 003 updated.

## STOP conditions

Stop and report if:
- Progress writes are spread across many paths and notifying would require broad architecture changes.
- Removing polling causes no reliable refresh point for reader progress.
- Need to modify native/background task behavior outside scope.

## Maintenance notes

If background sync later updates progress while app is foregrounded, route that write through the same notification path.
