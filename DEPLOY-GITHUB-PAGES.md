# Host the LotKeys test build with GitHub Pages

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

## V0.9.5.13 web hotfix

Deploy the complete website snapshot and then fully close and reopen the installed LotKeys web app once so cache `lotkeys-app-v095013-device-chat-live-refresh` takes control. Keep the working V0.9.5.12 Android connector installed: this release changes only the web conversation view, so there is no APK reinstall or Google-account re-selection.

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
