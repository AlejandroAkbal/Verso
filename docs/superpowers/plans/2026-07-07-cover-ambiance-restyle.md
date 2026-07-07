# Cover Ambiance Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Verso Apple-Books calm + Infuse dominant-color depth across the Library and Reader, driven by each book's own color, without hurting scroll performance or accessibility.

**Architecture:** One shared color system — `useCoverColor` (sync from `blurhash` for grids, async dominant color for single-book surfaces) feeds a generalized `CoverAmbiance` background layer, per-card glow shadows, a single library ambient backdrop, a color-tinted reader chrome, and a color-continuity reader-open wash. No data-flow, routing, or engine changes.

**Tech Stack:** Expo SDK 57, React Native, Restyle (`@/components/ui`), `react-native-reanimated` 4.5, `expo-blur`, `expo-image`, `react-native-image-colors`, `expo-haptics`. Dark-only.

## Global Constraints

- **Testing is E2E-only** (Maestro). No unit/component test harness. Per-task verification = `pnpm typecheck` → `pnpm lint` → (where feasible) `pnpm e2e:ios` smoke → on-device visual check.
- **`pnpm` only.** Never `npm`/`yarn`. Commands: `pnpm typecheck`, `pnpm lint`, `pnpm e2e:ios`.
- **Dependencies:** prefer what's already installed, but a new dependency is allowed when it clearly earns its place and won't burden the project later — favor first-party Expo modules (config-plugin-free, SDK-versioned) over heavy/abandoned packages. This plan needs none, but `expo-linear-gradient` is a sanctioned option for the ambient fade if the blurred-cover approach looks off (see Task 2).
- **No schema migration.** `books.dominant_color` cache is out of scope.
- **Dark-only.** Off-black surfaces; never pure `#000`. One accent identity per screen.
- **Accessibility (mandatory):** honor reduce-motion (no springs/parallax → opacity or static) and reduce-transparency (no blur → solid tint) on every animated/blurred surface.
- **Copy:** any user-facing string is plain; **zero em-dashes** (`—`/`–`). No new i18n keys are required by this plan; if one is added it must be added to all 5 locales (`en/es/zh/hi/ar`).
- **Imports:** use `@/` alias. Restyle primitives from `@/components/ui`. Theme via `useTheme()` / `@/theme/theme`.
- **Book detail is deferred** — do not modify `src/app/book/[id].tsx` or `src/components/BlurBackdrop.tsx`.
- **Minimal diff.** Follow existing patterns (see `BookCard.tsx`, `ReaderChrome.tsx` for the Reanimated idiom already in use).
- Spec: `docs/superpowers/specs/2026-07-07-cover-ambiance-restyle-design.md`.

---

### Task 1: `useCoverColor` — the shared color source

**Files:**
- Create: `src/hooks/useCoverColor.ts`

**Interfaces:**
- Consumes: `useDominantColor(imageUrl?: string, blurhash?: string)` from `@/hooks/useDominantColor` (returns `{ dominant: string; background: string; detail: string }`).
- Produces:
  - `type CoverColors = { glow: string; ambient: string }`
  - `coverColorFromBlurhash(blurhash?: string): CoverColors` — **sync**, offline, for grids.
  - `useCoverColor(imageUrl?: string, blurhash?: string): CoverColors` — async upgrade for single-book surfaces.

- [ ] **Step 1: Create the module**

Create `src/hooks/useCoverColor.ts`:

