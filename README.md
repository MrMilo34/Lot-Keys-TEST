# LotKeys V0.9.4.87 — Smart customer chat update

This TEST release builds on the V0.9.4.86 Hub workflow with one reusable customer card, structured buying details, the revised appointment form, smart-note suggestions, and matching Device/LotKeys chat composers. The phone remains the Device-message source of truth.

## V0.9.4.87 included

- Customer cards reuse the primary Interested Vehicle, stock, odometer, price, Cash/Financing goals, trade details and next appointment across Hub, Contact and Calendar.
- Add Note has searchable structured fields for purchase method, total budget, bi-weekly goal, down payment, trade/no trade, expected trade value and Interested Vehicle.
- Recent incoming messages can show a temporary ⤴️ suggestion for a narrow contact field. Only the newest five messages qualify; a user must choose every value before it is retained.
- Appointment entry follows the nine-field workflow, accepts a free typed customer name, uses Tentative/Booked/Confirmed/Double Confirm states, and displays MM/DD/YYYY plus 12-hour times.
- Device and LotKeys Chat use the same ＋ Camera/Images/Documents and 🎙️ Voice memo/Talk to text composer. Tap opens choices; a 0.5-second hold enables directional shortcuts.
- Sent and received Chat media exposes a deliberate 💾 action to save a separate copy in the private Contact folder. A source key prevents accidental duplicate saves.
- The conversation action row is Notes, Questions, Call, Booking and Organize. Add to Hub is reduced to Start Chat/Group, Create Contact, Add Note, Upload and Reminder.
- The V0.9.4.87 Android connector reads MMS attachment metadata/content and prepares Device media in the phone's default messaging app for final review and Send.
- V0.9.4.86 grouping, reminders, PC-only LotKeys alert sounds, corrected logo crop and responsive floating controls remain in place.

## First checkpoint included

- The current LotKeys Hub is the conversation interface on both phone and computer.
- A small Android setup layer requests SMS/MMS, SMS-send, optional Contact Names and connection-status access without becoming the default messenger.
- The phone reads its current Android SMS/MMS conversation index and paged message history.
- Existing Android contact names appear when optional Contacts access is granted; LotKeys custom contact names still take precedence.
- A computer on the same authorized LotKeys Google account pairs with a short-lived matching four-digit code and phone approval.
- Session requests and message responses are end-to-end encrypted before entering short-lived files in Google Drive's hidden application-data area. Processed and expired frames are deleted.
- The computer can open phone history and submit a plain-text SMS through the phone.
- Outgoing messages show Sending, Sent or Failed. A failure never retries automatically.
- Coverage is honest: amber means SMS/MMS is live but RCS safety coverage is not enabled; red locks Device Messages when the phone is unavailable.
- Phone numbers can be sorted without creating a full LotKeys contact folder. The same number keeps its category paths after the phone conversation is removed.
- The four trust choices are present: Ask Every Time, 36 Hours, 7 Days and Until I Disconnect.

## Existing V0.9.4.83 behavior retained

- Home, Inventory, Listings, Garage, Account, Store, media uploads, Management Updates, awards and Posting Buddy V0.1.23.
- Internal LotKeys direct/group chat and calls remain a separate Hub source.
- Private contacts, notes, documents, questions and appointments remain in the user's private Account/Hub Drive boundary.
- Multiple category assignments, one nested subcategory level, combined filtering and category colours remain functional.
- Restore-first Account sync, Account Photo/Celebration Sound recovery and Description Builder template recovery remain intact.
- The approved TEST OAuth web client, restricted Picker API key and matching Cloud project fallback remain present.

## Intentional checkpoint limits

- Android first; no iPhone connection yet.
- SMS/MMS history and direct plain-SMS sending are included. Existing private RCS history, RCS send and the RCS Notification Safety Watcher are not included.
- Device media is a reviewed handoff to the default phone messaging app, not a claim of direct MMS delivery. The user verifies the recipient and presses Send on the phone; LotKeys never retries it automatically.
- Group conversations are view-only and dual-SIM selection is deferred.
- One active computer session plus the phone. Several trusted computer records can exist, but simultaneous multi-PC messaging is deferred.
- Keep LotKeys open on the phone during this first end-to-end test. The Android capability service stays ready in the background, but a permanent always-on internet relay/token-renewal service is not claimed yet.
- This is private test software using sensitive Android permissions. It is not a Google Play production release and has not completed an independent security review.

## Android build

The source is under `android/`. GitHub Actions builds and lints it through **Build LotKeys Android Layer** and publishes the screen-recording-enabled debug APK artifact as `LotKeys-Android-V0.9.4.87`. This web release requires that matching connector for MMS attachment saving and the reviewed media handoff.

The Android setup uses four short screens:

1. Confirm the existing messaging app remains the default.
2. Allow required Messages access.
3. Optionally allow Contact Names.
4. Allow the quiet connection-status notification, then open LotKeys from the setup app once to link the browser.

No `device.json`, `hub.json`, Python relay, HTTPS tunnel, Bluetooth, screen casting, Accessibility permission or default-messenger switch is used.

## TEST pairing walkthrough

1. Install and open the V0.9.4.87 Android TEST APK.
2. Complete its permission screens and tap **Open LotKeys & Link This Phone**.
3. Sign into the same LotKeys Google account on phone and computer.
4. Open Hub on both devices.
5. On the computer, select **Connect phone**.
6. Confirm the same four digits on the phone, choose the trust position and tap **Approve & Connect**.
7. Open a Device conversation and send a fictional test SMS. Test media separately and confirm that Android opens the default messaging app for final review.

## TEST deployment

GitHub Pages serves:

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=09487`

Keep `CNAME` absent. This repository is TEST only; `lot-keys.ca` is not changed by this release.

Fully close and reopen the installed TEST web app once after deployment so the V0.9.4.87 service worker replaces the old cache. Do not clear browser/app data; existing LotKeys and Hub records should remain.
