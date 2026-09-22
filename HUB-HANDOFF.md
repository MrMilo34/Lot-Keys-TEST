# Current Hub handoff — 0.9.4.99

V0.9.4.99 uses the final V0.9.4.81 application checkpoint as its protected data/upload base. Approved core repairs are the documented route-ownership guard, safe Blob URL lifecycle, lightweight disposable synchronization metadata mirror and disposable in-session IndexedDB read-through cache. Do not restore the V0.9.4.95 route deadline or the V0.9.4.96 summary/cover stores and migration.

The permitted overlay is the isolated Hub set: `lotkeys-hub-*`, `lotkeys-device-*`, the small internal-Chat hooks in `lotkeys-messaging.js`, the documented Hub integration points in `index.html`, and Android Phone Mirror 0.2.0 under `device-bridge/android`.

The website opens IndexedDB schema version 3 solely so a device that opened V0.9.4.96 can return without a downgrade error. It uses the original V0.9.4.81 Vehicle and Listing stores. Do not ask testers to clear site storage.

Phone Mirror uses Android's SMS/MMS provider and sends explicitly confirmed SMS through the phone. Private RCS, MMS sending/attachment downloads, groups, short codes and new-number composition are not supported. The existing Python relay and current HTTPS tunnel must stay running; a changed tunnel URL requires new pairing files.

The phone is the communication source of truth. Device history is transient in Hub; saved CRM contacts, organization, notes, documents and appointments remain separate private Hub records. Offline drafts never auto-send, and an uncertain send must be checked on the phone before retrying.

Keep Posting Buddy V0.1.23, Store Processor V0.9.4.76, Drive authority, Viewer-only official Inventory permissions and the full source artifact unchanged unless a separately tested release intentionally advances them.
