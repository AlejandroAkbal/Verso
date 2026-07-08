# OPDS Reader — Agent Instructions

Frictionless OPDS e-book reader. Premium native iOS/Android feel. Network library is home.

**Identity:** `src/config/appIdentity.ts` + `app.config.ts`. i18n uses `{{appName}}`.

**Pre-production:** Nothing shipped — break schema, delete dead code, rebuild dev clients for native deps. No backwards-compat migrations.

---

## Expo SDK 57

Read https://docs.expo.dev/versions/v57.0.0/ before changing Expo APIs. **Expo Go does not work** — use `pnpm run:ios` / EAS dev builds.

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Dev + Metro | `pnpm start` |
| iOS build + run | `pnpm run:ios` |
| Android build + run | `pnpm run:android` |
| Pod issues | `pnpm pod-install` |
| Lint / types | `pnpm lint` / `pnpm typecheck` |
| E2E (Maestro) | `pnpm e2e:ios` — see `docs/e2e.md` |
| Preflight check | `pnpm verify:preflight` |
| E2E check | `pnpm verify:e2e` |
| Ship check | `pnpm verify:ship` |

`pnpm` only. iOS + Android only — no web. Config is `app.config.ts` (not `app.json`).

**Testing:** E2E only (Maestro). No unit/component tests unless explicitly requested. Before pushing or marking a UI/data-flow change complete, run relevant Maestro coverage (`pnpm e2e:ios` or a targeted flow) and record the exact command; if skipped, state why.

---

## Stack

Expo Router · Restyle + `theme.ts` (no Tailwind) · TanStack Query · `expo-sqlite` · OPDS via `fast-xml-parser` · downloads via `expo-file-system` + background tasks · i18n (`en/es/zh/hi/ar`) · FlashList · `expo-image` / blur / dominant color.

**Reader:** `react-native-readium` + `react-native-nitro-modules`. Progress = Readium locator JSON. **KOReader sync:** Calibre-Web Automated `/kosync` (derive from OPDS URL) or any KOSync server; partial MD5 document ID; conflict prompt defaults to Keep here.

---

## Product

- OPDS 1.2 catalogs (Calibre-Web, Gutenberg). Flat feeds only — no folder browsing.
- Download → read offline. Basic Auth: username in SQLite, password in SecureStore.
- Active library in Settings (`user_preferences.active_server_id`). Two Gutenberg feeds seeded for testing.
- Library: search, category chips, All/Downloaded filters, progress on covers, NEW badge (14-day first-seen).
- **Anti-goals:** PDF, highlights sync, OPDS directory trees, Tailwind, web.

---

## Architecture (non-obvious)

**OPDS:** `parser.ts` handles acquisition + subsection entries (Gutenberg). `catalog.ts` resolves Calibre navigation roots. `cached_at` set on insert only (first-seen for NEW badge). Gutenberg `.opds` detail URLs resolved to EPUB at download time.

**Downloads:** Queue max 2 concurrent → `Paths.document/books/{bookId}.{ext}`. Resolve stored file URIs against the current documents directory; iOS app container UUIDs can change. Background task uses `openDatabaseSync(appIdentity.database)` only in `task.ts`.

**SQLite:** `useSQLiteContext()` in UI — never a second DB connection in-app. Bump `SCHEMA_VERSION` in `schema.ts` for migrations.

**Reader:** Pass local EPUB path to `ReadiumView`. Store locator JSON + `progression` in `reading_progress`. Plugins: `expo-build-properties` + `./plugins/withReadium.js`.

---

## Conventions

Minimal diff · `@/` imports · Restyle primitives from `src/components/ui.tsx` · `ThemedText` / `useTheme()` · strict TS · dark-only UI · i18n keys in all 5 locales.

**Design System - Modal Sheets**: Embrace the native iOS/Android look for modal headers. Use native-style text buttons (e.g., "Done") instead of custom icon buttons for closing modals.
```tsx
<PressableBox onPress={onClose} hitSlop={12}>
  <ThemedText style={{ color: theme.colors.interactive, fontSize: 17, fontWeight: '600' }}>
    {t('common.done')}
  </ThemedText>
</PressableBox>
```

Track durable product/engineering backlog in `TODO.md`. When changing a feature, mention nearby UX/architecture improvements worth considering; do not implement them unless asked.

---

## Never

- `npm` / `yarn` · web / `react-native-web` · Tailwind / NativeWind
- Custom EPUB-to-plain-text reader · WebView epub readers
- PDF · OPDS folder browsing · commit secrets or `dev-secrets.ts`

**Ask first:** reader engine change, anti-goal scope.

---

## Self-Improvement

Update this file when durable project facts change. Keep it short — remove stale rules.
