# KOReader Onboarding Intro Page

## Context
Verso supports KOReader progress sync. Currently, it's auto-enabled silently during Calibre-Web Automated library addition, or configured manually via Settings. Users may not realize they can sync progress with their e-readers unless they dig into settings.

## Design

### User Flow
The new flow for first-time users:
1. `(onboarding)/index.tsx`: Welcome screen
2. `(onboarding)/connect.tsx`: Add OPDS library screen
3. **NEW: `(onboarding)/sync.tsx`**: KOReader sync introduction screen
4. Library (completes onboarding)

### Screen UI (`(onboarding)/sync.tsx`)
A minimal, premium introductory screen matching the current onboarding aesthetic.
- **Title**: "Sync your reading progress" (i18n: `onboarding.syncTitle`)
- **Body**: "Read on your e-reader, pick up where you left off on your phone. Verso syncs seamlessly with KOReader and Calibre-Web Automated." (i18n: `onboarding.syncBody`)
- **Primary Action**: "Enable KOReader Sync" (i18n: `onboarding.syncEnable`).
  - If the server added in step 2 was a CWA server and we successfully auto-enabled sync in the background, this button can just finish onboarding or say "Sync is enabled".
  - Otherwise, tapping this opens a native modal sheet pointing to the KOReader settings form (`/settings/koreader`), allowing them to configure their `sync.koreader.rocks` or custom credentials.
- **Secondary Action**: "Not now" (i18n: `onboarding.syncSkip`). Completes onboarding and drops the user into the Library tab.

### Router & Navigation State
- In `src/app/(onboarding)/connect.tsx`: Change the success destination from `router.replace('/(tabs)')` to `router.push('/(onboarding)/sync')`.
- In the new `sync.tsx`:
  - `onSkip`: `completeOnboarding()` → `router.replace('/(tabs)')`
  - `onEnable`: `completeOnboarding()` → `router.replace('/(tabs)')` → `router.push('/settings/koreader')` (or open a modal directly before navigating away).

### i18n
Add the following keys to all 5 supported locales (`en`, `es`, `zh`, `hi`, `ar`):
- `onboarding.syncTitle`
- `onboarding.syncBody`
- `onboarding.syncEnable`
- `onboarding.syncSkip`