```ts
import { useMemo } from 'react';

import { useDominantColor } from '@/hooks/useDominantColor';

export type CoverColors = {
  /** Saturated tint for shadow/edge glow. */
  glow: string;
  /** Darker, desaturated wash that blends into the near-black background. */
  ambient: string;
};

/** Deterministic hue (0-359) from any string. Mirrors useDominantColor's hash. */
function hueFromString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/** Saturation kept under 80% per the taste guardrail (no neon glow). */
function colorsFromHue(hue: number): CoverColors {
  return {
    glow: `hsl(${hue}, 55%, 45%)`,
    ambient: `hsl(${hue}, 40%, 22%)`,
  };
}

/** Sync color for grid cells — derived from the stored blurhash, no async work. */
export function coverColorFromBlurhash(blurhash?: string): CoverColors {
  return colorsFromHue(hueFromString(blurhash ?? ''));
}

/** Truer color for single-book surfaces (reader, ambient backdrop). */
export function useCoverColor(imageUrl?: string, blurhash?: string): CoverColors {
  const colors = useDominantColor(imageUrl, blurhash);
  return useMemo(
    () => ({ glow: colors.dominant, ambient: colors.background }),
    [colors.dominant, colors.background],
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `TypeScript: No errors found` and `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCoverColor.ts
git commit -m "feat(ui): add useCoverColor shared color source (blurhash sync + dominant async)"
```

---

### Task 2: `CoverAmbiance` — the ambient background layer

**Files:**
- Create: `src/components/CoverAmbiance.tsx`
- Create: `src/hooks/useReduceTransparency.ts`

**Interfaces:**
- Consumes: `Box`, `ImageBox` from `@/components/ui`; `BlurView` from `expo-blur`.
- Produces:
  - `useReduceTransparency(): boolean` (from `@/hooks/useReduceTransparency`).
  - `<CoverAmbiance color imageUrl? imageHeaders? intensity? style? />` (from `@/components/CoverAmbiance`) — an absolute-fill background layer. With `imageUrl`, renders a heavily-blurred cover tinted by `color`; without it, a flat `color` wash. Honors reduce-transparency (drops blur, solid tint). Note: this is a background layer only (no children) — it does not replace `BlurBackdrop`, which book detail keeps using.

> **Design note:** the blurred-cover backdrop is dependency-free and reads as authentic Infuse-style depth, so it's the default here. If a cleaner top-to-bottom fade is wanted instead, `expo-linear-gradient` (first-party Expo module) is a sanctioned addition — `pnpm add expo-linear-gradient`, then a rebuild of the dev client. Don't add it preemptively; only if the blurred cover looks off in practice.

- [ ] **Step 1: Create the reduce-transparency hook**

Create `src/hooks/useReduceTransparency.ts`:

```ts
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the OS "Reduce Transparency" setting is on (iOS). Android: always false. */
export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (mounted) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduce,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
```

- [ ] **Step 2: Create the CoverAmbiance component**

Create `src/components/CoverAmbiance.tsx`:

```tsx
import { BlurView } from 'expo-blur';
import type { ViewStyle } from 'react-native';

import { Box, ImageBox } from '@/components/ui';
import { useReduceTransparency } from '@/hooks/useReduceTransparency';

type CoverAmbianceProps = {
  /** Ambient tint color (e.g. CoverColors.ambient). */
  color: string;
  /** Optional cover image to blur behind the tint for organic depth. */
  imageUrl?: string;
  imageHeaders?: Record<string, string>;
  /** Blur strength when transparency is allowed. Default 60. */
  intensity?: number;
  style?: ViewStyle;
};

/**
 * Absolute-fill ambient background layer. With an image, renders a heavily
 * blurred cover tinted by `color` (Infuse-style depth). Without one, a flat
 * `color` wash. Under Reduce Transparency, drops the blur for a solid tint.
 */
