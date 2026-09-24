# LotKeys TEST V0.9.4.90 — Compact schedule cards

Published September 24, 2026. This update builds on V0.9.4.89 and condenses customer scheduling information across Hub conversation cards and Calendar day view.

## Changes

- Moves each Customer category beside the customer name in Device conversation cards.
- Moves the next appointment date, explicit AM/PM start–end range, and booking status beside the phone number.
- Replaces appointment field 6, Duration, with **End Time (optional)**.
- Preserves older appointments by deriving their visible end time from the previously stored duration/end value.
- Uses an estimated 30-minute end when no end time is entered, while allowing Tentative appointments to remain Time TBD.
- Rejects a selected end time that is not later than its start time.
- Moves the Calendar day-view start–end range above the appointment so its customer, vehicle, and buying information can use the full width in a shorter card.
- Uses unambiguous uppercase AM/PM labels for Hub timestamps and appointment time choices.
- Retains all V0.9.4.89 Device-header, structured-note, composer-gesture, menu-dismissal, Lock Screen, and Android handoff repairs.

## Release identity

- Web version: `0.9.4.90`
- Build query: `09490`
- Service worker cache: `lotkeys-app-v09490-compact-schedule-cards`
- Android version code: `9490`
- Android artifact: `LotKeys-Android-V0.9.4.90`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09490`

## Verification

- JavaScript syntax checks pass for the Hub, messaging, phone, and retained-record modules.
- The Node contract/model suite verifies the new card placement, optional End Time workflow, legacy end-time compatibility, and AM/PM display contract.
- GitHub Actions builds and lints the matching Android TEST APK after deployment.

Production `lot-keys.ca` is not changed by this TEST release. Use the complete source ZIP when promoting the approved build later.
