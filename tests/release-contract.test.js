'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('release metadata is consistently V0.9.4.83', () => {
  const version = JSON.parse(read('version.json'));
  assert.equal(version.version, '0.9.4.83');
  assert.equal(version.build, '09483');
  assert.equal(version.channel, 'test');
  assert.equal(version.serviceWorkerCache, 'lotkeys-app-v09483-hub-foundation-credentials-repair');
  assert.match(read('index.html'), /V0\.9\.4\.83/);
  assert.match(read('manifest.webmanifest'), /build=09483/);
  assert.match(read('sw.js'), /lotkeys-app-v09483-hub-foundation-credentials-repair/);
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

test('phone bridge, pairing and Android artifacts are absent', () => {
  for (const target of [
    'lotkeys-device-client.js',
    'lotkeys-device-pairing.js',
    'device-bridge',
    '.github/workflows/build-phone-mirror.yml'
  ]) assert.equal(fs.existsSync(path.join(root, target)), false, target);
  assert.doesNotMatch(read('index.html'), /lotkeys-device-client|LotKeysDevice/);
  assert.doesNotMatch(read('sw.js'), /lotkeys-device-client/);
  assert.doesNotMatch(read('lotkeys-hub.js'), /LotKeysDevice|bridgeDialog|pairing code|D\.send/);
});

test('internal LotKeys chat remains wired into Hub', () => {
  const messaging = read('lotkeys-messaging.js');
  assert.match(messaging, /if\(window\.LotKeysHub\)return window\.LotKeysHub\.open/);
  assert.match(messaging, /async function sendDirect/);
  assert.match(messaging, /async function sendParty/);
  assert.match(messaging, /function hubMount/);
  assert.match(messaging, /async function hubRows/);
  assert.match(read('index.html'), /lotkeys-messaging\.js\?v=09483/);
  assert.match(read('index.html'), /lotkeys-hub\.js\?v=09483/);
});

test('Device is an organization surface, not a connection claim', () => {
  const hub = read('lotkeys-hub.js');
  assert.match(hub, /Phone connection intentionally not included in V0\.9\.4\.83/);
  assert.match(hub, /data-category-all/);
  assert.match(hub, /selectedCategories/);
  assert.match(hub, /Subcategory/);
  assert.doesNotMatch(hub, /id="hub-connect"/);
});