export function CoverAmbiance({
  color,
  imageUrl,
  imageHeaders,
  intensity = 60,
  style,
}: CoverAmbianceProps) {
  const reduceTransparency = useReduceTransparency();
  const fill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

  if (reduceTransparency || !imageUrl) {
    return (
      <Box
        pointerEvents="none"
        style={[fill, { backgroundColor: color, opacity: 0.18 }, style]}
      />
    );
  }

  return (
    <Box pointerEvents="none" style={[fill, style]}>
      <ImageBox
        source={{ uri: imageUrl, headers: imageHeaders }}
        style={fill}
        contentFit="cover"
        blurRadius={40}
      />
      <Box style={[fill, { backgroundColor: color, opacity: 0.5 }]} />
      <BlurView intensity={intensity} tint="dark" style={fill} />
    </Box>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `TypeScript: No errors found` and `0 errors`.

- [ ] **Step 4: Commit**

```bash
git add src/components/CoverAmbiance.tsx src/hooks/useReduceTransparency.ts
git commit -m "feat(ui): add CoverAmbiance background layer + useReduceTransparency"
```

---

### Task 3: Per-card cover glow (Library depth)

**Files:**
- Modify: `src/lib/coverStyle.ts`
- Modify: `src/components/BookCard.tsx:62-119`

**Interfaces:**
- Consumes: `coverColorFromBlurhash` (Task 1).
- Produces: `coverGlowStyle(glow: string)` exported from `@/lib/coverStyle` — a shadow-only style tinted to the glow color, applied to a wrapper that is NOT `overflow:hidden`.

- [ ] **Step 1: Add the glow style helper**

In `src/lib/coverStyle.ts`, add below `coverShadowStyle`:

```ts
/** Soft, book-colored depth glow for grid covers (shadow only — no blur layer). */
export function coverGlowStyle(glow: string) {
  return {
    shadowColor: glow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  } as const;
}
```

- [ ] **Step 2: Apply the glow in BookCard**

In `src/components/BookCard.tsx`:

Add imports near the existing `coverFrameStyle` import (line 6):

```tsx
import { coverFrameStyle, coverGlowStyle } from '@/lib/coverStyle';
import { coverColorFromBlurhash } from '@/hooks/useCoverColor';
```

After `const frameStyle = coverFrameStyle(theme);` (line 62) add:

```tsx
const glowStyle = coverGlowStyle(coverColorFromBlurhash(book.blurhash));
```

Wrap the existing jacket Box (the `<Box overflow="hidden" width={width} style={frameStyle}>` block at lines 84-119) in a glow-carrying wrapper. Replace the opening tag at line 84:

```tsx
      {/* Jacket image */}
      <Box overflow="hidden" width={width} style={frameStyle}>
```

with:

```tsx
      {/* Jacket image — outer wrapper carries the color glow (no overflow clip) */}
      <Box width={width} style={glowStyle}>
      <Box overflow="hidden" width={width} style={frameStyle}>
```

And add one closing `</Box>` after the jacket block's existing closing `</Box>` (the one on line 119, before the `{/* Below-cover progress */}` comment):

```tsx
      </Box>
      </Box>

      {/* Below-cover progress — fixed height container ensures grid cells are uniform */}
```

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `TypeScript: No errors found` and `0 errors`.

- [ ] **Step 4: On-device visual check**

Start Metro (`pnpm start`) and run the app (`pnpm run:ios` if not already installed). Open the Library. Expected: each cover shows a soft, colored shadow tinted toward that book's color; grid cells stay uniform height; scrolling stays smooth.

- [ ] **Step 5: Commit**

```bash
git add src/lib/coverStyle.ts src/components/BookCard.tsx
git commit -m "feat(library): per-cover color glow via coverGlowStyle"
```

---

### Task 4: Library ambient backdrop (single, last-read-driven)

**Files:**
- Modify: `src/app/(tabs)/index.tsx:253-261`

**Interfaces:**
- Consumes: `CoverAmbiance` (Task 2), `useCoverColor` (Task 1), `useServerAuthHeaders` (existing), `progressByBookId` (already in this screen).
- Produces: nothing downstream.

- [ ] **Step 1: Add imports**

In `src/app/(tabs)/index.tsx`, add:

```tsx
import { CoverAmbiance } from '@/components/CoverAmbiance';
import { useCoverColor } from '@/hooks/useCoverColor';
import { useServerAuthHeaders } from '@/hooks/useServerAuthHeaders';
```

- [ ] **Step 2: Derive the last-read book**

After the `libraryStats` `useMemo` block (ends line 135) add:

```tsx
  const ambientBook = useMemo(() => {
    let latest: BookRow | undefined;
    let latestAt = 0;
    for (const book of catalogBooks) {
      const at = progressByBookId.get(book.id)?.updated_at ?? 0;
      if (at > latestAt) {
        latestAt = at;
        latest = book;
      }
    }
    return latest ?? catalogBooks[0];
  }, [catalogBooks, progressByBookId]);

  const ambientHeaders = useServerAuthHeaders(ambientBook?.server_id);
  const ambientColors = useCoverColor(ambientBook?.cover_url, ambientBook?.blurhash);
```

- [ ] **Step 3: Mount the backdrop behind the list**

In the main `return` (line 253), insert `CoverAmbiance` as the first child of the root Box, before `<LibraryHeader ...>`:

```tsx
  return (
    <Box flex={1} backgroundColor="background">
      {ambientBook ? (
        <CoverAmbiance
          color={ambientColors.ambient}
          imageUrl={ambientBook.cover_url}
          imageHeaders={
            Object.keys(ambientHeaders).length > 0 ? ambientHeaders : undefined
          }
        />
      ) : null}

      <LibraryHeader
```

- [ ] **Step 4: Make the list transparent so the backdrop shows**

The `FlashList` has `style={{ flex: 1 }}` (line 274). Change it to keep its background clear:

```tsx
          style={{ flex: 1, backgroundColor: 'transparent' }}
```

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `TypeScript: No errors found` and `0 errors`.

- [ ] **Step 6: Library Maestro smoke + visual check**

Run: `pnpm e2e:ios` (Metro must be running; a simulator booted).
Expected: `library-smoke` passes (Library still renders). Visually: a soft color wash sits behind the grid, tinted toward the last-read book; it does not wash out cover or text contrast.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(tabs)/index.tsx"
git commit -m "feat(library): single ambient backdrop driven by last-read book"
```

---

### Task 5: Cover press feedback (scale + haptic)

**Files:**
- Modify: `src/components/BookCard.tsx:1-1,86-107`

**Interfaces:**
- Consumes: `react-native-reanimated` (`useSharedValue`, `useAnimatedStyle`, `withTiming`, `useReducedMotion`), `lightImpactHaptic` from `@/lib/haptics`.
- Produces: nothing downstream.

- [ ] **Step 1: Extend the reanimated import**

In `src/components/BookCard.tsx`, change line 1:

```tsx
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
```

to:

```tsx
import Animated, {
  FadeInDown,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
```

Add the haptic import near line 15 (`useTheme` import group):

```tsx
import { lightImpactHaptic } from '@/lib/haptics';
```

- [ ] **Step 2: Add the press-scale value**

After `const glowStyle = coverGlowStyle(...)` (added in Task 3) add:

```tsx
  const reduceMotion = useReducedMotion();
  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
```

- [ ] **Step 3: Wrap the pressable in an animated view and wire press**

Replace the existing `PressableBox` cover block (lines 86-107) so the image scales on press. Change:

```tsx
          <PressableBox
            position="absolute"
            top={0}
            right={0}
            bottom={0}
            left={0}
            onPress={() => router.push(`/book/${book.id}`)}
          >
            <ImageBox
              key={coverKey}
              source={{
                uri: book.cover_url,
                headers: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
              }}
              width="100%"
              height="100%"
              backgroundColor="surfaceElevated"
              contentFit="cover"
              placeholder={book.blurhash ? { blurhash: book.blurhash } : undefined}
              transition={200}
            />
          </PressableBox>
```

to:

```tsx
          <PressableBox
            position="absolute"
            top={0}
            right={0}
            bottom={0}
            left={0}
            onPressIn={() => {
              if (!reduceMotion) pressScale.value = withTiming(0.97, { duration: 90 });
            }}
            onPressOut={() => {
              pressScale.value = withTiming(1, { duration: 140 });
            }}
            onPress={() => {
              void lightImpactHaptic();
              router.push(`/book/${book.id}`);
            }}
          >
            <Animated.View style={[{ width: '100%', height: '100%' }, pressStyle]}>
              <ImageBox
                key={coverKey}
                source={{
                  uri: book.cover_url,
                  headers: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
                }}
                width="100%"
                height="100%"
                backgroundColor="surfaceElevated"
                contentFit="cover"
                placeholder={book.blurhash ? { blurhash: book.blurhash } : undefined}
                transition={200}
              />
            </Animated.View>
          </PressableBox>
```

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `TypeScript: No errors found` and `0 errors`.

- [ ] **Step 5: Maestro book-detail smoke + visual check**

Run: `pnpm e2e:ios` (Metro + simulator running).
Expected: `book-detail` flow still passes (tap cover → detail opens). Visually: cover dips slightly on press-in and springs back on release; a light haptic fires on tap. With Reduce Motion on, no scale (tap still navigates).

- [ ] **Step 6: Commit**

```bash
git add src/components/BookCard.tsx
git commit -m "feat(library): cover press scale + haptic (reduce-motion aware)"
```

---

### Task 6: Reader chrome color tint

**Files:**
- Modify: `src/components/reader/ReaderChrome.tsx:21-30,64-76,109-110`
- Modify: `src/app/reader/[id].tsx:54-57,138-147`

**Interfaces:**
- Consumes: `useCoverColor` (Task 1); `useReaderSession` already exposes the book (see below).
- Produces: `ReaderChrome` gains an optional `tintColor?: string` prop.

- [ ] **Step 1: Add the tintColor prop to ReaderChrome**

In `src/components/reader/ReaderChrome.tsx`, add `tintColor` to `ReaderChromeProps` (after `percent`, line 23):

```tsx
type ReaderChromeProps = {
  title: string;
  percent: number | null;
  tintColor?: string;
  visible: boolean;
```

Destructure it in the component signature (after `percent,` line 34):

```tsx
export function ReaderChrome({
  title,
  percent,
  tintColor,
  visible,
```

- [ ] **Step 2: Render the tint over the chrome background**

In the `chromeBackground` block (lines 64-76), the iOS branch returns a `BlurView`. Add a tint Box over it. Change the whole `chromeBackground` definition to:

```tsx
  const chromeBackground =
    Platform.OS === 'ios' ? (
      <>
        <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
        {tintColor ? (
          <Box style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, opacity: 0.22 }]} />
        ) : null}
      </>
    ) : (
      <Box
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        style={tintColor ? { backgroundColor: tintColor, opacity: 0.4 } : undefined}
        backgroundColor={tintColor ? undefined : 'overlay'}
      />
    );
```

- [ ] **Step 3: Pass the open book's color from the reader screen**

In `src/app/reader/[id].tsx`, `useReaderSession` returns `title` and `file`. Add the book's color. First check that `useReaderSession` exposes `blurhash`/`cover_url`; it currently returns `{ loading, error, title, file, progression, setProgression, tableOfContents, setTableOfContents }`. Add a `coverUrl` + `blurhash` passthrough:

In `src/hooks/useReaderSession.ts`, add state near the other `useState` calls (after line 39 `tableOfContents`):

```tsx
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [blurhash, setBlurhash] = useState<string | undefined>(undefined);
```

Inside `openWithLocalProgress`, after `setTitle(book.title);` set them:

```tsx
          setCoverUrl(book.cover_url || undefined);
          setBlurhash(book.blurhash || undefined);
```

Add both to the returned object:

```tsx
  return {
    loading,
    error,
    title,
    coverUrl,
    blurhash,
    file,
    progression,
    setProgression,
    tableOfContents,
    setTableOfContents,
  };
```

- [ ] **Step 4: Wire the tint in the reader screen**

In `src/app/reader/[id].tsx`, add the import:

```tsx
import { useCoverColor } from '@/hooks/useCoverColor';
```

Destructure `coverUrl` and `blurhash` from `useReaderSession` (line 43-52 block) and compute the color after that block:

```tsx
  const { loading, error, title, coverUrl, blurhash, file, progression, setProgression, tableOfContents, setTableOfContents } = useReaderSession(id);

  const chromeColors = useCoverColor(coverUrl, blurhash);
```

Pass it to `ReaderChrome` (line 138-147), adding one prop:

```tsx
      <ReaderChrome
        title={title}
        percent={percent}
        tintColor={chromeColors.ambient}
        visible={chromeVisible}
```

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `TypeScript: No errors found` and `0 errors`.

- [ ] **Step 6: Maestro reader-open smoke + visual check**

Run: `pnpm e2e:ios` (Metro + simulator running).
Expected: `reader-open` flow still passes. Visually: the reader top chrome carries a subtle tint from the open book's color over the blur; text stays legible.

- [ ] **Step 7: Commit**

```bash
git add src/components/reader/ReaderChrome.tsx src/app/reader/[id].tsx src/hooks/useReaderSession.ts
git commit -m "feat(reader): tint chrome with the open book's color"
```

---

### Task 7: Reader color-continuity open wash

**Files:**
- Modify: `src/app/reader/[id].tsx:1-3,123-136`

**Interfaces:**
- Consumes: `react-native-reanimated` (`useSharedValue`, `useAnimatedStyle`, `withTiming`, `runOnJS`, `Easing`, `useReducedMotion`), `chromeColors` (Task 6).
- Produces: nothing downstream.

- [ ] **Step 1: Add reanimated imports**

In `src/app/reader/[id].tsx`, add after the existing imports:

```tsx
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
```

- [ ] **Step 2: Drive a mount wash that fades out**

After `const chromeColors = useCoverColor(coverUrl, blurhash);` (Task 6) add:

```tsx
  const reduceMotion = useReducedMotion();
  const washOpacity = useSharedValue(reduceMotion ? 0 : 1);
  const washStyle = useAnimatedStyle(() => ({ opacity: washOpacity.value }));

  const startWashFade = useCallback(() => {
    washOpacity.value = withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [washOpacity]);
```

- [ ] **Step 3: Trigger the fade when Readium is ready**

The `ReadiumView` already has `onPublicationReady`. In the JSX (line 131-134), extend it to start the fade:

```tsx
          onPublicationReady={(event) => {
            setTableOfContents(event.tableOfContents);
            setPositionCount(event.positions.length);
            startWashFade();
          }}
```

- [ ] **Step 4: Render the wash overlay**

Inside the outer `return`'s root `<Box flex={1} backgroundColor="background" testID="reader-screen">` (line 124), add the wash as the LAST child of that Box (after `ReaderTocModal`, before the closing `</Box>` on line 166), so it sits above Readium but below nothing important during the brief fade:

```tsx
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: chromeColors.ambient },
          washStyle,
        ]}
      />
    </Box>
  );
