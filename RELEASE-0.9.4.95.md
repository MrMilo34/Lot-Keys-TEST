# LotKeys 0.9.4.95 — Navigation recovery hotfix

This is a browser/PWA hotfix on top of the 0.9.4.94 Phone Mirror test release. It does not change
the Phone Mirror 0.2.0 protocol, Android permissions, pairing files, Store Processor or Posting Buddy.

## Fixed

- Navigation now replaces the previous page with a route-specific loading shell before any IndexedDB
  work begins. The title, highlighted tab and body therefore cannot remain split across two sections.
- Each navigation has a generation token. A slow Account, Inventory, Listings or Garage render is
  discarded if the user has already selected another section.
- A 12-second route watchdog shows a retry card without clearing or changing saved data.
- Account-photo and Listing-alert reads no longer block the selected page from opening. Listing-alert
  calculation is scheduled during idle time.
- Blob-backed vehicle thumbnails are revoked only after no displayed image uses them. This prevents
  the broken thumbnail placeholders seen when a refresh began before the replacement page committed.
- Inventory resolves the current user once per card batch rather than once for every vehicle.

## Preserved

- Existing IndexedDB records, Google Drive data, account settings and PIN-protected pairings.
- Phone Mirror 0.2.0 SMS/MMS history and explicit SMS-send test behavior from 0.9.4.94.
- Store Processor 0.9.4.76 and Facebook Posting Buddy 0.1.23.
- The full 0.9.4.94 Phone Mirror test record in `RELEASE-0.9.4.94.md` and `TEST-REPORT.json`.

## Deployment and backup

Deploy the complete `main` branch through GitHub Pages. The successful GitHub Actions run publishes
`LotKeys-Phone-Mirror-Source`, a ZIP containing the complete repository folder, plus the separately
compiled `LotKeys-Phone-Mirror-APK`. Do not clear LotKeys site storage or replace working pairing files.

## Verification

- Inline browser scripts and all standalone JavaScript parse successfully.
- Version, manifest and service-worker cache identifiers agree on build 09495.
- The complete repository checksum manifest validates after packaging.
- Static navigation regression checks confirm immediate stale-body replacement, nonblocking badge work,
  stale-render rejection and safe Blob URL cleanup.

Physical phone/carrier behavior remains governed by the 0.9.4.94 test limitations: private RCS,
MMS sending and attachment download are not implemented.
