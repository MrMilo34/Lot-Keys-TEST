# LotKeys Hub V0.9.4.82 — first test

This is a controlled test build, made from the approved V0.9.4.81 release. Start with a fictional customer and non-sensitive documents. Do not replace your dealership's approved customer/finance system with this prototype.

## Install the main app

Keep the V0.9.4.81 ZIP as a rollback copy. Upload the complete contents of this release to the existing Lot-Keys-TEST repository, with the same folder structure. Do not add CNAME to the TEST repository. Open the TEST site with `?build=09482` after deployment and confirm V0.9.4.82 in Account. The main bottom tab now says **Hub**.

Posting Buddy stays V0.1.23. Its bundled ZIP and `extension/latest.json` are unchanged. Store Processor stays V0.9.4.76; no reinstall is required.

## First contact test

Open Hub → ＋ → New customer/contact. Create **Jordan Example**, phone **780-555-0123**, and select Customers. Add a second phone, a second email, and an alias. Rename a field with the pen and make one valid phone Primary.

Return to All: Jordan has the Customers colour and no LotKeys avatar. LotKeys conversations retain their existing avatar rows. Device → Customers → Unread applies both the category and unread filters. Use Device → Organize to rename/add/delete colour categories. Deleting an organization category does not delete its contacts.

Search Jordan by name, alias, either phone, or email. Saved contacts work without a Device connection; a saved contact is not presented as a live phone conversation.

## Private Drive test

Your personal Lot-Keys Account folder must be owned by you and unshared. Hub will refuse Store/shared-drive storage or a shared personal root. Save and press Hub **Sync**. Inspect the new `Hub/Customers/CUST-…/Contact.json` inside your personal Account folder. Contact names, fields, notes and attachment metadata are stored here. Appointments and organization categories are separate Hub records.

A local pending record is not yet saved on your other device. Sign into the same Google account on the other device and open Hub/Sync. A detected conflicting revision is retained for explicit review instead of being silently overwritten. Avoid simultaneous editing of the same record during this first test.

## Notes, camera and documents

Open Jordan → Add note. Choose Budget, Down payment, Trade, Decision makers, Co-applicant discussion, or General note. Save explicitly. Questions to Ask shows answered topics and neutral prompts for missing information. Conversation suggestions use conservative local text rules—not a cloud AI model—and require your approval before saving. No question is sent automatically.

Open Photo/document → Choose files and upload a harmless pitch-sheet PDF or photo. Camera uses the in-app live preview, Take photo, Retake and Save to customer. LotKeys does not intentionally write captures to the phone photo gallery. Browser/OS temporary memory can still exist. Camera permissions and HTTPS are required; file selection remains available if camera access is denied.

Attachments are limited to 50 MiB each in this test. Saved documents ARE retained in private Drive. Device messages are not archived there. Do not put SINs, licence numbers or full financing records in ordinary fields/notes. Sensitive document handling requires an approved retention/permission workflow before real use.

Open/Save-print offers a copy for your usual document app. A downloaded/printed copy is outside Hub deletion. Delete one note/file, or Clear saved notes & attachments while keeping the contact. Delete contact & saved data permanently removes its Hub Drive folder, local customer data and linked Hub appointments after confirmation. It does not delete phone messages or exported calendar copies.

## Calendar test

Open the calendar button above the phone button, or Hub ＋ → Add appointment. Search the saved contact, select a Vehicle Profile, date/time and duration. Save a 9:15 AM test drive. Month, Week and Day are real views; tapping a date lists that day's appointments from earliest to latest. Cards show customer, primary number, vehicle, stock number, mileage and price.

Appointment creation is also available in LotKeys and live Device conversations. Saved time is UTC with the creation timezone; display follows the current device timezone. A daylight-saving time that does not exist is rejected. Overlap prompts do not automatically block a deliberate appointment.

The calendar is private Hub data. **Google Calendar/Outlook are not synchronized in this build.** Export .ics creates a separate copy; future changes/deletions do not update that copy. Saving an appointment does not send invitations, texts, or reminders. No background appointment alarm is implemented yet.

## Device bridge test

The main ZIP contains the real encrypted Device client, but it does not automatically install a phone bridge or host a relay. Use the separate **LotKeys Device Bridge Test Kit 0.1.0**.

Start with its fictional-message simulator. Android is a native companion **source project**, not a compiled APK in this delivery. The Mac/iPhone adapter is runnable Python source, but needs a Mac with Messages forwarding and explicit local permissions. Neither native route has been tested on your actual devices. An iPhone plus a Windows PC alone is not supported as an integrated Device bridge in this prototype.

Device replies require a live, exact adapter conversation/reply capability. The UI distinguishes sending, submitted to phone, rejected and unconfirmed. “Submitted” does not mean carrier delivery. Never retry an unconfirmed reply until checking the source phone.

Device transcripts and browser pairing keys stay in memory only; disconnect, lock, account change, page close or reload clears them. The external messaging app retains its own normal history. An Android notification may disappear/revoke reply ability when dismissed. Device history, MMS/photo attachment transfer and unsolicited outbound messages to arbitrary contacts are not part of this first bridge test.

## Preserve the known-good baseline

After the Hub tests, run one normal Vehicle Profile photo/video upload and one Buddy video-first post/update. The existing media function bodies, all original media/assets modules and the Buddy archive have been kept unchanged. These real-account checks confirm deployment integrity; the automated browser tests used simulated storage/Drive, not your accounts.
