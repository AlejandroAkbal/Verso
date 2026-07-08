# Global KOReader Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make KOReader sync a global account that applies to all downloaded EPUBs, while keeping CWA `/kosync` as a setup shortcut only.

**Architecture:** Keep `sync_accounts.default` and `user_preferences.koreader_sync_enabled` as global source of truth. Stop mutating sync account when active OPDS library changes. Isolate active-library-derived CWA setup into one helper used only by onboarding/settings setup flows.

**Tech Stack:** Expo SDK 57, TypeScript, Expo SQLite, SecureStore, KOReader KOSync HTTP API, Vitest, Maestro.

## Global Constraints

- `pnpm` only.
- iOS + Android only; no web.
- No new dependencies.
- No backward-compat migration required; pre-production.
- `sync_accounts.default` is global source of truth.
- Active OPDS library does not own KOReader sync config.
- CWA `/kosync` derivation is setup shortcut only.
- Reader/download flows must not block on network sync.

---

## File Structure

- `src/services/koreader/account.ts` — new pure-ish account selection helpers for global account vs CWA setup candidate.
- `src/services/koreader/onboarding.ts` — use account helpers; verify global account first; use CWA shortcut only when no saved account exists.
- `src/app/settings/koreader.tsx` — keep settings global; update helper copy to say sync applies to all downloaded EPUBs.
- `src/i18n/locales/{en,es,zh,hi,ar}.json` — update KOReader settings/onboarding copy.
- `src/services/koreader/account.test.ts` — unit tests for global account winning over active-library shortcut and library switch not changing account selection.
- `.maestro/global-koreader-sync.yaml` — optional E2E smoke if simulator state supports CWA + Gutenberg flow.

---

### Task 1: Add Global Sync Account Selection Helper

**Files:**
- Create: `src/services/koreader/account.ts`
- Test: `src/services/koreader/account.test.ts`

**Interfaces:**
- Produces: `type SyncSetupCandidate`, `type SavedSyncAccountCandidate`, `getSavedSyncAccountCandidate(db)`, `getActiveLibrarySyncSetupCandidate(db)`.
- Consumes existing: `getSyncAccount`, `getAllServers`, `getUserPreferences`, `getServerPassword`, `deriveKosyncUrlFromOpdsUrl`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { chooseSyncAccountSource } from './account';

