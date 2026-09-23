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
