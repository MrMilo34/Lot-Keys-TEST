# LotKeys SMS Mirror test — 0.9.4.92 / Android 0.2.0

## What changed

- Replaces Android notification capture and RemoteInput replies with direct access to Android's SMS provider.
- Mirrors the eight newest SMS messages from up to 25 recent threads when the phone connects.
- Watches for later incoming and outgoing SMS changes, including messages sent in the normal phone messaging app.
- Sends Hub replies through the phone with `SmsManager`.
- Uses a foreground service so the mirror no longer depends on reopening the companion app.
- Keeps LotKeys contacts, categories, notes, documents, requirements and appointments separate from Android Contacts.

## Test order

1. Install the APK built by the included Android GitHub Action.
2. Open **LotKeys SMS Mirror**, paste the existing Device pairing JSON, check authorization, and enable it.
3. Grant SMS and notification permissions. Disable battery optimization for this test app if Samsung suspends it.
4. Connect Device in LotKeys 0.9.4.92. Recent SMS conversations should populate without waiting for a new notification.
5. Open one conversation and send a harmless SMS from Hub. Confirm it reaches the recipient and appears in the normal phone messaging app.
6. Send a message directly from the phone. Confirm it appears in Hub without reopening the mirror app.
7. Turn the phone offline, confirm Hub reports the device unavailable, then restore connectivity and confirm it reconnects and catches up.

## Honest boundaries

- This proof covers SMS text only. Google Messages RCS and MMS attachments are not mirrored yet.
- The Android project is source plus an APK-build workflow; an APK could not be compiled in the current local runtime.
- Sideloaded testing can request SMS permissions. Public Play distribution will require policy review/approval or qualifying as the default SMS/companion use case.
- The relay remains the existing temporary test relay and must stay available.
