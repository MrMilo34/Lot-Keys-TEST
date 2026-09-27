'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const PhoneCore = require('../lotkeys-phone-core.js');

const source = fs.readFileSync(path.join(__dirname, '..', 'lotkeys-phone.js'), 'utf8');

function phoneWithNativeRelay(relay) {
  const values = new Map([['lotkeys-phone-native-token-v1', 'x'.repeat(40)]]);
  const sessions = new Map([['lotkeys-phone-active-session-v1', '{"role":"phone"}']]);
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) });
  const calls = { authorize: 0, restore: 0, fetch: [] };
  const native = { deviceName: 'Test phone', capabilities: { smsHistory: true }, relay };
  const context = {
    LotKeysPhoneCore: PhoneCore,
    LotKeysMessagingBridge: { DriveSync: {
      connected: () => true,
      restoreSessionAuthorization: async () => { calls.restore++; return true; },
      authorize: async () => { calls.authorize++; return 'browser-token'; },
      getGoogleIdentity: async () => ({ email: 'browser@example.test' })
    } },
    crypto: webcrypto, TextEncoder, TextDecoder, Headers, AbortController, URLSearchParams,
    localStorage: storage(values), sessionStorage: storage(sessions),
    location: { hash: '', pathname: '/', search: '' }, history: { replaceState() {} },
    navigator: {}, document: { readyState: 'loading', visibilityState: 'visible', addEventListener() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    dispatchEvent() {}, addEventListener() {},
    setTimeout: () => 1, clearTimeout() {},
    fetch: async url => {
      calls.fetch.push(String(url));
      if (String(url).endsWith('/v1/status')) return { ok: true, json: async () => native };
      if (String(url).includes('/v1/threads?')) return { ok: true, json: async () => ({ threads: [] }) };
      if (String(url).endsWith('/v1/pairings')) return { ok: true, json: async () => ({ pairings: [] }) };
      throw Error('Unexpected network request: ' + url);
    }
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'lotkeys-phone.js' });
  return { phone: context.LotKeysPhone, calls, sessions };
}

function pcWithRememberedTrust() {
  const browserId = 'trusted-browser-1234567890';
  const values = new Map([
    ['lotkeys-phone-browser-id-v1', browserId],
    ['lotkeys-phone-remembered-pair-v1', JSON.stringify({
      version: 1, browserId, phoneName: 'Test phone', trustMode: '36h',
      deviceId: 'trusted-phone-1234567890',
      trustExpiresAt: Date.now() + 60 * 60 * 1000, connectedAt: Date.now(), disconnected: false
    })]
  ]);
  const sessions = new Map();
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) });
  const timers = [];
  const uploads = [];
  const response = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(body)
  });
  const context = {
    LotKeysPhoneCore: PhoneCore,
    LotKeysMessagingBridge: { DriveSync: {
      connected: () => true,
      restoreSessionAuthorization: async () => true,
      authorize: async () => 'pc-browser-token'
    } },
    crypto: webcrypto, TextEncoder, TextDecoder, Headers, AbortController, URL, URLSearchParams, Blob,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    localStorage: storage(values), sessionStorage: storage(sessions),
    location: { hash: '', pathname: '/', search: '' }, history: { replaceState() {} },
    navigator: { platform: 'Test PC', userAgent: 'Chrome/1' },
    document: { readyState: 'loading', visibilityState: 'hidden', addEventListener() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    dispatchEvent() {}, addEventListener() {},
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; },
    clearTimeout() {},
    fetch: async (url, options = {}) => {
      if (String(url).includes('/upload/drive/v3/files')) {
        uploads.push({ url: String(url), options });
        return response({ id: 'automatic-offer-file' });
      }
      if (String(url).includes('/drive/v3/files')) return response({ files: [] });
      throw Error('Unexpected network request: ' + url);
    }
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'lotkeys-phone.js' });
  return { phone: context.LotKeysPhone, timers, uploads };
}

test('the phone refuses browser-only pairing even with a browser Drive grant', async () => {
  const { phone, calls, sessions } = phoneWithNativeRelay({ authorized: false, account: 'phone@example.test', trusts: [] });
  await phone.init();
  assert.equal(phone.status().native, true);
  assert.equal(phone.status().relayReady, false);
  assert.equal(phone.status().connected, false);
  assert.equal(sessions.has('lotkeys-phone-active-session-v1'), false, 'legacy browser-owned phone session is removed');
  await assert.rejects(phone.preparePhonePairing(), /Android PC relay needs Google authorization/);
  assert.equal(calls.authorize, 0, 'browser Drive authorization must not substitute for Android relay');
  assert.equal(calls.restore, 1, 'Hub records can still restore their browser grant');
  assert.equal(calls.fetch.some(url => url.includes('googleapis.com')), false);
});

test('a native relay error survives a successful local SMS refresh', async () => {
  const { phone } = phoneWithNativeRelay({ authorized: true, account: 'phone@example.test', connected: false,
    lastError: 'Android relay cannot reach Drive', trusts: [] });
  await phone.init();
  await phone.refreshThreads();
  assert.equal(phone.status().relayReady, true);
  assert.equal(phone.status().relayError, 'Android relay cannot reach Drive');
  assert.equal(phone.status().connected, false);
  await assert.rejects(phone.preparePhonePairing(), /Android PC relay reported: Android relay cannot reach Drive/);
});

test('a trusted PC starts fresh background pairing without a reconnect tap', async () => {
  const { phone, timers, uploads } = pcWithRememberedTrust();
  await phone.init();
  const recovery = timers.find(timer => timer.delay === 500);
  assert.ok(recovery, 'automatic recovery timer should be scheduled');
  await recovery.fn();
  const status = phone.status();
  assert.equal(status.pairing?.automatic, true, JSON.stringify(status));
  assert.equal(status.rememberedPair?.trustMode, '36h');
  assert.equal(uploads.length, 1);
  const body = await uploads[0].options.body.text();
  assert.match(body, /"reconnect":true/);
  assert.match(body, /"browserId":"trusted-browser-1234567890"/);
  assert.match(body, /"targetDeviceId":"trusted-phone-1234567890"/);
});
