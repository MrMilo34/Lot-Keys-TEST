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
