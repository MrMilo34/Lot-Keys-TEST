'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Hub = require('../lotkeys-hub-core.js');

const categories = [
  { id: 'customers', name: 'Customers', color: '#ed8b2f', parentId: '', order: 0 },
  { id: 'follow-up', name: 'Follow-up', color: '#f59e0b', parentId: 'customers', order: 1 },
  { id: 'personal', name: 'Personal', color: '#9671d8', parentId: '', order: 2 }
];

test('legacy categoryId becomes the multi-category model', () => {
  const contact = Hub.normalizeContact({ id: 'one', categoryId: 'customers' });
  assert.deepEqual(contact.categoryIds, ['customers']);
  assert.equal('categoryId' in contact, false);
});

test('contact normalization keeps unique vehicle links with the primary first', () => {
  const contact = Hub.normalizeContact({ primaryVehicleId: 'v2', vehicleIds: ['v1', 'v1'] });
  assert.deepEqual(contact.vehicleIds, ['v2', 'v1']);
  assert.equal(contact.primaryVehicleId, 'v2');
});

test('category normalization keeps only one nested level', () => {
  const rows = Hub.normalizeCategories([
    ...categories,
    { id: 'deep', name: 'Deep', color: '#112233', parentId: 'follow-up', order: 3 }
  ]);
  assert.equal(rows.find(row => row.id === 'deep').parentId, 'customers');
});

test('a subcategory contact also matches its parent', () => {
  const closure = Hub.categoryClosure({ categoryIds: ['follow-up'] }, categories);
  assert.deepEqual(new Set(closure), new Set(['follow-up', 'customers']));
});

test('multiple Device filters combine without leaking LotKeys chat rows', () => {
  const rows = [
    { id: 'chat', source: 'lotkeys', title: 'Internal', unread: 1, at: 3 },
    { id: 'lead', source: 'device', title: 'Lead', contact: { name: 'Lead', fields: [], categoryIds: ['follow-up'] }, at: 2 },
    { id: 'friend', source: 'device', title: 'Friend', contact: { name: 'Friend', fields: [], categoryIds: ['personal'] }, at: 1 }
  ];
  const filtered = Hub.filtered(rows, {
    scope: 'device',
    selectedCategories: ['follow-up', 'personal'],
    categoryRows: categories
  });
  assert.deepEqual(filtered.map(row => row.id), ['lead', 'friend']);
});

test('parent Device filter includes contacts filed only in its subcategory', () => {
  const rows = [
    { id: 'lead', source: 'device', title: 'Lead', contact: { name: 'Lead', fields: [], categoryIds: ['follow-up'] } }
  ];
  assert.equal(Hub.filtered(rows, {
    scope: 'device',
    selectedCategories: ['customers'],
    categoryRows: categories
  }).length, 1);
});

test('Unsorted includes only Device conversations without category paths', () => {
  const rows = [
    { id: 'unknown', source: 'device', title: 'Unknown', organization: { categoryIds: [] } },
    { id: 'filed', source: 'device', title: 'Filed', organization: { categoryIds: ['customers'] } },
    { id: 'chat', source: 'lotkeys', title: 'Internal' }
  ];
  assert.deepEqual(Hub.filtered(rows, { filter: 'unsorted', categoryRows: categories }).map(row => row.id), ['unknown']);
});

test('phone matching and contact validation retain the V0.9.4.82 contract', () => {
  const contact = {
    name: 'Jordan Example',
    fields: [{ id: 'p1', kind: 'phone', label: 'Cellphone', value: '780-555-0123', primary: true }]
  };
  assert.doesNotThrow(() => Hub.validateContact(contact));
  assert.equal(Hub.phone('780-555-0123'), '+17805550123');
  assert.equal(Hub.matches(contact, '5550123'), true);
});

test('appointment overlap excludes cancelled appointments', () => {
  const candidate = { id: 'a', start: '2026-09-22T16:00:00.000Z', end: '2026-09-22T16:30:00.000Z' };
  const rows = [
    { id: 'b', start: '2026-09-22T16:15:00.000Z', end: '2026-09-22T16:45:00.000Z', status: 'Confirmed' },
    { id: 'c', start: '2026-09-22T16:00:00.000Z', end: '2026-09-22T17:00:00.000Z', status: 'Cancelled' }
  ];
  assert.deepEqual(Hub.overlap(rows, candidate).map(row => row.id), ['b']);
});

