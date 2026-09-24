# LotKeys TEST V0.9.4.89 — Device header card hotfix

Published September 24, 2026. This hotfix builds directly on V0.9.4.88 and corrects the Device-conversation placement of the Interested Vehicle and buying summary.

## Changes

- Restores the saved customer's Interested Vehicle and buying summary to an open Device conversation.
- Places the card inside the unused upper-right portion of the customer header instead of adding a separate full-width row.
- Keeps the vehicle photo, year/make/model, stock, odometer, price, Cash/Financing, budget/payment, down payment and trade details in the shared card.
- Keeps the header card clickable so a linked vehicle still opens its live Vehicle Profile.
- Adds responsive phone styles that shrink the photo and typography while preserving the customer name, number and SMS/MMS status on the left.
- Preserves every V0.9.4.88 repair: the two-choice Cash/Financing field, reliable hold-and-drag shortcuts, five-second menu dismissal, clean composer and Lock Screen wording.

## Release identity

- Web version: `0.9.4.89`
- Build query: `09489`
- Service worker cache: `lotkeys-app-v09489-device-header-card`
- Android version code: `9489`
- Android artifact: `LotKeys-Android-V0.9.4.89`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09489`

## Verification

- JavaScript syntax checks pass for the Hub, messaging, phone and retained-record modules.
- The Node contract/model suite verifies that the shared customer card is nested inside the Device header, remains interactive and has phone-width overrides.
- GitHub Actions builds and lints the matching Android TEST APK after deployment.

Production `lot-keys.ca` is not changed by this TEST release. Use the complete source ZIP when promoting the approved build later.
