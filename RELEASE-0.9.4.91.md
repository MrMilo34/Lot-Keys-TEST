# LotKeys 0.9.4.91 — release and test notes

Prepared 2026-09-21 from verified TEST commit
`ba7df774436bb185ae6df84510b0a9e77d5fd739`. No production repository was modified.
This package is not automatically deployed. Upload all update files together.

## Customer record versus live conversation

The saved customer has its own name, optional phone/email/custom fields, one
primary phone when numbers exist, source/category, lifecycle, deliberately saved
notes/documents, buying requirements and linked appointments. A conversation’s
notification disappearing does not delete this record.

Lifecycle choices are Active, Follow-up, Paused, Out of market, and Archived.
The default Device view excludes Archived. Other states remain findable; choose
a specific status to narrow the list. “All · including archived” shows everything.
Multiple colored categories are combined with OR; lifecycle/unread/search are
additional AND filters. Categories are flat organizational groups in this build,
not an arbitrary nested tree. For example select Facebook + Store, then Follow-up.

The customer summary puts buying requirements in a visible section: cash/financing,
body style, maximum price, maximum odometer in kilometres, stated CARFAX preference,
reason for buying, purchase timeframe and features. Blank limits are not zero.
These fields are not credit approval or a verified vehicle-history result.
The Print summary action prints the deliberately saved information, not phone texts.
It lists attachment names; open an attachment separately to print its contents.

Archive/restore keeps notes, photos/documents, requirements and appointments.
“Clear visible Device messages” clears the current RAM view only. It does not alter
Google Messages; Android may expose some of those messages again in a later active
notification. “Clear saved notes, requirements & files” removes those saved fields
and registered attachments, but preserves contact details and appointments.
“Delete customer completely” requires typing DELETE and removes the customer’s
LotKeys folder/record plus linked Hub appointments. It does not delete the phone’s
SMS history, external calendar copies, downloaded files or printed documents.
Destructive Drive operations require connectivity; errors remain visible.

## Mobile-first organization and appointments

Contact search includes names, aliases, numbers and email. Saved people remain in
the list even without a live Device thread. The category color follows the linked
record; duplicate names alone are not used to automatically match a customer.
Use the drag handle to move a row to a category, or tap the handle for a chooser.
An unsaved conversation first opens a contact form rather than silently retaining
all personal conversations. A phone number is optional, with a warning when saving
without one. Entered phone/email values still validate.

Appointments can use unmatched typed customer and vehicle descriptions, or selected
saved records. A confirmation explains when no saved match is attached. Optional
phone and vehicle text are retained as snapshots. Month/Week/Day and .ics export
remain; no Google Calendar two-way sync or automatic invitation is claimed.

Internal LotKeys chat has its own All/Unread/Groups/Contacts filters and + Add.
It does not require a Device relay or customer questionnaire. Internal attachment
sharing remains intact. Original internal messaging/VoIP code was not modified.
Approved mobile floating-button placement was preserved; logo/desktop cosmetics
were deliberately deferred.

## Saved pairing and working-session behavior

The new file `lotkeys-device-pairing.js` must be beside index.html. A saved browser
pairing is encrypted with AES-GCM and a PIN/password-derived key. PBKDF2-SHA256 uses
600,000 rounds and a random salt; the derived encryption key is not stored beside
the ciphertext. Origin, site directory and LotKeys account are bound into the
new storage key/encryption context. Messages are not written to this vault.

The existing LotKeys Lock Screen PIN/password gates remembered Device access.
Automatic screen locking can be off. Unlock once in Connection, or use the normal
Lock Screen unlock. Short lock/unlock cycles do not deliberately disconnect an
already-authorized working session. A true page reload requires unlocking again.
Four hours without user interaction expires Device access. The duration is fixed
in this test build; it is not the future 15-day trusted-computer policy.

A manual Disconnect keeps the encrypted record but pauses reconnection, including
after online/visibility events and reload in the same browser tab. Explicit Unlock
& reconnect resumes it. Forget both disconnects and deletes the local saved record.
Network interruptions retry with backoff; replies are never automatically resent
when delivery is uncertain. Concurrent restore attempts are serialized, and stale
account/connection results cannot silently replace a newer session.

The .90 saved-pairing format is migrated after a correct PIN. Old .90 rows were
only locally account-scoped with a browser-stored CryptoKey, not PIN-protected.
The new format removes that old key/row after successful migration. Keep your
private pairing files until the migration is confirmed. If the Lock Screen PIN is
changed and a saved record will not decrypt, Forget that record and pair again
with hub.json under the new PIN. A lost PIN cannot recover that encrypted record.
A session-only manual connection remains possible without remembering the code.

This is defense in depth for a local prototype, not a guarantee against a hostile
browser profile administrator, malicious same-origin scripts, or an attacker
brute-forcing a short PIN offline. Account separation is enforced by application
logic. Use a strong password on shared machines. Google/account enrollment,
individual revocable browser tokens, 15-day phone matching and SMS fallback need
a real authenticated server design; none are represented as implemented here.
For KDF background see the primary OWASP Password Storage Cheat Sheet:
https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

## Android and phone-history boundaries

Keep the already-installed Android Bridge 0.1.1. No Android files or relay Python
files are changed by this website package. Both PC and mobile Hub can use the
relay while it remains running. This still depends on the temporary PC/tunnel;
a permanent always-available relay is not deployed.

The bridge exposes approved active notifications and their Reply actions, not the
complete historical SMS/MMS/RCS inbox. “Continue in Messages” is a phone-side fallback
when a valid number is available and no live Reply action exists. It opens the
messaging application; it does not silently send anything. Attachments saved through
the customer panel remain private records, not outbound MMS attachments.
Android sometimes exposes only a display name. Verify the number manually before
linking such a thread. The 0.1.1 adapter’s fallback thread identity/background timing
still needs more real-device testing, especially same-name contacts and groups.
Primary API boundary:
https://developer.android.com/reference/android/service/notification/NotificationListenerService

The client preserves current-session threads after reply/notification removal.
Reload does not promise a complete transcript: only later events or the existing
adapter’s exposed active notifications can populate it. Clearing visible text does
not stop messages arriving later. Saved records do not depend on that transcript.

## Not implemented in this release

Complete phone-inbox mirroring; unrestricted new SMS/RCS creation inside Hub;
new-PC number-match approval; the 15-day 2FA service; permanent relay hosting;
automatic inventory-match reminders; AI extraction of arbitrary conversation facts;
automatic customer outreach. Structured buying requirements prepare for later
inventory suggestions but do not run a matching engine.

## Morning hardware acceptance test

First verify 0.9.4.91 on the website and 0.1.1 in the Android companion. Confirm
internal LotKeys chat, Calendar and + work with Device disconnected. Create a
fictional contact, note and requirement; archive/restore it; book an unmatched
customer/vehicle. Select two categories and a lifecycle filter together.

Then unlock the saved Device pairing. Use two harmless test phones: receive a new
message, reply once, verify actual receipt, and confirm the visible conversation
stays. Lock/unlock LotKeys and retry. Temporarily disable/re-enable network access
and observe recovery. Deliberately Disconnect; tab switching must not reconnect.
Reload and unlock the same pairing. Check the phone version on the same account.
Finally verify another LotKeys account does not display this account’s saved record.
Do not use real ID/financial documents for the first test.

Automated evidence, counts and limitations are in TEST-REPORT.json. The tests
exercise actual application logic with fixtures and Chromium DOM interactions;
physical Android background behavior and real carrier/Google Drive calls were not
performed here. See TESTS-0.9.4.91.zip for the reproducible test harness.
