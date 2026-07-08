# Plan 001: Add data-layer characterization tests

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If any STOP condition occurs, stop and report — do not improvise. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- package.json pnpm-lock.yaml src/services/opds/parser.ts src/db/migrations.ts src/services/koreader/cwaProgress.ts src/services/downloads/queue.ts src/services/koreader/documentId.ts`
> If any in-scope file changed since this plan was written, compare Current state excerpts against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

The app currently relies on Maestro E2E only. That catches broken screens, but not pure data bugs in OPDS parsing, migrations, KOReader checksum/progress mapping, or download state transitions. Recent migration and sync bugs landed despite typecheck/lint, so data-layer characterization tests should anchor the risky logic before further refactors.

## Current state

Relevant files:
- `package.json` — no unit-test script or unit-test dependency.
- `src/services/opds/parser.ts` — parses OPDS feeds and paginated acquisition entries; key fetch starts around `fetchOPDSFeed`.
- `src/db/migrations.ts` — migration runner with schema-version gates and broad `ALTER TABLE` catches.
- `src/services/koreader/cwaProgress.ts` — catalog-wide CWA KOReader sync via range fetches and KOSync progress lookup.
- `src/services/downloads/queue.ts` — download queue, cancellation, completion, KOReader restore-on-download.
- `src/services/koreader/documentId.ts` — partial MD5 and filename document IDs.

Known excerpts:
- `src/services/koreader/documentId.ts:17-23` computes partial MD5 with 1024-byte reads and offsets from `for (let i = -1; i <= 10; i += 1) { const offset = step << (2 * i); ... }`.
- `src/db/schema.ts:86` currently has `SCHEMA_VERSION = 11`.
- `src/db/schema.ts:96-106` creates `user_preferences` with `library_sort`, `library_filter`, `library_category_filter`.

Repo constraints:
- Use `pnpm` only.
- iOS/Android only, no web.
- E2E remains Maestro; this plan adds small data-layer characterization tests for pure logic and DB behavior.
- Do not add broad component/unit test coverage; keep tests targeted at risky pure/data surfaces.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| Unit tests | `pnpm test` | new data-layer tests pass |
| E2E smoke | `pnpm e2e:ios` | Maestro flows pass on booted dev client |

## Scope

**In scope**:
- `package.json`
- `pnpm-lock.yaml`
- `src/services/opds/parser.test.ts` (create)
- `src/db/migrations.test.ts` (create)
- `src/services/koreader/documentId.test.ts` (create)
- `src/services/koreader/cwaProgress.test.ts` (create only if `cwaProgress.ts` exports testable helpers; otherwise stop after parser/migration/documentId)
- `src/services/downloads/queue.test.ts` (create only for small pure helpers or dependency-injected paths; do not mock the whole app)

**Out of scope**:
- UI/component tests.
- Jest-native/React Native rendering harness.
- CI setup.
- Source behavior changes except small exports needed for testing pure helpers.

## Git workflow

- Branch suggestion: `advisor/001-data-layer-tests`.
- Commit message style: conventional commits, e.g. `test: add data-layer characterization coverage`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Add a small test runner

Add Vitest for pure TypeScript tests:

```bash
pnpm add -D vitest
```

Update `package.json` scripts:

```json
"test": "vitest run"
```

Do not add React Native component test libraries.

**Verify**: `pnpm test` → exits 0 with either no tests found handled by Vitest or new tests after later steps.

### Step 2: Add OPDS parser characterization tests

Create `src/services/opds/parser.test.ts` with fixtures that cover:
- acquisition link produces `downloadUrl` and `mime`.
- subsection/detail entry with `.opds` detail URL is preserved for later resolution.
- categories array is serialized/stable when converted to `BookRow`.

Use real parser exports from `src/services/opds/parser.ts`. If needed, export only pure parsing helpers; do not change parser behavior.

**Verify**: `pnpm test -- src/services/opds/parser.test.ts` → all tests pass.

### Step 3: Add migration characterization tests

Create `src/db/migrations.test.ts`. Use the same SQLite API available in the project if Vitest can run it in Node. If `expo-sqlite` cannot run under Vitest, STOP and report that migration tests need an Expo/instrumented harness instead of mocking SQLite.

Cover:
- a fresh DB reaches `SCHEMA_VERSION`.
- a DB at version 10 but missing `library_sort`, `library_filter`, `library_category_filter` gets those columns repaired.
- migration does not advance `schema_version` if a non-duplicate SQL error is forced.

**Verify**: `pnpm test -- src/db/migrations.test.ts` → all tests pass, or STOP with Expo SQLite harness limitation.

### Step 4: Add KOReader document ID characterization tests

Create `src/services/koreader/documentId.test.ts`.

Cover:
- `filenameDocumentId('file:///Books/My%20Book.epub')` hashes basename `My Book.epub`.
- `computeDocumentId(uri, 'filename')` delegates to filename mode.
- partial-MD5 offset list is stable. If current code does not expose offsets, extract a tiny pure helper `partialMd5Offsets()` returning the offsets used by `partialMd5DocumentId`; test it. Do not change checksum behavior.

**Verify**: `pnpm test -- src/services/koreader/documentId.test.ts` → all tests pass.

### Step 5: Add CWA progress helper tests only if cheap

If `src/services/koreader/cwaProgress.ts` has pure helpers such as CWA book-id extraction, URL origin checks, or range-fetch status classification, add tests in `src/services/koreader/cwaProgress.test.ts`.

If testing requires mocking all fetch/SQLite/SecureStore behavior, do not build a large fake app. STOP and record that plan 004 should add focused tests while changing the helper.

**Verify**: `pnpm test -- src/services/koreader/cwaProgress.test.ts` → all tests pass, or STOP with explanation.

### Step 6: Add download queue tests only for isolated logic

If `src/services/downloads/queue.ts` has or can expose pure helpers for cancel state resolution without running Expo download APIs, test those helpers. Do not mock `expo-file-system` deeply.

**Verify**: `pnpm test -- src/services/downloads/queue.test.ts` → all tests pass, or STOP with explanation.

### Step 7: Run full verification

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected:
- Typecheck exits 0.
- Lint exits 0 with only known pre-existing warning if still present.
- Unit tests pass.

Run Maestro only if a booted simulator/dev client is available:

```bash
pnpm e2e:ios
```

Expected: all flows pass. If no device is available, state skipped reason in handoff.

## Test plan

New tests:
- OPDS parser fixture tests.
- SQLite migration tests if environment supports `expo-sqlite` in Vitest.
- KOReader document ID pure helper tests.
- Optional focused helper tests for CWA/download queue.

## Done criteria

- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0 or only known pre-existing warning remains.
- [ ] `pnpm test` exists and exits 0.
- [ ] New data-layer test files exist and cover parser + document ID at minimum.
- [ ] Migration test either exists and passes, or executor stopped with explicit Expo SQLite harness blocker.
- [ ] No unrelated source behavior changes.
- [ ] `plans/README.md` row 001 updated.

## STOP conditions

Stop and report if:
- `expo-sqlite` cannot be exercised in Vitest without a large custom harness.
- Tests require adding a new broad React Native rendering framework.
- Current parser/migration/documentId code differs materially from excerpts.
- Fix requires changing app behavior beyond exporting pure helpers.

## Maintenance notes

Future refactors to parser, migrations, CWA sync, and document ID logic should add or update characterization tests in this suite before changing behavior.
