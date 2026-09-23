'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Phone = require('../lotkeys-phone-core.js');

const contacts = [{
  id: 'c1',
  name: 'LotKeys Custom Name',
  fields: [{ kind: 'phone', value: '780-555-0123', primary: true }],
  categoryIds: ['clients']
}];

test('custom LotKeys name wins over Android name and number', () => {
  const thread = { id: 'smsmms-1', address: '+17805550123', title: '+17805550123', phoneContactName: 'Android Name' };
  assert.equal(Phone.displayName(thread, contacts), 'LotKeys Custom Name');
  assert.equal(Phone.displayName({ ...thread, address: '+17805550999' }, contacts), 'Android Name');
});

test('conversation identity and sorting are keyed by normalized phone number', () => {
  const thread = { id: 'smsmms-2', address: '(780) 555-0123', title: 'Number', at: 10, canReply: true };
  const rows = Phone.normalizeThreads([thread], contacts, [{ phone: '+17805550123', categoryIds: ['hot'], primaryCategoryId: 'hot' }]);
  assert.equal(rows[0].phone, '+17805550123');
  assert.deepEqual(rows[0].organization.categoryIds, ['hot']);
  assert.equal(rows[0].organization.primaryCategoryId, 'hot');
});

test('unknown numbers can be sorted without a contact folder', () => {
  const rows = Phone.normalizeThreads([
    { id: 'smsmms-3', address: '7805550999', title: '7805550999', at: 5, canReply: true }
  ], [], [{ phone: '+17805550999', categoryIds: ['family'] }]);
  assert.equal(rows[0].contact, null);
  assert.deepEqual(rows[0].organization.categoryIds, ['family']);
});

test('trust windows and coverage states follow the locked rules', () => {
  const now = 1000;
  assert.equal(Phone.trustExpiry('36h', now), now + 36 * 60 * 60 * 1000);
  assert.equal(Phone.trustExpiry('7d', now), now + 7 * 24 * 60 * 60 * 1000);
  assert.equal(Phone.trustValid({ browserId: 'abc', mode: '36h', expiresAt: 2000 }, 'abc', 1500), true);
  assert.equal(Phone.trustValid({ browserId: 'abc', mode: 'ask', expiresAt: 9999 }, 'abc', 1500), false);
  assert.equal(Phone.coverage({ connected: true, sms: true, rcs: false }).level, 'amber');
  assert.equal(Phone.coverage({ connected: false, native: false }).level, 'red');
});

test('pair offers require a four-digit unexpired code and P-256 public key', () => {
  const now = Date.now();
  const offer = {
    version: 1,
    type: 'offer',
    sessionId: 'abcdefghijklmnop',
    code: '4821',
    browserId: 'abcdefghijklmnop',
    publicKey: { kty: 'EC', crv: 'P-256' },
    expiresAt: now + 60000
  };
  assert.equal(Phone.validatePairOffer(offer, now), true);
  assert.equal(Phone.validatePairOffer({ ...offer, code: '123456' }, now), false);
  assert.equal(Phone.validatePairOffer({ ...offer, expiresAt: now - 1 }, now), false);
});
