# LotKeys TEST V0.9.4.88 — Chat polish

Published September 24, 2026. This release builds directly on V0.9.4.87 and preserves its customer cards, appointments, smart notes, media saving, Android connector, and five-action chat layout.

## Changes

- Keeps the Interested Vehicle and buying summary at the top of Contact and on customer/Calendar cards, while removing the duplicate card from an open Device conversation.
- Makes `Cash` / `Financing` a two-button Note field with no textarea or keyboard.
- Auto-closes the ＋ and 🎙️ choice bubbles after five seconds, after selection, or after an outside tap.
- Repairs the 0.5-second hold-and-drag shortcuts by capturing the pointer immediately and blocking browser scrolling, selection, and touch-callout interference.
- Retains the requested directions: ＋ up for Camera, up-right for Images, right for Documents; 🎙️ right for Voice memo and left for Talk to text.
- Removes the technical SMS/media explanation beneath the Device composer.
- Changes the unlock prompt to `Enter your Lock Screen Password` and removes PIN wording from the active Lock Screen controls.

## Release identity

- Web version: `0.9.4.88`
- Build query: `09488`
- Service worker cache: `lotkeys-app-v09488-chat-polish`
- Android version code: `9488`
- Android artifact: `LotKeys-Android-V0.9.4.88`
- TEST URL: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09488`

## Verification

- JavaScript syntax checks pass for the Hub, messaging, phone, and retained-record modules.
- The Node contract/model test suite covers the compact Device view, Contact-first customer card, two-choice purchase method, five-second gesture-menu timeout, pointer capture, Lock Screen copy, and removed composer footer.
- GitHub Actions builds and lints the matching Android TEST APK after deployment.

Production `lot-keys.ca` is not changed by this TEST release. Use the complete source ZIP when promoting the approved build later.
