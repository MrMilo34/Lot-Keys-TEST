# Host the LotKeys test build with GitHub Pages

## V0.9.5.26 web update

Deploy the complete website snapshot and fully close and reopen the installed app so cache `lotkeys-app-v095026-store-sync-disconnect-recovery` takes control. Disconnect in Garage now parks unfinished Store work for a later reconnect, including when a background refresh is running; the page may briefly reload. The V0.9.5.12 Android connector stays installed.

## V0.9.5.25 web update

Deploy the complete website snapshot and fully close and reopen the installed app so cache `lotkeys-app-v095025-store-switch-and-creation` takes control. Garage now offers a Store-only Disconnect action and fresh Store creation for signed-in users. Existing Store membership and personal data remain intact. The V0.9.5.12 Android connector stays installed.

## V0.9.5.24 web update

Deploy the complete website snapshot, then fully close and reopen the installed web app so cache `lotkeys-app-v095024-hub-reminder-shortcut` takes control. The Hub bell remains available to open all reminders and turns grey when none are active; its glyph remains slightly smaller. Keep the V0.9.5.12 Android connector installed; no re-pairing is needed.

## V0.9.5.23 web update

Deploy the complete website snapshot, then fully close and reopen the installed web app so cache `lotkeys-app-v095023-hub-aware-right-side-previews` takes control. Incoming in-app previews are hidden while Hub is open and otherwise occupy only the right-side space from Hub toward the screen edge. The V0.9.5.12 Android connector stays installed; no re-pairing is needed.

## V0.9.5.22 web update

Deploy the complete website snapshot, then fully close and reopen the installed web app so cache `lotkeys-app-v095022-quiet-device-send-confirmation` takes control. Device SMS sends no longer show a duplicate success pop-up; the sent state remains under the message and send errors still appear. Keep the V0.9.5.12 Android connector installed; no re-pairing is needed.

## V0.9.5.21 web update

Deploy the complete website snapshot, then fully close and reopen the installed web app so cache `lotkeys-app-v095021-chat-width-typography-theme-headers` takes control. Full LotKeys Chat now uses more screen width, incoming chat cards match Device chat, Device text matches the in-app type, and the five main page headers follow the light and dark theme. Keep the V0.9.5.12 Android connector installed; no re-pairing is needed.

## V0.9.5.20 web update

Deploy the complete website snapshot, then fully close and reopen the installed LotKeys web app once so cache `lotkeys-app-v095020-neutral-bubble-frame-contact-header` takes control. The Device Bubble Chat frame is grey, while messages and compact alerts retain their Organization color. Its contact number sits below the name. Keep the V0.9.5.12 Android connector installed; no re-pairing is needed.

## V0.9.5.19 web update

Deploy the complete website snapshot, then fully close and reopen the installed LotKeys web app once so cache `lotkeys-app-v095019-unified-bubble-chat-hub-controls` takes control. Keep the V0.9.5.12 Android connector installed. The update adds the shared LotKeys/Device Bubble Chat, incoming previews, bell adjustments, and lower-right Hub action placement. No APK reinstall or re-pairing is required.

LotKeys needs a normal HTTPS origin for Google browser OAuth. Opening `index.html` with Android's `content://` URL is fine for UI testing but Google authorization will not work there.

## Team-test deployment

1. For team testing, open `MrMilo34/Lot-Keys-TEST` and use its `main` branch. Use `MrMilo34/Lot-Keys` only when intentionally promoting the tested build to the production custom domain.
2. Extract the release ZIP, then upload **everything inside it** directly to the repository root. The ZIP is already flat: `index.html` appears immediately after extraction, with no version-named wrapper folder. Do not omit the `assets` or `extension` folders or either feature module. The required root items include:
   - `index.html`
   - `manifest.webmanifest`
   - `sw.js`
   - `icon.svg`
   - `lotkeys-messaging.js`
   - `lotkeys-awards.js`
   - `lotkeys-info.js` and `lotkeys-info.json`
   - `install.html`, `privacy.html`, and `terms.html`
   - `lotkeys-store-directory.json`, `lotkeys-creator-access.json`, and `version.json`
   - `PROCESSOR-SETUP.md` and the complete `processor` folder (Admin Level 2 setup source)
   - the complete `assets` folder
   - `extension/latest.json` and the current V0.1.23 ZIP in `extension/releases`, so the in-app Post Buddy download cannot depend on a remote pointer
   - no unpacked `extension/latest` or `extension/source` directory and no superseded Buddy ZIPs; maintained source stays outside the public website snapshot
3. Open the repository's **Settings**.
4. Open **Pages** under Code and automation.
5. Under Build and deployment, choose **Deploy from a branch**.
6. Select the `main` branch and `/ (root)` folder.
7. Save.
8. Wait for GitHub to publish the page, then use the HTTPS URL GitHub provides.
9. Open that URL in Chrome on Android.

## V0.9.5.18 web update

Deploy the complete website snapshot and then fully close and reopen the installed LotKeys web app once so cache `lotkeys-app-v095018-contact-header-pc-names` takes control. Keep the working V0.9.5.12 Android connector installed: this release keeps the V0.9.5.17 Hub controls and adds two-line contact names plus trusted-computer nicknames in the phone Hub. It retains V0.9.5.16 live MMS previews and scroll-loaded history. There is no APK reinstall, re-pairing, or Google-account re-selection.

## Compatible V0.9.5.12 Android connector

Uploading the complete release also includes the unchanged `android/` source and may start **Build LotKeys Android Layer**. Install its artifact only when the phone does not already have V0.9.5.12. After that Action succeeds:

1. Open the repository's **Actions** tab and select the newest successful **Build LotKeys Android Layer** run.
2. Download the `LotKeys-Android-V0.9.5.12` artifact and extract its APK.
3. Install it over the existing **LotKeys Connector TEST** app. The repository's stable TEST signing secrets must be configured for an in-place update.
4. Open the connector and confirm the heading reads **Phone Connection · V0.9.5.12 TEST**.
5. Select the same Google account once when prompted. This refreshes V0.9.5.11's incomplete saved Android account identity; future updates preserve the exact identity.
6. Keep the connection notification enabled. Use **Locked-Phone Battery Settings** and confirm Android's direct unrestricted-background prompt.

After the website is current, sign in as Admin Level 2, run **Repair Store Structure**, and complete `PROCESSOR-SETUP.md`. The static website can accept More requests without the trigger, but creator/Trusted automatic changes and Administration queue delivery require the processor.

The independent test URL is `https://mrmilo34.github.io/Lot-Keys-TEST/`. Keep `CNAME` absent from that repository. The production `Lot-Keys` repository keeps its existing root `CNAME` and therefore redirects its GitHub project URL to `https://lot-keys.ca/`.

Google OAuth Authorized JavaScript origins contain only the scheme and hostname: use `https://mrmilo34.github.io`, `https://lot-keys.ca`, and `https://www.lot-keys.ca` during the transition.

Do not put Google client secrets, passwords, Drive access tokens, customer data, VIN databases, or other private dealership data in the GitHub repository. This repository contains only the static application code. Actual vehicle/customer files stay in Google Drive.
