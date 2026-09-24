# LotKeys TEST V0.9.4.92 — Reliable PC pairing

Published September 24, 2026. This update completes the controlled TEST path for pairing an Android phone with one active LotKeys computer.

## Changes

- Moves phone-side encrypted transport into the Android foreground service, so the phone browser can close after setup.
- Requires matching four-digit approval for every new computer.
- Enforces Ask Every Time, 36 Hours, 7 Days and Until Disconnect trust on the phone.
- Restores an active encrypted browser session after an ordinary refresh and rejects expired saved sessions.
- Lets a trusted computer establish a fresh ECDH P-256 / AES-GCM session without repeating approval.
- Keeps one active PC; approving another computer sends a transfer/disconnect event to the prior one.
- Adds active-device, trust-expiry, disconnect, individual forget and revoke-all controls.
- Adds a stable TEST-only APK certificate, supplied only through GitHub Actions secrets, for the same-project Android OAuth registration required by the hidden Drive app-data relay.
- Retains every V0.9.4.91 customer-card, appointment, note, Calendar, composer and media correction.

## Release identity

- Web version: `0.9.4.92`
- Build query: `09492`
- Service worker cache: `lotkeys-app-v09492-pc-pairing-relay`
- Android version code: `9492`
- Android artifact: `LotKeys-Android-V0.9.4.92`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09492`

## Required one-time TEST setup

Register an Android OAuth client in the same Google Cloud project as the LotKeys Web client:

- Package: `ca.lotkeys.connector.test`
- SHA-1: `D5:18:A4:69:3A:DA:9F:62:BD:B1:65:17:38:2B:17:4C:52:A5:76:12`

The APK then asks the tester to select the same Google account already used by LotKeys. No Google password, OAuth client secret or Drive token is stored in the website source.

## Verification

- JavaScript syntax and the full Node contract/model suite must pass.
- GitHub Actions must complete Android `assembleDebug` and `lintDebug` with the stable TEST signing identity.
- Pairing must be tested with the phone browser closed, a PC refresh, trusted reconnect, trust expiry, active-PC transfer and revoke-all.

Production `lot-keys.ca` is not changed by this TEST release. Use the complete source ZIP only after this TEST build is approved.
