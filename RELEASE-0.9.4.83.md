# LotKeys V0.9.4.83 — clean Hub foundation

## Source decision

V0.9.4.81 is the application source of truth. V0.9.4.82 is used only for the Hub’s private CRM and internal-chat integration boundary.

Everything added after those supplied archives was removed from the TEST file tree before this rebuild. The earlier V0.9.4.94 state remains recoverable on the backup branch documented in the repository history.

## Functional acceptance boundary

### LotKeys

- Existing internal LotKeys direct chat, group chat, calls, unread/favourite state, and Store/Drive delivery remain functional.
- Opening Hub does not replace, emulate, or combine internal LotKeys messages with customer phone messages.
- The approved TEST OAuth client, browser-restricted Picker key, and matching project number are available as bundled fallbacks and appear in Google Test Credentials when no saved override exists.
- Personal Account data is restore-first and conflict-safe. Blank device defaults cannot replace an existing `Account.json`, and profile-photo deletion requires the explicit Remove Photo action.
- **Restore from Drive** reapplies the recovered Account photo, theme/accent, Celebration Sound metadata, and Description Builder templates, then redraws the current device.
- Folder discovery now recovers an unreferenced `Account Photo.jpg`, repopulates every supported audio file found in `Celebration Sounds`, and lets the user choose which recovered sound to use.
- Custom Description Builder templates now receive individual recovery JSON files in `Description Templates`, allowing future reconstruction even when `Account.json` is missing.

### Device organization

- Create private contacts for phone numbers without adding them to Android Contacts.
- Create, rename, recolour, delete, and reorder top categories.
- Create one nested subcategory level and move a row between the top and a parent category.
- Assign multiple categories/subcategories to one contact.
- Select multiple filters; a subcategory contact also matches its parent filter.
- See organization colours on filter chips, saved-contact rows, contact details, and appointment cards.
- Existing V0.9.4.82 contacts with one `categoryId` continue to load and migrate safely when saved.

### Private CRM

- Contacts, notes, documents, questions, appointments, and categories use the owned, unshared personal Account/Hub boundary.
- Internal LotKeys conversations can be associated with a private contact for notes and appointments without changing the conversation archive.
- Customer records remain independent when future phone conversations are deleted or archived on the phone.

## Explicitly excluded

- Phone connection, pairing, relay, heartbeat, notification listener, SMS provider, Android source, and APK.
- Phone message discovery, history, sending, delivery state, RCS, MMS, and attachments.
- Any fake Device thread, “connected” banner, Connect button, or simulator presented as real phone access.

The next phase should build a Google-Messages-for-Web-style interface where the phone is authoritative. When the phone is unreachable, Device conversations are unavailable; a send must visibly fail with Retry or Cancel and must never be silently queued for later automatic delivery.

## Deployment

- Repository: `MrMilo34/Lot-Keys-TEST`
- Pages root: `https://mrmilo34.github.io/Lot-Keys-TEST/`
- Version: `0.9.4.83`
- Build: `09483`
- Cache: `lotkeys-app-v09483-account-folder-recovery`
- Production `lot-keys.ca`: unchanged
