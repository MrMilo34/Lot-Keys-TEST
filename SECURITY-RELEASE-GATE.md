# LotKeys security and release gate

## Current status: team testing

V0.9.5.03 is suitable for controlled testing with approved Google accounts, a compatible explicitly installed Android test APK, and non-sensitive dealership test data. It is **not yet the public-production security finish line**.

The website remains a static browser application. Google Drive enforces file access, and the installed Store Processor is the trusted writer for the current Inventory test model; a production service is still required as the final authority for multi-Store Creator/Admin roles, global contact discovery, cross-Store message delivery, abuse controls, and long-lived authorization secrets.

## Team-test controls now present

- Google Identity Services account selection and explicit Drive authorization.
- Browser authorization explicitly requests both Store Drive access and the private Drive app-data permission used by the encrypted phone-pairing relay.
- Automatic personal `Lot-Keys Account` creation/restoration in the signed-in user's My Drive.
- Store Code lookup still requires the Google account to have permission to the Store Drive folder.
- Official Inventory remains Viewer-only for ordinary and Trusted accounts; each user writes only to their own limited-access Listings/More workspace.
- The Admin Level 2 Apps Script processor validates requests by their actual user workspace, applies the creator/Trusted exceptions, and leaves contributed media pending for Administration.
- Approved media is copied into official Inventory, so later deletion of a user’s More copy cannot delete the official copy.
- Creator-only award checks are case-insensitively bound to the configured Google account email.
- The developer's `Developer Files / LotKeys Info.json` announcement is intentionally shared as anyone-readable and its stable ID is distributed through Store Access. It must contain public platform information only—never credentials, customer data, internal Store documents, or private links.
- Direct Chat envelopes are encrypted in-browser and written to a sender-owned lane shared Reader-only with the exact recipient Google account. The Admin Level 2 processor provides one deduplicated private-Inbox recovery copy; it is not the live courier.
- Account Lock Screen credentials use PBKDF2-SHA-256, a unique random device salt, and delays after repeated failures.
- Lock state survives a page refresh in the current tab.
- Public source contains no Google client secret, Drive access token, user password, or customer financial record.
- The Android bridge listens only on `127.0.0.1`, requires a random install token, accepts only approved LotKeys web origins, and removes the token from the URL fragment immediately after linking.
- Device-message read acknowledgements are bounded, device-scoped browser records containing thread/message markers only. They expire after 180 days, contain no message body, and never write to Android's SMS/MMS provider.
- Phone pairing uses a matching four-digit approval plus ephemeral P-256 ECDH keys. Session frames are AES-GCM encrypted, placed only in the signed-in account's hidden Drive app-data space, expire after two minutes, and are deleted after processing.
- The Android foreground service owns the phone side of that relay after setup. Its Drive app-data grant is limited to the registered TEST package/signing identity; private trust/session material stays in Android application storage.
- The Android checkpoint reads SMS/MMS history and selected MMS attachment bytes, and sends an SMS only after an explicit Send/Retry action. Device media is restricted by type/size, written to a private temporary cache and opened in the existing default messaging app for final review and Send. Its ledgers store request/receipt state—not message text or recipient numbers—and it does not become the default messenger.
- PC tabs do not retain a second transcript. Customer organization and explicitly saved records remain in the user's private LotKeys Account storage.
- Standalone reminders are account-scoped local-first records in the user's owned, unshared private `Hub/Reminders` folder. Deleting a linked Contact clears the task's Contact link instead of silently deleting the reminder.
- Privacy, Terms, install, domain, and team-test guidance are included in the release.

## Important limitations

