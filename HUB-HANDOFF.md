# Current Hub handoff — 0.9.4.91

Use README.md, RELEASE-0.9.4.91.md and TEST-REPORT.json as the current behavior and
validation record. Other architecture/checklist documents retained from .82 are
historical and are not assertions that the new features or production security
have been certified.

This is a website-only patch over verified .90. Keep the current Android 0.1.1
project/APK and existing Python relay. No GitHub deployment occurred automatically.

Next: physical receive/reply + lock/reload/PIN tests on Samsung/Windows and real
private Drive sync; then fix native fallback conversation identity for same-name
contacts, reply-action refresh/replay and Android background behavior. Do not claim
notification history equals complete SMS/RCS history. A permanent relay and unique
revocable per-browser credentials need server-validated account/device enrollment.
Two-digit number matching is only approval context, never a bearer secret. New-PC
and 15-day policy remain unimplemented. Do not add a fake OTP flow.

The local PIN vault improves at-rest protection but short PINs can be brute-forced
from a copied browser profile. Same-origin scripts remain a trust boundary. The
15-day cloud identity system must not reuse this as a server authentication design.

Customer lifecycle and source are separate. Category chips use OR, lifecycle/unread
use AND. Archive keeps the record, clear-visible only clears RAM, clear-content
removes saved details/files, delete removes the record/folder and linked Hub events.
Requirements are stored explicitly; no automatic outreach/matching engine exists.

Keep media upload functions, Posting Buddy 0.1.23, Store Processor 0.9.4.76,
artwork and original internal messaging unchanged. Keep accepted mobile action
placement. Always update page, version.json, manifest and sw.js together.
