# KOReader Sync — Design (Reader app)

Status: **Implemented (v1)** — see `src/services/koreader/` and Settings → KOReader Sync.
Refs: [Open-Audiobook/koreader-sync-protocol](https://github.com/Open-Audiobook/koreader-sync-protocol), KOReader sync server (e.g. `https://sync.koreader.rocks`).

This is the main cross-device feature: resume on KOReader / Thorium / another Reader install from the same sync account.

---

## Goals

- Push/pull reading progress to a KOReader-compatible sync server.
- Document ID must match KOReader when using **partial MD5** mode (default for many self-hosted setups).
- Map **Readium** `locator_json` + `progression` ↔ KOReader `percentage` + `progress` string.
- Never jump silently while the user is actively reading — show conflict UI.

## Non-goals (v1)

- Highlights, bookmarks, metadata sync (not in KOReader progress API).
- PDF (app anti-goal).
- Custom sync server implementation (use existing KOReader server).

---

## Protocol summary

| Item | Value |
|------|--------|
| Base URL | User-configured (default `https://sync.koreader.rocks`) |
| Accept | `application/vnd.koreader.v1+json` |
| Auth | `X-Auth-User` (plain), `X-Auth-Key` (MD5 hex of password, lowercase) |
| Upsert | `PUT /syncs/progress` |
| Fetch | `GET /syncs/progress/{document_id}` |
| Test | `GET /users/auth` |

**PUT body:**

```json
{
  "progress": "42",
  "percentage": 0.28,
  "device_id": "A1B2C3D4E5F6",
  "document": "<document_id>",
  "device": "Reader"
}
```

**GET response** adds `timestamp` (unix seconds). Conflict rule on server: last write wins.

---

## Document ID

KOReader supports two modes. **Reader must support both**; user picks in Settings (default: partial MD5).

### Filename mode

```
document_id = MD5(hex) of UTF-8 basename, e.g. "MyBook.epub"
```

Fast but collides if filenames differ across libraries.

### Partial MD5 (recommended)

Sample 1024 bytes at offsets `1024 << (2*i)` for `i = -1..10` (i.e. 512, 2048, 8192, …), MD5 the concatenation.

```typescript
// src/services/koreader/documentId.ts (planned)
export async function partialMd5DocumentId(localEpubPath: string): Promise<string>
```

- Compute from **downloaded file** at `Paths.document/books/{bookId}.epub` (resolved via `resolveDownloadLocalUri`).
- Store per-book in SQLite once computed (see schema below).
- Recompute if `local_uri` changes (re-download).

---

## Progress mapping (Readium ↔ KOReader)

### Local (already in app)

`reading_progress`:

- `progression` — float 0–1 from Readium `locator.locations.totalProgression` (fallback `progression`)
- `locator_json` — full Readium `Locator` for resume inside Reader

### Remote (KOReader)

- `percentage` — float 0–1 (`current_virtual_page / total_virtual_pages` in KOReader)
- `progress` — string page index or XPath-like pointer
- `timestamp` — server unix time

### Push (Reader → server)

On debounced local save (after Readium `onLocationChange`, same ~800ms debounce as today):

1. `percentage` = `reading_progress.progression` (clamp 0–1)
2. `progress` = derive from Readium positions if available (`onPublicationReady` → `positions` array index), else `String(Math.round(percentage * totalPositions))` or `String(Math.round(percentage * 10000))` as coarse fallback
3. `document` = `book_sync_state.document_id`
4. `device_id` = stable app UUID (no hyphens, uppercase — KOReader convention)
5. `device` = `appIdentity.displayName` (`Reader`)

**Note:** KOReader virtual page count ≠ Readium page count. **Use `percentage` as the canonical cross-app field.** `progress` string is best-effort for KOReader UI; exact XPath alignment is v2.

### Pull (server → Reader)

On reader open (before `ReadiumView` mounts with `initialLocation`):

1. `GET /syncs/progress/{document_id}`
2. If 404 → use local `locator_json` only
3. If `remote.timestamp > book_sync_state.last_pushed_at` (or local `reading_progress.updated_at`) and user not in active reading session → apply remote

**Apply remote percentage to Readium:**

- Preferred: map `percentage` to nearest entry in `positions` from `onPublicationReady`, set `initialLocation` to that `Locator`
- Fallback: set `ReadiumFile.initialLocation` with `locations: { totalProgression: percentage }` if Readium accepts progression-only locator (verify in spike)

---

## Conflict UX

**Rule:** Newest `timestamp` wins **unless** user is actively reading.

| State | Behavior |
|-------|----------|
| Reader screen focused, user paginated in last 30s | Queue remote conflict; show banner after exit |
| App foreground, not in reader | Pull remote; if newer than local, show banner on library/detail |
| User taps Read | Pull once before open; if conflict, modal: **Jump to synced position** / **Keep here** |

Banner copy (i18n): `sync.newerPositionAvailable` with actions `sync.jump` / `sync.keep`.

Never auto-seek Readium while `ReadiumView` is mounted unless user confirms.

---

## Sync triggers

| Event | Action |
|-------|--------|
| Local progress save (debounced) | Push if sync enabled + credentials set |
| Reader open | Pull (conflict check) |
| Reader close / `flushProgress` | Push final |
| App → foreground | Pull all in-progress books (or last-open only v1) |
| Download complete | Compute & store `document_id` |
| Settings: enable sync / change server | Auth test + optional full reconcile |

Debounce push: min **25s** between successful pushes per book (match KOReader). Coalesce with local save debounce.

---

## Settings UI

New section in Settings stack: **KOReader Sync**

| Field | Storage |
|-------|---------|
| Enable sync | `user_preferences.koreader_sync_enabled` (0/1) |
| Server URL | `sync_accounts.server_url` |
| Username | `sync_accounts.username` |
| Password | SecureStore `opds-reader.koreader.password.{accountId}` |
| Document ID mode | `sync_accounts.document_id_mode` (`partial_md5` \| `filename`) |

Actions:

- **Test connection** → `GET /users/auth`
- Show last sync time / error (from `book_sync_state` aggregate or account row)

Password: store MD5 in memory only for requests; never persist raw password except SecureStore for re-hash on launch.

---

## Schema (proposed — bump `SCHEMA_VERSION` to 10)

```sql
CREATE TABLE sync_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  server_url TEXT NOT NULL,
  username TEXT NOT NULL,
  document_id_mode TEXT NOT NULL DEFAULT 'partial_md5',
  device_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE book_sync_state (
  book_id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL,
  document_id_mode TEXT NOT NULL,
  last_pushed_at INTEGER NOT NULL DEFAULT 0,
  last_pulled_at INTEGER NOT NULL DEFAULT 0,
  remote_timestamp INTEGER NOT NULL DEFAULT 0,
  remote_percentage REAL,
  remote_progress TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Optional v1
ALTER TABLE user_preferences ADD COLUMN last_open_book_id TEXT NOT NULL DEFAULT '';
```

Single sync account for v1 (`id = 'default'`). Multi-account later.

---

## Module layout

```text
src/services/koreader/
  client.ts         # GET/PUT progress + connection test
  credentials.ts    # password storage, MD5 auth key, headers
  cwaProgress.ts    # CWA catalog progress restore via range partial-MD5
  deviceId.ts       # stable device_id generation
  documentId.ts     # partialMd5 + filename mode
  fileName.ts       # filename extraction for filename document IDs
  profile.ts        # KOSync profile/auth-mode resolution
  syncBook.ts       # pull/push orchestration per book
  types.ts          # KOSync payload/response types
```

Hooks:

- Reader/open hooks call `pullRemoteProgressForBook()` before opening local books.
- Library refresh calls CWA catalog progress sync for compatible servers.

---

## Auto-launch last book (depends on sync)

After sync exists:

- Setting: `user_preferences.resume_last_book` (0/1)
- On cold launch (post-onboarding): if enabled + `last_open_book_id` downloaded → navigate to reader
- Update `last_open_book_id` on reader open
- If remote newer on launch → conflict modal before auto-open

Design this **after** conflict UX is implemented.

---

## Error handling

| HTTP | Client action |
|------|----------------|
| 401 | Clear auth cache, show Settings error |
| 404 on GET | No remote progress (normal) |
| Network | Retry with exponential backoff; show offline, keep local |
| 5xx | Retry later; don't block reading |

---

## Testing plan

1. Unit: `partialMd5DocumentId` against known EPUB fixtures from koreader-sync-protocol repo
2. Integration: mock server or `sync.koreader.rocks` test account
3. Maestro: enable sync in Settings → read → background KOReader push (manual) → resume in app
4. Verify document ID matches KOReader app on same file

---

## Open questions (spike before coding)

1. Does Readium `initialLocation` accept `{ locations: { totalProgression } }` without `href`?
2. Can we read `positions.length` once per open to improve `progress` string accuracy?
3. Self-hosted sync servers: any URL path differences from `sync.koreader.rocks`?
4. Filename mode: use OPDS title-derived filename or actual `books/{id}.epub` on disk?

---

## Implementation order

1. `documentId.ts` + fixture tests
2. `client.ts` + Settings UI + auth test
3. Schema migration + `book_sync_state` on download complete
4. Push on local progress save
5. Pull on reader open + conflict modal
6. Foreground pull + banner
7. Auto-launch last book setting
