# LotKeys V0.9.4.91 team-test checklist

## Clean V0.9.4.83 baseline

- Open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09491` and confirm **V0.9.4.91 / 09491**.
- Confirm Account storage still restores the profile photo, celebration sounds, and Description Builder templates from the selected personal folder.
- Confirm Inventory, Listings, Garage, internal LotKeys Chat, and Posting Buddy still open normally.
- Confirm Hub contacts, notes, documents, appointments, categories, and subcategories from V0.9.4.83 remain available.

## Android setup

- Download the GitHub Actions artifact named **LotKeys-Android-V0.9.4.91** and install its `app-debug.apk` on an Android 11+ test phone.
- Confirm Android screenshots and screen recording work while the connector setup is visible.
- Open **LotKeys Connector TEST** and approve Messages access. Contacts is optional but required to show Android contact names.
- Confirm the setup clearly says the phone's existing messaging app stays the default.
- Approve the quiet connection-status notification, then tap **Open LotKeys & Link This Phone**.
- Confirm LotKeys opens in the browser and shows **SMS/MMS live** in amber—not full/RCS coverage.

## Pairing

- Sign into the same LotKeys Google account on the phone and computer.
- On the computer, open Hub and choose **Connect phone**.
- Confirm a four-digit code appears on the computer and the same code plus computer name appears on the phone.
- Approve with each trust choice at least once: Ask Every Time, 36 Hours, 7 Days, and Until I Disconnect.
- Confirm a second computer connection replaces the first active computer session.
- Confirm **Forget** removes a trusted computer and **Disconnect** locks Device Messages on the computer.
- Power off or disconnect the phone and confirm the computer changes to red/unavailable rather than showing stale messages as live.

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

- Sort an unknown number into multiple categories/subcategories without creating a LotKeys contact.
- Confirm parent filters include conversations assigned to their subcategories and multiple selected filters combine results.
- Confirm **Unsorted** contains only numbers without a category path.
- Create a LotKeys contact from an already-sorted conversation and confirm its category choices carry into the contact.
- Rename the LotKeys contact and confirm the custom name overrides the Android contact name.
- Delete the LotKeys contact and confirm its number returns to Unsorted while the phone conversation remains.
- Confirm deleting/clearing a phone conversation does not delete the LotKeys customer folder, notes, or saved documents.

## V0.9.4.91 customer cards and notes

- In All, confirm LotKeys Chats appears above Device Messages; collapse each independently, reopen Hub, and confirm the state is remembered.
- Confirm new messages update unread counts without forcing a collapsed group open.
- Open a saved-customer Device conversation and confirm its compact Interested Vehicle/buying card appears inside the upper-right header beside the customer details—not as a separate full-width row. Confirm the card shows photo, vehicle facts and buying summary, opens the live Vehicle Profile, and Notes, Questions, Call, Booking and Organize still fit in one row.
- Open Contact and confirm the primary Interested Vehicle/buying card is its first section. Link multiple profiles and confirm year/make/model, stock, odometer, price and `+N more` appear and the card opens the live Vehicle Profile.
- In Add Note, choose Cash or Financing using only the two buttons; confirm no text box or keyboard appears for that field. Save total budget, bi-weekly payment, down payment, Trade/No Trade and expected trade value and confirm the summary updates.
- Confirm a manual Interested Vehicle description and a linked Vehicle Profile use the same field/workflow.
- Search the Add Note topic list, save a general note, then save another with an all-day reminder and one with a time.
- Put `400 bi weekly` and `567 bi weekly would never work; too high` in recent incoming test messages. Confirm both ⤴️ choices appear with different context labels and neither is saved until tapped.
- Add six newer messages and confirm the oldest message's ⤴️ action disappears. Confirm a suggestion bubble closes after five seconds and after tapping elsewhere.
- Create a Reminder directly from Calendar; confirm all-day reminders sort above appointments and `.ics` export uses a date-only event.
- Open Questions after a conversation mentions financing or a vehicle feature. Confirm answered topics are excluded and selecting a question only fills the Device draft.
- On PC, choose and preview each built-in notification sound, Silent and a short custom clip. Confirm an incoming LotKeys Chat plays only the selected PC sound.
- On Android, confirm incoming LotKeys Chat does not play an extra LotKeys sound and normal Device SMS/MMS notifications remain unchanged.
- Confirm the Hub logo has no dark corner matte, floating controls sit just above mobile navigation, and desktop controls are on the right-side rail.

## V0.9.4.91 conversation cards and appointments

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

## V0.9.4.91 composers and media

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
- Keep LotKeys open on the phone while testing a paired computer. The Android layer stays ready, but this checkpoint does not claim browser-independent always-on internet relay.
- Use test/non-sensitive customer data. This is a controlled TEST build, not a public Play Store release.

## Automated checks

- Run `node --test tests/*.test.js`.
- Run `node --check` on `lotkeys-phone-core.js`, `lotkeys-phone.js`, `lotkeys-hub-core.js`, `lotkeys-hub-store.js`, and `lotkeys-hub.js`.
- Confirm the GitHub workflow **Build LotKeys Android Layer** completes `assembleDebug` and `lintDebug`.