```

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `TypeScript: No errors found` and `0 errors`.

- [ ] **Step 6: Maestro reader-open smoke + visual check**

Run: `pnpm e2e:ios` (Metro + simulator running).
Expected: `reader-open` still passes (the wash is `pointerEvents="none"` and fades out, so taps and the back button work). Visually: opening a book briefly shows its color, which dissolves as the page paints. With Reduce Motion on, the wash starts at opacity 0 (no flash).

- [ ] **Step 7: Commit**

```bash
git add src/app/reader/[id].tsx
git commit -m "feat(reader): color-continuity wash on book open (reduce-motion aware)"
```

---

### Task 8: Full verification + accessibility sweep

**Files:**
- No source changes expected. This task is the integration gate.

**Interfaces:**
- Consumes: everything above.
- Produces: a verified, green build.

- [ ] **Step 1: Full typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `TypeScript: No errors found`; lint `0 errors` (one pre-existing warning in `src/i18n/index.ts` is acceptable).

- [ ] **Step 2: i18n parity (only if any key was added)**

If no i18n key was added during this plan, skip. Otherwise verify all 5 locales carry the new key(s) — `en/es/zh/hi/ar` must match with zero drift.

- [ ] **Step 3: Full Maestro iOS suite**

Run: `pnpm e2e:ios` (Metro + simulator running).
Expected: all flows pass (`library-smoke`, `settings-smoke`, `koreader-settings`, `book-detail`, `download-book`, `reader-open`).

- [ ] **Step 4: Accessibility pass (manual, on-device)**

In iOS Simulator Settings → Accessibility:
- Turn **Reduce Motion** ON: library cover press does not scale; reader-open wash does not flash; navigation still works.
- Turn **Reduce Transparency** ON: the library ambient backdrop renders as a flat tint (no blurred cover); the app stays legible.
Expected: both settings degrade gracefully; no visual breakage.

- [ ] **Step 5: Performance check (manual, on-device)**

Scroll the Library grid quickly on a device/simulator. Expected: sustained smooth scroll (no stutter from the single ambient layer; card glows are shadow-only). If any jank, reduce `CoverAmbiance` blur `intensity` and re-check.

- [ ] **Step 6: Update the backlog**

In `TODO.md`, mark the design-polish item done:

```markdown
- [x] Design-polish pass (Cover Ambiance restyle): per-book dominant-color depth across Library + Reader — cover glows, single ambient backdrop, tinted reader chrome, color-continuity open, press feedback. Reduce-motion/transparency honored.
```

- [ ] **Step 7: Commit + push**

```bash
git add TODO.md
git commit -m "docs: mark design-polish (cover ambiance) done"
git push
```

---

## Self-Review

**Spec coverage:**
- Spec §2.1 `useCoverColor` (sync + async) → Task 1. ✓
- Spec §2.2 `CoverAmbiance` (generalized, reduce-transparency) → Task 2. ✓
- Spec §3 Library ambient backdrop (last-read) + cover glow → Tasks 3, 4. ✓
- Spec §4 Reader chrome tint + color-continuity open → Tasks 6, 7. ✓
- Spec §5 Motion (cover press, haptics; list stagger already exists; TOC/settings unchanged) → Task 5. ✓
- Spec §6 Taste guardrails (per-book color, motivated motion, dark lock, no em-dash) → enforced in Global Constraints + each task. ✓
- Spec §7 Perf (one blur layer, shadow-only glows, sync grid color) → Tasks 3/4 + Task 8 Step 5. ✓
- Spec §6/§10 a11y (reduce-motion, reduce-transparency) → Tasks 2, 5, 7 + Task 8 Step 4. ✓
- Spec §8 boundaries (no book-detail, no schema, no deps) → Global Constraints; `BlurBackdrop`/book-detail untouched. ✓
- Spec §11 open questions (glow/ambient math; wash vs shared-element) → resolved concretely: `hsl` targets in Task 1; simple mount wash in Task 7 (shared-element not pursued). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `CoverColors { glow, ambient }` defined in Task 1 and consumed as `.glow`/`.ambient` in Tasks 3/4/6/7. `coverColorFromBlurhash` (sync) used in Task 3; `useCoverColor` (hook) used in Tasks 4/6/7. `coverGlowStyle(glow)` defined Task 3, used same task. `ReaderChrome` `tintColor?` defined Task 6 and passed Task 6. `useReaderSession` return extended with `coverUrl`/`blurhash` in Task 6 and consumed same task. ✓

**Note on `book/[id].tsx` press scale:** Task 5 Step 5 references the `book-detail` Maestro flow (tap cover → detail). The press-scale change is in `BookCard` (library), which is what that flow exercises; book detail screen itself is untouched, honoring the deferral.
