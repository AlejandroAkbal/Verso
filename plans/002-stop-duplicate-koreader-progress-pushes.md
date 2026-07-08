# Plan 002: Stop duplicate KOReader progress pushes

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- src/hooks/useReaderProgress.ts src/services/koreader/syncBook.ts`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-data-layer-characterization-tests.md
- **Category**: perf
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

Reader progress saves currently trigger KOReader sync twice for the same page-turn. One call is forced inside `flushProgress`; another call follows in the debounce path. This wastes network work and can make sync feel slower without improving correctness.

## Current state

Relevant files:
- `src/hooks/useReaderProgress.ts` — owns debounced reader progress persistence and sync push.
- `src/services/koreader/syncBook.ts` — `pushLocalProgressForBook` rate-limits non-forced pushes with `MIN_PUSH_INTERVAL_MS`.

Known behavior from audit:
- `flushProgress` writes SQLite progress and calls `pushLocalProgressForBook(..., { force: true })`.
- Debounced save path also calls `pushLocalProgressForBook` again after `flushProgress`, without `force`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| Tests | `pnpm test -- src/hooks/useReaderProgress.test.ts src/services/koreader/syncBook.test.ts` | all relevant tests pass if plan 001 added them |
| E2E reader smoke | `pnpm e2e:ios -- .maestro/reader-open.yaml` or `maestro test .maestro/reader-open.yaml` | reader flow passes |

## Scope

**In scope**:
- `src/hooks/useReaderProgress.ts`
- `src/hooks/useReaderProgress.test.ts` (create only if test harness from plan 001 supports hooks or pure extracted helper)

**Out of scope**:
- KOReader protocol changes.
- Conflict resolution behavior.
- UI redesign.
- Changing `MIN_PUSH_INTERVAL_MS`.

## Git workflow

- Branch suggestion: `advisor/002-dedupe-koreader-push`.
- Commit message: `fix: avoid duplicate KOReader progress pushes`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Add or identify a regression check

If plan 001 added a viable unit test harness, add a small test that proves one progress save calls `pushLocalProgressForBook` once. Prefer extracting a pure helper only if needed.

If hook testing is not available, use source-level verification instead: after the edit, grep for `pushLocalProgressForBook` in `src/hooks/useReaderProgress.ts` and ensure only `flushProgress` calls it.

**Verify**: `grep -n "pushLocalProgressForBook" src/hooks/useReaderProgress.ts` → exactly one call site after imports.

### Step 2: Remove duplicate non-forced push

In `src/hooks/useReaderProgress.ts`, remove the standalone `pushLocalProgressForBook(...)` call from the debounced save path after `flushProgress()`.

Keep the forced push inside `flushProgress()`. Do not remove SQLite progress persistence.

**Verify**: `grep -n "pushLocalProgressForBook" src/hooks/useReaderProgress.ts` → import plus one call inside `flushProgress`, no second call after debounce.

### Step 3: Run verification

Run:

```bash
pnpm typecheck
pnpm lint
```

If tests exist:

```bash
pnpm test -- src/hooks/useReaderProgress.test.ts src/services/koreader/syncBook.test.ts
```

If simulator is available:

```bash
maestro test .maestro/reader-open.yaml
```

Expected: typecheck/lint pass; tests pass if present; reader flow opens.

## Test plan

- Unit if harness supports it: one progress update causes exactly one sync push.
- Manual/E2E: `reader-open.yaml` still opens reader after change.

## Done criteria

- [ ] Only one `pushLocalProgressForBook` call remains in `src/hooks/useReaderProgress.ts`.
- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0 or only known pre-existing warning remains.
- [ ] Relevant test or grep verification recorded.
- [ ] `plans/README.md` row 002 updated.

## STOP conditions

Stop and report if:
- Live `useReaderProgress.ts` no longer has the duplicate call pattern.
- Removing the second call breaks expected force/rate-limit semantics.
- A test requires adding a broad hook-rendering framework not already introduced by plan 001.

## Maintenance notes

Reviewers should confirm sync is still forced when reader progress flushes and not merely rate-limited away.
