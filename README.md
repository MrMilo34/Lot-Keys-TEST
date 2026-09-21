# LotKeys 0.9.4.91 — Customer records + dependable Device sessions

Controlled TEST build based on `MrMilo34/Lot-Keys-TEST` commit
`ba7df774436bb185ae6df84510b0a9e77d5fd739` (website 0.9.4.90).

**Keep Android Bridge 0.1.1. This is a website update, not an APK update.**

Start with **START-HERE-0.9.4.91.txt**. The full feature/change list, migration notes,
known boundaries and morning test sequence are in **RELEASE-0.9.4.91.md**.
Automated results are in **TEST-REPORT.json**; hashes are in **CHECKSUMS.txt**.

## What this build changes

Customer profiles, deliberately saved notes/documents, buying requirements and
appointments are independent of transient Device messages. Archive/restore keeps
the record, clear-visible-messages clears only RAM, clear-saved-contents removes
saved notes/requirements/registered attachments, and Delete customer removes the
record, its folder and linked Hub appointments after explicit confirmation.

Device category chips are multi-select; a separate customer-status filter narrows
that union. Desktop drag/drop and a touch handle/chooser support organization.
Appointments accept typed names and vehicles without forcing saved-record matches.

The saved-pairing box now asks for the existing LotKeys PIN/password once for a
work session. A successful normal Lock Screen unlock can satisfy the same gate.
Temporary network interruptions retry; intentional Disconnect does not undo itself.
Saved .90 browser pairings migrate only after PIN validation. See security limits
in the release notes: this is not a production second-factor enrollment service.

## Protected baseline

The existing Vehicle media function bodies, original artwork, internal messaging
module, extension assets/Posting Buddy archive, and Store Processor are unchanged.
Approved phone floating-button placement remains unchanged. No CNAME is included
for the TEST repository. Do not delete existing repository folders when uploading.

## Boundaries

No complete phone SMS/RCS inbox mirror, 15-day phone approval/2FA service, cloud
relay deployment, automatic inventory matching or outgoing customer campaign is
implemented. Existing Android 0.1.1 continues to supply notification-based replies.
The temporary PC relay and tunnel must stay available, including while using Hub
on the phone. Saved customer records remain usable without a live Device link.

Tests use fictional records, actual local protocol/crypto, API contract fixtures,
and Chromium UI interactions. They do not certify Android background reliability,
actual carrier delivery, native browser IndexedDB persistence or real Google Drive
permissions. Those need the next hardware/browser test.
