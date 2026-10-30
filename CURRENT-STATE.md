# LotKeys current work — TEST V0.9.5.39 candidate

Current main baseline: d8caf710905bd26ddb540489052ba387428ee9a0 (.38).
Work branch: codex/background-transfer-doorbell-v095039. Prepared, not deployed.

- Native original-file queue and Vehicle Profile media handoff implemented in
  source, with resumable Drive checkpoints, final size/checksum validation and
  stable allocated file IDs. Up to three photos + one video; documents first.
- Separate upload consent; existing pairing app-data scope unchanged. Web/older
  connector fallback preserved. Native queue needs a matching signed .39 APK.
- Shared Inventory cover finalization uses ETag/revision guards. Sheets cover,
  rename/delete reconciliation finishes in the foreground; no native deletions.
- PC doorbell, FCM receiver and separate Apps Script sender implemented in source.
  Activation blocked on LotKeys Firebase registration and owner sender setup.
  Enigma-only JSON is invalid for this package. No billing/resources activated.
- 307 Node tests and JS syntax checks pass. Android compile/lint and seven native
  recovery/security tests passed on 4986f63; the final index-conflict test/code
  awaits the next CI run. No real-device verification or deployment.
- PR: https://github.com/MrMilo34/Lot-Keys-TEST/pull/9 (draft). CI does not receive
  the stable TEST signing secrets, so no matching installable APK is published.
  Restore the existing TEST signing identity; do not generate a replacement key.
- Marketplace Listings, More contributions and Account assets retain existing
  foreground paths. See RELEASE-0.9.5.39.md and wake-sender/README.md for limits.
- Preserve all prior .38 behavior below. Do not stop idle relay recovery until
  real-device push wake gates pass.

## Deployed baseline checkpoint (historical .38)


This is the short continuation reference. Verify current main/version.json before
changing it. Historical release files remain available for a specific question.

- Web 0.9.5.38 / build 095038, based on .37 commit
  `9ba361f63743228774fb1609cf6067f25263de43`.
- Android connector 0.9.5.12; Posting Buddy 0.1.24; distributed Processor 0.9.4.77.
  Correct installed Processor 0.9.4.76 remains compatible. No native rebuild or
  reinstall for this web release.
- TEST: https://mrmilo34.github.io/Lot-Keys-TEST/. Production is separate scope.

## Preserve

- Store switching/creation and account/Store-scoped interrupted work. Keep
  personal account, profile, Hub, settings and phone pairing across Store changes.
- Cumulative Go Auto and Legacy recognition; Legacy Price is the sale price.
  Keep vehicle identity, CARFAX, descriptions, original gallery and photo order.
- Vehicle Profiles and personal Marketplace Listings are distinct. Personal
  Listings/assets live under personal Account Storage, grouped by dealership
  (.32+), superseding the older Store/Users description in ARCHITECTURE-v0.2.md.
- Store Inventory setup is independent of personal listing migration. Keep
  local media recovery, permissions and pending writes; do not clear site data.
- Verified personal template/default/PC-sound backups, retry and latest-edit
  protection; preserve other Account.json sections and Listing wording.
- Preserve the active encrypted phone relay, trusted pairing, reconnect,
  revocation, live history, drafts, media, accurate send receipts and Check status
  request IDs. Never automatically resend an uncertain SMS.
- Store/account-scoped branding and persistent installed Processor Store binding.

## .38 Device cache

Six recent phone messages for each of the ten most recent unblocked conversations
are kept in temporary memory while connected. One background page is requested
at a time, yielding to foreground history before starting another. Changed
threads refresh, unchanged warm snapshots are reused, and failed threads back
off independently. Snapshots renew before their five-minute expiry. Disconnect,
account changes and page closure clear them and reject late writes. Older
history keeps a native timestamp/sort cursor at the six-message boundary. The
open conversation still receives complete pages and live arrivals.

Initial population depends on the existing phone/Drive relay; this is not a
guarantee of zero network delay for a never-warmed conversation. Image/video
bytes are not prefetched by this cache.

## Pending phone doorbell

Design only: no deployed FCM registration, receiver or secure sender. The two
Firebase JSON files supplied so far register Enigma, not the LotKeys Android
package `ca.lotkeys.connector.test`. See PHONE-WAKE-STATUS.md for setup and test
requirements. Do not disable working idle recovery, add slower polling, activate
billing, expose the Store Processor, merge app identities or call wake live.

## GPT conversation stalls

The exact platform cause remains unresolved. Infinite loading was previously
misread as Infiniti branding. Large repeated source/history reads and stale
documentation are workflow risks, not proof of a platform hang. AGENTS.md now
directs future work to this compact checkpoint and bounded source reads.
