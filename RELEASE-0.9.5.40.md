# LotKeys TEST V0.9.5.40 — Add a PC and matching live connection status

Prepared from .39 main ec11dfba417375c02933afa30051983809c8cf86.

Phone Hub connection settings now have Add a PC. It checks the native connector
for a pending request and shows the matching four-digit code. A new PC still
starts Connect phone and needs approval; trusted reconnections need no new code.

Connected cards, their dots and the header light show blue for an actual live
session on the phone and PC. Open status dialogs update without reopening.
Store synchronization warnings remain separate. The Android connector's PC relay
line also refreshes while visible, with blue connected and green ready/waiting.
Its local UI refresh stops when leaving the activity; no extra idle polling.

Vehicle Profile progress retains Background ready · you can switch apps after
Android confirms every original. Before that point, keep LotKeys open through
Preparing originals. App switching early may pause staging until the browser
returns; this release does not claim Android can read files it has not received.
Upload scheduling remains independent of the two-second/hourly Hub schedule.
The lightweight recovery receipt preserves this handoff without another large
original-file database write.

The website remains compatible with .39. The .40 TEST connector preserves the
original package/certificate and updates the installed connector in place.
Native upload protocol, encrypted pairing, trust, accounts and Store data remain.

Validation: 321 Node tests and focused real-function UI/handoff tests pass.
Android assembly, lint and 16 native tests will be checked before release.
Physical phone tests are still needed for these UI adjustments and app-switch
uploads. Blair's .39 report is encouraging, not a completed device test matrix.
