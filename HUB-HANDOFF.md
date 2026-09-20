# Continuation checkpoint — Hub V0.9.4.82

Use this exact release as the Hub test baseline. The prior user-confirmed media baseline is V0.9.4.81 + Buddy V0.1.23; it has not been replaced by a new media implementation.

## Actual delivery status

The Hub UI, private contacts/notes/attachments, calendar, local-cache/Drive sync and encrypted Device client are implemented. Google Drive and browser storage were mocked in automated tests, not live user credentials. Model and protocol tests use real JavaScript/Python crypto with fictional messages. Native phone camera, Android companion compile/install, notification availability, Mac Messages/AppleScript and actual SMS/RCS/iMessage delivery remain hardware acceptance gates.

Do not describe the simulator as phone messaging. No APK is included, no production relay is hosted, and no direct iPhone/Windows bridge is claimed. Android uses notification Reply capabilities, not SMS inbox permissions or a replacement SMS app. iPhone testing requires a Mac and may expose unsupported rich message bodies as unavailable. Device attachments/history/new outbound recipient support are not implemented.

## Preserve

Existing app uploads/Drive/Inventory and Buddy source are outside the Hub changes. New Hub files are separately loaded and cached. Original messaging transport functions are unchanged; hooks change only home/open/preview/refresh behavior. HubDrive uses an independent database and a private owned personal Account/Hub folder, never Store customer sharing. Lock/account changes purge the live Device session. A manual contact link to a Device thread is session-scoped; exact unique phone matches can restore the category later.

## Test next

Deploy .82 on TEST, not a blind production overwrite. Verify real personal Drive permissions, first contact sync, another-device restore, revision conflict/deletion, camera permissions and correct appointment timezone. Recheck one baseline media/Buddy flow. Then use Bridge Test Kit's loopback simulator. Native Android compilation/phone tests come next; Mac/iPhone integration requires its own hardware/schema test before claiming support. Keep real customer identity/finance documents out of first tests.

Calendar is private Hub + one-way .ics export, not Google/Outlook synchronization or reminder delivery. Notes suggestions are conservative local rules with explicit user approval, not an external language model or automated eligibility decisions.
