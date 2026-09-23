# LotKeys V0.9.4.84 team-test checklist

## Clean V0.9.4.83 baseline

- Open `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09484` and confirm **V0.9.4.84 / 09484**.
- Confirm Account storage still restores the profile photo, celebration sounds, and Description Builder templates from the selected personal folder.
- Confirm Inventory, Listings, Garage, internal LotKeys Chat, and Posting Buddy still open normally.
- Confirm Hub contacts, notes, documents, appointments, categories, and subcategories from V0.9.4.83 remain available.

## Android setup

- Download the GitHub Actions artifact named **LotKeys-Android-V0.9.4.84** and install its `app-debug.apk` on an Android 11+ test phone.
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

## Known checkpoint boundaries

- RCS watching/sending, MMS/file sending, complete group/dual-SIM behavior, iPhone support, and phone-conversation deletion are not included.
- Keep LotKeys open on the phone while testing a paired computer. The Android layer stays ready, but this checkpoint does not claim browser-independent always-on internet relay.
- Use test/non-sensitive customer data. This is a controlled TEST build, not a public Play Store release.

## Automated checks

- Run `node --test tests/*.test.js`.
- Run `node --check` on `lotkeys-phone-core.js`, `lotkeys-phone.js`, `lotkeys-hub-core.js`, `lotkeys-hub-store.js`, and `lotkeys-hub.js`.
- Confirm the GitHub workflow **Build LotKeys Android Layer** completes `assembleDebug` and `lintDebug`.
