# Monetization — Revisit Notes

Status: **Deferred** until core reader + KOReader sync are stable in daily use.

## Product principles

- Core OPDS read + offline library stays **free** (AGPL app; self-hosted data).
- Premium is for power features that cost ongoing engineering or licensing — not basic reading.

## Candidate gates (not built)

| Feature | Tier | Rationale |
|---------|------|-----------|
| OPDS catalog + download + Readium reader | Free | Core promise |
| KOReader sync | Free | Core promise — cross-device resume |
| Bionic Reading mode | Premium | Licensed UX; engine spike required |
| Multiple sync accounts | Premium | Nice-to-have |
| OPDS server count > N | Premium | Only if abuse appears |
| Themes beyond dark | Premium | Low priority — dark-only is brand |

## Technical hooks (future)

- `user_preferences.premium_entitled` (SQLite) — set by StoreKit / Play Billing receipt validation.
- Feature checks in reader settings and Bionic transform — single `usePremium()` hook.
- No paywall before onboarding completes or first successful read.

## Store compliance

- Apple: reading apps may link out for account management; digital books IAP rules vary by region — review before any in-app purchase.
- AGPL: monetization code can be proprietary if separated; keep OPDS client core open per project license goals.

## Next revisit trigger

- KOReader sync shipped and dogfooded 2+ weeks
- Bionic spike completed with pass/fail
- User demand for cloud backup beyond KOReader

No implementation in this milestone — document only.