test('all-day reminders sort first and never create appointment collisions', () => {
  const at = (hour, minute = 0) => new Date(2026, 8, 24, hour, minute).toISOString();
  const rows = [
    { id: 'appt', kind: 'Test drive', start: at(16), end: at(16, 30) },
    { id: 'rem', kind: 'Reminder', allDay: true, start: at(12), end: new Date(2026, 8, 25, 12).toISOString() }
  ];
  assert.deepEqual(Hub.agenda(rows, '2026-09-24').map(row => row.id), ['rem', 'appt']);
  assert.deepEqual(Hub.overlap(rows, rows[1]), []);
});

test('all-day reminder calendar export uses date values', () => {
  const output = Hub.ics({
    id: 'reminder',
    title: 'Talk to Finance about John',
    kind: 'Reminder',
    allDay: true,
    start: '2026-09-24T12:00:00.000Z',
    end: '2026-09-25T12:00:00.000Z'
  });
  assert.match(output, /DTSTART;VALUE=DATE:20260924/);
  assert.match(output, /DTEND;VALUE=DATE:20260925/);
  assert.doesNotMatch(output, /DTSTART:\d+T/);
});

test('question recommendations prioritize context and omit answered topics', () => {
  const contact = { notes: [{ key: 'budget', text: '$500 monthly' }] };
  const rows = Hub.recommendQuestions(contact, 'I want to finance a vehicle and need AWD.');
  assert.equal(rows.some(row => row.key === 'budget'), false);
  assert.equal(rows.some(row => row.key === 'purchaseMethod'), false, 'recognized financing answer is omitted');
  assert.equal(rows[0].key, 'biweeklyPayment');
  assert.ok(rows.findIndex(row => row.key === 'features') < rows.findIndex(row => row.key === 'dealType'));
});

test('buying details normalize and render in the shared compact order', () => {
  const contact = Hub.normalizeContact({
    buying: {
      method: 'Financing',
      totalBudget: '$45,000',
      biweeklyPayment: '400',
      downPayment: '2,000',
      tradeStatus: 'Trade',
      expectedTradeValue: '20,000'
    }
  });
  assert.deepEqual(Hub.buyingSummary(contact), [
    'Financing', '$45,000 Total', '$400 Bi-W', '$2,000 Dwn', 'Trade', '$20,000 Expected'
  ]);
});

test('structured note choices update contact fields without creating a second vehicle concept', () => {
  let contact = Hub.applyContactField({ name: 'John', fields: [] }, 'biweeklyPayment', '$400');
  contact = Hub.applyContactField(contact, 'tradeStatus', 'No Trade');
  contact = Hub.applyContactField(contact, 'interestedVehicle', 'Honda Civic Type R');
  assert.equal(contact.buying.biweeklyPayment, 400);
  assert.equal(contact.buying.tradeStatus, 'No Trade');
  assert.equal(contact.interestedVehicleText, 'Honda Civic Type R');
  assert.equal('wantedVehicle' in contact, false);
});

test('message suggestions retain competing bi-weekly values and label negative context', () => {
  const suggestions = Hub.suggestNotes('Make $400 bi-weekly work. $567 bi-weekly would never really work because it is too high.');
  const payments = suggestions.filter(item => item.key === 'biweeklyPayment');
  assert.deepEqual(payments.map(item => item.value), ['$400', '$567']);
  assert.equal(payments[0].meaning, 'likely goal');
  assert.equal(payments[1].meaning, 'mentioned as too high');
  assert.equal(suggestions.some(item => item.key === 'interestedVehicle'), false);
});

test('appointment display helpers enforce MM/DD/YYYY and 12-hour time', () => {
  assert.equal(Hub.parseDisplayDate('09/26/2026'), '2026-09-26');
  assert.equal(Hub.displayDate('2026-09-26'), '09/26/2026');
  assert.equal(Hub.displayTime('00:05'), '12:05 AM');
  assert.equal(Hub.displayTime('12:30'), '12:30 PM');
  assert.throws(() => Hub.parseDisplayDate('26/09/2026'), /MM\/DD\/YYYY|valid/);
});
