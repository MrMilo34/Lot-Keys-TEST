# LotKeys V0.9.4.99 — stable V0.9.4.81 core + phone navigation repair + Phone Hub

V0.9.4.99 keeps the final proven V0.9.4.81 checkpoint (`13e5042`) as its data, upload and synchronization baseline, retains the upgraded Hub/Phone Mirror, and fixes the remaining physical-phone failure recorded on V0.9.4.98: data-backed tabs waiting indefinitely while Android Chrome repeatedly cloned the same media-heavy IndexedDB records behind synchronization work.

## Included
- **V0.9.4.81 application core restored:** the V0.9.4.95 route watchdog and V0.9.4.96 summary-store experiment are not included.
- **Correct route ownership:** every Home, Inventory, Listings, Account and Garage render owns a navigation token. A slow page can finish its read, but it cannot overwrite a newer selected page.
- **No false route timeout:** the loading shell can report that a read is still opening, but it never invalidates or cancels a legitimate phone-cache read.
- **One full local read per store per page session:** after the first complete IndexedDB read, normal tab changes reuse an in-memory read-through copy instead of cloning all cached media again. Existing save/delete/clear helpers maintain the copy after IndexedDB succeeds.
- **No database migration:** the read-through copy is disposable page memory, not a new object store or authoritative data source. Closing the page discards it naturally.
- **Lightweight routine synchronization checks:** a small local metadata mirror tracks IDs and sync state only. Full Vehicle/Listing records and all media remain exclusively authoritative in the existing IndexedDB stores.
- **Unchanged Drive checks stay light:** unchanged indexes no longer launch full Vehicle/Listing reconciliation scans, while actual index/folder changes still use the complete V0.9.4.81 reconciliation path.
- **Syncing cannot wait forever on a read:** read-only Google Drive requests stop after 30 seconds and unwind the visible refresh state. Potentially ambiguous Drive writes are not automatically timed out or repeated.
- **Stable cached thumbnails:** active Blob URLs are retained until their page nodes are replaced, preventing navigation from breaking images that are still visible.
- **Forward-compatible phone cache:** IndexedDB remains on schema version 3 only so a phone that opened V0.9.4.96 can return safely without clearing site storage. LotKeys uses the original V0.9.4.81 stores and read/write paths.
- **Upgraded Hub retained:** private Hub contacts, notes, documents, appointments, categories and internal LotKeys Chat remain available.
- **Phone Mirror 0.2.0 retained:** Android native SMS/MMS history, older-message paging, explicit SMS sending through the phone and foreground reconnect remain in the companion build. RCS and MMS sending/attachment downloads remain outside this test build.
- **Fresh Vehicle video discovery:** Posting Buddy can ask the open LotKeys tab to refresh the official Vehicle Profile Videos folder directly from Drive. A video added after a Marketplace Listing was created no longer requires re-saving the LotKeys Listing before the Buddy can discover it.
- **Per-user More Media retained:** the signed-in user's own existing More Media Videos are checked separately; another user's More Media is never exposed and empty More folders are not created just for discovery.
- **Management Updates cleanup:** admin controls are above the top post for administrators. Published images and videos no longer show device filenames, MIME types, or file sizes. Real downloadable documents/files keep their filename and open/download row.
- **Posting Buddy V0.1.23 bundled:** video is prepared early and handed to Facebook first; selected Photos, Description and Details continue while Facebook handles the video. The fields timer finishes from live Facebook editor readiness rather than a fixed video delay.
- **Existing update safety preserved:** selected photo updates still rebuild the Facebook photo set in the saved LotKeys order rather than appending duplicates; selected text fields remain replacement updates.
- **Processor unchanged:** Store Processor V0.9.4.76 remains current.

## Test deployment
The GitHub Actions run packages the complete repository as `LotKeys-Phone-Mirror-Source` and builds the Android companion APK. Keep `CNAME` absent in `Lot-Keys-TEST`, and open:

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=09499`

Do not clear site storage. Close every older LotKeys tab/PWA instance before reopening so the new service worker and the existing phone database can reconnect cleanly. Phone Mirror 0.2.0 does not need to be reinstalled for this website-only repair.

For the extension, install V0.1.23 unpacked, reload the LotKeys and Facebook tabs once, and test both a newly added official Vehicle Profile video and a video in the signed-in user's More Media.
