# TODO

Living product and engineering backlog. Keep this file current when new durable work appears.

## Now

- [x] Finish the full Restyle migration and remove `StyleSheet.create` from app UI code.
- [x] Add cover skeleton loaders so unloaded covers do not appear as black boxes.
- [x] Make NEW badges smarter (acknowledge on open/download/read; age-out).
- [x] Add an onboarding button to add/select an example public library.
- [x] Add subtle haptics for key actions.

## Next

- [x] KOReader sync — design (`docs/koreader-sync.md`) + v1 implementation (Settings, push/pull, conflict prompt).
- [x] Optional auto-launch/resume last book (Settings toggle + `StartupGate`).
- [x] Improve link rendering/styling for rich OPDS descriptions (`BookAboutSection`).

## Later

- [x] Research Bionic Reading Mode (`docs/bionic-reading.md`).
- [x] Revisit monetization gates (`docs/monetization.md`).

## Follow-ups (new)

- [ ] Dogfood KOReader sync against real `sync.koreader.rocks` account + KOReader app on device.
- [ ] Android Readium E2E via Maestro on emulator.
- [ ] Bionic Reading technical spike in Readium (only if pursuing Premium).

## Maestro (iOS)

Smoke flows in `.maestro/` — run with Metro on `127.0.0.1:8081`:

- `library-smoke.yaml` — app launches to Library
- `koreader-settings.yaml` — Settings → KOReader Sync form
