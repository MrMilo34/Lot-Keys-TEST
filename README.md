# LotKeys V0.9.4.83 — Hub foundation rebuild

This TEST release is rebuilt from the supplied **LotKeys V0.9.4.81** gold-standard app. It brings forward the useful Hub boundary from V0.9.4.82 without carrying forward the later notification bridge, pairing client, Android companion, phone-mirror code, or simulated Device connection states.

## Working in this build

- The complete V0.9.4.81 Home, Inventory, Listings, Garage, Account, Store, media-upload, Management Updates, awards, calendar-linked Vehicle Profile, and Posting Buddy V0.1.23 behavior.
- Internal LotKeys direct chats, group chats, calls, unread state, favourites, attachments, and existing Store/Drive message delivery.
- Separate **All / LotKeys / Device** Hub sources.
- Private customer/contact records that do not require creating an Android contact.
- User-created Device categories plus one nested subcategory level.
- Multiple category assignments per contact and multi-select Device filtering.
- Category colour carried through filters, contact rows, contact details, and appointment cards.
- Private notes, documents, questions, Month/Week/Day appointments, and one-way `.ics` export from the V0.9.4.82 Hub boundary.
- Backward reading of legacy single-category Hub contacts; they migrate to `categoryIds` when saved.

## Deliberately not in this build

- No phone pairing, relay, notification listener, SMS provider access, Device transcript, or fake “connected” state.
- No Android project or APK.
- No RCS, SMS, or MMS history/send claim.
- No delayed phone-send queue. The future phone-source implementation will use explicit sending, failure, Retry, and Cancel behavior.

The phone remains the future source of truth. LotKeys CRM records—contact identity, categories, subcategories, colours, notes, documents, vehicles, and appointments—are the independent overlay that this build stabilizes first.

## TEST deployment

GitHub Pages serves the repository root:

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=09483`

Keep `CNAME` absent. This repository is TEST only; `lot-keys.ca` is not changed by this release.

After deployment, fully close and reopen the installed TEST app once so the V0.9.4.83 service worker replaces any later cached TEST build. Do not clear browser/app data; existing LotKeys and Hub records should be preserved.

## Baseline components

- LotKeys browser app: supplied V0.9.4.81
- Hub starting point: supplied V0.9.4.82, narrowed to organization/private CRM and internal-chat integration
- Posting Buddy: V0.1.23
- Store Processor: V0.9.4.76
