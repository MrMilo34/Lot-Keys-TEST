# LotKeys 0.9.4.97

This release is intentionally built from the final working V0.9.4.81 checkpoint, commit `13e50428fb13ef1c296d1bb79fccdb88c57e1cd2`.

## Retained from V0.9.4.81

- Startup and account restoration
- Home, Inventory and Listings routes
- Vehicle Profile and Listing local-cache behavior
- Google Drive as the authoritative store
- Parallel/resumable Vehicle media uploads and recovery checkpoints
- Posting Buddy V0.1.23
- Store Processor V0.9.4.76

## Carried forward separately

- Private Hub contacts, notes, documents, appointments and categories
- Internal LotKeys Chat inside Hub
- PIN-protected Device pairing and RAM-only Device conversation mirror
- Android Phone Mirror 0.2.0 native SMS/MMS history, older-message paging, explicit SMS send and reconnect support

## Deliberately excluded

- V0.9.4.95 route-loading watchdogs
- V0.9.4.96 summary, cover-cache and full-record migration experiment
- Any change to V0.9.4.81 synchronization, upload ordering or resumable-transfer functions

IndexedDB is opened as schema version 3 only for forward compatibility with devices that already opened V0.9.4.96. The application continues using the original V0.9.4.81 stores and behavior. Do not clear site storage.
