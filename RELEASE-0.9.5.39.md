# LotKeys TEST V0.9.5.39 candidate — background transfers and phone doorbell

Prepared from main d8caf710905bd26ddb540489052ba387428ee9a0 (web .38,
Android .12). This branch is not a deployed or real-device-verified release.

## Vehicle Profile saves

An optional, separately consented Android Drive grant enables background saves
for administrator Vehicle Profiles, including original photos, videos and
document attachments. The existing browser path remains available with older
connectors and when background uploads have not been authorized. Personal
Marketplace Listings, non-admin More contributions and Account assets retain
their existing foreground paths in this candidate.

The browser prepares folders, core profile information and the Vehicle Info
Directory first, then hands every pending original to app-private Android
storage before committing one durable batch. Keep LotKeys open through
**Preparing originals**. **Android has the originals** means the browser may
close; it does not mean Drive has finished. The upload notification and retained
receipt track later progress. Android controls scheduling and may defer or stop
ordinary background jobs; a visible Chrome/PWA window is not the connector's
native activity. Resume Drive Saves in native setup can request a UIDT job on
eligible Android 14+ devices. No endless data-sync foreground service is added.

Atomic manifests and source checkpoints survive a process restart. Resumable
uploads trust Google's acknowledged ranges, retain stable allocated Drive IDs
across lost replies and expired sessions, and check final size/MD5. Documents
run first, followed by up to three photo streams and one original-video stream;
stream buffers are bounded. Google account consent is separate from pairing's
private app-data grant. The signed-in account, Store, record and edit travel with
every batch. A newer edit holds earlier work; a context change during handoff
prevents commit. Sources remain on errors and are released only after completion
or acknowledged foreground reconciliation. Batches are limited to 500 files /
4 GiB and require enough phone storage for all retained originals.

Core profile data is saved before media. The native finalizer updates only the
matching Inventory cover field using a fresh read and Drive v2 File ETag
precondition (not an assumed v3 media write precondition). A newer
edit, missing index or missing ETag produces **needs_reconcile**, retaining
confirmed media IDs for foreground repair. It never overwrites a whole stale
profile/index. Sheets has no values compare-and-swap: the native job deliberately
does not overwrite its cover cell. The next foreground sync refreshes that cell,
photo names/order and stale-asset cleanup. Native jobs never delete remote media.

## Phone doorbell (configuration pending)

The PC writes its normal encrypted-relay pairing offer/request, then sends a
small signed doorbell to a **separate** Apps Script sender. Only an encrypted
phone reply establishes connectivity; an opaque HTTP dispatch or FCM send does
not. Wake payloads contain identifiers, a nonce, timestamp and signature, never
chat content. Phone-owned per-trusted-PC HMAC grants are exchanged inside
encrypted foreground replies, not plaintext pairing answers. The sender checks
binding, expiry, signature, replay, rate limits and a daily cap. The phone checks
its own current trust and account again. Token rotation re-registers grants;
forgetting a PC invalidates them locally and attempts broker revocation.

No Firebase config, sender deployment, billing change or Enigma identity is
included. See wake-sender/README.md. Without setup, the push receiver stays
inactive. Existing two-second idle recovery remains until locked/deep-idle
tests prove wake delivery. FCM priority can be downgraded; restricted foreground
launches produce an open-connector notification rather than assuming an
exemption. Do not promise zero latency, force-stop delivery or a sleeping laptop
wake: this feature wakes the Android phone connection, not the REA laptop.

## Evidence and validation

The Google Drive APK analysis observed native JobService/foreground content-sync
wrappers, not its private transfer protocol or a performance benchmark. This
implementation uses public Android scheduling and Drive resumable APIs.

Web: 307 tests and inline/module JavaScript syntax pass. Android assembly, lint
and all eight recovery/security tests pass on code commit e3e4187 (Android CI
41143008309; web CI 41143015580). The CI job does not receive stable TEST signing
secrets, so it intentionally publishes no installable APK. Restore the existing
signing identity to preserve update compatibility. No real-device verification
or deployment has been claimed. See PR #9 for the reviewable candidate.

Real-device gates: locked screen and browser swipe-away; interrupted staging;
airplane mode during a chunk; process death/reboot; consent expiry; same-Store
newer edit and account/Store transition; large original video; lost upload reply;
concurrent Inventory updates; FCM token rotation; trust expiry/revocation;
duplicate doorbell; PC suspend; deep idle; and force-stop recovery. No such
device test has been claimed.
