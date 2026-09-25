# LotKeys TEST V0.9.4.93 — Standalone reminders

Released September 25, 2026.

## Included

- Reminders are standalone, account-scoped, local-first Hub records stored in a dedicated private `Hub/Reminders` Drive folder.
- The top header and Hub floating rail share one bell state: plain for undated, daily-only, or more than seven days away; one mark within seven Edmonton calendar days; two marks within three days, today, or overdue.
- The compact reminder panel supports All, Open, Completed, and Daily filters plus circle completion, details, edit, and delete.
- Reminder fields include title, notes, optional time/date, collapsed Contact/raw-phone/Vehicle links, and Daily Repeat.
- One-time completion uses `completedAt`; Daily completion uses `lastCompletedDay` and automatically becomes open on the next America/Edmonton day.
- Only dated one-time reminders appear in Calendar, where they use lightweight bell/check rows instead of appointment type, status, duration, or collision behavior.
- Contact notes create standalone reminders and retain `note.reminderId`. Deleting the reminder preserves the note; deleting the Contact preserves the task and clears its Contact link.
- Legacy appointment records with `kind: "Reminder"` migrate idempotently using the same ID and are tombstoned only after the standalone copy has synced safely.
- Phone-only appointments display one normalized phone identity; named appointments retain `Name · Phone`.
- V0.9.4.92 reliable PC pairing, trust controls, Android background relay, customer cards, chat composers, media, appointments, and Account recovery remain intact.

## Release identity

- Web version: `0.9.4.93`
- Build query: `09493`
- Service worker cache: `lotkeys-app-v09493-standalone-reminders`
- Android version code: `9493`
- Android artifact: `LotKeys-Android-V0.9.4.93`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09493`
- Based on protected V0.9.4.92 commit: `756bb5f62d197140a79592f577386a600a7473c2`

## Upgrade behavior

No browser data reset is required. Close and reopen the installed TEST app once so the V0.9.4.93 service worker replaces the prior cache. Keep Google Drive connected during the first Hub open so legacy reminders can finish their safe copy-before-tombstone migration. If offline, the reminder remains available locally and migration retries without deleting the old appointment record.

This remains a controlled TEST release. Reminder push notifications, public production use, RCS coverage, automatic direct MMS delivery, iPhone phone-source support, and a completed independent security review remain outside this checkpoint.
