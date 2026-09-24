# LotKeys V0.9.4.86 — Hub customer workflow

Release date: 2026-09-24  
Channel: TEST  
Build: `09486`  
Cache: `lotkeys-app-v09486-hub-workflow`

## Included

- LotKeys Chats first and Device Messages second in All, with independent persistent collapse controls and unread counts.
- A simplified Device conversation header without a duplicate profile photo.
- Contact, Call, Appointment, Add Note, Questions and Photo/document actions directly above Device history.
- Interested Vehicle Profile links on private contacts, including a compact primary vehicle card and `+N more` indicator.
- Searchable note topics plus optional date-only or timed Calendar reminders.
- Direct Calendar reminder creation, all-day-first ordering and date-only `.ics` exports.
- Context-aware question ordering that excludes confidently answered/saved topics and only inserts chosen questions into the Device draft.
- PC-only LotKeys Chat sound selection: six built-in tones, Silent and a local custom clip eight seconds or shorter.
- No automatic LotKeys Chat sound on Android and no duplicate Device SMS/MMS alert.
- Corrected Hub logo corner crop and responsive floating actions.

## Data and compatibility

- Existing contact, category, appointment, phone pairing, Chat and Inventory records remain compatible.
- Reminders use the existing private Hub appointment storage with `kind: "Reminder"` and optional `allDay: true`.
- Interested vehicles store only Vehicle Profile IDs in the private contact record; live Inventory remains the source for vehicle details.
- PC notification choice and custom audio remain local browser settings and are not copied to Store profiles or Google Drive.
- No Android APK update is required; continue using the TEST `LotKeys-Android-V0.9.4.85` artifact.

## Test entry point

`https://mrmilo34.github.io/Lot-Keys-TEST/?build=09486`

Use fictional/non-sensitive customer data. This is controlled TEST software, not a production security approval.
