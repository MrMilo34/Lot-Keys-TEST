'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const Phone = require('../lotkeys-phone-core.js');
const source = fs.readFileSync(require.resolve('../lotkeys-hub.js'), 'utf8');
function fixture(connected = false) {
  const state = { role: 'pc', registered: true, connected, rememberedPair: { deviceId: 'registered-phone' }, coverage: { label: 'SMS/MMS only' }, capabilities: {} };
  state.connection = Phone.connectionStatus(state);
  const actions = new Map(), toasts = [], calls = { retry: 0, pairing: 0 }; let html;
  const dialog = { isConnected: true, close() { this.isConnected = false; } };
  const context = {
    P: { status: () => state, retryPhoneConnection: async () => { calls.retry++; return false; } },
    S: { pending: async () => 0 }, e: x => String(x ?? ''), modal: (title, body) => { html = body; return dialog; },
    $: selector => ({ selector }), action: (button, fn) => actions.set(button.selector, fn), toast: text => toasts.push(text),
    pairPhone: async () => { calls.pairing++; }, pairingFailure: error => { throw error; }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function phonePrimaryLabel('), source.indexOf('\nfunction paintStatus(')), context);
  vm.runInContext(source.slice(source.indexOf('async function phoneStatusDetails('), source.indexOf('\nfunction paintRows(')), context);
  return { context, actions, calls, toasts, dialog, html: () => html };
}
test('status-light settings show green registration and a retry action that reuses trust', async () => {
  const f = fixture(); await f.context.phoneStatusDetails();
  assert.match(f.html(), /hub-status phone green/);
  assert.match(f.html(), /Phone registered/);
  assert.match(f.html(), /Retry phone connection/);
  await f.actions.get('#hub-phone-action')();
  assert.equal(f.calls.retry, 1); assert.equal(f.calls.pairing, 0);
  assert.equal(f.dialog.isConnected, false);
  assert.match(f.toasts.at(-1), /Calling your registered phone/);
  assert.doesNotMatch(f.toasts.at(-1), /Phone connected/);
});
test('an acknowledged live connection shows blue and opens the existing device settings', async () => {
  const f = fixture(true); await f.context.phoneStatusDetails();
  assert.match(f.html(), /hub-status phone blue/);
  assert.match(f.html(), /Phone connected/);
  assert.match(f.html(), /Connected devices/);
  assert.doesNotMatch(f.html(), /Retry phone connection/);
});
