'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('release metadata is consistently V0.9.4.86', () => {
  const version = JSON.parse(read('version.json'));
  assert.equal(version.version, '0.9.4.86');
  assert.equal(version.build, '09486');
  assert.equal(version.channel, 'test');
  assert.equal(version.serviceWorkerCache, 'lotkeys-app-v09486-hub-workflow');
  assert.match(read('index.html'), /V0\.9\.4\.86/);
  assert.match(read('manifest.webmanifest'), /build=09486/);
  assert.match(read('sw.js'), /lotkeys-app-v09486-hub-workflow/);
});

test('TEST Google browser configuration has complete safe fallbacks', () => {
  const html = read('index.html');
  const clientId = html.match(/googleClientId:'([^']+)'/)?.[1] || '';
  const apiKey = html.match(/googleApiKey:'([^']+)'/)?.[1] || '';
  const projectNumber = html.match(/googleProjectNumber:'([^']+)'/)?.[1] || '';
  assert.match(clientId, /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i);
  assert.match(apiKey, /^AIza[A-Za-z0-9_-]{30,}$/);
  assert.match(projectNumber, /^\d{10,15}$/);
  assert.equal(projectNumber, clientId.split('-')[0]);
  assert.match(html, /configuredSettingValue\(id,value,fallback/);
  assert.doesNotMatch(html, /client[_ ]?secret/i);
});

