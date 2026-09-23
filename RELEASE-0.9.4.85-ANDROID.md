# LotKeys Android V0.9.4.85 — screen-capture test hotfix

This Android-only TEST hotfix removes the secure-window flag from the LotKeys Connector setup activity so testers can take screenshots and record the screen.

- Android version code: `9485`
- Android version name: `0.9.4.85-test`
- GitHub artifact: `LotKeys-Android-V0.9.4.85`
- Connected LotKeys web checkpoint: `V0.9.4.84 / 09484`
- Messaging, pairing, storage and permission behavior: unchanged
- Production `lot-keys.ca`: unchanged

The release contract now explicitly prevents `FLAG_SECURE` from returning to the TEST connector.
