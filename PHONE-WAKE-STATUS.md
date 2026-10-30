# Phone wake-up candidate — 2026-10-30

The .39 work branch adds native FCM reception, encrypted per-PC wake grants,
PC dispatch and a separate authenticated Apps Script sender. It is source only,
not activated or real-device verified. Import requires a genuine LotKeys Android
Firebase registration and a private owner sender setup. Existing idle polling
remains intact. See wake-sender/README.md and RELEASE-0.9.5.39.md. No billing,
Store Processor exposure or Enigma identity reuse is authorized.

## Earlier baseline and constraints (still applicable)

# Phone wake-up continuation — 2026-10-16

Blair wants no intentional polling wait: a trusted PC opening LotKeys should wake the phone; keep the existing quick SMS/MMS relay active while the PC is reachable; after a recovery grace period with no PC, let the connector sleep. Opening LotKeys on the phone can also initiate work. Preserve trusted pairing and the working active messaging path.

Status: design only. Android V0.9.5.12 currently runs the DriveRelay worker with a two-second fixed delay, including idle offer checks. Reconnection after reboot resumes those checks; it does not prove an inbound wake channel exists. No push endpoint, Firebase Android registration or FCM receiver has been deployed in this work.

FCM delivery is listed as no-cost. Sending requires a trusted environment that protects server credentials, authenticates the approved PC, validates phone/trust/revocation and resists replay/abuse. The sender's hosting also must satisfy Blair's zero-spend requirement. Firebase Cloud Functions require Blaze, so their free usage allowance alone does not meet the no-billing condition. A quota-limited no-billing sender such as Apps Script is a candidate requiring verification and separate configuration; it is not yet a proven deployment. Do not deploy the Store Processor as a public wake endpoint.

Enigma already has a separate Firebase account/backend project and remains under its own Spark/zero-spend hold. Sharing a provider or implementation approach does not authorize merging identities, exposing credentials or activating paid resources.

Android high-priority push and foreground-service launch rules apply, including user-visible notification requirements and possible delivery delays. Do not promise guaranteed instantaneous wake or successful reception while the phone is offline or force-stopped. Test deep idle, reboot, PC suspension, ordinary network blips, token rotation, revocation and duplicate wake requests before allowing the current idle loop to stop.

References: https://firebase.google.com/pricing ; https://firebase.google.com/docs/cloud-messaging/server-environment ; https://firebase.google.com/docs/cloud-messaging/android-message-priority ; https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start .

## V0.9.5.38 setup check

The two supplied google-services JSON files both contain only the Enigma Android client `ca.enigma.messages.alpha2` in its Firebase project. Neither registers `ca.lotkeys.connector.test`. Do not substitute Enigma resources or claim that its current setup activates LotKeys wake. A LotKeys Android app entry/configuration, native receiver and secure sender deployment are still required. The .38 web cache is independent of this setup and retains the installed .12 connector.
