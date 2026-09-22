# LotKeys Hub V2 architecture

## Non-negotiable boundary

The normal LotKeys application and the Hub are peers. The Hub is not an application router, synchronization coordinator, Inventory cache, Listing cache, media queue, or startup dependency.

| Owner | Authoritative data | Hub access |
|---|---|---|
| Android phone | SMS/MMS threads, message bodies, recipient address and sending | Live encrypted relay only; RAM while connected |
| Existing LotKeys Chat | LotKeys direct/group conversations and calls | Read-only summaries; existing Chat UI owns opening/sending |
| V0.9.4.81 LotKeys core | Inventory, Listings, Store configuration, uploads, Account, Garage | No Hub startup dependency; later vehicle links use IDs only |
| Personal Hub records | Contacts, categories, notes, attachments and appointments | Separate module added after transport checkpoint |

If the phone is unavailable, the Device view is unavailable. The Hub must not replace the phone with an old transcript.

## Runtime modules

### `lotkeys-hub-v2.js`

- Owns the Hub overlay only.
- Provides All / LotKeys / Device and All / Unread views.
- Reads existing LotKeys Chat summaries through the published settings bridge.
- Delegates full LotKeys conversations to the unchanged LotKeys Chat UI.
- Delegates phone access to `LotKeysDevice`.
- Closes before a normal LotKeys navigation button completes its route.

### `lotkeys-device-client.js`

- Owns the encrypted relay session.
- Requests conversation pages and history from the phone.
- Holds thread/message data in JavaScript `Map` objects only.
- Sends SMS through the phone and waits for phone acknowledgement.
- Does not auto-start during LotKeys boot.
- Does not access Inventory, Listings, Store Drive sync or vehicle uploads.

### `lotkeys-device-pairing.js`

- Stores only pairing configuration.
- Encrypts saved pairing with the LotKeys Lock Screen PIN/password.
- Never stores phone message bodies.

### `lotkeys-hub-v2-identity.js`

- Supplies the current account identity to scope pairing.
- Reads only the current account email/subject settings.

### `lotkeys-hub-v2-core.js`

- Pure formatting, normalization and identifier helpers.
- No browser storage, network, Drive or application routes.

## Layer-back sequence

### Checkpoint 1 — transport and isolation

- All / LotKeys / Device views.
- Search and unread filtering.
- Existing LotKeys Chat delegation.
- Pair/unlock/forget Phone Mirror.
- Live Device threads, history and SMS replies.
- Navigation stress test while Store sync is active.

### Checkpoint 2 — organization

- User-created colored categories.
- Saved contacts independent of Android Contacts.
- Link one saved contact to one or more live phone conversations.
- Universal search across saved contact fields and currently live thread summaries.
- No message-body persistence.

### Checkpoint 3 — customer workspace

- Notes and buying requirements.
- Photos/documents explicitly uploaded by the user.
- Vehicle Profile ID links without importing Inventory records.
- Contact and attachment deletion cleanup.
- Separate personal storage module; failure cannot block conversation or app navigation.

### Checkpoint 4 — appointments

- Appointment status and reminders.
- Contact and Vehicle Profile ID associations.
- Hub calendar views and `.ics` export.
- Calendar storage remains independent from app startup and Inventory/Listings rendering.

## Release gates

Every checkpoint must prove:

1. `lotkeys-messaging.js`, Processor and Posting Buddy still match V0.9.4.81 hashes.
2. `index.html` differs from V0.9.4.81 only at version and Hub integration edges.
3. Hub files contain no Inventory/Listings object-store access or Store synchronization calls.
4. Device message bodies are absent from persistent browser/Drive storage.
5. Home → Inventory → Listings → Garage → Account → Home remains usable while Hub/Phone Mirror is active, disconnected and reconnecting.
