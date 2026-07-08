# Plan 004: Harden CWA range-fetch auth origin

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- src/services/koreader/cwaProgress.ts src/services/opds/credentials.ts src/services/opds/url.ts`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: plans/001-data-layer-characterization-tests.md
- **Category**: security
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

CWA catalog progress restore computes KOReader document IDs by range-fetching OPDS acquisition URLs with Basic Auth headers. Those URLs come from OPDS XML. If a malicious or compromised feed points a download URL to another origin, the app could send OPDS credentials to that origin.

## Current state

Relevant files:
- `src/services/koreader/cwaProgress.ts` — range-fetches `book.download_url` and sends OPDS auth headers.
- `src/services/opds/credentials.ts` — `authToHeaders` builds `Authorization: Basic ...`.
- `src/services/opds/url.ts` — URL normalization and KOReader base derivation helpers.

Known evidence:
- `BookRow.download_url` is populated from OPDS acquisition links.
- CWA progress sync receives server URL and book rows, then fetches each download URL.
- Current code must not leak `Authorization` to a different origin from the active server.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| Tests | `pnpm test -- src/services/koreader/cwaProgress.test.ts` | origin tests pass if test harness exists |
| E2E | `maestro test .maestro/library-switch.yaml` | library switch still passes |

## Scope

**In scope**:
- `src/services/koreader/cwaProgress.ts`
- `src/services/koreader/cwaProgress.test.ts` (create/update if test harness exists)

**Out of scope**:
- Changing general OPDS download behavior.
- Rejecting cross-origin public catalogs globally.
- Storing credentials differently.

## Git workflow

- Branch suggestion: `advisor/004-cwa-auth-origin`.
- Commit message: `fix: restrict CWA progress auth to server origin`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Extract an origin guard

In `src/services/koreader/cwaProgress.ts`, add a pure helper:

```ts
export function isSameOriginUrl(candidateUrl: string, serverUrl: string): boolean {
  try {
    return new URL(candidateUrl).origin === new URL(serverUrl).origin;
  } catch {
    return false;
  }
}
```

If `book.download_url` can be relative, resolve it against `serverUrl` before comparing and fetching.

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Enforce before adding auth headers

Before any range fetch that includes OPDS Basic Auth headers, check same-origin against the active server URL. If not same-origin, skip that book and count it as an error or skipped item without sending credentials.

Do not send `Authorization` headers to cross-origin URLs.

**Verify**: `grep -n "isSameOriginUrl" src/services/koreader/cwaProgress.ts` → guard appears before range fetch headers are used.

### Step 3: Add focused tests

If plan 001 introduced Vitest, create/update `src/services/koreader/cwaProgress.test.ts`:

- same `https://example.com/opds` and `https://example.com/opds/download/1/epub/` → true.
- different host → false.
- invalid URL → false.
- relative `/opds/download/1/epub/` against server URL → accepted only after resolution.

**Verify**: `pnpm test -- src/services/koreader/cwaProgress.test.ts` → tests pass.

### Step 4: Run verification

Run:

```bash
pnpm typecheck
pnpm lint
```

If simulator/dev client available:

```bash
maestro test .maestro/library-switch.yaml
```

Expected: all pass.

## Test plan

- Unit: pure origin guard cases listed above.
- Manual/E2E: CWA/Gutenberg library switching still works; CWA progress sync does not block catalog display.

## Done criteria

- [ ] CWA range fetch never sends Basic Auth to a different origin.
- [ ] Relative download URLs still work if CWA emits them.
- [ ] Origin guard tests pass if test harness exists.
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] `plans/README.md` row 004 updated.

## STOP conditions

Stop and report if:
- Live `cwaProgress.ts` no longer performs range fetches.
- Download URLs are stored relative and there is no reliable base URL to resolve them.
- Same-origin check would break known supported CWA deployments using a separate download host.

## Maintenance notes

Reviewer should inspect the exact fetch call and confirm `Authorization` headers are constructed only after origin validation.
