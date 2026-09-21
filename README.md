# LotKeys V0.9.4.84 — Hub + Device bridge refinement test

Built forward from the user-approved **V0.9.4.81 / Posting Buddy V0.1.23** media baseline. Vehicle photo/video upload logic, Store Processor V0.9.4.76 and Posting Buddy V0.1.23 remain protected from this Hub work.

## V0.9.4.84 focus

- LotKeys Lock Screen no longer intentionally disconnects the in-memory Device bridge. Unlocking wakes the existing pairing/poll immediately, so idle lock behaves like privacy protection rather than a Device-session teardown.
- Returning to a visible/online Hub wakes Device polling without requiring the user to paste the Hub code again, as long as the browser session itself was not reloaded.
- On desktop, Calendar / Phone / ＋ float against the viewport edge instead of the Hub list edge, keeping them clear of the list scrollbar.

- Device organization chips are now **multi-select**. A user can view Facebook + Store + another coloured group together without selecting every Device conversation.
- Device conversations no longer disappear just because Android removes or refreshes the source notification after a reply. Notification removal now revokes the current live Reply action only.
- Browser Device status accepts a longer heartbeat window and refreshes on real phone activity, reducing false “waiting for adapter” states.
- A restarted Android bridge keeps the current browser-session conversation list instead of clearing it solely because the phone-side session ID changed.
- Device contact links use the stable bridge thread identity rather than the temporary Android service session, so saved organization/category links survive bridge reconnects.
- Android Bridge **0.1.1** retries temporary relay interruptions, refreshes its on-screen status while open, and replays messaging notifications Android still exposes when the listener reconnects.
- The Android bridge now uses a more stable conversation identity and can replay multiple message rows exposed inside an active MessagingStyle notification.
- The stale Hub connection error is cleared after a successful reconnect.

## Hardware result established before this refinement

A real Samsung / Google Messages test proved both directions through the temporary HTTPS relay:

1. A real incoming phone message appeared in LotKeys Hub.
2. A reply typed in LotKeys Hub was submitted through the Samsung notification Reply action.
3. The recipient received that carrier-delivered reply.
4. The sent reply also appeared in the phone’s normal Google Messages conversation.

The current Android route therefore has a working real-device receive/reply path. V0.9.4.84 is primarily refining reliability, conversation retention and organization around that proven path.

## Device history boundary

Google Messages for web can show existing conversation threads because Google Messages itself participates in that pairing/sync system. LotKeys does **not** have a public Google Messages history API.

The current LotKeys Android bridge uses authorized Android notification access and live RemoteInput reply actions. V0.1.1 can repopulate messages still present in active messaging notifications, but it does **not** claim complete SMS/MMS/RCS history.

A later full-history experiment must be treated separately because Android SMS database permissions are restricted and do not provide equivalent generic access to Google Messages RCS history. Do not silently substitute partial SMS history and call it a complete phone mirror.

## Hub features retained

Hub keeps All / LotKeys / Device scopes, coloured Device organization, searchable private customer contacts, notes, Questions to Ask, photo/document records and Month/Week/Day appointments. Contact records can be linked to live Device conversations and keep their organization colour.

Appointments remain forgiving: typed customer/vehicle snapshots are allowed even when no saved contact or Vehicle Profile match exists.

## Test deployment

This repository is the public **Lot-Keys-TEST** deployment. Do not add the production CNAME here.

Open the test site with:

`?build=09484`

The Android bridge source lives under `device-bridge/android/`. Build the debug APK using the existing **Build Android test APK** GitHub Action. The APK version for this refinement is **0.1.1-prototype**.

Pairing/relay JSON files remain private test credentials and must not be committed to this repository.
