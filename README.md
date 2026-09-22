# LotKeys V0.9.5.0 — isolated Hub V2 preview

V0.9.5.0 starts the Hub rebuild from the exact final V0.9.4.81 commit. Inventory, Listings, Google Drive synchronization, resumable media uploads, Posting Buddy V0.1.23, Store Processor V0.9.4.76, Awards, Account and Garage remain on that known-good foundation.

## Hub V2 checkpoint

- The Hub is a separately loaded overlay. It does not own application startup, normal route rendering, Inventory/Listings reads, Google Drive synchronization, or media-upload state.
- The existing encrypted LotKeys Chat file remains byte-for-byte identical to V0.9.4.81 and opens as its own surface.
- The Device connector talks only to the Phone Mirror relay. SMS/MMS threads and message bodies stay in RAM and disappear from Hub when the phone is unavailable.
- Saved pairing contains no message bodies and remains encrypted locally with the LotKeys Lock Screen PIN/password.
- The first checkpoint intentionally implements the All / LotKeys / Device boundary and live Device replies before adding customer categories, notes, documents and calendar back as separate modules.

## Preview testing

This branch is not the live release. Test only after the full automated package passes, then open the staging URL supplied with the build and confirm:

1. Home, Inventory, Listings, Garage and Account behave exactly like V0.9.4.81.
2. Hub opens without starting or blocking Store synchronization.
3. LotKeys Chat still opens and sends independently.
4. Device conversations appear only while Phone Mirror is connected.
5. Closing the phone/relay removes Device access without affecting Inventory or Listings.

---

## Preserved V0.9.4.81 release notes

V0.9.4.81 is a focused workflow update built directly on V0.9.4.80. It keeps the V0.9.4.80 parallel Vehicle Profile media uploader and V0.9.4.79 safe editor recovery unchanged while tightening Posting Buddy video discovery and Management Updates.

## Included
- **Fresh Vehicle video discovery:** Posting Buddy can ask the open LotKeys tab to refresh the official Vehicle Profile Videos folder directly from Drive. A video added after a Marketplace Listing was created no longer requires re-saving the LotKeys Listing before the Buddy can discover it.
- **Per-user More Media retained:** the signed-in user's own existing More Media Videos are checked separately; another user's More Media is never exposed and empty More folders are not created just for discovery.
- **Management Updates cleanup:** admin controls are above the top post for administrators. Published images and videos no longer show device filenames, MIME types, or file sizes. Real downloadable documents/files keep their filename and open/download row.
- **Posting Buddy V0.1.23 bundled:** video is prepared early and handed to Facebook first; selected Photos, Description and Details continue while Facebook handles the video. The fields timer finishes from live Facebook editor readiness rather than a fixed video delay.
- **Existing update safety preserved:** selected photo updates still rebuild the Facebook photo set in the saved LotKeys order rather than appending duplicates; selected text fields remain replacement updates.
- **Processor unchanged:** Store Processor V0.9.4.76 remains current.

## Test deployment
Upload the complete ZIP to `Lot-Keys-TEST`, keep `CNAME` absent, and open:

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=09481`

For the extension, install V0.1.23 unpacked, reload the LotKeys and Facebook tabs once, and test both a newly added official Vehicle Profile video and a video in the signed-in user's More Media.
