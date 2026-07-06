# TODO

Living product and engineering backlog. Keep this file current when new durable work appears.

## Now

- [ ] Dogfood KOReader sync against Calibre-Web Automated `/kosync` on personal library (partial MD5, same credentials as OPDS).
- [ ] Expand Maestro E2E coverage (reader open, download → read, conflict prompt) — see `docs/e2e.md`.
- [x] Toast feedback for sync errors + last-error on KOReader settings.
- [x] Move KOReader sync next to libraries in Settings; “Use library server” prefills CWA `/kosync` URL.

## Next

- [ ] Android Maestro E2E on emulator.
- [ ] CI job: Maestro smoke on macOS + dev client artifact.
- [ ] Surface sync status per book on detail screen (optional).

## Later

- [ ] Bionic Reading technical spike in Readium (only if pursuing Premium).
- [ ] Revisit monetization gates (`docs/monetization.md`).

## Done (archive)

- [x] Restyle migration, cover skeletons, NEW badges, onboarding, haptics.
- [x] KOReader sync v1 (Settings, push/pull, conflict prompt, Readium locators).
- [x] Auto-launch/resume last book, OPDS summary links, research docs.
- [x] Maestro iOS smokes: library, settings, KOReader form, book detail.

## E2E

**Policy:** E2E only — no unit/component tests. See `docs/e2e.md`.

```bash
pnpm start      # Metro on 127.0.0.1:8081
pnpm e2e:ios    # all flows in .maestro/
```
