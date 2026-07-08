# End-to-end testing (Maestro)

**We do not maintain unit or integration tests.** Product confidence comes from Maestro flows against a dev client on a simulator or device.

## Prerequisites

1. **Dev build** installed (`pnpm run:ios` or EAS dev client). Expo Go is not supported.
2. **Metro** running and reachable at `http://127.0.0.1:8081` (`pnpm start`).
3. **[Maestro CLI](https://maestro.mobile.dev/)** on your PATH.
4. Simulator or device with the app (`appId: dev.akbal.opdsreader`).

Maestro deep-links via `exp+opds-reader://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`. If Metro is down, the dev client shows a red error screen — tap **Reload** after starting Metro.

## Run checks

```bash
pnpm verify:preflight  # typecheck + lint
pnpm start             # separate terminal
pnpm verify:e2e        # runs every YAML in .maestro/
pnpm verify:ship       # preflight + E2E
```

Run one flow:

```bash
maestro test .maestro/library-smoke.yaml
```

List devices:

```bash
maestro list_devices
```

Pass a device id:

```bash
maestro --device <UDID> test .maestro/
```

## Flows

| File | Covers |
|------|--------|
| `book-detail.yaml` | Grid tap → book detail screen |
| `complete-onboarding.yaml` | First-run onboarding completion |
| `download-book.yaml` | Download from detail → Read button |
| `filter-test.yaml` | Sort/filter sheet opens and closes |
| `koreader-settings.yaml` | KOReader sync form fields |
| `library-header-scroll-top.yaml` | Library title tap scrolls list to top |
| `library-smoke.yaml` | Dev client → Library visible |
| `library-switch.yaml` | Settings library switch updates active library |
| `reader-open.yaml` | Download → Read → Readium reader open (`reader-screen`), then back |
| `settings-smoke.yaml` | Settings gear → OPDS Servers → KOReader row |

Add a new flow when shipping user-visible behavior. Prefer `testID` and accessibility labels over coordinate taps.

### Sync-conflict prompt

The KOReader conflict prompt (`sync.conflictTitle` → **Keep** / **Jump to page**) is a native
`Alert`. `reader-open.yaml` taps **Keep** opportunistically (`optional: true`) so a sync-enabled
run exercises it, but it cannot be triggered deterministically without a KOSync server returning
remote progress that conflicts with local. To exercise it end to end:

1. Enable KOReader sync on the server — Calibre-Web Automated returns `503 {"error":1000,"message":"KOReader sync is disabled"}` until then.
2. Push a higher remote position from another device for a downloaded book.
3. Open that book locally with lower progress — the prompt appears on open.

## Conventions

- Use `testID` on interactive controls (see library settings gear, KOReader rows).
- `extendedWaitUntil` with 60–90s timeout for cold Metro bundle.
- Optional `tapOn: Reload` when the dev client may be stale.
- Vitest is reserved for data-layer characterization tests; no component tests unless explicitly requested.

## Where tests run

Local only, on our own simulators/emulators — there is no GitHub Actions pipeline. Run
`pnpm verify:preflight` for type/lint checks and `pnpm verify:e2e` on a booted device before shipping user-visible changes. `pnpm verify:ship` runs both.
