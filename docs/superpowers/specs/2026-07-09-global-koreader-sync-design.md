# Global KOReader Sync Design

## Problem

KOReader sync is account-level and document-ID based. The sync server stores progress by user + document hash, not by OPDS library. Verso currently treats sync as if it belongs to the active OPDS library by deriving `/kosync` from that library during onboarding. That makes Calibre-Web Automated feel magical, but it makes Project Gutenberg and multi-library use confusing: changing libraries appears to change sync availability even though KOReader sync should remain global.

## Decision

Use one global KOReader sync account as source of truth: `sync_accounts.default` plus its SecureStore password. Active-library CWA detection stays only a setup shortcut. If a user connects a CWA OPDS server and no sync account exists yet, Verso may prefill or test the derived `/kosync` endpoint. After saved, sync is global and applies to every downloaded EPUB by document ID.

Do not add per-library sync settings now. Add them later only if real users need multiple independent KOReader servers.

## Architecture

- `sync_accounts.default` remains the global account row.
- `user_preferences.koreader_sync_enabled` remains the global sync toggle.
- `book_sync_state` remains per book because document IDs and remote status are per book.
- OPDS `servers` do not own sync configuration.
- CWA `/kosync` derivation is allowed only in onboarding/settings setup flows when no explicit sync account exists.

## UX

Onboarding:
1. User connects OPDS library.
2. KOReader step says sync is optional and works across libraries.
3. If active library looks like CWA, offer fast setup from that library's credentials.
4. If setup succeeds, save global sync account and enter Library.
5. If setup fails or library is not CWA, show global KOReader settings.

Settings:
- KOReader Sync remains one top-level settings screen.
- It shows current sync server URL + username.
- It may show helper text: “Applies to all downloaded EPUBs. Calibre-Web Automated can provide a built-in `/kosync` endpoint.”
- OPDS server settings do not duplicate KOReader settings.

## Data Flow

When opening/downloading/syncing a book:
1. Read `sync_accounts.default`.
2. If disabled/missing, skip sync.
3. Compute document ID from local EPUB.
4. Pull/push progress to global sync server.
5. Store per-book result in `book_sync_state`.

When active library changes:
- Do not change KOReader sync account.
- Do not disable sync.
- Do not derive a new `/kosync` endpoint automatically.

## Error Handling

- Failed CWA shortcut routes to global KOReader settings.
- Missing sync account means sync disabled/no-op, not library-specific failure.
- Network failures never block reader open or completed downloads.
- Conflict prompt remains per book.

## Testing

- Unit-test selection logic: saved global account wins over active-library derived shortcut.
- Unit-test active-library switch does not mutate sync account.
- Maestro: connect CWA, enable KOReader, switch to Gutenberg, verify KOReader settings still show same global sync account.

## Deferred

Per-library override table, e.g. `server_sync_accounts(server_id, sync_account_id)`, is deferred. Add only when users need different KOReader servers for different OPDS libraries.
