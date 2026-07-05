# Verso — Agent Instructions

Verso is a frictionless e-book reader competing with doomscrolling. The network library is home. Zero friction time-to-read. Premium native iOS feel (Infuse / Apple Music style).

This file is the single source of agent guidance for this repo. `CLAUDE.md` references it.

---

## Critical: Expo SDK 57

**Expo HAS CHANGED.** Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code. Do not rely on training-data patterns for Expo APIs.

---

## Commands

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Dev server (dev client) | `pnpm start` |
| iOS simulator build + run | `pnpm run:ios` |
| iOS Metro only | `pnpm ios` |
| Android | `pnpm run:android` / `pnpm android` |
| CocoaPods (after prebuild) | `pnpm pod-install` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |

**Package manager:** `pnpm` only (pinned in `packageManager`). Never use npm or yarn.

**Platforms:** iOS and Android only — no web target. Do not add `react-native-web`, web routes, CORS proxies, or WASM SQLite workarounds.

**pnpm:** `.npmrc` hoists `@expo/*` and `expo-router` so typed-route generation resolves. Use `pnpm start` / `pnpm run:ios` (not bare `pnpx expo`) — scripts set `NODE_PATH=./node_modules`.

**Dev builds:** **Expo Go will not work** (SDK 57 + native modules). Use `expo-dev-client` via `pnpm run:ios` (simulator) or `eas build --profile development` (physical device). Background tasks are skipped on simulators; foreground download queue still runs.

**iOS CocoaPods:** If `pod install` fails on `cdn.cocoapods.org` SSL, run `pnpm pod-install` — it pins the git specs repo in `ios/Podfile`.

**Simulator automation (Maestro MCP):** Project `.cursor/mcp.json` wires Maestro for full simulator control. Install: `brew tap mobile-dev-inc/tap && brew install mobile-dev-inc/tap/maestro` (not the unrelated `brew install --cask maestro`). Restart Cursor after install. Requires booted simulator + Verso dev build.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Expo SDK 57, React Native 0.86, React 19, TypeScript strict |
| Routing | Expo Router (`src/app/`) |
| Styling | `StyleSheet` + `src/theme/theme.ts` — **no Tailwind, no NativeWind** |
| Remote data | TanStack Query v5 |
| OPDS parsing | `fast-xml-parser` |
| Local persistence | `expo-sqlite` (`SQLiteProvider`, `useSQLiteContext`) |
| Downloads | `expo-file-system` + `expo-background-task` / `expo-task-manager` |
| Reader | Custom EPUB extraction (`jszip`) + plain-text pagination — **not** `@epubjs-react-native/core` |
| Lists | `@shopify/flash-list` |
| Images / blur | `expo-image`, `expo-blur`, `react-native-image-colors` |

Path alias: `@/*` → `src/*` (see `tsconfig.json`).

---

## Product & Data Model

### Source of truth (target)

Self-hosted OPDS (e.g. Calibre-Web), OPDS 1.2 Atom/XML. Basic Auth for private servers. KOReader sync for reading progress — **future, not implemented**.

### Anti-goals (do not add)

- PDF support
- Remote highlight / annotation sync
- OPDS directory / folder browsing (flat acquisition feeds only)
- Tailwind or CSS-in-JS libraries

### What exists today

- Generic OPDS 1.2 feed fetch + parse (public feeds work; **Basic Auth UI not built**)
- SQLite cache: `servers`, `books`, `downloads`, `reading_progress`
- Stale-while-revalidate catalog: TanStack Query fetch → upsert SQLite; on failure, serve cached books + `OfflineBanner`
- Local reading progress (page index + font size) in SQLite — no KOReader sync
- First launch shows onboarding — users connect their own OPDS catalog; two public Project Gutenberg feeds are also seeded for demo and library-switch testing
- Per-server Basic Auth: username in SQLite, password in `expo-secure-store`
- OPDS fetch, cover images, and downloads send Basic Auth headers when configured

---

## Project Structure

```text
src/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Library (single home screen)
│   ├── book/[id].tsx       # Detail (blur backdrop, dominant color)
│   ├── reader/[id].tsx     # Paginated reader
│   ├── settings.tsx        # OPDS server CRUD
├── components/             # BookCard, CloudDownloadButton, ProgressRing, …
├── db/                     # schema, migrations, queries, hooks
├── hooks/                  # useOPDSCatalog, useBackgroundDownload, useDominantColor
├── services/
│   ├── opds/               # parser, types
│   ├── downloads/          # queue + background task
│   └── reader/             # EPUB/text load + pagination
└── theme/                  # theme.ts, ThemeProvider
```

