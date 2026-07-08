# Plan 010: Update stale docs

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- docs/e2e.md docs/koreader-sync.md README.md TODO.md appIdentity.js src/config/appIdentity.ts .maestro`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

Docs are drifting from shipped behavior. E2E docs list fewer Maestro flows than exist, KOReader sync docs label shipped modules as planned, and README still uses the old generic OPDS Reader branding while the app is now Verso. This misleads future agents and contributors.

## Current state

Relevant files:
- `docs/e2e.md` — local Maestro workflow and flow inventory.
- `docs/koreader-sync.md` — KOReader sync architecture docs.
- `README.md` — public project intro.
- `appIdentity.js` and `src/config/appIdentity.ts` — source of app display name.
- `.maestro/` — actual E2E flows.

Known evidence:
- `docs/e2e.md` table lists 6 flows, but `.maestro/` has 10: `complete-onboarding.yaml`, `filter-test.yaml`, `library-header-scroll-top.yaml`, `library-switch.yaml` are missing from docs.
- `docs/koreader-sync.md` has heading `Module layout (planned)` even though KOReader implementation exists.
- `README.md` still says `OPDS Reader`; app display name is `Verso`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Flow list | `ls .maestro` | shows current flow files |
| Typecheck | `pnpm typecheck` | exit 0, no errors if run |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |

## Scope

**In scope**:
- `docs/e2e.md`
- `docs/koreader-sync.md`
- `README.md`

**Out of scope**:
- Source code changes.
- Maestro flow behavior changes.
- New product promises beyond shipped behavior.
- Rebranding internal package slug `opds-reader`.

## Git workflow

- Branch suggestion: `advisor/010-update-stale-docs`.
- Commit message: `docs: update E2E, KOReader, and Verso docs`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Update E2E flow table

Run:

```bash
ls .maestro
```

Update `docs/e2e.md` table so it includes every flow currently in `.maestro/`:
- `book-detail.yaml`
- `complete-onboarding.yaml`
- `download-book.yaml`
- `filter-test.yaml`
- `koreader-settings.yaml`
- `library-header-scroll-top.yaml`
- `library-smoke.yaml`
- `library-switch.yaml`
- `reader-open.yaml`
- `settings-smoke.yaml`

Keep descriptions short and factual.

**Verify**: `grep -n "library-switch\|library-header-scroll-top\|complete-onboarding\|filter-test" docs/e2e.md` → all missing flows now documented.

### Step 2: Update KOReader sync module layout

In `docs/koreader-sync.md`, change `Module layout (planned)` to `Module layout` or `Module layout (current)`.

Update the module list to include actual shipped files under `src/services/koreader/`, including:
- `client.ts`
- `credentials.ts`
- `cwaProgress.ts`
- `deviceId.ts`
- `documentId.ts`
- `fileName.ts`
- `mapProgress.ts` if present
- `profile.ts`
- `syncBook.ts`
- `types.ts` if present

Do not claim unsupported features.

**Verify**: `grep -n "planned" docs/koreader-sync.md` → no stale planned label for shipped module layout.

### Step 3: Update README branding to Verso

In `README.md`, change user-facing title/tagline from `OPDS Reader` to `Verso` where it refers to the app name.

Keep internal slug/package references as `opds-reader` if they describe technical identifiers.

**Verify**: `grep -n "OPDS Reader" README.md` → no old app-name usage remains, or only explicit historical/internal context remains.

### Step 4: Run lightweight verification

Docs-only change; run:

```bash
pnpm typecheck
pnpm lint
```

Expected: pass. If operator wants docs-only no commands, still run these unless unavailable.

## Test plan

No runtime tests required for docs-only changes. Flow list verification and type/lint are enough.

## Done criteria

- [ ] `docs/e2e.md` lists all current `.maestro/*.yaml` flows.
- [ ] `docs/koreader-sync.md` no longer labels shipped module layout as planned.
- [ ] `README.md` uses `Verso` as app name.
- [ ] No source files modified.
- [ ] `pnpm typecheck` and `pnpm lint` pass or skipped reason recorded.
- [ ] `plans/README.md` row 010 updated.

## STOP conditions

Stop and report if:
- `.maestro/` flow list differs from this plan and docs need a larger rewrite.
- README intentionally preserves `OPDS Reader` as a product name despite `appIdentity`.
- Updating docs would require changing app behavior.

## Maintenance notes

After adding/removing any Maestro flow, update `docs/e2e.md` in the same PR.
