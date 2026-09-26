# LotKeys V0.9.5.04 team-test checklist

## Clean V0.9.4.83 baseline

- Open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095004` and confirm **V0.9.5.04 / 095004**.
- Confirm Account storage still restores the profile photo, celebration sounds, and Description Builder templates from the selected personal folder.
- Confirm Inventory, Listings, Garage, internal LotKeys Chat, and Posting Buddy still open normally.
- Confirm Hub contacts, notes, documents, appointments, categories, and subcategories from V0.9.4.83 remain available.

## Android setup

- If the stable TEST signing secrets are configured, download **LotKeys-Android-V0.9.5.04** and install its `app-debug.apk` on an Android 11+ test phone. Otherwise confirm CI completes Android assemble/lint and intentionally withholds the unsigned APK.
- Confirm Android screenshots and screen recording work while the connector setup is visible.
- Open **LotKeys Connector TEST** and approve Messages access. Contacts is optional but required to show Android contact names.
- Confirm the setup clearly says the phone's existing messaging app stays the default.
- Approve the quiet connection-status notification, choose the same LotKeys Google account for PC pairing, then tap **Open LotKeys & Link This Phone**.
- Confirm LotKeys opens in the browser and shows **SMS/MMS live** in amber—not full/RCS coverage.

## Pairing

- Sign into the same LotKeys Google account on the phone and computer.
- On the computer, open Hub and choose **Connect phone**.
- Confirm a four-digit code appears on the computer and the same code plus computer name appears on the phone.
- Approve with each trust choice at least once: Ask Every Time, 36 Hours, 7 Days, and Until I Disconnect.
- Confirm a second computer connection replaces the first active computer session.
- Confirm **Forget** removes a trusted computer and **Disconnect** locks Device Messages on the computer.
- Refresh the PC page during an active session and confirm it reconnects without another approval.
- Close the phone browser completely while leaving the Android connection notification active. Confirm the PC continues to refresh Device Messages and send a fictional SMS.
- Close and reopen the PC browser, start Connect phone again, and confirm a still-trusted PC is approved automatically while an expired/forgotten PC requires phone approval.
- Tap **Disconnect & forget all**, then confirm no previously trusted PC reconnects without a new phone approval.
- Power off or disconnect the phone and confirm the computer changes to red/unavailable rather than showing stale messages as live.

## Important category alerts and pairing permission

- On the phone, use **Prepare PC pairing** and complete the refreshed Google consent prompt. Confirm LotKeys no longer shows “The granted scopes do not give access to all of the requested spaces.”
- From the PC, send a pairing request through the same Google account and confirm the phone receives it.
- In Hub → Device → **🗂️ Organize**, star one, two and then three categories. Attempt to star a fourth and confirm the first three remain selected with the message **Choose up to three Important categories. Unstar one first.**
- Save and reload. Confirm the three stars persist after category rename, recolour, reorder and parent-level changes.
- Confirm **🗂️ Organize** is black with white text in light theme and white with black text in dark theme.
- Receive unread messages in each Important category. Confirm the original blue Hub total remains accurate and up to three smaller category-coloured dots stack beneath it in saved category order.
- Assign a conversation to an Important subcategory and confirm that both it and an Important parent alert when applicable. A multi-category thread may activate each selected Important category.
- Unstar a category that has unread messages. Confirm its chip keeps a black numbered badge in light theme and a white numbered badge in dark theme, while its category-coloured Hub-tab dot disappears.
- Select and deselect a category filter with unread messages. Confirm the numbered chip badge remains visible in both states.
- Confirm chip badges show `1–99`, then `99+`, and that parent/subcategory totals remain accurate.
- Open each unread Device conversation and wait for history to appear. Confirm its row badge, numbered category badge, main Hub total and Hub-tab dot when starred all disappear together.
- Send an outgoing reply and confirm the acknowledged alert stays cleared. Then receive a genuinely newer incoming message and confirm every applicable alert returns.

## Phone conversations and sending

- Confirm Device lists the phone's newest SMS/MMS conversations first and loads only 40 at a time.
- Use **Load older conversations** and confirm additional threads append without duplicates.
- Open a conversation and confirm older messages are above newer messages; use **Load older messages** for history.
- Confirm Android contact names appear when Contacts access is approved and LotKeys custom names take priority.
- Send a short SMS from the phone view and from the paired computer. Confirm it is actually sent by the phone.
- Confirm the message state changes through **Sending**, then **Sent** or **Failed**.
- Force a send failure and confirm LotKeys never retries automatically; only the explicit **Retry** button can try again.
- Confirm group/unsupported threads cannot be replied to from this checkpoint.

## Organization and customer records

- Confirm **Unsorted** is directly after **All Device** in the organization row and no longer appears in the lower filter row.
- Confirm **📵 Blocked** replaces **Saved contacts**. Block one saved Contact and one unsaved number, then confirm both appear there and nowhere in All, Unread, Unsorted, category views, the Hub total, numbered category alerts, or starred Important dots.
- Confirm the new/edit Contact screen and saved Contact details both show **📵 Block Number / Unblock Number**. Unblock from Contact details and from the unsaved-number Blocked card, then confirm each conversation returns to its normal organization view without losing phone history or categories.
- Open a saved Contact and confirm **📵 Block Number / Unblock Number** sits beside its primary number instead of on a separate row below it, including on a narrow phone screen.
- Open a Device thread from a numeric SMS short code such as `66000`. Confirm the new/edit Contact screen can block it, **📵 Blocked** lists it, and unblocking restores it without enabling the **Call** action or accepting it as a full Contact phone number.
- Confirm LotKeys explains that its Blocked state affects Hub views/alerts while Android's messaging app still controls phone-level blocking and notifications.
- Open Hub → Device → Organize on Android. Confirm every category card has a physical ☰ grip at the bottom-left and that holding it produces a moving card preview rather than page scrolling.
- Drag a category above and below other rows, save, close, and reopen Organize. Confirm the new order remains. Repeat once with the ↑/↓ fallback buttons.
- Confirm category names, parent/subcategory choices and colours remain editable after dragging, and removing a category still moves its subcategories to the top level without deleting contacts.
- Sort an unknown number into multiple categories/subcategories without creating a LotKeys contact.
- Confirm parent filters include conversations assigned to their subcategories and multiple selected filters combine results.
- Confirm **Unsorted** contains only numbers without a category path.
- Create a LotKeys contact from an already-sorted conversation and confirm its category choices carry into the contact.
- Rename the LotKeys contact and confirm the custom name overrides the Android contact name.
- Delete the LotKeys contact and confirm its number returns to Unsorted while the phone conversation remains.
- Confirm deleting/clearing a phone conversation does not delete the LotKeys customer folder, notes, or saved documents.

## Listing photo order

- Edit a Marketplace Listing and confirm its photo tile size and centered ☰ handle match Inventory's photo reorder surface.
- Drag selected and unselected Listing photos in several directions. Confirm the moving preview and drop cue respond as smoothly as Inventory and the saved order remains after reopening the Listing.
- Tap a selected photo off and back on. Confirm the tile never relocates, unselected photos remain grey and labelled **Not selected**, and selected photos are renumbered in selected order around skipped tiles.
- Confirm the first selected photo reads **1 · Cover**, the count reflects selected photos only, and LotKeys never permits more than 20 selected photos.

## Retained customer cards and notes

- Open a Contact and confirm **Interested Vehicle**, **💾 Media**, and **💬 Chat** stay in that order on one line. Chat remains visibly disabled when there is no current Device conversation or the number is blocked.
- Open a Device conversation with no saved Interested Vehicle. Confirm a compact **+ Interested Vehicle** card appears in the header, creates a private Contact when needed, searches Vehicle Profiles by year/make/model/stock/VIN, and can instead save any typed custom vehicle description.
- In All, confirm LotKeys Chats appears above Device Messages; collapse each independently, reopen Hub, and confirm the state is remembered.
- Confirm new messages update unread counts without forcing a collapsed group open.
- Open a saved-customer Device conversation and confirm its compact Interested Vehicle/buying card appears inside the upper-right header beside the customer details—not as a separate full-width row. Confirm the card shows photo, vehicle facts and buying summary, opens the live Vehicle Profile, and Notes, Questions, Call, Booking and Organize still fit in one row.
- Open Contact and confirm the primary Interested Vehicle/buying card is its first section. Link multiple profiles and confirm year/make/model, stock, odometer, price and `+N more` appear and the card opens the live Vehicle Profile.
- In Add Note, choose Cash or Financing using only the two buttons; confirm no text box or keyboard appears for that field. Save total budget, bi-weekly payment, down payment, Trade/No Trade and expected trade value and confirm the summary updates.
- Confirm a manual Interested Vehicle description and a linked Vehicle Profile use the same field/workflow.
- Search the Add Note topic list, save a general note, then save another with an all-day reminder and one with a time.
- Put `400 bi weekly` and `567 bi weekly would never work; too high` in recent incoming test messages. Confirm both ⤴️ choices appear with different context labels and neither is saved until tapped.
- Add six newer messages and confirm the oldest message's ⤴️ action disappears. Confirm a suggestion bubble closes after five seconds and after tapping elsewhere.
- Tap **＋ Reminder** in Calendar and confirm it opens **All reminders**. Tap the plus there, create a dated reminder, and confirm it appears as a lightweight bell/check row rather than an appointment or `.ics` event.
- Open Questions after a conversation mentions financing or a vehicle feature. Confirm answered topics are excluded and selecting a question only fills the Device draft.
- On PC, choose and preview each built-in notification sound, Silent and a short custom clip. Confirm an incoming LotKeys Chat plays only the selected PC sound.
- On Android, confirm incoming LotKeys Chat does not play an extra LotKeys sound and normal Device SMS/MMS notifications remain unchanged.
- Confirm the Hub logo has no dark corner matte, floating controls sit just above mobile navigation, and desktop controls are on the right-side rail.

## Standalone reminders

- On Home, Inventory, Listings, Garage and Account, open the top-right Create menu and confirm **🔔 Reminder** is available. Confirm Hub keeps Reminder in its own Add menu.
- Create an undated reminder and confirm the plain bell appears in the main header and directly above Calendar in Hub, but no Calendar row is created.
- Create reminders due 8, 7, 3 and 0 Edmonton calendar days away. Confirm the shared bells show plain, one mark, two marks and two marks respectively; confirm overdue also shows two marks.
- On Android, confirm the main-header one-mark bell uses a compact `!` badge rather than a stretched emoji; confirm the two-mark bell remains compact.
- Complete the final open one-time reminder and confirm both bells disappear without refreshing the page. Mark it open again from the reminder list.
- Create a Daily reminder, complete it, and confirm it is complete only for today. After the Edmonton day changes, confirm it becomes open and both bells re-evaluate automatically.
- Confirm Daily and undated reminders do not populate Calendar. Confirm a completed dated reminder stays on its due date with completed styling but does not keep either bell active.
- Open reminder details from both All reminders and Calendar. Delete one and confirm the detail closes immediately, the previous view returns, its visible count/list update before Drive finishes, and both shared bells repaint. Test Edit, Complete/Open, All/Open/Completed/Daily filters, optional Contact, raw phone, Call, linked note and Vehicle Profile actions.
- Create a reminder and confirm Customer / Contact, Phone number, and Interested Vehicle / Vehicle Profile remain hidden beneath **Additional fields** until it is opened. Edit a reminder containing one of those values and confirm the section opens automatically.
- In Hub's Device list, confirm a linked Interested Vehicle card shows the same real Vehicle Profile thumbnail as its open chat header. Confirm a manually entered vehicle not linked to Inventory still shows the standard missing-vehicle image.
- Leave the Hub Device list open for at least 15 seconds. Confirm the three-second phone checks do not flash, blank, or rebuild unchanged cards or Vehicle Profile thumbnails; then receive a test SMS and confirm the changed conversation refreshes once.
- From a Contact note, enable **Add a reminder**, optionally select a date/time, save, and confirm the note retains its reminder link. Delete the reminder and confirm the note remains.
- Delete a Contact with a linked reminder and confirm the standalone task remains with its saved name/phone and cleared Contact link.
- With a V0.9.4.92 reminder present, open V0.9.5.04 online and confirm it appears once, keeps its title/note/date/time/link/completion state, and no longer participates in appointment collisions after safe sync.
- Create a phone-only appointment and confirm its number appears once. Create a named appointment and confirm it shows **Name · Phone** once.

## Navigation and sync header hotfix

- Open Inventory, switch to the Google approval/test-user tab, then return after Chrome restores or reloads LotKeys. Confirm Inventory remains selected instead of jumping to Home. Repeat once from Garage.
- Refresh Inventory and then Listings at different times. On Home, confirm the **Synced [time]** label shows the newest successful refresh time without an ellipsis; Inventory and Listings still show their own relevant refresh times.
- Complete the final active reminder and confirm the main-header bell disappears immediately. Reopen that reminder and confirm the bell returns with the correct urgency mark.

## Retained conversation cards and appointments

- In the Device conversation list, confirm a saved name and phone number share the first line, while Customer category and the appointment date, AM/PM start–end range and booking status share the second line.
- Confirm a phone-only conversation displays its number once, not again as a subtitle.
- Tap the name, phone, category, empty card area and vehicle summary; each should open that Device chat. Confirm the appointment chip alone opens Calendar on the correct day.
- Start a new appointment on Android and confirm Date opens the native calendar screen and Time/End Time open the native clock screen. Edit the saved appointment and confirm the compact date/time editing controls remain available.
- Confirm New appointment uses this order: Customer/Contact, Interested Vehicle, Booking Status, Date, Time, End Time, Appointment Type, Notes, Location.
- Type an unsaved customer name and create a Tentative appointment without a time. Edit it later, select a saved Contact, and confirm the link is retained.
- Confirm End Time is optional, must be later than the start when supplied, and older duration-based appointments display their calculated end time.
- Confirm Date validates MM/DD/YYYY and every visible time and message timestamp uses uppercase AM/PM.
- Confirm Booked, Confirmed and Double Confirm require a time; Tentative permits Time TBD.
- Confirm types are Consultation, Test Drive, Follow-up Appointment, Vehicle Delivery and Other.
- Confirm the Hub customer card and Calendar appointment card show the same vehicle and buying information.
- Confirm each Calendar day appointment shows its start–end range above a shorter full-width customer/vehicle card.
- Confirm the appointment chip beside the phone number shows its date, start–end range and state. Tap it and confirm Calendar opens the correct selected week.

## Retained composers and media

- In Device and LotKeys Chat, tap ＋ and confirm Camera, Images and Documents appear, then disappear after five seconds or an outside tap. Confirm hold-up, hold-up-right and hold-right select those actions after roughly 0.5 seconds.
- Tap 🎙️ and confirm Voice memo and Talk to text appear, then disappear after five seconds or an outside tap. Confirm hold-right starts Voice memo and hold-left starts Talk to text; dragging back to the centre leaves the tap choices available briefly.
- Confirm selected files appear in a removable queue and are not handed off/sent until Send (or Send voice) is explicitly pressed.
- On Device, confirm a media send opens the phone's default messaging app with the correct recipient for final review. Cancel once and send once; confirm LotKeys never silently retries.
- On a received MMS attachment and on sent/received LotKeys Chat file messages, tap 💾 and choose a Contact. Confirm the file appears under Saved media.
- Tap the same 💾 action again and confirm no second Drive copy is created.
- Confirm Add to Hub shows exactly Start LotKeys Chat/Group, Create Customer/Contact, Add Note, Upload Photo/Document and Add Reminder in that order.
- Confirm there is no technical SMS/media explanation beneath the Device composer and the Lock Screen says `Enter your Lock Screen Password`.

## Known checkpoint boundaries

- RCS watching/sending, automatic direct MMS delivery, complete group/dual-SIM behavior, iPhone support, and phone-conversation deletion are not included. Media uses a reviewed handoff to the existing phone messaging app.
- Keep the Android foreground-service notification active. Force-stop, revoked Google access, lost connectivity or aggressive battery restrictions can require reopening LotKeys Connector TEST.
- Use test/non-sensitive customer data. This is a controlled TEST build, not a public Play Store release.

## Automated checks

- Run `node --test tests/*.test.js`.
- Run `node --check` on `lotkeys-phone-core.js`, `lotkeys-phone.js`, `lotkeys-hub-core.js`, `lotkeys-hub-store.js`, and `lotkeys-hub.js`.
- Confirm the GitHub workflow **Build LotKeys Android Layer** completes `assembleDebug` and `lintDebug`.