---

## UX Mechanics

| Interaction | Behavior |
|-------------|----------|
| Library home | Single grid — **All** / **On device** chips; search bar; genre chips from OPDS categories |
| Grid center tap | Navigate to `/book/[id]` detail |
| Cover progress | Thin bar on cover (Apple Books) + `42%` / `Finished` below (Kindle) |
| List footer | Book count, download/progress stats, server name at scroll end |
| Grid bottom-right cloud | Queue download; show progress ring while active |
| Detail view | Cover dominant color → `BlurBackdrop` gradient; Read button when downloaded |
| Catalog offline | `OfflineBanner`; undownloaded books dimmed (Apple Music pattern) |
| OPDS connect | URL + optional auth only; server title auto-derived from feed or hostname |
| Reader | Tap center toggles chrome; left/right zones paginate; font +/- in footer |

### Planned / not yet implemented

- Optional auto-launch last open book on app start

---

## Architecture Notes

### OPDS pipeline

1. `parser.ts` — fetches OPDS XML; **only entries with acquisition links become books** (navigation/category entries are skipped)
2. `catalog.ts` — resolves navigation roots (Calibre-Web `/opds`) to a flat book listing (e.g. `/opds/books/letter/00`)
3. `useOPDSCatalog` — paginated fetch + SQLite upsert; exposes `searchUrl` for OPDS search
4. Library — client filter + remote OPDS search; category chips from BISAC/tags on each book

### Download queue

- `enqueueDownload` → `processDownloadQueue` (max 2 concurrent)
- `task.ts` registers `expo-background-task` for background processing
- Files land in `Paths.document/books/{bookId}.{ext}`

### Reader

- EPUB: unzip via `jszip`, walk OPF spine, strip HTML to plain text, paginate by char count
- Plain text: direct file read
- Progress persisted via `upsertReadingProgress` (page index, not CFI)

---

## Development Phases

| Phase | Scope | Status |
|-------|-------|--------|
| Foundation | Expo Router, SQLite, theme, providers | Done |
| Data Layer | OPDS parser, TanStack Query, cache hooks | Done |
| UI Grid | FlashList catalog, BookCard dual-tap | Done |
| Queue Engine | Download queue, progress rings, background task | Done |
| Detail & Reader | Blur detail, custom EPUB reader | Done (basic); epubjs migration not started |

---

## Code Conventions

- **Minimal scope** — smallest correct diff; no drive-by refactors
- **Match existing patterns** — functional components, `@/` imports, `ThemedText`, `useTheme()`
- **No over-engineering** — no premature abstractions or one-line helpers
- **Strict TypeScript** — no `any`; reuse types from `src/db/schema.ts` and `src/services/opds/types.ts`
- **Dark-only UI** — pitch black `#000` background; use `theme.ts` tokens, not hardcoded colors (except legacy `#141414` placeholders)
- **Comments** — only for non-obvious business logic

### Database

- Migrations via `migrateDatabase` in `src/db/migrations.ts` (`PRAGMA user_version` via `schema_version` table)
- `PRAGMA busy_timeout = 5000` + migration mutex prevent lock errors on fast refresh / Strict Mode double-mount
- Access DB through `useSQLiteContext()` in components; `openDatabaseSync('verso.db')` only in background tasks (physical device)
- Foreground download processing must pass the provider `db` — never open a second connection in-app

---

## Do / Ask / Don't

### Always do

- Read Expo SDK 57 docs before adding or changing Expo APIs
- Use `pnpm` and existing scripts
- Style with `StyleSheet.create` + theme tokens
- Test typecheck: `pnpm exec tsc --noEmit`

### Ask first

- Adding new dependencies (especially reader libraries)
- Changing SQLite schema (requires migration bump)
- Auth / credential storage design
- Scope that touches anti-goals (PDF, highlights, directory browse)

### Never do

- Add Tailwind, NativeWind, or styled-components
- Use `@epubjs-react-native/core` without an explicit migration plan (current reader is custom)
- Commit secrets, `.env` credentials, or OPDS passwords
- Use `npm` / `yarn`
- Add class components
- Implement PDF reading
- Browse OPDS navigation feeds as folder trees
- Add web/browser support or `react-native-web`

---

## Self-Improvement

When a session reveals durable project knowledge, update this file before handoff. Prefer repo-local guidance over global `~/AGENTS.md`. Remove stale instructions — outdated rules harm agents more than missing ones.
