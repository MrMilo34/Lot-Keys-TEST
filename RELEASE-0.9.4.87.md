# LotKeys V0.9.4.87 TEST release

Published: 2026-09-24  
Build: `09487`  
Channel: TEST

## Customer information and cards

- Contacts now carry structured Cash/Financing, total-budget, bi-weekly-payment, down-payment, trade/no-trade and expected-trade-value fields.
- `Interested Vehicle` is the only vehicle-interest concept. It can reference a live Inventory Vehicle Profile or retain a manual description until a profile is selected.
- The reusable customer card shows year, make, model, stock, odometer and price, followed by the compact buying summary and next appointment where applicable.
- Customer list cards show the appointment date/time and booking state. Selecting that appointment chip opens its Calendar week.

## Appointments and reminders

- The appointment form order is Customer/Contact, Interested Vehicle, Booking Status, Date, Time, Duration, Appointment Type, Notes and Location.
- A typed customer name can be booked without creating a Contact and linked later by editing the appointment.
- Booking states are 🔴 Tentative, 🟡 Booked, 🟢 Confirmed and 🔵 Double Confirm. Time may be left undecided only while Tentative.
- Dates are entered/displayed as MM/DD/YYYY; time choices are shown in 12-hour format.
- Appointment cards reuse the customer, vehicle and buying summary. Existing private Calendar reminders remain supported.

## Smart notes

- Add Note includes a searchable field picker and segmented choices for Cash/Financing and Trade/No Trade.
- Recent incoming messages can expose a ⤴️ action for narrow local matches such as a bi-weekly payment value.
- The watcher evaluates only the newest five messages. The option disappears after it leaves that window.
- Suggestion bubbles collapse after five seconds or an outside tap and can be reopened while the source message remains eligible.
- Competing values remain separate choices and their nearby wording is labelled, for example `likely goal` versus `mentioned as too high`.
- Nothing writes itself: the user must choose a suggestion. Broad vehicle-name extraction is intentionally excluded.

## Chat controls and media

- Device and LotKeys Chat action rows are Notes, Questions, Call, Booking and Organize.
- Both composers use ＋, message text, 🎙️ and Send.
- Tapping ＋ shows Camera, Images and Documents. Holding for 0.5 seconds enables up, up-right and right shortcuts.
- Tapping 🎙️ shows Voice memo and Talk to text. Holding enables right and left shortcuts, with haptic/highlight feedback where supported.
- Attachments remain queued until the user explicitly sends. Voice recording has separate Cancel and Send voice actions.
- File messages and MMS attachments expose 💾 Save to Contact. The retained copy is separate from chat history and protected against duplicate saves.
- Add to Hub now contains exactly the five primary creation actions requested.

## Android connector

- Connector version: `0.9.4.87-test` (`versionCode 9487`).
- MMS history now exposes attachment metadata and allows a deliberate attachment read for Contact-folder saving.
- Device media is prepared through a token-protected loopback or encrypted paired-computer request, then opened in Android's default messaging app for recipient review and final Send.
- This is deliberately a reviewed handoff, not direct MMS submission. LotKeys does not become the default SMS app and does not claim delivery or retry automatically.
- Plain SMS keeps its existing direct, receipt-tracked send path.

## Test notes

- Install the matching `LotKeys-Android-V0.9.4.87` artifact before testing Device media.
- Use fictional customer information and small test media.
- Close and reopen the installed TEST web app once so cache `lotkeys-app-v09487-smart-customer-chat` takes control.
- RCS, iPhone connectivity, automatic direct MMS delivery, group Device sending and multi-SIM selection remain outside this checkpoint.
