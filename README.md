# LotKeys V0.9.4.82 — Hub test release

Built forward from the user-approved V0.9.4.81 / Posting Buddy V0.1.23 media baseline.

## Ready for controlled testing

Chat becomes Hub with All / LotKeys / Device categories, scoped unread filters, user-created coloured Device organization categories and searchable private customer contacts. Repeated phone/email/custom fields support renamed labels and a primary phone number. Existing internal messaging and VoIP remain available.

Private customer notes, Questions to Ask, camera/file attachments, individual/content/contact deletion and vehicle-linked Month/Week/Day appointments are implemented. Records synchronize to the user's owned, unshared personal Lot-Keys Account/Hub Drive area, with local account isolation, explicit conflicts and deletion tombstones. Calendar export is .ics only; no Google/Outlook two-way sync, automatic invitation or reminder is claimed.

## Device messaging is a separate prototype

Hub has an encrypted, session-only Device client. Actual texts require the separate Device Bridge Test Kit, adapter installation and an authorized private HTTPS relay. Android companion source is supplied but no compiled APK is included. iPhone testing uses a Mac intermediary; iPhone + Windows alone is not integrated. Native phone delivery has not been hardware-tested. Use the fictional-message simulator first.

## Protected baseline

Existing Vehicle Profile upload/resume function bodies, all original assets, awards/info code, Store Processor V0.9.4.76 and Posting Buddy V0.1.23 ZIP remain unchanged. No Processor reinstall or Buddy update is required. Upload all release files together to Lot-Keys-TEST; do not add CNAME to TEST. Open the test site with `?build=09482`.

Read **HUB-TEST-GUIDE.md** first. **HUB-ARCHITECTURE.md** explains data boundaries and prototype limits. **TEST-REPORT.json** records exactly what was and was not tested. Start with fictional customer data, not IDs or financing records.
