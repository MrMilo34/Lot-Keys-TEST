# LotKeys V0.9.4.84 — first Android phone-source checkpoint

V0.9.4.84 branches from the clean V0.9.4.83 rebuild. It does not restore the abandoned Phone Mirror interface or its manual JSON/Python/tunnel workflow.

## Release contract

- Phone is the only SMS/MMS source of truth.
- LotKeys remains the visible phone and PC interface.
- Current default messaging app remains unchanged.
- Same-account discovery plus matching four-digit phone approval.
- Short-lived ECDH/AES-GCM session transport through private Google Drive app data; no retained PC transcript.
- SMS/MMS index/history and plain SMS reply with explicit send receipts.
- One active PC and the phone; no automatic send retry.
- Honest amber SMS/MMS-only coverage and red disconnected state.
- Android contact-name fallback and phone-number-based category sorting.
- Conversation paging (40 threads/messages at a time), newest conversations first, and normal oldest-to-newest chat rendering.
- Category/subcategory organization for unknown numbers without forcing a LotKeys customer folder.
- Contact creation carries the conversation's existing organization into the new customer record.

## Not claimed

- RCS history/send/watcher coverage
- MMS or file sending
- Complete group or dual-SIM behavior
- iPhone support
- Always-on browser-independent internet transport
- Production Google Play approval or independent security audit

## First test path

1. Install the Android artifact's `app-debug.apk` on an Android 11+ test phone.
2. Complete the four short permission/setup screens and open LotKeys from the Android setup.
3. Sign into the same LotKeys Google account on phone and computer.
4. On the computer, open Hub → **Connect phone**.
5. Match the four digits and approve the computer on the phone.
6. Open Device, load a conversation, and send a plain test SMS.

Keep LotKeys open on the phone during this checkpoint's paired-computer test. The Android service keeps the protected phone API ready, but the same-account internet relay currently runs inside the LotKeys phone page.

## Build identity

- Version: `0.9.4.84`
- Build: `09484`
- Cache: `lotkeys-app-v09484-phone-source-checkpoint`
- Website: `https://mrmilo34.github.io/Lot-Keys-TEST/?build=09484`
- Android application ID: `ca.lotkeys.connector.test`
- Android artifact: `LotKeys-Android-V0.9.4.84`

The exact agreed product logic was preserved in `LotKeys-Phone-Connectivity-Spec-V0.9.4.83.txt` before implementation began and is included with this release.
