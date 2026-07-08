# Plan 009: Remove theme and dead-code drift

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm expected result before moving on. If a STOP condition occurs, stop and report. When done, update this plan row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat cc0348e..HEAD -- src/theme/theme.ts src/lib/coverStyle.ts src/components/BookCard.tsx`
> If any in-scope file changed, compare Current state against live code before proceeding; mismatch is STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `cc0348e`, 2026-07-08

## Why this matters

The theme contains unused/misleading configuration keys, and cover glow code remains after the design changed to pure black gallery/no per-book aura. Dead config makes future styling changes harder because developers may edit tokens that do nothing.

## Current state

Relevant files:
- `src/theme/theme.ts` — Restyle theme tokens.
- `src/lib/coverStyle.ts` — cover frame helpers; contains unused `coverGlowStyle`.
- `src/components/BookCard.tsx` — should no longer import/use `coverGlowStyle`.

Known evidence:
- `src/theme/theme.ts` has `borderRadii` near line 78 and `typography` near line 123.
- `src/lib/coverStyle.ts` exports `coverGlowStyle` near line 24.
- `grep coverGlowStyle` found only definition after prior gallery glow removal.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0, no errors |
| Lint | `pnpm lint` | exit 0; only known pre-existing i18n warning if still present |
| E2E | `maestro test .maestro/library-smoke.yaml .maestro/book-detail.yaml` | flows pass |

## Scope

**In scope**:
- `src/theme/theme.ts`
- `src/lib/coverStyle.ts`

**Out of scope**:
- Visual redesign.
- Adding new tokens.
- Changing colors/elevation.
- Formatting entire theme file.

## Git workflow

- Branch suggestion: `advisor/009-remove-theme-dead-code`.
- Commit message: `chore: remove unused theme and cover glow code`.
- Do not push or open PR unless operator asks.

## Steps

### Step 1: Confirm dead references

Run:

```bash
grep -R "coverGlowStyle\|theme.typography\|borderRadii" -n src
```

Expected before edit:
- `coverGlowStyle` only in `src/lib/coverStyle.ts`.
- `theme.typography` no matches.
- `borderRadii` only in theme definition or no runtime matches.

If there are live references, STOP and report.

### Step 2: Remove `coverGlowStyle`

Delete the unused `coverGlowStyle` export from `src/lib/coverStyle.ts`. Keep `coverFrameStyle` and any active exports.

**Verify**: `grep -R "coverGlowStyle" -n src` → no matches.

### Step 3: Remove misleading unused theme keys

In `src/theme/theme.ts`, remove unused `typography` object if no code references it. Remove `borderRadii` only if typecheck proves Restyle does not require it.

Do not remove active `radii`, `spacing`, `textVariants`, `colors`, or `breakpoints`.

**Verify**: `pnpm typecheck` → exits 0.

### Step 4: Run visual smoke checks

Run:

```bash
pnpm lint
```

With simulator:

```bash
maestro test .maestro/library-smoke.yaml .maestro/book-detail.yaml
```

Expected: all pass.

## Test plan

- Typecheck catches token type removals.
- Library/book detail Maestro catches obvious visual/render crashes.

## Done criteria

- [ ] `coverGlowStyle` removed and no references remain.
- [ ] Unused `typography` removed if unreferenced.
- [ ] `borderRadii` removed only if typecheck passes.
- [ ] No color/elevation behavior changes.
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] `plans/README.md` row 009 updated.

## STOP conditions

Stop and report if:
- `borderRadii` is required by Restyle typing.
- Any removed token has live code references.
- A visual diff appears beyond dead-code deletion.

## Maintenance notes

Avoid reintroducing design tokens unless a component consumes them. Keep theme small and truthful.
