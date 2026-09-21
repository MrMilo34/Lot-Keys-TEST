# Hub 0.9.4.97 implementation notes

## Integration boundary

New files: lotkeys-hub-core.js (pure models), lotkeys-hub-store.js (private records), lotkeys-device-client.js (live encrypted transport), lotkeys-hub.js (UI), lotkeys-hub.css (scoped styles).

The original messaging module retains encryption, inbox/outbox, archive, VoIP and delivery code. Four navigation/rendering functions have hooks for Hub. Cached conversation rows and existing open/share/call actions are exported. index.html adds only the Hub module load, a read-only media-busy signal, Vehicle Profile opener and a pending-private-record sign-out guard, apart from version labels. The Vehicle Profile uploader, Drive media helpers and Facebook Buddy remain unchanged.

## Data model

- Contact: stable CUST UUID; name; ordered field records {id,kind,label,value,phoneType?,primary?}; categoryId; explicitly linked Device thread IDs or LotKeys conversation ID; retained notes; Drive attachment metadata.
- Categories: user-owned ordered {id,name,color} records. Default colour is inherited from the current accent when no category applies.
- Appointment: stable APPT UUID; contactId; optional vehicleId + label snapshot; UTC start/end; timezone; type/status/location/notes. Calendar export is one-way .ics only.
- Device: bounded in-memory thread/message maps. Never passed to HubStore, the internal chat archive or Google Drive.

Private structure:

    Lot-Keys Account/             owned, unshared personal Google Drive
      Hub/
        Categories.json
        Customers/
          CUST-<uuid>/
            Contact.json         includes notes and attachment metadata
            Documents/           created when files are saved
        Appointments/
          APPT-<uuid>.json
        Deleted Records/
          contact-CUST-<uuid>.json

Deleted Records contain only stable ID/type/time tombstones, not the deleted customer's name/notes/documents. They stop an old device from recreating a deleted contact. Contact deletion also deletes linked appointment records. Clearing notes/attachments targets Hub-managed records, not arbitrary manually placed Drive files.

## Storage and access

Hub uses an independent IndexedDB database, `lotkeys-private-hub-v1`, keyed by the Google account identity. Contacts/notes/appointments are cached locally, not encrypted with a separate application data key in this first release. App lock is a UI/session protection, not a substitute for device encryption or an independent data vault. Shared computers require the user's normal account/device security practices.

Google OAuth uses the existing authorization session. Hub refuses shared/non-owned roots and verifies private contact folders. It never calls setAnyoneReader or modifies Store access. Sharing changes after a check cannot be prevented by browser code; private permissions must remain private. Revision checks and conditional If-Match when an ETag is exposed detect conflicts; Google Drive is not an atomic multi-record CRM database. Conflicts are explicit and simultaneous edits remain a test case. A stale editor is rejected before replacing a newer cached revision.

Hub sync yields at entry and before writes when existing Vehicle/Listing/More jobs are active. It does not change their scheduling, chunks or worker counts. Saved contacts/notes can be queued offline. New camera/file bytes are not durably cached locally: an interrupted attachment upload may require reselecting the file. Failed uploads may leave an unreferenced private Drive object; do not treat this prototype as an audited records-retention system.

## Device protocol

Version 1 envelopes: AES-256-GCM; random 12-byte nonce; room ID as additional authenticated data; JSON {v,iv,ciphertext}. Hub and adapter share the content key, with distinct role bearer tokens for relay endpoints. Relay knows role tokens but not the content key. TLS is required outside the loopback simulator. No redirects are accepted by clients.

Encrypted events carry id, at, expiresAt, kind and adapter session. Readiness is an adapter heartbeat, not merely an open HTTP connection. Browser filters replayed, expired, tampered and wrong-session events. Only an exact active thread and recipient authorize a send; fuzzy-name matching is never used. Relay ciphertext is bounded and temporary in RAM; do not enable request-body logging. Browser pairing can remain session-only or be saved encrypted by the LotKeys Lock PIN. Native Android configuration is encrypted with AndroidKeyStore.

This is an experimental protocol implementation, not independently security-audited. Manual Device-to-contact links are adapter-session scoped, to avoid assigning a reused notification/thread key to an old customer. An exact unambiguous phone-number match can resolve the saved contact across sessions. No durable message archive, history import, attachment transport, delivery/read receipt, phone-call relay or push-when-browser-closed is claimed. A live browser tab, relay and adapter are required. Explicitly saved notes/documents are a separate retained data path.

## Phone adapters

Android Phone Mirror 0.2.0: after explicit READ_SMS/SEND_SMS approval, a foreground remote-messaging service reads the native SMS/MMS provider, pages history, observes changes and submits confirmed SMS with an idempotent local receipt ledger. The phone remains the message database. It does not read Contacts, use Accessibility, become the default SMS app, root the phone, expose RCS, send MMS or silently grant permissions. Boot recovery, battery restrictions, carrier behavior and OEM background rules require physical testing.

There is no supported direct iPhone-to-Windows Phone Mirror in this release.
