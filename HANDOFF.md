# Handoff — Verso (OPDS Reader)

_Updated 2026-07-08. Rewrite or delete once the next feature lands. Read `AGENTS.md` first (project rules), then this._

## TL;DR

`main` is green and fully pushed (`origin/main` = `f1d1d7b`). The last two efforts — a whole-project refactor and a **Cover Ambiance design-polish restyle** — are done, reviewed, on-device-validated, merged, and pushed. There is no work-in-progress branch. The backlog's remaining items are runtime/hardware-bound, not codeable from a keyboard alone.

## Repo state

- Branch: `main`, HEAD `f1d1d7b` (pushed).
- Working tree: `M .gitignore`, `M package.json`, `M pnpm-lock.yaml` — these predate the current work (uncommitted since before this session; likely from a scratch "vexly" experiment). **Not mine; left untouched.** Confirm with the owner before committing or reverting them.
- `tsc` clean; `pnpm lint` = 0 errors, 1 warning (pre-existing `import/no-named-as-default-member` in `src/i18n/index.ts`, untouched).
- `dev-secrets.ts` (CWA creds) is gitignored and never committed. Never stage it.

## What shipped most recently (Cover Ambiance restyle — merge `f1d1d7b`)

Per-book dominant-color depth across Library + Reader. Built with subagent-driven-development (a review gate per task + a whole-branch review). Spec + plan: `docs/superpowers/specs/2026-07-07-cover-ambiance-restyle-design.md`, `docs/superpowers/plans/2026-07-07-cover-ambiance-restyle.md`.

| Area | What | Key files |
|---|---|---|
| Color source | `useCoverColor` — sync `coverColorFromBlurhash` for grids, async `useCoverColor` for single-book surfaces; both `{ glow, ambient }` | `src/hooks/useCoverColor.ts` |
| Ambient layer | `CoverAmbiance` (blurred cover + tint, reduce-transparency aware) + `useReduceTransparency` | `src/components/CoverAmbiance.tsx`, `src/hooks/useReduceTransparency.ts` |
| Library | single ambient backdrop (last-read book) + per-cover glow shadow + cover press (haptic + scale) | `src/app/(tabs)/index.tsx`, `src/components/BookCard.tsx`, `src/lib/coverStyle.ts` |
| Reader | chrome tinted by open book + color-continuity open wash (+ safety-net timer) | `src/components/reader/ReaderChrome.tsx`, `src/app/reader/[id].tsx`, `src/hooks/useReaderSession.ts` |

All motion honors reduce-motion; all blur honors reduce-transparency.

**On-device validation (iOS sim):** `library-smoke`, `settings-smoke`, `book-detail` Maestro flows pass. Library ambient + reader immersive + open-wash confirmed visually. **A stray native header on the reader was found and fixed on-device** (`6e624dd`): the modal refactor added `src/app/reader/_layout.tsx` (making `reader` a nested navigator) but the root stack still registered `reader/[id]`; fixed to register `reader` so `headerShown:false`+`fullScreenModal` apply to the whole group.

## Known issues / flags

- **`reader-open.yaml` E2E is flaky** on its *fresh network-download* step (times out on the read button before ever reaching the reader). Not a regression — the restyle touches no download/OPDS code, `book-detail` passes, and the reader opens fine manually. If you make it deterministic, point it at an already-downloaded book instead of re-downloading a specific catalog seed.
- **Two app installs on the sim:** `dev.akbal.opdsreader` (shows as "Reader") and `dev.akbal.verso` ("Verso"). Maestro flows target `appId: dev.akbal.opdsreader`. The displayName is "Verso" (W1 refactor) but bundleId stayed `dev.akbal.opdsreader`.

## Backlog (`TODO.md`)

Codeable items are essentially done. Remaining are runtime/hardware-bound:
- Dogfood KOReader sync during real reading sessions (round-trip already verified working).
- Android Maestro E2E on a booted emulator (needs Android SDK + AVD; tooling/docs ready in `docs/e2e.md`).
- `Later`: Bionic Reading spike; monetization revisit.

There is **no GitHub Actions pipeline** — testing is local-only on our own devices (the old `e2e.yml` was removed this session).

## How to run / verify

```bash
pnpm start        # Metro on 127.0.0.1:8081 (usually already up; nohup if backgrounding)
rtk tsc           # expect: TypeScript: No errors found
rtk lint          # expect: 0 errors, 1 warning (i18n/index.ts, pre-existing)
pnpm run:ios      # dev build+run; Expo Go does NOT work (native deps)
pnpm e2e:ios      # Maestro flows in .maestro/
```

**Always boot the simulator and run the app / E2E yourself — never ask the owner to.** (Standing instruction.) Booting: `xcrun simctl bootstatus BACD4CEA-1B77-45B6-BCD0-0A3143C348DE -b`. Launch the dev client + point it at Metro via the deep link `exp+opds-reader://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`. Screenshot/drive via the Maestro MCP tools. This restyle was pure JS/TS, so Metro serves branch code on reload with no native rebuild; a **routing/layout change needs a full app relaunch** (fast-refresh won't re-evaluate the navigator).

## Working agreements (saved as memories under the project memory dir)

- **Commit & push after each verified unit of work** — don't let diffs pile up.
- **Dependencies:** a new dep is fine when it clearly earns its place and won't burden the future; prefer first-party Expo modules. (`pnpm` only.)
- **Boot the simulator yourself** for any UI work; do the visual/a11y/perf checks yourself.
- Process: for creative/UI work the owner expects **superpowers:brainstorming → writing-plans → subagent-driven-development**; each task verified with `tsc`/`lint`/Maestro/on-device.

## Environment notes

- `main`-based workflow: commit to `main` (or a feature branch that merges back) and push. Owner's SSH/HTTPS push works.
- Prefix shell commands with `rtk` (token-optimized wrappers). `pnpm` only — never npm/yarn. iOS + Android only, no web/Tailwind. Config is `app.config.ts` (not `app.json`).
- Sim used this session: `BACD4CEA-1B77-45B6-BCD0-0A3143C348DE` (iPhone 17 Pro, iOS 26.5). Maestro CLI at `/opt/homebrew/bin/maestro` if the MCP driver disconnects. Maestro Viewer: `http://127.0.0.1:10001/`.
- Scratch/ledger from the last multi-agent run lives under `.superpowers/sdd/` (git-ignored) — safe to ignore or delete.
