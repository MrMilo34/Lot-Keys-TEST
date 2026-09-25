# LotKeys TEST V0.9.4.95 — Reminder bell state hotfix

Released September 25, 2026.

## Fixed

- Completing or deleting the final active reminder hides the main-header bell again. The Android-safe grid layout can no longer override the button's hidden state.
- The phone header now shows **Synced [time]** rather than presenting the time without context. The compact phone form omits AM/PM so it fits without an ellipsis; the accessible label and wider layouts retain the full 12-hour time.

## Retained from V0.9.4.94

- Returning from Google approval or a restored tab keeps the active LotKeys page.
- Home selects the newest successful Inventory or Listings refresh time.
- Bell and urgency marks render separately, reminder deletion repaints locally, and Calendar's **＋ Reminder** opens **All reminders**.
- Standalone private reminders, Edmonton-day urgency, Daily reset, lightweight Calendar rows, safe migration, phone-only appointment identity deduplication, and reliable PC pairing remain intact.

## Release identity

- Web version: `0.9.4.95`
- Build query: `09495`
- Service worker cache: `lotkeys-app-v09495-reminder-bell-state-hotfix`
- Android version code: `9495`
- Android artifact when stable TEST signing secrets are configured: `LotKeys-Android-V0.9.4.95`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09495`
- Based on V0.9.4.94 reminders and navigation hotfix.

## Upgrade behavior

No browser data reset is required. Close and reopen the installed TEST app once so the V0.9.4.95 service worker replaces the prior cache. Existing reminders and other Hub data remain in place.

This remains a controlled TEST release. Reminder push notifications, public production use, RCS coverage, automatic direct MMS delivery, iPhone phone-source support, and a completed independent security review remain outside this checkpoint.
