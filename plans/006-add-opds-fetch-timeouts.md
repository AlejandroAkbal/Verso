# Plan 006: Add OPDS fetch timeouts

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- src/services/opds/parser.ts src/services/opds/connection.ts src/hooks/useOPDSCatalog.ts`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-data-layer-characterization-tests.md
- **Category**: bug
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

OPDS fetch and pagination currently depend on the platform fetch timeout behavior. A slow but responsive server can keep catalog loading for minutes, especially across paginated feeds. Explicit timeouts turn hangs into actionable errors.

## Current state

Relevant files:
- `src/services/opds/parser.ts` — fetches OPDS feeds and follows pagination.
- `src/services/opds/connection.ts` — tests OPDS connection during server setup.
- `src/hooks/useOPDSCatalog.ts` — calls parser and shows catalog loading/error state.

Known evidence:
- `fetchOPDSFeed` around `src/services/opds/parser.ts:327` uses `fetch` without explicit abort timeout.
- `fetchAllOPDSEntries` around `src/services/opds/parser.ts:361` can paginate up to `maxPages = 50`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| Tests | `pnpm test -- src/services/opds/parser.test.ts` | parser tests pass if present |
| E2E | `maestro test .maestro/library-switch.yaml .maestro/settings-smoke.yaml` | flows pass |

## Scope

**In scope**:
- `src/services/opds/parser.ts`
- `src/services/opds/connection.ts` only if it has a separate fetch path
- parser tests if present

**Out of scope**:
- Retry/backoff system.
- Offline cache redesign.
- UI copy/i18n changes unless current errors become unreadable.

## Git workflow

- Branch suggestion: `advisor/006-opds-fetch-timeouts`.
- Commit message: `fix: add OPDS fetch timeouts`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Add a timeout helper

In `src/services/opds/parser.ts`, add a small helper using `AbortController`:

```ts
const OPDS_FETCH_TIMEOUT_MS = 30_000;

function timeoutSignal(ms = OPDS_FETCH_TIMEOUT_MS): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
```

If the runtime supports `AbortSignal.timeout`, you may use it behind a compatibility check, but do not assume it exists in React Native.

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Apply per-request timeout

Pass the timeout signal to every OPDS `fetch` in `fetchOPDSFeed` and connection test fetches. Preserve existing headers/auth behavior.

On abort, throw a clear error such as `OPDS request timed out`.

**Verify**: `grep -n "signal" src/services/opds/parser.ts src/services/opds/connection.ts` → OPDS fetch calls include signal.

### Step 3: Add overall pagination deadline

In `fetchAllOPDSEntries`, add an overall deadline such as 120 seconds. Before each page fetch, check whether the deadline has passed and throw `OPDS pagination timed out`.

Do not increase `maxPages`.

**Verify**: `grep -n "pagination timed out\|deadline" src/services/opds/parser.ts` → deadline code exists.

### Step 4: Add tests if parser test harness exists

If plan 001 added parser tests with mocked fetch, add cases:
- fetch abort propagates as timeout error.
- pagination deadline stops loop before all 50 pages.

**Verify**: `pnpm test -- src/services/opds/parser.test.ts` → all pass.

### Step 5: Run verification

Run:

```bash
pnpm typecheck
pnpm lint
```

With simulator:

```bash
maestro test .maestro/library-switch.yaml .maestro/settings-smoke.yaml
```

Expected: all pass.

## Test plan

- Unit: mocked slow fetch/abort if test harness exists.
- E2E: library switching and server settings still work.

## Done criteria

- [ ] OPDS fetches have explicit per-request timeout.
- [ ] Pagination has an overall timeout/deadline.
- [ ] Errors are clear enough for existing UI to show.
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] `plans/README.md` row 006 updated.

## STOP conditions

Stop and report if:
- React Native fetch does not honor `AbortController` in this Expo SDK.
- Timeout error handling requires broad UI/i18n changes.
- Existing parser tests cannot mock fetch without fragile global state.

## Maintenance notes

If users report slow private servers, tune constants before adding retries. Keep timeout constants near parser code.
