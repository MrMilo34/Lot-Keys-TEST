# LotKeys 0.9.4.98

This release keeps the final working V0.9.4.81 application checkpoint (`13e50428fb13ef1c296d1bb79fccdb88c57e1cd2`) as the protected data, Google Drive, upload and recovery baseline. It retains the V0.9.4.97 Hub/Phone Mirror integration and repairs the navigation and routine-sync failures observed on the phone.

## Repairs

- Every Home, Inventory, Listings, Account and Garage render now carries a navigation epoch. Only the currently selected route may replace the page body.
- A loading shell appears immediately during a cached read. After eight seconds it reports that the saved phone copy is still opening, but it never cancels or invalidates that read.
- Visible Blob-backed thumbnails are kept alive until their DOM nodes are removed, preventing an earlier render from revoking images that the user can still see.
- Routine Inventory checks use a small local ID/sync-state mirror when available rather than cloning media-heavy Vehicle records from IndexedDB.
- Pending Vehicle and Listing recovery loads only the individual records that need work when the metadata mirror is available.
- An unchanged Inventory or Listings index no longer triggers another full Vehicle/Listing reconciliation scan.
- The Inventory folder audit now follows the existing five-minute background refresh cadence instead of repeating every 30 seconds.
- Read-only Google Drive checks stop after 30 seconds and return control to the UI instead of leaving the header and Refresh button indefinitely on Syncing. Drive writes are not automatically timed out or repeated, avoiding an ambiguous duplicate write.

## Data safety

- IndexedDB remains the authoritative source for complete Vehicle and Listing records, including every photo, video and document Blob.
- The metadata mirror is disposable and automatically rebuilt by normal IndexedDB reads/writes. It is never treated as authoritative data.
- Database schema version 3 is retained only for forward compatibility with phones that briefly opened V0.9.4.96.
- No summary store, cover store, database migration, storage clear or account reset is introduced.
- Full V0.9.4.81 Drive reconciliation still runs whenever the remote folder/index state actually changes.

## Retained

- Private Hub contacts, notes, documents, appointments, categories and internal LotKeys Chat
- Android Phone Mirror 0.2.0 SMS/MMS history, paging, explicit SMS send and reconnect support
- Posting Buddy V0.1.23
- Store Processor V0.9.4.76
- V0.9.4.80 parallel/resumable Vehicle media uploads and recovery checkpoints

Phone Mirror 0.2.0 does not need to be reinstalled for this website-only repair. Do not clear site storage.
