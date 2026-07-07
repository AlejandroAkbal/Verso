# Cover Ambiance Restyle — Design Spec

Date: 2026-07-07
Status: Approved (design), pending implementation plan
Scope: Library (home) + Reader + cross-cutting motion. Book detail deferred.

## 1. Goal

A "bolder restyle" design-polish pass that gives Verso a distinctive, premium feel:
**Apple Books calm as the base, Infuse-style dominant-color depth on top.** Every
surface should quietly carry the color of the book in focus — covers gain soft
depth, the library gains an ambient backdrop, and the reader is tinted by the
open book — without hurting scroll performance or accessibility.

Design read: native dark-only iOS/Android e-reader restyle, Apple Books × Infuse
language, built on Restyle/theme tokens + Reanimated + expo-blur + per-book
dominant color. This is a native app; web/Tailwind/Motion patterns do not apply.

## 2. Architecture — "Cover Ambiance" system (Approach A)

One shared system that every surface composes. No per-surface bespoke color code.

### 2.1 `useCoverColor(book)` — the color source
Returns `{ glow, ambient }` hex strings for a book.

- **Sync path (grids):** derive instantly from the book's stored `blurhash`
  (already persisted in SQLite for every book). No async, works offline, no
  schema change. This is what the library grid uses so scrolling never waits on
  async work.
- **Async upgrade (single-book surfaces):** where exactly one book is in focus
  (reader, the library ambient backdrop), use the existing
  `useDominantColor(cover_url, blurhash)` hook for a truer hue. One frame of
  async is acceptable there; `blurhash` color is the immediate fallback.
- **Optional stretch (NOT required this pass):** cache the async-extracted hex in
  a new `books.dominant_color` column to upgrade grid glows too. Only pursue if
  blurhash-derived glows look too muddy in practice. Requires a `SCHEMA_VERSION`
  bump.

`glow` = a slightly saturated tint for shadows/edges. `ambient` = a darker,
desaturated wash that fades into `theme.colors.background`. Derivation rules live
in one place so the whole app's "feel" is tunable from a single module.

### 2.2 `<CoverAmbiance>` — the ambient layer
Generalize the existing `src/components/BlurBackdrop.tsx` (currently used on book
detail) into a reusable positioned ambient layer: a dominant-color wash
(radial/linear) fading into the background. Props: `color`, `intensity`,
optional `style`. Honors reduce-transparency by falling back to a flat low-alpha
tint (no blur). Exactly one instance renders per screen.

## 3. Surface: Library (home)

- **Single ambient backdrop** behind the FlashList, driven by the **last-read
  book** (fallback: first book in the grid). Cross-fades (Reanimated `withTiming`
  opacity) when the driving book changes. Sits above `background`, below the
  list. One blur layer for the whole screen — never one per card.
- **Cover-forward cards:** increase cover size and give each cover a softer,
  larger shadow whose `shadowColor` is that card's blurhash-derived `glow`
  (Books-style depth, per-card, **shadow-only — no blur**). Extend the central
  `src/lib/coverStyle.ts` `coverFrameStyle(theme)` to accept an optional glow
  tint so every cover stays consistent and there is one place to tune depth.
- **Header** floats over the ambient with a blur; the existing collapsing search
  behavior is preserved. Progress footer band + NEW badge get minor contrast
  tuning so they read cleanly over the new backdrop.

## 4. Surface: Reader

- **Chrome tint:** `ReaderChrome` top and bottom bars pick up the open book's
  dominant color as a translucent tint over blur (Infuse depth), kept minimal
  (Books calm). Sourced from `useCoverColor` (async path) for the open book.
- **Color-continuity open:** on reader mount, a brief ambient wash in the book's
  color so entering a book feels continuous rather than a hard cut. Uses the
  existing `fullScreenModal` presentation; the wash fades out as Readium paints.
- **Light hierarchy tidy** of `ReaderChrome`: top = back · title · TOC · settings;
  bottom = chapter + percent. No structural rewrite — just clarity and the tint.

## 5. Cross-cutting: Motion & micro-interactions

Each animation must justify itself in one sentence:

- **Cover press** (feedback): scale-down + spring on tap, library + detail.
  Reanimated shared values, not React state.
- **List entrance** (hierarchy): keep/refine the existing `FadeIn` stagger on
  first library load.
- **Reader open** (state transition): the color-continuity wash above.
- **Haptics:** audit and ensure light impact on cover tap and selection feedback
  on filter changes (reuse `src/lib/haptics.ts`).
- **TOC / settings modals:** already native router modals — no change.

## 6. Taste guardrails (execution bar)

- **Anti-default / no AI glow:** depth comes only from a book's own dominant
  color. No purple/neon/generic gradients. One color identity per screen, locked.
- **Motion motivated:** no infinite loops, no motion-for-show; every animation
  maps to feedback / hierarchy / state-transition.
- **Accessibility (mandatory):** respect `AccessibilityInfo` reduce-motion
  (opacity fallbacks, no springs) and reduce-transparency (solid tints, no blur)
  on every surface.
- **Dark-mode lock:** app is dark-only; off-black surfaces, never pure `#000`.
- **Consistency:** one corner-radius scale; shadows tinted to the glow color, not
  pure black; any user-facing copy is plain with **zero em-dashes**.

## 7. Performance guardrails

- Exactly **one** blurred ambient layer per screen. Card glows are shadow-only.
- Grid color is sync (blurhash) — no async work during scroll.
- Animate transform/opacity only; Reanimated worklets off the JS thread.
- Profile library scroll (release build) before/after; target sustained 60fps.

## 8. Boundaries / non-goals

- No book-detail restyle this pass (separate follow-up).
- No schema migration required (`books.dominant_color` cache is an optional
  stretch only).
- No new dependencies — `react-native-reanimated`, `expo-image`, `expo-blur`,
  dominant-color hook, and `BlurBackdrop` already exist.
- No changes to data flow, routing, or the download/sync/reader engines.

## 9. Components & files (anticipated)

New / generalized:
- `src/hooks/useCoverColor.ts` — the `{ glow, ambient }` source (new).
- `src/components/CoverAmbiance.tsx` — generalized from `BlurBackdrop.tsx`.

Touched:
- `src/lib/coverStyle.ts` — `coverFrameStyle` gains an optional glow tint.
- `src/components/BookCard.tsx` — larger cover + glow shadow.
- `src/app/(tabs)/index.tsx` (+ `LibraryHeader`) — mount the single ambient
  backdrop, drive it from last-read book.
- `src/components/reader/ReaderChrome.tsx` — color tint + hierarchy tidy.
- `src/app/reader/[id].tsx` — color-continuity open wash.
- `src/lib/haptics.ts` consumers — audit press/selection haptics.

Each unit has one job and a clear interface: `useCoverColor` (data),
`CoverAmbiance` (presentation), `coverFrameStyle` (shared cover chrome). They can
be understood and tuned independently.

## 10. Success criteria

- Library and reader visibly carry each book's color; covers show soft depth.
- Reader open feels continuous (no hard cut).
- Library grid holds 60fps scroll on a release build.
- Reduce-motion and reduce-transparency are honored on every animated/blurred
  surface.
- `pnpm typecheck` and `pnpm lint` green; Maestro iOS smokes still pass.
- No em-dashes in any user-facing string; one accent identity per screen.

## 11. Open questions (resolve during planning)

- Exact `glow`/`ambient` derivation from blurhash (saturation/lightness targets)
  — tune against real covers.
- Whether the reader color-continuity wash is worth a shared-element-style
  transition from the cover, or a simple mount wash is enough (start simple).
