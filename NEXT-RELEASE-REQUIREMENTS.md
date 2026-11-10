# Next update: Account background controls and public OAuth readiness

Recorded from Blair's requirements on 2026-11-10. This is a requirements/audit checkpoint, not an implemented or deployed .47 release. Baseline: TEST main 6f5d24622789d466237483f0a4bcf55f0eac7bdc / .46. Existing signed APK, data, .44 retries, .43 fallback and production stay preserved.

## Confirmed and unconfirmed .46 behavior

Blair confirmed that the .46 toolbar correction fixed the installed app view. This does not confirm a real phone background upload.

Source inspection confirms TransferJobService uses Android JobScheduler independently of the browser. It uploads retained originals, checkpoints progress, completes Vehicle PDF/Inventory work and retries transient failures. From a visible native action on Android 14+, it requests user-initiated data transfer scheduling and shows an ongoing notification. Ordinary jobs may be deferred. Android can stop jobs; no guarantee of uninterrupted execution is made.

The browser must remain open during original preparation/staging until the complete durable handoff is verified. This does not keep the entire website alive as though foregrounded and is not universal support for every upload. Current native handoff is used for eligible administrator Vehicle Profile saves; browser-only Listing, Account, Store assets and conservative edit/reconciliation paths must be audited separately before claiming all-upload coverage.

406 web and 58 Robolectric native tests passed for .46; build/lint and signature checks passed. These are automated checks, not actual Samsung app-switch/lock/network tests. Do not display a universal green working indicator based only on capability or a saved authorization account. TransferAuth.ready checks stored account identity, not current live token validity. JobInfo.isUserInitiated describes scheduling mode, not measured transfer activity.

## Minimal Account UI requirement

Put normal controls on Account directly beneath Lock Screen, not in a separate upload menu:

- Background uploads: one primary enable/setup or resume action, a small status light and short status text.
- Phone connector: one enable/setup or manage action, a small status light and short status text.

Request only each feature's necessary Google/Android permissions in response to the user's enable action, opening standard system/consent prompts. Show missing permission recovery in that same Account section. Avoid a large advanced settings panel. Account Lock Screen privacy must not cancel already committed authorized native uploads.

Green means the relevant capability/access has actually been checked and is ready; actual running work must separately say Uploading. Missing permission, revoked consent, wrong account, offline/deferred work and errors must not appear as green active transfers. Refresh status on returning from permission/system UI and app resume, without adding idle polling.

Make native confirmation minimal and return the user to Account. A web button inside Chrome/TWA is not automatically a visible Activity of ca.lotkeys.connector.test for Android UIDT eligibility. Do not remove that eligibility boundary or fake foreground visibility just to remove the old menu. Prefer requesting upload scheduling from a real native visible user interaction, while keeping the normal setup/status surface in Account. Existing .46 standalone controls remain until the replacement is implemented/tested; this checkpoint does not claim they have moved.

Blair wants uploads to keep progressing while using other apps. Audit all upload paths, preserve original media and retries, and identify precisely which preparation/upload/finalization steps remain browser-dependent. Measure a phone upload through app switch, lock/unlock and brief network loss; verify final media/PDF/Inventory and absence of duplicates. A percentage alone is not permission to switch apps.

## Exact current user-provisioning behavior

index.html provisionStoreUser({userName,email}) adds or reactivates a LotKeys Store user, creates their Listings/Listing Assets/More workspace and provisions appropriate Drive access. Setup Label is optional and defaults from email; it is a LotKeys setup/workspace identifier, not the person's Google profile name. Exact Google Account Email identifies the Google account to share with.

Add User & Provision Access does not add an OAuth test user or edit Google Cloud. Open Google OAuth Test Users opens the Google Console audience page separately. While that OAuth project is Testing, the same exact email must also be added there manually. Public OAuth consent and Store membership are independent: publishing OAuth must not make private dealership files available to every Google account.

## Public-release prerequisites

Current web DRIVE_SCOPE includes openid, email, https://www.googleapis.com/auth/drive and drive.appdata. Native TransferAuth requests full drive; phone relay uses drive.appdata. Google classifies full drive as restricted, drive.file and drive.appdata as non-sensitive.

To remove the OAuth test-user allowlist for public users, prepare the appropriate External / In production OAuth configuration and complete verification for the requested sensitive/restricted scopes. Publishing alone is not scope approval; an unverified app may retain warning screens and user caps. Review production/test client separation, domains, branding/home/privacy/deletion information and exact current scopes. Assess whether an external security assessment applies to the actual data flow; do not promise a cost or introduce a migration blindly.

Evaluate least-privilege scopes without breaking existing shared Store folders, folder discovery, existing-file recovery, Google Picker access, native upload OAuth clients or Store Processor behavior. Do not merely replace drive with drive.file and assume inherited/descendant access works. Preserve the low-cost Google-based pilot and current data.

Live Google Cloud audience/verification status is unconfirmed. https://console.cloud.google.com/auth/audience?project=lotkeys returned Site Unavailable in this browser, including after one reload. No Console settings, credentials, permissions or publishing state were changed.

Primary references checked 2026-11-10:
- https://support.google.com/cloud/answer/15549945?hl=en
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://developer.android.com/develop/background-work/background-tasks/uidt

## Next implementation checkpoint

Start from current main, read AGENTS/CURRENT-STATE/version, and preserve signing/data/features/production. Implement minimal Account controls with honest status and permission recovery; test real behavior and lifecycle, then run the required existing checks. Coordinate any native/API/web version changes, build/sign with the existing authorized key and verify an upgrade. Keep physical phone results separate. Resolve the all-upload coverage gap and OAuth access/verification before claiming public-release readiness.
