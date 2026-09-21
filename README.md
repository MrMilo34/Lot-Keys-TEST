# LotKeys 0.9.4.96 — Fast Inventory/Listings recovery + Phone Mirror test

**Use with the separately installed Phone Mirror 0.2.0 Test APK.**

The complete website is published from the **Lot-Keys-TEST** main branch. GitHub Actions packages
the whole repository as **LotKeys-Phone-Mirror-Source** and separately rebuilds the test APK.
No browser storage reset, account reconnection or replacement pairing file is required for this hotfix.

## 0.9.4.96 hotfix

- Adds lightweight IndexedDB summaries for Inventory and Listings cards. Full cached photos, videos,
  documents and upload checkpoints stay in their original records and are no longer cloned before a
  list can open.
- Builds those summaries and a separate cover-photo cache during the automatic database upgrade;
  no saved-data reset or Drive re-download is required.
- Hydrates card thumbnails progressively after the list is interactive, using the local cover cache
  first and Google Drive only when needed.
- Removes the 12-second self-cancel loop: a slow route reports that it is still opening and remains
  allowed to finish, with a retry offered only after 45 seconds.
- Reuses already-loaded Vehicle and location summaries while building Listing cards instead of
  reopening the blob-heavy Vehicle store once per Listing.
- Leaves the known-good parallel/resumable upload, background resume, Drive reconciliation,
  Store Processor 0.9.4.76 and Phone Mirror 0.2.0 paths unchanged.

## 0.9.4.95 hotfix

- Replaces the old page immediately when a tab is selected, so Account cannot remain visible under
  an Inventory or Listings header.
- Rejects late asynchronous renders and provides a safe retry after 12 seconds instead of leaving
  the app indefinitely split or frozen.
- Moves Account-icon and Listing-alert database reads off the blocking navigation path.
- Keeps temporary vehicle-photo URLs alive until the cards that use them are removed, preventing
  broken thumbnail tiles during refresh/navigation.
- Reuses one cached user lookup while building Inventory cards, reducing phone database work.
- Retains Phone Mirror 0.2.0 behavior, Store Processor 0.9.4.76 and Posting Buddy 0.1.23 unchanged.

## Scope

The native companion reads Android's SMS/MMS provider and responds to authenticated, encrypted,
short-lived browser requests. Conversations/history are paged on demand. The browser does not
archive a transcript to the customer database or Drive. Hub contacts, categories, requirements,
notes, documents, appointments and the internal LotKeys chat remain their existing independent layer.
No Android contact permission is requested, and no Android contacts are created.

The companion keeps a user-visible remote-messaging foreground service with provider observers,
network callbacks, retry, and boot recovery. These paths compiled; OEM sleep/Doze/boot behavior
still needs acceptance testing on the actual phone. An always-on production relay was NOT added.
Keep the original authenticated relay and HTTPS tunnel running.

## Included behavior

- Discover existing SMS/MMS threads, 40 conversations per page; load older messages in pages.
- Open the same authoritative phone history from separately paired PC and phone browsers.
- Explicit **Send SMS** through the phone's chosen default SMS subscription.
- Keep an in-flight send pending until the Android send callback; do not treat acceptance as delivery.
- Record send request IDs/results on the phone to avoid duplicate execution; no stored message bodies.
- Hide device transcripts/disable sending after disconnect or heartbeat expiry; retain CRM records.
- Preserve a local unsent draft for manual retry or cancellation; never auto-resend it on reconnect.
- Fresh browser-to-phone challenge before considering a native connection live.
- Reconcile phone-side activity with provider refresh/invalidation, not notification previews.

## Excluded / not proven

Private RCS history and RCS sending are **not implemented**. SMS is labelled explicitly rather than
silently presented as RCS. MMS sending/media download is not implemented; MMS text and media indicators
are read where the provider supplies them. Groups and short codes are view-only; reply to existing
supported individual threads only. iOS is not part of this build.

The supplied APK is the EXACT remotely compiled debug APK, with matching Android source. Later
uncompiled hardening ideas are deliberately absent. Long-duration phone sleep, dual-SIM behavior,
actual SMS provider differences, permissions, carrier sending, reboot and tunnel recovery still
need physical testing. Restriction or failure must not be presented as successful mirroring.

## Validation

19 model/filter checks, 16 CRM/Drive-contract checks, 26 legacy encrypted-transport checks,
17 native mirror browser checks, and 10 rendered native Hub UI checks passed: **88 total**.
Native tests use a fictional phone/database; the legacy transport suite uses the real local Python
relay and a simulated device. No actual SMS was sent. Android build/lint: **0 errors, 10 warnings**.

The older broad UI suite stopped after six passes because a strict Playwright customer-dialog
selector matched two dialogs. It did not complete and is not counted as passing. The native UI
suite passed, but this release is not a complete regression certification.

Both native UI screenshots were inspected at desktop and 412px mobile widths.
The eight changed browser files passed syntax checks, including inline application scripts.
Protected CRM storage, internal messaging, pairing storage, processor, extension and artwork are
byte-for-byte unchanged from the .93 baseline; SHA-256 values are in TEST-REPORT.json.

## Deployment

Read START-HERE-LotKeys-Phone-Mirror.txt. For a local backup, download the newest successful Actions
run’s **LotKeys-Phone-Mirror-Source** artifact; it contains the complete folder rather than a partial
patch. Do not delete/recreate the repository or clear user browser storage. The Android APK is installed
on the phone separately. Stop the old notification Bridge; use device.json in the companion and the
same hub.json on both LotKeys browser instances. Retain your current PIN-protected browser pairing.

## Official API references checked September 21, 2026

- SMS permission restrictions: https://developer.android.com/reference/android/Manifest.permission#READ_SMS
- SMS send API/provider behavior: https://developer.android.com/reference/android/telephony/SmsManager
- SMS/MMS provider: https://developer.android.com/reference/android/provider/Telephony
- Remote messaging foreground service: https://developer.android.com/develop/background-work/services/fgs/service-types#remote-messaging
- ADB install and authorized debugging: https://developer.android.com/tools/adb

The Android references describe platform capabilities, not proof that this APK works on a particular phone.