test('personal Account sync restores before writing and deletes photos only by explicit request', () => {
  const html = read('index.html');
  const messaging = read('lotkeys-messaging.js');
  assert.match(html, /getPersonalProfileRestoreStatus/);
  assert.match(html, /Restore Account\.json from Google Drive before saving/);
  assert.match(html, /remoteAt!==baseline\.baseUpdatedAt/);
  assert.match(html, /personalProfileHydratedFileId/);
  assert.match(html, /personalProfilePhotoDeleteRequested/);
  assert.match(html, /else if\(deletePhoto&&photoFileId\)/);
  assert.doesNotMatch(html, /else if\(photoFileId\)\{await trashFile\(photoFileId\)/);
  assert.match(html, /else if\(allowPhotoDelete&&thumbId\)/);
  assert.doesNotMatch(html, /else if\(thumbId\)\{await trashFile\(thumbId\)/);
  assert.match(html, /localPersonalRecoverySignals/);
  assert.match(html, /preserved the local copy and blocked automatic replacement/);
  assert.match(html, /if\(preferRemote&&!localPending\)\{const loaded=await loadPersonalProfile\(\)/);
  assert.match(html, /id='restore-account-settings'/);
  assert.match(html, /loadPersonalProfile\(\{forceRemote:true\}\)/);
  assert.doesNotMatch(html, /choosePersonalAccountLocation\(\);loaded=await DriveSync\.loadPersonalProfile\(\{forceRemote:true\}\)/);
  assert.match(html, /markPersonalProfileChanged\(\).*personalProfileSyncPending/s);
  assert.match(messaging, /personalProfileSyncPending/);
});

test('personal Account folders can rebuild recoverable assets without Account.json pointers', () => {
  const html = read('index.html');
  assert.match(html, /discoverPersonalAccountAssets/);
  assert.match(html, /discoverPersonalCelebrationSounds/);
  assert.match(html, /personalCelebrationAudioFile/);
  assert.match(html, /selectedCelebrationSoundId:selectedId&&soundIds\.has\(selectedId\)\?selectedId:''/);
  assert.match(html, /recoverPersonalAccountFolder\(\{folder=null,preserveLocal=true\}/);
  assert.match(html, /Celebration Sounds folder whenever this opens/);
  assert.match(html, /lotkeysOriginalName/);
  assert.match(html, /syncPersonalDescriptionTemplateFiles/);
  assert.match(html, /personalDescriptionTemplates/);
  assert.match(html, /recordType:'descriptionTemplate'/);
  assert.match(html, /deletePersonalDescriptionTemplateFile/);
  assert.match(html, /preserveLocalPreferences:localPending/);
  assert.match(html, /templateSource=preserveLocalPreferences/);
  assert.match(html, /personalCelebrationSoundClearRequested/);
  assert.match(html, /if\(photoFile\?\.trashed\)photoFile=null/);
  assert.match(html, /if\(accountFile\?\.trashed\)accountFile=null/);
  assert.match(html, /if\(!selected&&storeFileId&&!clearRequested\)return/);
  assert.match(html, /syncStoreCelebrationSound\(null,\{allowDelete:!fileId\}\)/);
});

test('phone checkpoint uses the new Android layer and encrypted same-account transport', () => {
  for (const target of [
    'lotkeys-phone-core.js',
    'lotkeys-phone.js',
    'android/app/src/main/AndroidManifest.xml',
    'android/app/src/main/java/ca/lotkeys/connector/MainActivity.java',
    'android/app/src/main/java/ca/lotkeys/connector/PhoneStore.java',
    '.github/workflows/build-lotkeys-android.yml'
  ]) assert.equal(fs.existsSync(path.join(root, target)), true, target);
  const phone = read('lotkeys-phone.js');
  assert.match(phone, /appDataFolder/);
  assert.match(phone, /name: 'ECDH'/);
  assert.match(phone, /name: 'AES-GCM'/);
  assert.match(phone, /lotkeysPairOffer/);
  assert.match(phone, /String\(1000 .* % 9000\)/);
  assert.match(phone, /processed and expired|cleanupStale|deleteFile/);
  assert.doesNotMatch(phone, /device\.json|hub\.json|cloudflared|Python relay/i);
  assert.match(read('index.html'), /lotkeys-phone\.js\?v=09486/);
  assert.match(phone, /targetAddressSpace: 'loopback'/);
  assert.match(phone, /connectNative/);
  assert.match(read('lotkeys-hub.css'), /hub-signal-bars/);
  assert.match(read('sw.js'), /lotkeys-phone\.js/);
});

test('Android layer keeps the existing messenger and requests only checkpoint capabilities', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const activity = read('android/app/src/main/java/ca/lotkeys/connector/MainActivity.java');
  const store = read('android/app/src/main/java/ca/lotkeys/connector/PhoneStore.java');
  const server = read('android/app/src/main/java/ca/lotkeys/connector/LocalApiServer.java');
  const boot = read('android/app/src/main/java/ca/lotkeys/connector/BootReceiver.java');
  assert.match(manifest, /android\.permission\.READ_SMS/);
  assert.match(manifest, /android\.permission\.SEND_SMS/);
  assert.match(manifest, /android\.permission\.READ_CONTACTS/);
  assert.match(manifest, /foregroundServiceType="remoteMessaging"/);
  assert.doesNotMatch(manifest, /RECEIVE_SMS|RECEIVE_MMS|RECEIVE_WAP_PUSH|WRITE_SMS|READ_CALL_LOG|WRITE_CALL_LOG|BIND_ACCESSIBILITY_SERVICE|MANAGE_EXTERNAL_STORAGE/);
  assert.match(activity, /remains your default messaging app/);
  assert.match(activity, /#lotkeys-phone=/);
  assert.doesNotMatch(activity, /FLAG_SECURE/, 'TEST connector must allow screenshots and screen recording');
  assert.doesNotMatch(activity, /ROLE_SMS|device\.json|hub\.json/);
  assert.match(store, /Telephony\.Threads/);
  assert.match(store, /sendTextMessage|sendMultipartTextMessage/);
  assert.match(store, /The phone recipient changed/);
  assert.match(server, /127\.0\.0\.1/);
  assert.match(server, /Bearer /);
  assert.match(server, /allowedOrigin/);
  assert.match(boot, /ACTION_BOOT_COMPLETED\.equals\(action\)/);
  assert.match(manifest, /dataExtractionRules="@xml\/data_extraction_rules"/);
});

test('internal LotKeys chat remains wired into Hub', () => {
  const messaging = read('lotkeys-messaging.js');
  assert.match(messaging, /if\(window\.LotKeysHub\)return window\.LotKeysHub\.open/);
  assert.match(messaging, /async function sendDirect/);
  assert.match(messaging, /async function sendParty/);
  assert.match(messaging, /function hubMount/);
  assert.match(messaging, /async function hubRows/);
  assert.match(read('index.html'), /lotkeys-messaging\.js\?v=09486/);
  assert.match(read('index.html'), /lotkeys-hub\.js\?v=09486/);
});

test('cached LotKeys renders before Chat and Phone background startup', () => {
  const html = read('index.html');
  const messaging = read('lotkeys-messaging.js');
  const phone = read('lotkeys-phone.js');
  const hub = read('lotkeys-hub.js');
  const firstRender = html.indexOf('await render();\n    signalBaseReady();');
  const onlineBoot = html.indexOf("requestAnimationFrame(()=>setTimeout(()=>finishOnlineBoot().catch(console.warn),0))");
  assert.ok(firstRender >= 0, 'base render must signal readiness');
  assert.ok(onlineBoot > firstRender, 'remote startup must begin after the cached render');
  assert.match(html, /window\.__lotKeysBaseReady=true/);
  assert.match(messaging, /lotkeys-base-ready/);
  assert.match(phone, /lotkeys-base-ready/);
  assert.match(hub, /lotkeys-base-ready/);
});

test('adaptive monitoring gives refreshes and uploads temporary network priority', () => {
  const html = read('index.html');
  const messaging = read('lotkeys-messaging.js');
  const phone = read('lotkeys-phone.js');
  const activity = read('android/app/src/main/java/ca/lotkeys/connector/MainActivity.java');
  assert.match(html, /MONITOR_MESSAGE_IDLE_MS=1500,MONITOR_MESSAGE_HEAVY_MS=10000/);
  assert.match(html, /MONITOR_PHONE_IDLE_MS=3000,MONITOR_PHONE_HEAVY_MS=30000/);
  for (const reason of ['inventory-refresh', 'listings-refresh', 'vehicle-profile-upload', 'vehicle-listing-upload']) {
    assert.match(html, new RegExp(reason));
  }
  assert.match(html, /lotkeys-workload-change/);
  assert.match(html, /monitoringState,/);
  assert.match(messaging, /const POLL_NORMAL=1500/);
  assert.match(messaging, /const POLL_HEAVY=10000/);
  assert.match(messaging, /nextPollDelay/);
  assert.match(messaging, /resumeMessageMonitoring/);
  assert.match(phone, /PHONE_POLL_IDLE_MS = 3000/);
  assert.match(phone, /PHONE_POLL_HEAVY_MS = 30000/);
  assert.match(phone, /FRAME_POLL_HEAVY_MS = 10000/);
  assert.match(phone, /scheduleNativeTick/);
  assert.match(phone, /scheduleOfferPoll/);
  assert.doesNotMatch(phone, /nativeTimer\s*=\s*setInterval/);
  assert.doesNotMatch(phone, /offerTimer\s*=\s*setInterval/);
  assert.match(activity, /This is not a second customer-message alert and it does not replace your normal messaging notifications/);
});

test('Hub connection status is compact, actionable and scrolls with Hub home', () => {
  const hub = read('lotkeys-hub.js');
  const css = read('lotkeys-hub.css');
  assert.match(hub, /class="hub-phone-indicator amber" id="hub-phone-status"/);
  assert.match(hub, /async function phoneStatusDetails/);
  assert.match(hub, /id="hub-phone-action"/);
  assert.match(hub, /id="hub-sync"/);
  assert.doesNotMatch(hub, /<div id="hub-status"><\/div>/);
  assert.match(css, /\.hub-shell\.home\{overflow:auto/);
  assert.match(css, /\.hub-phone-indicator\.green/);
  assert.match(css, /\.hub-phone-indicator\.amber/);
  assert.match(css, /\.hub-phone-indicator\.red/);
});

test('Device chat survives background refresh and preserves its unsent draft', () => {
  const messaging = read('lotkeys-messaging.js');
  const hub = read('lotkeys-hub.js');
  assert.match(messaging, /!panel\.dataset\.conversationId&&!panel\.dataset\.hub/);
  assert.match(hub, /DEVICE_DRAFT_PREFIX='lotkeys-device-draft-v1:'/);
  assert.match(hub, /draft\.value=readDeviceDraft\(draftKey\)/);
  assert.match(hub, /saveDeviceDraft\(draftKey,draft\.value\)/);
  assert.match(hub, /input\.value='';saveDeviceDraft\(draftKey,''\)/);
});

test('Device is driven by real phone availability and never simulates connectivity', () => {
  const hub = read('lotkeys-hub.js');
  assert.match(hub, /P\.refreshThreads/);
  assert.match(hub, /openDeviceConversation/);
  assert.match(hub, /Approve & Connect/);
  assert.match(hub, /Sending/);
  assert.match(hub, /Sent/);
  assert.match(hub, /Failed/);
  assert.match(hub, /data-category-all/);
  assert.match(hub, /selectedCategories/);
  assert.match(hub, /Subcategory/);
  assert.doesNotMatch(hub, /simulated|fake conversation/i);
});

test('Hub All groups LotKeys first and remembers independent collapse state', () => {
  const hub = read('lotkeys-hub.js');
  const lotkeys = hub.indexOf("section('lotkeys','LotKeys Chats'");
  const device = hub.indexOf("section('device','Device Messages'");
  assert.ok(lotkeys >= 0 && device > lotkeys);
  assert.match(hub, /GROUP_STATE_KEY='lotkeys-hub-group-state-v1'/);
  assert.match(hub, /data-toggle-group/);
  assert.match(hub, /saveGroupState/);
});

test('current Device conversation layout omits avatar and exposes customer actions', () => {
  const hub = read('lotkeys-hub.js');
  const current = hub.slice(hub.lastIndexOf('async function openDeviceConversation'), hub.indexOf('function appointmentCard', hub.lastIndexOf('async function openDeviceConversation')));
  assert.doesNotMatch(current, /hub-device-avatar/);
  for (const id of ['hub-device-contact', 'hub-device-appointment', 'hub-device-note', 'hub-device-questions', 'hub-device-files']) {
    assert.match(current, new RegExp(id));
  }
  assert.match(current, /Use in message|questionsDialog/);
});

test('contacts support interested vehicles, searchable notes and reminders', () => {
  const hub = read('lotkeys-hub.js');
  assert.match(hub, /primaryVehicleId/);
  assert.match(hub, /Interested vehicles/);
  assert.match(hub, /data-contact-vehicle/);
  assert.match(hub, /id="hub-note-topic-search"/);
  assert.match(hub, /id="hub-note-reminder"/);
  assert.match(hub, /kind:'Reminder'/);
  assert.match(hub, /id="hub-cal-reminder"/);
  assert.match(read('lotkeys-hub-core.js'), /DTSTART;VALUE=DATE/);
});

test('PC notification sounds never add a second Android alert', () => {
  const html = read('index.html');
  const messaging = read('lotkeys-messaging.js');
  assert.match(html, /PC Notification Sound/);
  assert.match(html, /Android phone stays silent/);
  assert.match(html, /lotkeysNotificationCustomSound/);
  assert.match(messaging, /if\(!preview&&isPhoneNotificationDevice\(\)\)return false/);
  assert.match(messaging, /notificationSounds/);
  assert.match(messaging, /playNotificationSound\(\)\.catch/);
});

test('Hub logo and floating actions use the corrected responsive layout', () => {
  const css = read('lotkeys-hub.css');
  assert.match(css, /\.hub-brand img\{border-radius:22%;clip-path:inset\(0 round 22%\)\}/);
  assert.match(css, /\.hub-actions\{right:12px;bottom:12px\}/);
  assert.match(css, /@media\(min-width:980px\).*\.hub-actions\{top:50%;bottom:auto/s);
});