describe('chooseSyncAccountSource', () => {
  it('keeps saved global account ahead of active-library CWA shortcut', () => {
    expect(
      chooseSyncAccountSource(
        { serverUrl: 'https://sync.example.com', username: 'global', hasPassword: true },
        { serverUrl: 'https://cwa.example.com/kosync', username: 'library', hasPassword: true },
      ),
    ).toEqual({ kind: 'saved', serverUrl: 'https://sync.example.com', username: 'global' });
  });

  it('uses active-library CWA shortcut only when no saved global account exists', () => {
    expect(
      chooseSyncAccountSource(
        null,
        { serverUrl: 'https://cwa.example.com/kosync', username: 'library', hasPassword: true },
      ),
    ).toEqual({ kind: 'setup-shortcut', serverUrl: 'https://cwa.example.com/kosync', username: 'library' });
  });

  it('returns null when neither source has password-backed credentials', () => {
    expect(
      chooseSyncAccountSource(
        { serverUrl: 'https://sync.example.com', username: 'global', hasPassword: false },
        { serverUrl: 'https://cwa.example.com/kosync', username: 'library', hasPassword: false },
      ),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/services/koreader/account.test.ts`
Expected: FAIL because `./account` does not exist.

- [ ] **Step 3: Add minimal helper**

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllServers, getSyncAccount, getUserPreferences } from '@/db/queries';
import { getKoreaderPassword } from '@/services/koreader/credentials';
import { getServerPassword } from '@/services/opds/credentials';
import { deriveKosyncUrlFromOpdsUrl } from '@/services/opds/url';

export type SyncAccountCandidate = {
  serverUrl: string;
  username: string;
  hasPassword: boolean;
};

export type ChosenSyncAccountSource = {
  kind: 'saved' | 'setup-shortcut';
  serverUrl: string;
  username: string;
};

export function chooseSyncAccountSource(
  saved: SyncAccountCandidate | null,
  setupShortcut: SyncAccountCandidate | null,
): ChosenSyncAccountSource | null {
  if (saved?.serverUrl && saved.username && saved.hasPassword) {
    return { kind: 'saved', serverUrl: saved.serverUrl, username: saved.username };
  }

  if (setupShortcut?.serverUrl && setupShortcut.username && setupShortcut.hasPassword) {
    return {
      kind: 'setup-shortcut',
      serverUrl: setupShortcut.serverUrl,
      username: setupShortcut.username,
    };
  }

  return null;
}

export async function getSavedSyncAccountCandidate(
  db: SQLiteDatabase,
): Promise<SyncAccountCandidate | null> {
  const account = await getSyncAccount(db);
  if (!account?.server_url || !account.username) return null;
  const password = await getKoreaderPassword();
  return {
    serverUrl: account.server_url,
    username: account.username,
    hasPassword: Boolean(password),
  };
}

export async function getActiveLibrarySyncSetupCandidate(
  db: SQLiteDatabase,
): Promise<SyncAccountCandidate | null> {
  const [servers, prefs] = await Promise.all([getAllServers(db), getUserPreferences(db)]);
  const activeServer = servers.find((server) => server.id === prefs.active_server_id) ?? servers[0];
  if (!activeServer?.auth_username) return null;

  const password = await getServerPassword(activeServer.id);
  return {
    serverUrl: deriveKosyncUrlFromOpdsUrl(activeServer.url),
    username: activeServer.auth_username,
    hasPassword: Boolean(password),
  };
}
```

- [ ] **Step 4: Run focused test**

Run: `pnpm test src/services/koreader/account.test.ts`
Expected: PASS.

---

### Task 2: Make Onboarding Use Global Account First

**Files:**
- Modify: `src/services/koreader/onboarding.ts`
- Test: `src/services/koreader/account.test.ts`

**Interfaces:**
- Consumes Task 1 helpers.
- Keeps exported `verifyExistingOrActiveLibrarySync(db): Promise<boolean>` and `syncActiveLibraryCatalogProgress(db): Promise<void>` unchanged.

- [ ] **Step 1: Replace inline account selection**

In `src/services/koreader/onboarding.ts`, replace duplicated saved-account/active-library credential branching with:

```ts
const saved = await getSavedSyncAccountCandidate(db);
const setupShortcut = await getActiveLibrarySyncSetupCandidate(db);
const source = chooseSyncAccountSource(saved, setupShortcut);

if (!source) return false;

const password = source.kind === 'saved'
  ? await getKoreaderPassword()
  : await getServerPassword(activeServer.id);
```

Then preserve behavior:
- test connection with `testKoreaderConnection(source.serverUrl, source.username, password)`.
- if `source.kind === 'setup-shortcut'`, call `saveDefaultSyncAccount(...)` once to persist global account.
- always call `setKoreaderSyncEnabled(db, true)` on success.

- [ ] **Step 2: Delete no-longer-needed account-selection imports**

Remove direct imports only if unused after Step 1.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS.

---

### Task 3: Update Settings Copy to Match Global Model

**Files:**
- Modify: `src/app/settings/koreader.tsx`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/hi.json`
- Modify: `src/i18n/locales/ar.json`

**Interfaces:**
- Produces clearer global-copy keys; no schema changes.

- [ ] **Step 1: Find current KOReader settings copy keys**

Run: `grep -n "koreader" src/i18n/locales/en.json`
Expected: existing `settings.koreader...` keys.

- [ ] **Step 2: Add/update helper copy**

Use this English meaning in all locales:

```json
"koreaderSyncScope": "Applies to all downloaded EPUBs. Calibre-Web Automated can provide a built-in /kosync endpoint."
```

Translate naturally for `es`, `zh`, `hi`, `ar`.

- [ ] **Step 3: Render helper copy in settings**

In `src/app/settings/koreader.tsx`, show helper text below sync server URL or screen intro:

```tsx
<ThemedText variant="body" color="mutedText">
  {t('settings.koreaderSyncScope')}
</ThemedText>
```

Match existing component style in file.

- [ ] **Step 4: Run lint/typecheck**

Run: `pnpm verify:preflight`
Expected: PASS with only known `src/i18n/index.ts:52 import/no-named-as-default-member` warning.

---

### Task 4: Prevent Active Library Switch from Mutating Sync

**Files:**
- Inspect: `src/db/hooks/useActiveServer.ts`
- Inspect: `src/app/settings/servers.tsx` or active-server settings file found by grep
- Test: `src/services/koreader/account.test.ts`

**Interfaces:**
- Ensures active-server changes only set `user_preferences.active_server_id`.

- [ ] **Step 1: Search for active-server side effects**

Run: `grep -R "setActiveServerId\|active_server_id\|saveDefaultSyncAccount\|setKoreaderSyncEnabled" -n src`
Expected: no active-server switch path calls `saveDefaultSyncAccount` or disables sync.

- [ ] **Step 2: Remove any active-server sync mutation if found**

If a switch path mutates sync, delete that mutation. Active server switching must not call `saveDefaultSyncAccount`, `setKoreaderSyncEnabled`, or `deleteKoreaderPassword`.

- [ ] **Step 3: Run focused tests**

Run: `pnpm test src/services/koreader/account.test.ts`
Expected: PASS.

---

### Task 5: Verification and Cleanup

**Files:**
- Modify: `TODO.md`
- Optional create: `.maestro/global-koreader-sync.yaml`

**Interfaces:**
- Produces verified global sync behavior.

- [ ] **Step 1: Mark TODO item done**

Change:

```md
- [ ] Redesign KOReader sync as global account first; active-library CWA detection only setup shortcut.
```

to:

```md
- [x] Redesign KOReader sync as global account first; active-library CWA detection only setup shortcut.
```

- [ ] **Step 2: Run all JS tests**

Run: `pnpm test`
Expected: all Vitest tests pass.

- [ ] **Step 3: Run preflight**

Run: `pnpm verify:preflight`
Expected: typecheck passes; lint has 0 errors and the known `src/i18n/index.ts:52` warning only.

- [ ] **Step 4: Remove transient OpenCode dir**

Run: `rm -rf .opencode && rtk git status --short`
Expected: no `.opencode/` entry.

- [ ] **Step 5: Report uncommitted status**

Do not commit unless user explicitly asks. Report changed files and exact verification commands.

---

## Self-Review

Spec coverage:
- Global account source of truth: Task 1 + Task 2.
- CWA setup shortcut only: Task 1 + Task 2.
- Settings copy: Task 3.
- Active library switch does not mutate sync: Task 4.
- Testing/verification: Task 5.

Placeholder scan: no TBD/TODO placeholders in implementation steps.

Type consistency: `SyncAccountCandidate`, `ChosenSyncAccountSource`, and `chooseSyncAccountSource` names match all tasks.
