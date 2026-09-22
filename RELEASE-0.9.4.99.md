# LotKeys 0.9.4.99

This release keeps the final working V0.9.4.81 application checkpoint (`13e50428fb13ef1c296d1bb79fccdb88c57e1cd2`) as the protected data, Google Drive, upload and recovery baseline. It retains the V0.9.4.98 route/sync repair and addresses the remaining Android-phone failure demonstrated by `1000074748.mp4`.

## Confirmed phone failure

- Home eventually rendered 37 cached Vehicles and 23 Listings.
- Once background synchronization was active, Inventory, Listings, Garage and a later Home visit remained on “Opening … / loading the saved phone copy.”
- Account and Hub continued to open because they do not require the same full Vehicle/Listing store reads.
- Headers and selected tabs stayed correct, confirming the V0.9.4.98 route-ownership repair worked.

This isolates the remaining freeze to repeated media-heavy IndexedDB cloning during navigation, not the additional repository folders, GitHub Pages routing, the Phone Mirror relay or a cross-route paint.

## Repair

- The first complete read of each existing IndexedDB store is retained in a disposable in-memory map for the lifetime of the page.
- Later `all`, `get` and indexed reads use that hydrated map instead of cloning the same photo, video and document Blobs again.
- Concurrent first reads are deduplicated so only one `getAll()` clone runs per store.
- Existing `put`, `delete` and `clear` helpers maintain the in-session map only after the IndexedDB operation succeeds.
- A cached navigation read remains available while a background write is pending, so tab rendering no longer waits behind that write.

## Data safety

- IndexedDB remains authoritative across reloads.
- Database schema version 3 and the original V0.9.4.81 object-store set are unchanged.
- No summary store, cover store, migration, storage clear or account reset is introduced.
- Google Drive writes, media upload ordering, resumable checkpoints and full reconciliation functions remain byte-for-byte on the protected V0.9.4.97/V0.9.4.81 implementation spans.
- The in-session read cache is disposable and is rebuilt after a normal page reopen.

## Retained

- V0.9.4.98 route ownership, safe Blob URL lifecycle, lightweight sync-state mirror and bounded read-only Drive requests
- Private Hub and internal LotKeys Chat
- Android Phone Mirror 0.2.0
- Posting Buddy V0.1.23
- Store Processor V0.9.4.76

Phone Mirror 0.2.0 does not need to be reinstalled for this website repair. Do not clear site storage.
