# LotKeys V0.9.5.05 — PC pairing relay recovery

This TEST release repairs the PC side of phone pairing with a focused Google-permission renewal, a private relay probe, a second browser transport, and actionable failure details.

## V0.9.5.05 included

- Add **Reconnect pairing access** on the PC without signing out, clearing LotKeys data, or changing the Store connection.
- Renew the temporary Google authorization and verify the exact Google account used by the PC.
- Create, read, and delete a short-lived probe in Google Drive's private app-data space before retrying the real pairing offer.
- Retry failed browser relay traffic through `XMLHttpRequest` when the normal `fetch` transport is blocked.
- Show the specific Google HTTP or browser-network detail when pairing still cannot create an offer.

## V0.9.5.04 retained

- Keep **📵 Block Number / Unblock Number** inline with a saved Contact's primary messaging number.
- Accept numeric SMS short codes from three to fifteen digits for LotKeys blocking and Device organization.
- Keep Contact saving and **Call** actions restricted to full valid phone numbers.
- Retain every V0.9.5.03 Blocked, Unsorted, Interested Vehicle, and unread-alert behavior.

## V0.9.5.03 retained

- Move **Unsorted** beside **All Device** as the first organization choice.
- Replace **Saved contacts** with **📵 Blocked**, covering saved Contacts and unsaved Device numbers.
- Add **📵 Block Number / Unblock Number** controls to the Contact editor and saved Contact details.
- Exclude blocked numbers from normal Hub views, Hub unread totals, numbered category badges and starred Important-category dots without deleting phone history.
- Keep **Interested Vehicle**, **💾 Media** and **💬 Chat** together on one Contact shortcut row.
- Show **+ Interested Vehicle** in an empty Device-chat header; search Vehicle Profiles by year, make, model, stock or VIN, or save a custom typed vehicle.
- Retain every V0.9.5.02 unread acknowledgement rule.

## V0.9.5.02 included

- Clear the conversation-row badge, numbered category badge, main Hub total and matching Important-category dot together after Device history loads successfully.
- Restore all applicable alerts when a newer incoming SMS/MMS arrives.
- Keep an outgoing reply or other harmless Android thread update from reviving an already-read alert.
- Store only device/thread signatures and the latest incoming message marker locally; message bodies are never added to the receipt.
- Remain protocol-compatible with the V0.9.5.01 Android connector, so this particular web hotfix does not require reinstalling the APK.
- Retain every V0.9.5.01 category-count and Important Hub alert rule.

## V0.9.5.01 included

- Show a black numbered unread badge on every matching Device category chip in light theme and a white numbered badge in dark theme.
- Keep each chip badge independent from the category's ⭐ Important selection and visible while the chip is selected or unselected.
- Display `1` through `99`, then `99+`, while retaining the exact count in the accessible chip label and tooltip.
- Continue using parent/subcategory closure and live Device conversations only; saved contacts without a live phone thread remain at zero.
- Keep the smaller category-coloured dots beneath the main Hub badge limited to the up-to-three starred Important categories.

## V0.9.4.100 retained

- Add a ⭐ selector to every Device category and subcategory, preserve it across rename/recolour/reorder/parent changes, and enforce a clear three-category maximum.
- Count unread messages only from current live Device conversations, while retaining parent-category alerting for unread subcategory threads and multi-category assignments.
- Keep the existing blue all-unread Hub badge and add up to three smaller category-coloured dots beneath it in saved category order.
- Show category unread status with high-contrast light/dark badges.
- Rename the filter action to **🗂️ Organize**, using black with white text in light theme and white with black text in dark theme.
- Request and verify both Store Drive and private `drive.appdata` permissions, with useful pairing guidance for missing-scope and network failures.

## V0.9.4.99 retained

- Add a bottom-left physical ☰ grip to each category row with mouse and Android pointer-drag support, a moving row preview and clear before/after drop cues.
- Persist the new category order for both drag and arrow moves so rows no longer snap back after repaint or save.
- Make the Listing photo grid inherit Inventory's tile/handle layout and skip its extra scroll-restoration frame after a drag.
- Preserve the single Listing grid: tap toggles without relocating a tile, unselected photos remain grey and in place, selected photos alone receive Cover/sequential numbering, and no more than 20 can be selected.

## V0.9.4.98 retained

- Suppress duplicate phone-status events when the public connection state has not changed.
- Keep status-only updates away from the Device conversation cards and their Vehicle Profile image URLs.
- Compare refreshed thread data before notifying Hub and replace changed threads without first clearing the list.

## V0.9.4.97 retained

- Paint cached Vehicle Profile cover photos in linked Hub Device-list cards.
- Reuse the existing chat-header thumbnail path and clean up replaced object URLs during Hub list refreshes.
- Preserve the standard missing-vehicle image for manually entered, unlinked interested vehicles.

## V0.9.4.96 retained

- Enforce the optional reminder section's hidden state even though its expanded layout uses `display: grid`.
- Keep Customer / Contact, Phone number, and Interested Vehicle / Vehicle Profile together inside **Additional fields**.
- Automatically expand those fields when editing a reminder that already contains a linked Contact, phone number, or Vehicle Profile.

## V0.9.4.95 retained

- Enforce the header bell's hidden state even though its Android-safe visual layout uses `display: grid`.
- Keep the bell visible only while at least one reminder is active; completed reminders do not hold it open.
- Show **Synced [time]** in the phone header, using a compact time that fits beside readiness, reminders and Create.

## V0.9.4.94 retained

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
- The matching V0.9.5.02 Android connector retains MMS attachment reading and the reviewed default-messaging-app handoff.
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

The source is under `android/`. GitHub Actions builds and lints it through **Build LotKeys Android Layer** and publishes the screen-recording-enabled debug APK artifact as `LotKeys-Android-V0.9.5.05` when the stable TEST signing secrets are configured. Blocking is enforced inside LotKeys Hub; Android's existing messaging app remains responsible for phone-level blocking and notifications.

The Android setup uses five short screens:

1. Confirm the existing messaging app remains the default.
2. Allow required Messages access.
3. Optionally allow Contact Names.
4. Allow the quiet connection-status notification.
5. Choose the same LotKeys Google account for private background pairing, then open LotKeys once to link the phone browser.

No `device.json`, `hub.json`, Python relay, HTTPS tunnel, Bluetooth, screen casting, Accessibility permission or default-messenger switch is used.

## TEST pairing walkthrough

1. Install and open the V0.9.5.05 Android TEST APK.
2. Complete its permission screens, choose the same LotKeys Google account, and tap **Open LotKeys & Link This Phone**.
3. Sign into the same LotKeys Google account on phone and computer.
4. Open Hub on both devices.
5. On the computer, select **Connect phone**.
6. Confirm the same four digits on the phone, choose the trust position and tap **Approve & Connect**.
7. Close the phone browser, then open a Device conversation on the PC and send a fictional test SMS. Test media separately and confirm that Android opens the default messaging app for final review.

## TEST deployment

GitHub Pages serves:

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=095005`

Keep `CNAME` absent. This repository is TEST only; `lot-keys.ca` is not changed by this release.

Fully close and reopen the installed TEST web app once after deployment so the V0.9.5.05 service worker replaces the old cache. Do not clear browser/app data; existing LotKeys and Hub records should remain.
