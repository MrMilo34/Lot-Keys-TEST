# LotKeys current work — TEST V0.9.5.39 release

Current main baseline: d8caf710905bd26ddb540489052ba387428ee9a0 (.38).
Release branch: codex/background-transfer-doorbell-v095039; PR #9.
Website and matching original-key APK prepared for the authorized TEST deployment.

- Native original-file queue and Vehicle Profile media handoff implemented in
  source, with resumable Drive checkpoints, final size/checksum validation and
  stable allocated file IDs. Up to three photos + one video; documents first.
- Separate upload consent; existing pairing app-data scope unchanged. Web/older
  connector fallback preserved. Native features require the matching signed .39 APK.
- Shared Inventory cover finalization uses ETag/revision guards. Sheets cover,
  rename/delete reconciliation finishes in the foreground; no native deletions.
- PC auto retry/status changes: open page calls the saved phone, retries every
  15 seconds, shares one valid offer, and stops on pagehide. Manual retry lives
  inside status-light connection settings. Green = registered; blue = fresh ack.
- Blair now permits hourly idle checks. Adaptive native scheduling is implemented
  in source: two seconds during visible phone use or a live PC activity lease,
  hourly while idle with a trusted PC, no idle checks without trusted PCs.
  Hidden phone-browser polling stops; idle SMS events do not restart cloud work.
  A bounded active wake lock is released on idle. Android hourly jobs are inexact.
- This policy needs no Firebase. An idle phone may take about an hour (or longer
  under Android/network deferral) to notice a newly opened PC; opening the phone
  app checks promptly. Optional FCM remains inactive. No resources/billing enabled.
- 317 Node tests and syntax checks pass. Android assembly, all 16 native tests
  (including presence/idle policy and persisted hourly-job tests) and lint pass
  including final setup labels. The distributed APK is built from b50ea6a (Android CI 41153938625) and
  signed with the recovered original TEST key, verified against SHA-1
  6CAE202927D7884907C25147FE7FA0E11D87B741. Real-device verification is outstanding.
- PR: https://github.com/MrMilo34/Lot-Keys-TEST/pull/9. Signed APK/checksum live in
  downloads/. Install over the existing connector; preserve app data and trust.
  CI signing secrets are still unavailable: its UNSIGNED signing-candidate artifact
  is not an installable release. Use the original-key signed download instead.
  Never commit the private keystore/recovery password or generate a replacement key.
- Marketplace Listings, More contributions and Account assets retain existing
  foreground paths. See RELEASE-0.9.5.39.md and wake-sender/README.md for limits.
- Preserve prior .38 behaviour except the explicitly approved idle polling policy.
  Validate locked/deep-idle/reboot behaviour and power use on a real phone before
  claiming measured battery savings or guaranteed reconnection timing.

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
