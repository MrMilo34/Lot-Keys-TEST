# LotKeys 0.9.4.96 — Lightweight Inventory/Listings cache hotfix

This browser/PWA hotfix corrects the phone-cache timeout seen in 0.9.4.95. It preserves the
Phone Mirror 0.2.0 protocol, Android source, Google Drive source-of-truth model, Store Processor,
Posting Buddy and the established Vehicle/Listing upload pipeline.

## Root cause

Inventory and Listings were reading complete IndexedDB Vehicle records before painting. Those records
can contain every cached photo, document and video. Listings then reopened a full Vehicle record for
each card. While background synchronization performed its own reads, the 0.9.4.95 12-second watchdog
invalidated the otherwise valid route render, so retrying could repeat the same cancellation forever.

## Fixed

- IndexedDB schema 3 adds lightweight `vehicleSummaries` and `listingSummaries` stores for list cards.
- The automatic upgrade derives summaries from the existing saved records without deleting, moving or
  rewriting the authoritative full records.
- `vehicleCovers` and `listingCovers` retain only a card cover image. Cards paint from summaries first,
  then hydrate thumbnails progressively without blocking navigation.
- Every subsequent Vehicle or Listing write updates its full record and matching summary atomically.
- Inventory, Home and Listings render from summaries; Listing cards reuse one Vehicle/location lookup
  map rather than issuing one full-record read per card.
- The 12-second timer now changes the loading message but does not cancel the active render. A retry is
  offered only after 45 seconds, and the original read may still complete safely in the background.

## Preserved from the known-good synchronization builds

- Google Drive remains the source of truth; local IndexedDB remains a speed/offline cache.
- Vehicle photos and video still upload together, photos retain up to three workers, and large media
  keeps resumable Drive sessions, saved checkpoints, byte progress and automatic resume.
- Inventory/Listings refresh, pending-item protection, Listing null-progress handling and background
  reconciliation are unchanged.
- Full photos, videos, documents and upload drafts remain available when a Profile or editor opens.

## Deployment and backup

Deploy the complete `main` branch through GitHub Pages. The successful GitHub Actions run publishes
`LotKeys-Phone-Mirror-Source`, a ZIP of the complete repository, plus the separately compiled APK.
Do not clear LotKeys site storage; the summary/cover migration runs automatically on first open.

## Verification

- Version, manifest, service-worker cache and asset query identifiers agree on build 09496.
- Static regression checks parse all inline/standalone JavaScript and verify the summary stores,
  non-destructive watchdog, progressive cover paths and preservation of resumable/parallel uploads.
- Full repository checksums are regenerated for the published tree.

Physical phone acceptance is still required. Private RCS, MMS sending and attachment download remain
outside the Phone Mirror 0.2.0 test scope.
