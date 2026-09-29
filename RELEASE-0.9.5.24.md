# LotKeys TEST V0.9.5.24 — conditional Hub reminder bell

## Changes

- Makes the Hub reminder action respect its hidden state when there are no active reminders. This fixes the display:grid CSS override that kept the bell visible after every reminder was checked off, and also hides it on the initial Hub render.
- Reduces the bell glyph from 29px to 26px on desktop and from 27px to 24px on narrow screens. The urgency mark stays separate.

## Compatibility and test limits

This is a web-only TEST update on V0.9.5.23. The V0.9.5.12 Android connector and pairing remain unchanged. Confirm appearance on a phone and PC during team testing.

## Identifiers

- Web version: `0.9.5.24`
- Build: `095024`
- Release: `conditional-hub-reminder-bell`
- Service worker cache: `lotkeys-app-v095024-conditional-hub-reminder-bell`
- Android connector: `0.9.5.12` (unchanged)
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=095024`
