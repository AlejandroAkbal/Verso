# Plan 005: Tighten migration error handling

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- src/db/migrations.ts src/db/schema.ts`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-data-layer-characterization-tests.md
- **Category**: migration
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

Several migrations swallow all `ALTER TABLE ADD COLUMN` errors because duplicate-column errors can happen on fresh installs. That also swallows real SQL failures, then the migration can still advance `schema_version`. The newer `ensureLibraryPreferenceColumns` pattern is safer because it checks schema state before adding columns.

## Current state

Relevant files:
- `src/db/migrations.ts` — migration runner with version gates.
- `src/db/schema.ts` — current schema version and CREATE TABLE definitions.

Known evidence:
- `SCHEMA_VERSION = 11` in `src/db/schema.ts:86`.
- `user_preferences` includes `library_sort`, `library_filter`, `library_category_filter` in `CREATE_TABLES_SQL`.
- Migration code contains broad catches around `ALTER TABLE ADD COLUMN` blocks for earlier versions.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| Tests | `pnpm test -- src/db/migrations.test.ts` | migration tests pass if plan 001 added them |
| E2E smoke | `maestro test .maestro/library-smoke.yaml` | library loads |

## Scope

**In scope**:
- `src/db/migrations.ts`
- `src/db/migrations.test.ts` if present from plan 001

**Out of scope**:
- Schema redesign.
- New migration version unless absolutely required.
- Deleting existing migration steps.

## Git workflow

- Branch suggestion: `advisor/005-tighten-migrations`.
- Commit message: `fix: avoid swallowing migration errors`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Add reusable column-exists helper if missing

In `src/db/migrations.ts`, use or create a helper that reads:

```sql
PRAGMA table_info(<table>)
```

and returns whether a column exists. Keep table names hardcoded/validated; do not interpolate user input.

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Replace broad catches for `ADD COLUMN`

For each migration block that currently does:

```ts
try {
  await db.execAsync('ALTER TABLE ... ADD COLUMN ...');
} catch {
  // Column may already exist...
}
```

replace with:

1. Check whether the target column exists.
2. If missing, run `ALTER TABLE`.
3. Do not catch all errors. If the alter fails, let the migration fail and do not advance version.

Apply to all `ADD COLUMN` migrations, including older v4/v5/v7/v10 patterns.

**Verify**: `grep -n "catch {" src/db/migrations.ts` → no broad empty catch remains for `ALTER TABLE ADD COLUMN`.

### Step 3: Keep repair behavior for library preferences

Keep the v11 repair behavior that handles DBs already at version 11 but missing `library_sort`, `library_filter`, `library_category_filter`. It may run unconditionally if needed for recovery, but should use PRAGMA pre-checks and not swallow real errors.

**Verify**: `grep -n "ensureLibraryPreferenceColumns" src/db/migrations.ts` → helper still exists or equivalent repair code exists.

### Step 4: Run migration tests

If `src/db/migrations.test.ts` exists, add/keep cases:
- fresh DB reaches version 11.
- version 10 missing library preference columns repairs them.
- forced non-duplicate SQL error fails migration.

Run:

```bash
pnpm test -- src/db/migrations.test.ts
```

Expected: all pass.

### Step 5: Run full verification

Run:

```bash
pnpm typecheck
pnpm lint
```

If simulator is available:

```bash
maestro test .maestro/library-smoke.yaml
```

Expected: all pass.

## Test plan

- Migration unit tests from plan 001.
- Library smoke E2E to confirm app opens with existing DB.

## Done criteria

- [ ] No migration `ALTER TABLE ADD COLUMN` block swallows all errors.
- [ ] Duplicate/existing-column cases are handled by PRAGMA pre-checks.
- [ ] `schema_version` is not advanced after an unhandled SQL migration failure.
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] `plans/README.md` row 005 updated.

## STOP conditions

Stop and report if:
- Expo SQLite PRAGMA results differ from expected shape and cannot be typed safely.
- Fix would require rewriting the whole migration runner.
- Existing test DBs rely on swallowed non-duplicate errors.

## Maintenance notes

Future migrations should use PRAGMA pre-checks for additive columns and fail loudly on unexpected SQL errors.
