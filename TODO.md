# TODO

Living product and engineering backlog. Keep this file current when new durable work appears.

## Now

- [ ] Dogfood KOReader sync during real reading sessions (round-trip verified working; keep an eye on conflict UX across devices).

## Next

Library-UX features, now sitting on the refactored base (see `docs/superpowers/specs/2026-07-07-focused-refactor-design.md`):

- [x] Library sorting (reading progress, recency / "old books") — extend `useLibraryFilters`.
- [x] Replace the always-on category chips with a filter menu/sheet; keep All/Downloaded quick toggles.
- [x] Collapsing / non-sticky search bar (iOS large-title behavior) that reads well on Android too.
- [x] Cancel an in-progress download by tapping its control again (stop + revert to cloud).
- [x] Design-polish pass (Cover Ambiance restyle): per-book dominant-color depth across Library + Reader — cover glows, single ambient backdrop, tinted reader chrome, color-continuity open, cover press feedback. Reduce-motion/transparency honored. (Spec + plan under `docs/superpowers/`.)
- [ ] Android Maestro E2E: run the shared flows on a booted emulator locally (tooling/docs ready; needs Android SDK + AVD).
- [x] Audit application for non-native UI components or custom routing → migrated all custom sheets to native router modals; unified shared native-modal header chrome (`nativeModalHeaderOptions`). No custom sheets/overlays remain.

## Later

- [ ] Bionic Reading technical spike in Readium (only if pursuing Premium).
- [ ] Revisit monetization gates (`docs/monetization.md`).

## Done (archive)

- [x] Focused refactor (W1–W6): displayName → "Verso"; i18n drift fixed (0 across 5 locales) + cover-frame dedupe; broke the queue↔syncBook↔manage require cycle via a leaf `paths.ts`; re-layered download state behind one event-driven store (`useSyncExternalStore`, poll only while in-flight) + renamed `useDownloadController`; split the library screen (470→286) and reader screen (356→168) into focused hooks + components. All verified on-device.
- [x] Premium fade-out (opacity + bloom) on download success → settle; fixed a settle timer that never fired (unstable `enterSettled` reset by 300ms download polling).
- [x] KOReader sync verified end-to-end against CWA `/kosync` (auth, pull, push round-trip); fixed a `NOT NULL` crash on `book_sync_state.remote_progress` and surfaced server error bodies (e.g. "KOReader sync is disabled").
- [x] Per-book sync status on detail screen ("Synced 2m ago", relative time, error state).
- [x] Maestro `reader-open.yaml` (download → read → reader open → back) + `reader-screen` / `reader-back` testIDs; conflict-prompt handling documented.
- [x] Local E2E harness: Maestro flows + `e2e:ios`/`e2e:android` scripts + docs. (No GitHub Actions pipeline — testing is local-only on our own devices; the old `e2e.yml` workflow was removed.)
- [x] Restyle migration, cover skeletons, NEW badges, onboarding, haptics.
- [x] KOReader sync v1 (Settings, push/pull, conflict prompt, Readium locators).
- [x] Auto-launch/resume last book, OPDS summary links, research docs.
- [x] Maestro iOS smokes: library, settings, KOReader form, book detail.
- [x] Toast feedback for sync errors + last-error on KOReader settings.
- [x] Move KOReader sync next to libraries in Settings; “Use library server” prefills CWA `/kosync` URL.
- [x] Library refresh button (OPDS catalog + KOReader progress pull).
- [x] Reading progress below cover with % caption on grid (not overlaid on jacket).
- [x] Guard against multiple reader opens on rapid Read taps.

## E2E

**Policy:** E2E only — no unit/component tests. See `docs/e2e.md`.

```bash
pnpm start      # Metro on 127.0.0.1:8081
pnpm e2e:ios    # all flows in .maestro/
```
