# Bounded native request finalizer checkpoint

Based on the reviewed .50 source a29d923 and its TEST-only publication39e89f0.
The .49 rollback remains a3cbd0a. No production, Store data, reports, permissions
or signing identity changes are authorized by this source checkpoint.

Protocol3 has one vehicle-submission finalizer: fileId is a browser-reserved Drive
file ID, parentId is the existing private Pending folder, request is the frozen
schema3 LotKeys vehicle-create or vehicle-owner-update request. Request context
must match native account/store/record/revision. Existing media has driveFileId;
new media has assetKey and its original parentFolderId. Every staged asset must
match one media reference and contribution request. The existing native queue
retains originals and uploads them before running this finalizer.

The finalizer verifies Pending -> Requests -> More Vehicle folder ancestry and
public role/Vehicle properties. It resolves only confirmed media IDs, creates
metadata and JSON body together with the reserved ID and a plan fingerprint,
and verifies a matching server receipt. It never PATCHes a request, writes shared
Inventory, changes access or performs provider migration. A response lost after
acceptance is recovered by exact ID; an existing terminal receipt is never
rewritten to pending. Failures retain original files and checkpoints. The existing
Store processor continues enforcing user roles and publishing accepted Inventory.

This is a native prerequisite, not end-to-end background posting. The existing
.50 browser does not build protocol3 plans or reconcile its receipts. Completing
that client path, testing it against isolated authorized workspaces, preserving
the .44/.48 recovery safeguards, and validating an actual matching-key .51 phone
upgrade are still required. Preparation before Android retains every original
still needs the visible browser; the existing wake lease is only best effort.
Ordinary jobs can be deferred; user-initiated jobs require the existing visible
native action on supported Android versions. No platform background restriction
is bypassed. No real phone or live Drive/processor test is claimed.

Robolectric fixtures cover delayed media, full payload binding, lost responses,
terminal receipts, collision, account/Store/edit changes, permission denial,
cancellation, and protocol compatibility. Record the actual CI result separately;
these are simulated tests rather than a physical-device send or upload test.
