# Bionic Reading — Research (Premium)

Status: **Future Premium feature** — not implemented.

## What it is

Bionic Reading bolds the first few letters of each word to guide the eye, claiming faster reading with less fatigue. It is a trademarked method; any product feature needs a licensing/compliance review before ship.

## Readium feasibility

`react-native-readium` renders EPUB HTML/CSS in native WebViews (Readium toolkit). Options:

| Approach | Feasibility | Notes |
|----------|-------------|-------|
| CSS `font-weight` on first letters | Poor | No standard CSS for per-word partial bold without injecting spans |
| HTML injection / post-process spine | Medium | Transform XHTML before render — heavy, breaks publisher CSS, updates on font change |
| Readium `preferences` / user settings | Low today | No bionic toggle in Readium RN v5 RC |
| Custom Nitro native text pipeline | High effort | Abandon HTML layout — not acceptable |

**Conclusion:** True Bionic Reading in reflowable EPUB requires **content transformation** (inject `<b>` spans or custom font) at chapter load time, plus re-layout on font-size changes. This is a **reader-engine spike**, not a theme toggle.

## Recommended spike (when prioritized)

1. Pick one short EPUB fixture.
2. Prototype chapter HTML transform: split words, wrap first ~40% of graphemes in `<span class="bionic">`.
3. Measure Readium render + pagination stability on iOS/Android.
4. Legal review for Bionic Reading™ API / license.

## Premium gate (see `docs/monetization.md`)

Gate behind subscription once monetization exists. Free tier keeps standard Readium rendering.

## Anti-pattern

Do not ship a fake “bold every word prefix” in plain `Text` reader — we deleted that path. Bionic must work on real EPUB layout or not at all.
