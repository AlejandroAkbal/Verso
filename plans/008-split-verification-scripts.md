# Plan 008: Split verification scripts

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- package.json AGENTS.md docs/e2e.md`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

`verify:ship` currently chains typecheck, lint, and full local Maestro. That is correct before shipping UI/data-flow changes, but painful for source-only or docs-only work when no simulator is booted. Splitting preflight and E2E gates makes verification clearer without weakening the Maestro rule.

## Current state

Relevant files:
- `package.json` — scripts include `typecheck`, `lint`, `e2e:ios`, `verify:ship`.
- `AGENTS.md` — command table and testing rule require relevant Maestro before pushing/marking UI/data-flow changes complete.
- `docs/e2e.md` — local Maestro docs, no CI pipeline.

Known current script:
- `verify:ship`: `pnpm typecheck && pnpm lint && pnpm e2e:ios`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| Preflight | `pnpm verify:preflight` | typecheck + lint pass |
| E2E | `pnpm verify:e2e` | Maestro flows pass on booted dev client |
| Ship | `pnpm verify:ship` | preflight + E2E pass |

## Scope

**In scope**:
- `package.json`
- `AGENTS.md`
- `docs/e2e.md`

**Out of scope**:
- CI setup.
- Git hooks.
- Changing Maestro flows.

## Git workflow

- Branch suggestion: `advisor/008-split-verify-scripts`.
- Commit message: `chore: split verification scripts`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Add split scripts

Update `package.json` scripts:

```json
"verify:preflight": "pnpm typecheck && pnpm lint",
"verify:e2e": "pnpm e2e:ios",
"verify:ship": "pnpm verify:preflight && pnpm verify:e2e"
```

Keep existing `e2e:ios`.

**Verify**: `pnpm verify:preflight` → typecheck + lint pass.

### Step 2: Update AGENTS command table/rule

In `AGENTS.md`, add or update rows:

- Preflight: `pnpm verify:preflight`
- E2E: `pnpm verify:e2e`
- Ship check: `pnpm verify:ship`

Keep the rule: before pushing or marking a UI/data-flow change complete, run relevant Maestro coverage or state why skipped.

**Verify**: `grep -n "verify:preflight\|verify:e2e\|verify:ship" AGENTS.md` → all three appear.

### Step 3: Update E2E docs

In `docs/e2e.md`, document:

- `pnpm verify:preflight` for type/lint-only check.
- `pnpm verify:e2e` for local Maestro.
- `pnpm verify:ship` for full local ship gate.

Do not imply CI exists.

**Verify**: `grep -n "verify:preflight\|verify:e2e\|verify:ship" docs/e2e.md` → all three appear.

### Step 4: Run verification

Run:

```bash
pnpm verify:preflight
```

With simulator/dev client available:

```bash
pnpm verify:e2e
```

If full ship gate is feasible:

```bash
pnpm verify:ship
```

Expected: commands pass; if E2E skipped, record device/Metro reason.

## Test plan

- Script-level verification only. No app behavior changes.

## Done criteria

- [ ] `package.json` has `verify:preflight`, `verify:e2e`, and `verify:ship`.
- [ ] `pnpm verify:preflight` passes.
- [ ] E2E command run or skipped reason recorded.
- [ ] `AGENTS.md` and `docs/e2e.md` describe split gates.
- [ ] `plans/README.md` row 008 updated.

## STOP conditions

Stop and report if:
- Existing project command names conflict with these scripts.
- User explicitly wants one single hard gate only.
- Docs imply CI or remote device availability that does not exist.

## Maintenance notes

Keep `verify:ship` strict. The split is for clearer local workflow, not for skipping E2E on UI/data-flow changes.
