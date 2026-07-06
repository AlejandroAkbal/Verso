# End-to-end testing (Maestro)

**We do not maintain unit or integration tests.** Product confidence comes from Maestro flows against a dev client on a simulator or device.

## Prerequisites

1. **Dev build** installed (`pnpm run:ios` or EAS dev client). Expo Go is not supported.
2. **Metro** running and reachable at `http://127.0.0.1:8081` (`pnpm start`).
3. **[Maestro CLI](https://maestro.mobile.dev/)** on your PATH.
4. Simulator or device with the app (`appId: dev.akbal.opdsreader`).

Maestro deep-links via `exp+opds-reader://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`. If Metro is down, the dev client shows a red error screen — tap **Reload** after starting Metro.

## Run all flows

```bash
pnpm start          # separate terminal
pnpm e2e:ios        # runs every YAML in .maestro/
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

## Android

The flows are platform-agnostic — they use `appId`, deep-links, `testID`s and accessibility
labels, so the same YAML runs on Android. To run them:

1. Install the Android SDK + an emulator image; set `ANDROID_HOME` (e.g. `~/Library/Android/sdk`).
2. Boot an AVD: `emulator -avd <name>` (or launch from Android Studio).
3. Build + install the Android dev client: `pnpm run:android`.
4. Start Metro (`pnpm start`) and run: `pnpm e2e:android` (or `maestro --device emulator-5554 test .maestro/`).

`pnpm e2e:android` runs the same flow set as iOS; Maestro targets whichever device is booted.
Pass `--device` when both an emulator and a simulator are connected. CI for Android (an emulator
job on a Linux runner) is tracked in `TODO.md`.

## Flows

| File | Covers |
|------|--------|
| `library-smoke.yaml` | Dev client → Library visible |
| `settings-smoke.yaml` | Settings gear → OPDS Servers → KOReader row |
| `koreader-settings.yaml` | KOReader sync form fields |
| `book-detail.yaml` | Grid tap → book detail screen |
| `download-book.yaml` | Download from detail → Read button |
| `reader-open.yaml` | Download → Read → Readium reader open (`reader-screen`), then back |

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
- **No Jest / Vitest / component tests** unless explicitly requested — extend Maestro instead.

## CI

`.github/workflows/e2e.yml`:

- **`static`** (Ubuntu, every push/PR): `pnpm typecheck` + `pnpm lint`.
- **`ios-smoke`** (macOS, push to `main` / manual): builds the simulator dev client
  (`eas build --local --profile development-simulator`), boots a simulator, starts Metro,
  and runs the fresh-install-safe flows (`library-smoke`, `settings-smoke`).

Requires an **`EXPO_TOKEN`** repo secret for the local EAS build. Download / reader / KOReader
flows need an authenticated server, so they stay local-only (not in CI). To skip rebuilding the
native client each run, publish a dev-client artifact and swap the build step for a download.
Android flows are tracked in `TODO.md`.
