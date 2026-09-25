# LotKeys V0.9.4.94 — Reminders and navigation hotfix

This focused TEST hotfix keeps the active page through Chrome/Google tab restoration, displays the newest successful sync time, stabilizes the main-header reminder marks on Android, makes reminder deletion repaint immediately, and routes Calendar's + Reminder shortcut to All reminders. The complete V0.9.4.93 standalone-reminder model and reliable PC pairing remain intact.

## V0.9.4.94 included

- Preserve the active Home, Inventory, Listings, Account, or Garage page in session storage so a browser-tab restore does not jump to Home.
- Display the newest successful Inventory or Listings refresh time on Home instead of the older timestamp, with the full time visible in the phone header.
- Render the header bell and its one/two urgency marks as separate elements for reliable Android sizing.
- Apply reminder deletion locally before Drive synchronization, immediately return to the previous list or Calendar, and repaint the filtered count and shared bells.
- Make Calendar's **＋ Reminder** button open **All reminders**; use the plus button there to create a reminder.

## V0.9.4.93 retained

- Add a Reminder from the top-right Create menu on every main application tab, the Hub action menu, Calendar, or a Contact note.
- Use one standalone reminder record with optional notes, due time/date, Contact, raw phone number, Vehicle Profile, and Daily Repeat.
- Show a compact bell between readiness and Create plus a matching Hub bell above Calendar; plain, one-mark, and two-mark states use America/Edmonton calendar days.
- Complete one-time reminders permanently or daily reminders only for the current local day. Undated and daily reminders never flood Calendar.
- Render each dated reminder once in Calendar as a lightweight bell/check row without appointment status, duration, or collision behavior.
- Sync reminders through the signed-in account's private `Hub/Reminders` folder with dirty state, conflicts, tombstones, deletion, and account isolation.
- Migrate old `kind: "Reminder"` appointment records idempotently, retaining the old record until its standalone copy has synced safely.
- Preserve a reminder when its linked Contact is deleted, clear the Contact link, and keep note text when a linked reminder is deleted.
- Show a phone-only appointment identity once while retaining `Name · Phone` for named appointments.

## V0.9.4.92 PC pairing retained

- The Android foreground service polls the same Google account's hidden Drive app-data space, so the paired PC no longer depends on an open phone browser tab.
- A new PC shows a short-lived matching four-digit code on both screens before Android can approve it.
- Ask Every Time, 36 Hours, 7 Days and Until Disconnect trust modes are enforced on the phone; expired trust cannot silently reconnect.
- The active encrypted browser session survives a normal refresh, while session secrets remain tab-scoped and time-bounded.
- Trusted PCs can reconnect with a fresh ECDH/AES-GCM session, and approving another PC cleanly transfers the one active connection.
- Connected Devices shows the Android relay account, active PC, last-active/expiry details and controls to disconnect, forget one PC or revoke all PC access.
- The TEST APK uses a stable TEST-only signing certificate supplied through GitHub Actions secrets, so its Android OAuth registration remains consistent without exposing the private key.

## V0.9.4.91 workflow retained

- A saved customer name and phone number now share the first line of each Device conversation card.
- Phone-only contacts show their number once instead of repeating it as both the title and subtitle.
- The Customer category and appointment date, explicit AM/PM start–end range and booking status share the second line.
- Tapping anywhere in the conversation card—including its vehicle/buying summary—opens the chat. The appointment chip remains a separate Calendar shortcut.
- Creating an appointment restores the phone/browser's native calendar and clock pickers. Editing an existing appointment keeps the compact date-entry and saved-time menus.
- Appointment field 6 is now **End Time (optional)**. Older saved durations remain compatible and appear as their calculated end time.
- Calendar day appointments place the start–end range above the card so the vehicle/customer details use the full width in a shorter card.
- The compact, clickable Interested Vehicle card remains inside the upper-right Device-chat header beside the customer details. It includes the vehicle photo, year/make/model, stock, odometer, price and buying summary without consuming a separate row.
- Add Note has searchable structured fields for purchase method, total budget, bi-weekly goal, down payment, trade/no trade, expected trade value and Interested Vehicle. Cash / Financing is now a two-button choice with no text box.
- Recent incoming messages can show a temporary ⤴️ suggestion for a narrow contact field. Only the newest five messages qualify; a user must choose every value before it is retained.
- Appointment entry follows the nine-field workflow, accepts a free typed customer name, uses Tentative/Booked/Confirmed/Double Confirm states, and displays MM/DD/YYYY plus uppercase 12-hour AM/PM times.
- Device and LotKeys Chat use the same ＋ Camera/Images/Documents and 🎙️ Voice memo/Talk to text composer. Tap opens choices for five seconds; a 0.5-second hold captures the gesture and enables directional shortcuts without browser scrolling or text selection.
- Sent and received Chat media exposes a deliberate 💾 action to save a separate copy in the private Contact folder. A source key prevents accidental duplicate saves.
- The conversation action row is Notes, Questions, Call, Booking and Organize. Add to Hub is reduced to Start Chat/Group, Create Contact, Add Note, Upload and Reminder.
- The Device composer no longer shows the implementation explanation beneath the message box, and the Lock Screen now asks simply for the user's Lock Screen Password.
- The matching V0.9.4.94 Android connector retains MMS attachment reading and the reviewed default-messaging-app handoff.
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
- Android keeps the private pairing relay active through its visible low-priority foreground-service notification. Google or Android may still require the connector to be reopened after account revocation, force-stop, battery restrictions or a recoverable authorization prompt.
- This is private test software using sensitive Android permissions. It is not a Google Play production release and has not completed an independent security review.

## Android build

The source is under `android/`. GitHub Actions builds and lints it through **Build LotKeys Android Layer** and publishes the screen-recording-enabled debug APK artifact as `LotKeys-Android-V0.9.4.94` when the stable TEST signing secrets are configured. This web release requires that matching connector for background PC pairing, MMS attachment saving and the reviewed media handoff.

The Android setup uses five short screens:

1. Confirm the existing messaging app remains the default.
2. Allow required Messages access.
3. Optionally allow Contact Names.
4. Allow the quiet connection-status notification.
5. Choose the same LotKeys Google account for private background pairing, then open LotKeys once to link the phone browser.

No `device.json`, `hub.json`, Python relay, HTTPS tunnel, Bluetooth, screen casting, Accessibility permission or default-messenger switch is used.

## TEST pairing walkthrough

1. Install and open the V0.9.4.94 Android TEST APK.
2. Complete its permission screens, choose the same LotKeys Google account, and tap **Open LotKeys & Link This Phone**.
3. Sign into the same LotKeys Google account on phone and computer.
4. Open Hub on both devices.
5. On the computer, select **Connect phone**.
6. Confirm the same four digits on the phone, choose the trust position and tap **Approve & Connect**.
7. Close the phone browser, then open a Device conversation on the PC and send a fictional test SMS. Test media separately and confirm that Android opens the default messaging app for final review.

## TEST deployment

GitHub Pages serves:

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=09494`

Keep `CNAME` absent. This repository is TEST only; `lot-keys.ca` is not changed by this release.

Fully close and reopen the installed TEST web app once after deployment so the V0.9.4.94 service worker replaces the old cache. Do not clear browser/app data; existing LotKeys and Hub records should remain.