- The local Lock Screen is walk-away privacy. It cannot replace the device lock, Google account security, or server authentication; someone controlling browser storage/developer tools can bypass it.
- A Store Code locates a Store. It is not a password or security boundary.
- The public creator-access file is a UI authorization hint in this static build. Public release must validate Creator/Admin actions server-side.
- Short-interval polling can collect messages while LotKeys is open. Reliable notifications or message receipt while the app is fully closed needs authenticated push delivery.
- WebRTC calling needs production signalling, TURN fallback, call authorization, and abuse controls for reliable use across restrictive networks.
- The current team-test build requests the full Google Drive scope so users can locate the Store and maintain their own Drive workspaces. This restricted scope requires Google's applicable verification/security work or replacement with a narrower authenticated broker/picker architecture before public launch.
- The bundled Apps Script processor is a controlled-test management boundary, not a general public backend. Protect the Admin Level 2 Google account and Apps Script project, limit editors on that project, and replace it with a production-reviewed service if LotKeys becomes public or multi-dealership.
- End-to-end encryption, key changes, recovery, attachments, group membership changes, and multi-device behavior require an independent security review before sensitive use.
- SMS access is highly sensitive. The TEST APK is for controlled sideload testing; any public app-store distribution requires a separate permission-policy, privacy, disclosure, and security review.
- V0.9.5.03 does not provide RCS coverage, automatic direct MMS delivery, complete group/dual-SIM handling, iPhone support, reminder push notifications, or operating-system-level number blocking. Its Blocked list suppresses numbers inside LotKeys Hub; Android's messaging app controls device-level blocking and notifications. Its browser-independent Android relay is a controlled foreground-service TEST implementation rather than production push infrastructure; Android force-stop, battery policy, lost connectivity or revoked Google access can still require reopening the connector. Its media feature is a reviewed handoff to the phone's default messaging app. The UI must continue to show amber partial coverage honestly.
- The four-digit code is a matching/approval aid, not a standalone password. Pairing also depends on the same authorized Google account and the phone-side approval screen.
- A compromised Google account, unlocked phone, or already trusted browser remains a serious account compromise. Users must be able to disconnect and forget devices.

## Required before public launch

1. **Authenticated service boundary**
   - Add a backend/Cloudflare Worker API that verifies Google identity tokens.
   - Resolve Store Codes server-side without publishing Store folder identifiers as authority.
   - Enforce Store membership, Admin Level 1/2, group ownership, and Creator-only grants on the server.
   - Issue short-lived app sessions; never put service secrets in GitHub Pages JavaScript.

2. **Production identity**
   - Use a separate production Google Cloud project.
   - Verify ownership of `lot-keys.ca`.
   - Publish the homepage, Privacy Policy, and Terms on the verified HTTPS domain.
   - Move OAuth from Testing to Production and complete brand/sensitive-scope verification as required.
   - Prefer Google Identity Services authorization-code flow with PKCE and a backend token exchange for long-lived production sessions.
   - Request the minimum scopes at the moment a feature needs them.

3. **Messaging and calls**
   - Add an authenticated user/contact directory with rate-limited exact email/phone lookup.
   - Add server-enforced block, mute, kick, ban, report, and group-admin actions.
   - Use a durable encrypted message queue plus Web Push for closed-app notifications.
   - Add key verification/change notices, delivery acknowledgements, attachment scanning/limits, retention rules, and recovery design.
   - Add authenticated signalling and a managed TURN service for calls.

4. **Operational protection**
   - Add immutable audit events for role changes, Store access, special awards, moderation, and security-sensitive actions.
   - Add per-user/IP rate limits, abuse detection, revocation, backup/restore tests, and incident-response steps.
   - Add Content Security Policy, Permissions Policy, Referrer Policy, dependency review, secret scanning, and release checksums.
   - Separate test data from production data and document retention/deletion responsibilities.

5. **Release verification**
   - Test two normal accounts plus Admin Level 1, Admin Level 2, and Creator roles.
   - Test revoked Drive access, removed Store membership, disabled accounts, expired OAuth sessions, offline recovery, and device changes.
   - Test direct/group Chat, block/mute/admin removal, unread state, key changes, attachments, and calls across two networks.
   - Complete accessibility, privacy, threat-model, and independent security reviews.

## Safe V0.9.5.03 test rules

- Keep Google OAuth in **Testing** and explicitly add every tester.
- Share the Store folder only with those same tester Google accounts.
- Keep ordinary and Trusted users as Store/Inventory Viewers. Give Editor/manager access only to Administration accounts.
- Install the processor only from the registered Admin Level 2 account and do not deploy it as a public web app.
- Use test/non-sensitive customer and dealership data.
- Back up the Store folder before testing migrations or administration actions.
- Do not advertise Chat/calls as production-secure or always-on while the app is closed.
- Install the Android APK only on an approved test phone, verify its source/checksum, and use test SMS conversations until the phone-source behavior has been reviewed.
- Register the TEST APK package and published SHA-1 as an Android OAuth client in the same test Cloud project before judging background pairing.
- After pairing, close the phone browser and verify the Android notification remains visible while the PC continues to read and send fictional SMS tests. Treat a red indicator as disconnected and amber as SMS/MMS-only coverage.
- Never describe this checkpoint as RCS-complete, direct-MMS-complete, independently audited, or Play Store approved.
- Do not distribute an EXE that modifies Chrome policy or silently installs the extension. Use the reviewed ZIP during testing and the Chrome Web Store for public release.
