# LotKeys TEST V0.9.4.94 — Reminders and navigation hotfix

Released September 25, 2026.

## Fixed

- LotKeys now remembers the active Home, Inventory, Listings, Account, or Garage page for the current browser tab. Chrome restoring the LotKeys tab after Google approval work no longer resets navigation to Home.
- The Home header now shows the newest successful Inventory or Listings refresh time without clipping it on phones. Inventory and Listings continue to show their own relevant refresh time.
- The main-header reminder bell and urgency mark render as separate elements, preventing Android emoji fallback from stretching the one-mark state.
- Reminder deletion completes locally first, immediately returns to the previous reminder list or Calendar, repaints its filtered count/list and shared bells, and synchronizes the tombstone to Drive in the background.
- Calendar's **＋ Reminder** shortcut now opens **All reminders**. The plus button inside All reminders remains the explicit new-reminder action.

## Retained from V0.9.4.93

- Standalone account-scoped reminders in the private `Hub/Reminders` folder.
- Edmonton-day urgency, Daily completion reset, lightweight Calendar rows, optional Contact/phone/Vehicle links, linked-note preservation, and safe legacy migration.
- Phone-only appointment identity deduplication.
- Reliable Android PC relay, trust controls, refresh recovery, customer cards, chat composers and media workflows.

## Release identity

- Web version: `0.9.4.94`
- Build query: `09494`
- Service worker cache: `lotkeys-app-v09494-reminders-navigation-hotfix`
- Android version code: `9494`
- Android artifact when stable TEST signing secrets are configured: `LotKeys-Android-V0.9.4.94`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09494`
- Based on V0.9.4.93 standalone reminders.

## Upgrade behavior

No browser data reset is required. Close and reopen the installed TEST app once so the V0.9.4.94 service worker replaces the prior cache. Existing reminders and other Hub data remain in place.

This remains a controlled TEST release. Reminder push notifications, public production use, RCS coverage, automatic direct MMS delivery, iPhone phone-source support, and a completed independent security review remain outside this checkpoint.
