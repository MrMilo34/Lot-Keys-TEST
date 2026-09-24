# LotKeys TEST V0.9.4.91 — Compact contact rows

Published September 24, 2026. This update builds on V0.9.4.90 and refines the Device conversation list from Blair's latest phone layout test.

## Changes

- Places a saved customer name and phone number together on the first card line.
- Shows a phone-only identity once instead of repeating the same number as a subtitle.
- Places the Customer category and next appointment/status together on the second card line.
- Makes the complete Device conversation card open its chat, including the identity, category, empty card space, and vehicle/buying summary.
- Keeps the appointment chip as its own Calendar shortcut instead of opening the chat.
- Restores native Google/Android-style calendar and clock selection screens when a new appointment is established.
- Keeps existing appointments easy to edit with manual date entry and the compact saved-time menus.
- Retains optional End Time, explicit AM/PM start–end ranges, full-width Calendar cards, compact Device-chat header, structured notes, reliable composer gestures, and media saving from V0.9.4.90.

## Release identity

- Web version: `0.9.4.91`
- Build query: `09491`
- Service worker cache: `lotkeys-app-v09491-compact-contact-rows`
- Android version code: `9491`
- Android artifact: `LotKeys-Android-V0.9.4.91`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09491`

## Verification

- JavaScript syntax checks pass for the Hub, messaging, phone, and retained-record modules.
- The Node contract/model suite verifies the two-row card placement, duplicate-number suppression, whole-card activation boundary, Calendar shortcut, and retained appointment behavior.
- GitHub Actions validates the web build, deploys Pages, and builds the matching Android TEST APK.

Production `lot-keys.ca` is not changed by this TEST release. Use the complete source ZIP when promoting the approved build later.
