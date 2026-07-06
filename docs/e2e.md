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

## Flows

| File | Covers |
|------|--------|
| `library-smoke.yaml` | Dev client → Library visible |
| `settings-smoke.yaml` | Settings gear → OPDS Servers → KOReader row |
| `koreader-settings.yaml` | KOReader sync form fields |
| `book-detail.yaml` | Grid tap → book detail screen |
| `download-book.yaml` | Download from detail → Read button |

Add a new flow when shipping user-visible behavior. Prefer `testID` and accessibility labels over coordinate taps.

## Conventions

- Use `testID` on interactive controls (see library settings gear, KOReader rows).
- `extendedWaitUntil` with 60–90s timeout for cold Metro bundle.
- Optional `tapOn: Reload` when the dev client may be stale.
- **No Jest / Vitest / component tests** unless explicitly requested — extend Maestro instead.

## CI (future)

Run `maestro test .maestro/` on a macOS runner with iOS simulator + prebuilt dev client artifact. Android flows are tracked in `TODO.md`.
