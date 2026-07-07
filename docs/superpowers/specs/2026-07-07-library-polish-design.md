# Library Design Polish

Six targeted visual refinements to elevate the library screen from functional to premium. Inspired by Infuse, Apple Music, and Apple Books.

## Goals

- Covers feel dominant and edge-to-edge
- Scroll behaviour feels fluid, not abrupt
- Chips and filter sheet feel crisp and intentional
- Cards have subtle life on entrance
- No new dependencies; no architectural changes

---

## Changes

### 1. Progress band → cover overlay

**Current:** A separate below-cover strip in `BookProgressFooterBand` adds visual bulk; sits outside the cover frame.

**Target:** Move the progress bar to a translucent overlay pinned to the bottom-inside of the cover image. White semi-opaque fill on top of the art; percentage text in white. Mirrors Apple Books' treatment.

**Files:** `src/components/BookProgressFooterBand.tsx`, `src/components/BookCard.tsx`

**Details:**
- Height: 3px track, flush to cover bottom edge (inside `overflow: hidden` box)
- Percentage text caption is removed from below-cover position and shown as small text inside the overlay strip on the right
- `BookFinishedFooterBand` similarly becomes a translucent bottom strip with a checkmark symbol instead of progress bar
- `isFinished` opacity dimming stays (`theme.opacity.finished = 0.42`)

### 2. Sticky header blur backdrop

**Current:** Header is a solid `background` colour box; content scrolls behind it with no depth cue.

**Target:** Wrap header content in `BlurView` (expo-blur, already a dep via `BlurBackdrop.tsx`). `tint="dark"`, `intensity=60`. Adds depth, feels native iOS.

**Files:** `src/components/library/LibraryHeader.tsx`

**Details:**
- Replace outer `Box` with `BlurView` as the outermost wrapper; keep all internal layout unchanged
- Add a hairline 1px bottom border (`separator` colour) to visually anchor the header
- The header already has `position: sticky` behaviour because it's outside the `FlashList`; this change just makes the blur fill that sticky area

### 3. Filter chip sizing & selected state

**Current:** Chips use text-weight change only for selected; height varies by content; look slightly flat.

**Target:** Fixed 34px height; `accentMuted` background on selected; slightly smaller font (13px → 13px unchanged) but tighter horizontal padding.

**Files:** `src/components/FilterChip.tsx`

**Details:**
- `height: 34`, `paddingHorizontal: 14`
- Selected: `backgroundColor: accentMuted`, `color: text` (white)
- Unselected: `backgroundColor: surfaceElevated`, `color: textSecondary`
- `borderRadius: full` (already done via Restyle)
- Remove the border-based selected indicator in favour of fill

### 4. Filter sheet — accent indicator on selected sort row

**Current:** Selected sort row (`Reading Progress`) uses `surfaceElevated` background — nearly invisible difference on OLED black.

**Target:** Remove the background diff; add a 3px left-edge accent bar coloured `primary` (white). Row text becomes `text` weight 600; unselected rows are `textSecondary`.

**Files:** `src/components/library/LibrarySortFilterSheet.tsx`

**Details:**
- `position: absolute`, `left: 0`, `top: 8`, `bottom: 8`, `width: 3`, `backgroundColor: primary`, `borderRadius: 2` inside the row
- Row `backgroundColor` always `undefined` (let list bg show through)
- Dividers stay as 0.5px `separator` lines

### 5. List header vertical rhythm

**Current:** Search bar and filter chips have stacked padding from two different components summing to ~28px gap below the title.

**Target:** Tighten to ~16px total gap. Achieved by:
- `paddingTop: 0` on `LibraryFilterBar` (remove `paddingTop: xs`)
- Reduce `paddingBottom` on the list header wrapper from 12 to 8px

**Files:** `src/components/library/LibraryFilterBar.tsx`, `src/app/(tabs)/index.tsx`

### 6. Book card stagger entrance animation

**Current:** Cards render flat with no entrance.

**Target:** Each `BookCard` fades in from 8px below using `FadeInDown` (react-native-reanimated) with a staggered delay of `Math.min(index * 18, 200)ms`. Only fires on initial mount, not on re-renders.

**Files:** `src/components/BookCard.tsx`, `src/app/(tabs)/index.tsx`

**Details:**
- Wrap outer `Box` in `Animated.View` with `entering={FadeInDown.delay(delay).duration(220).springify()}`
- Pass `index` prop into `BookCard` from the `renderItem` callback
- Guard with `if (index > 20) return null` for the delay (no animation on deep-scroll items)

---

## Verification Plan

1. `rtk tsc` — no type errors
2. `rtk lint` — 0 errors
3. Maestro screenshot check: library grid, filter sheet
4. Manual: scroll library, open sort sheet, check chip states
