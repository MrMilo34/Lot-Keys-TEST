# LotKeys V0.9.4.97 — stable V0.9.4.81 core + Phone Hub

V0.9.4.97 deliberately returns the application core to the final proven V0.9.4.81 checkpoint (`13e5042`). Startup, Home, Inventory, Listings, Vehicle Profiles, Google Drive synchronization, resumable media uploads, Posting Buddy V0.1.23 and Store Processor V0.9.4.76 remain on that known-good implementation. Only the isolated Hub/Phone Mirror integration is carried forward.

## Included
- **V0.9.4.81 application core restored:** the V0.9.4.95 route watchdog and V0.9.4.96 summary-store experiment are not included.
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

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=09497`

Do not clear site storage. Close every older LotKeys tab/PWA instance before reopening so the new service worker and the existing phone database can reconnect cleanly.

For the extension, install V0.1.23 unpacked, reload the LotKeys and Facebook tabs once, and test both a newly added official Vehicle Profile video and a video in the signed-in user's More Media.
