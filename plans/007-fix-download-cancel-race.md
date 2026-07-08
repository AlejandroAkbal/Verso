# Plan 007: Fix download cancel race

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- src/services/downloads/queue.ts src/services/downloads/manage.ts src/services/downloads/paths.ts src/db/queries.ts`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-data-layer-characterization-tests.md
- **Category**: bug
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

Cancel currently deletes the download row while the native download task may still complete. If completion wins the race, the filesystem and DB can disagree: UI returns to cloud state but an EPUB file remains, or a completed row is recreated after cancel. Cancel should be silent UX reset without orphaning files.

## Current state

Relevant files:
- `src/services/downloads/queue.ts` — queue execution, `activeTasks`, `cancelledTasks`, cancellation.
- `src/services/downloads/manage.ts` — remove/delete helpers.
- `src/services/downloads/paths.ts` — book file path resolution.
- `src/db/queries.ts` — download row updates/deletes.

Known behavior from audit:
- Download completion handles `task.downloadAsync()` result around `src/services/downloads/queue.ts:188`.
- Cancel path calls task cancel and deletes DB row around `src/services/downloads/queue.ts:228`.
- There is already a `cancelledTasks` Set used to swallow cancellation errors.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| Tests | `pnpm test -- src/services/downloads/queue.test.ts` | tests pass if present |
| E2E | `maestro test .maestro/download-book.yaml` | flow passes |

## Scope

**In scope**:
- `src/services/downloads/queue.ts`
- `src/services/downloads/queue.test.ts` if plan 001 added focused tests
- small helper in `manage.ts` only if needed to delete orphan local file safely

**Out of scope**:
- Queue manager UI.
- Download priority/reordering.
- Background task architecture rewrite.

## Git workflow

- Branch suggestion: `advisor/007-download-cancel-race`.
- Commit message: `fix: make download cancel race-safe`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Add a race characterization test if feasible

If plan 001 produced a test seam for queue logic, add a test where:
1. task is marked cancelled.
2. native download promise resolves anyway.
3. code must not persist completed status and must remove local file/row.

If no seam exists, do not mock all Expo modules. Proceed with careful source change and Maestro verification.

**Verify**: `pnpm test -- src/services/downloads/queue.test.ts` → test fails before fix if feasible, or STOP if no viable test seam and operator requires TDD.

### Step 2: Make completion check cancellation before committing DB state

In `src/services/downloads/queue.ts`, after `downloadAsync()` resolves but before writing completed status, check whether `bookId` is cancelled.

If cancelled:
- delete the just-downloaded file if `result.uri` exists.
- delete/reset the download row.
- do not call KOReader document ID/progress restore.
- do not show error toast.
- return cleanly.

Keep existing catch behavior for actual cancellation errors.

**Verify**: `grep -n "cancelledTasks" src/services/downloads/queue.ts` → cancellation is checked both in error path and after resolved result before completion write.

### Step 3: Avoid premature DB delete if active task is still running

In `cancelDownload`, if an active task exists, mark cancelled and request cancel, but let the queue worker perform final cleanup. If no active task exists, delete/reset row immediately.

This prevents two owners from racing the same DB row.

**Verify**: inspect `cancelDownload` and confirm active-task path does not immediately fight completion path.

### Step 4: Run verification

Run:

```bash
pnpm typecheck
pnpm lint
```

If tests exist:

```bash
pnpm test -- src/services/downloads/queue.test.ts
```

With simulator:

```bash
maestro test .maestro/download-book.yaml
```

Expected: all pass.

## Test plan

- Unit if feasible: cancel-before-resolve, cancel-error, normal completion.
- Manual/E2E: start a download, cancel if flow supports it, confirm button returns to cloud silently; run existing download flow.

## Done criteria

- [ ] Cancelled resolved download cannot write completed status.
- [ ] Cancelled resolved download cleans up local file if created.
- [ ] Cancel remains silent UX reset.
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] Relevant test or manual verification recorded.
- [ ] `plans/README.md` row 007 updated.

## STOP conditions

Stop and report if:
- Expo download task API does not expose result URI reliably.
- Cleanup requires changing background task DB connection rules.
- Existing cancel UX would show errors/toasts after fix.

## Maintenance notes

Reviewer should scrutinize ordering around `activeTasks.delete`, `cancelledTasks.delete`, DB row delete, and file cleanup.
