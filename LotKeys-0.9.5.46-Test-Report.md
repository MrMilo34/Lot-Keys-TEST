# TEST .46 signed candidate evidence

Android source commit: 3c6089d8ad4d3d7c3eef9926c96b6a7f378681c9.
Branch: codex/trusted-launch-background-v095046.
Successful CI: https://github.com/MrMilo34/Lot-Keys-TEST/actions/runs/42855311393
58 Robolectric tests pass; assembly/debug and non-debuggable release APK/AAB/lint pass.
Release lint: 0 errors, 33 warnings. 406 Node tests and 24 JS syntax checks pass locally.
Earlier runs exposed asynchronous browser-test assumptions and a missing session-
creation fallback guard; both were corrected before this successful candidate.
No physical-device fullscreen, background/lock/retry or upgrade result is claimed.

Recovered CI release artifact ZIP digest:
a2a56e6b6b979d3b95fab87f888b81b7e2b73b3da7799c5bf6f0c561d7861877
The release APK was signed privately with the existing TEST key, then verified.
APK SHA-256: 5050259a4ebc48314ba5c1ebbddc895f73e271dc2ccdbc3b76e0f3c9973a0093
Filename: LotKeys-Connector-TEST-V0.9.5.46.apk; 9293340 bytes.
Package ca.lotkeys.connector.test; version 0.9.5.46-test / 95046; SDK 30 minimum / 36 target.
Certificate SHA-256: 77bbfafca861ef0638cedbbeae0847d99d4c3416f6b50a888b01cab07b1f2635
The certificate, launcher and permission set match .45. Signature v3 verifies.
Signed APK payload bytes match the unsigned CI release APK. All four native
libraries retain 16 KB ZIP-offset and ELF LOAD alignment. No new credentials.

The signed installer is saved in Blair's Library. This branch does not replace
its downloads link with an unsigned CI artifact. No .46 website was published.
Live TEST remains .45 and production remains .81 as checked after signing.
Installing the APK alone opens that live TEST website, even with build=095046.

## Use and remaining work

Install OVER the existing app; do not uninstall or clear app/browser data.
Use the same browser/profile/account/Store. Native upload notification opens the
new controls; the native home also has Background upload controls. After originals
are committed, tap Continue to request user-initiated scheduling while native UI is
visible. No fresh Google or Android permission grant is performed by that screen.
Staging still requires LotKeys open, and Android can pause/retry transfers.

Toolbar-free TWA rendering still requires the origin-root assetlinks file prepared
in deployment/trusted-origin. That required live URL returns 404; the account-root
repository was not found through the current connection. No origin verification
bypass, WebView migration, origin switch or hosting change was performed.
Coordinated .46 TEST web publication is also pending, so its new in-page controls
and deferrable-queue wording are not live yet. Preserve .44 retry improvements,
.43 fallback, trusted PCs, consent, native queue and original-file order.

A draft PR creation attempt was denied by automatic approval review because the
user approved committing/building, not opening a PR. It was not retried. The branch,
CI and signed APK completed independently; no PR or merge exists for .46.
