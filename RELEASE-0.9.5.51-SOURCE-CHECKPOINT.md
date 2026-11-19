# .51 guarded regular-user native submission checkpoint

This is source for the existing PR25, not a deployed installer or proof of a
working locked phone. TEST .50 at 39e89f0 and production .81 are preserved.

The browser freezes selected originals and a request snapshot, reserves one
Drive ID, saves its plan, then stages originals locally to Android in 1 MiB
chunks. Android confirms retention before readiness. Native execution uploads
and verifies originals, creates one private More request atomically, and saves
the finalizer receipt. Browser resume verifies that exact receipt. Pending means
awaiting Inventory publication, not already published. Rejected requests retain
saved originals and show an error. Cross-account, Store, revision and competing
tab writes are refused. This path does not change media sharing.

Processor .79 adds an optimistic base-revision check before the existing creator
and Inventory write path. Distinct native request types fail closed on older
processors. The browser requires Store Access protocol3 bound to the same Store.
The original .78 processor, manifest, Store root and triggers must be preserved
as rollback before applying the patch to the existing TEST script project. Do
not reinstall or create duplicate triggers, alter roles/sharing, or run against
production. The source patch has not been applied to a live script: an authorized
Apps Script editor/update capability is absent in the current tool set.

Existing installed .46 continues the foreground path. Original recovery key and
certificate match .46 (SHA256 77bbfafca861ef0638cedbbeae0847d99d4c3416f6b50a888b01cab07b1f2635).
Only a final reviewed .51 build may be signed with that existing key, and package,
version and certificate must be verified before providing any installer. No new
credentials, browser data clearing or uninstall are required.

Node tests cover frozen plan binding, all selected originals, lost prepare/chunk/
commit replies, retained-file resume without Blobs, stale account/edit rejection,
competing tabs, terminal request receipts, old APK/processor fallback and .79
stale Inventory rejection. These are automated fixtures; live Google, browser
renewal, native-to-processor integration, app-switch/lock and OEM power behavior
remain unverified. Existing native prerequisite CI (44383405333) passed 80 tests;
this checkpoint changes guards and needs its own CI before packaging.

Keep the screen visible during local preparation. After retained confirmation,
Android owns the files; ordinary jobs may be deferred. Account > Background
uploads opens the existing native Continue control, which can request a
user-initiated job while native UI is visible. This does not promise continuous
execution through force-stop, revoked access or Android/OEM suspension.

PC-send remains awaiting screenshot and Device SMS versus LotKeys chat context;
no guessed repair is included. Automatic Compare remains pending and unchanged.
Stop at this bounded checkpoint or a verified test release; no next feature cycle.

Local validation at this checkpoint: 561 Node tests and 33 DOM tests pass;
21 standalone plus eight inline script syntax checks and git diff checks pass.
The local Chromium run could not launch because its expected Playwright browser
executable is absent. No responsive-browser success is claimed for this revision
until CI verifies it. Native CI for the updated guards is pending separately.
