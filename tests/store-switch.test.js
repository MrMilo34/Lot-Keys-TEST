'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function sourceBetween(start, end) {
  const begin = html.indexOf(start), finish = html.indexOf(end, begin);
  assert.ok(begin >= 0 && finish > begin, `Could not extract ${start}`);
  return html.slice(begin, finish);
}

const connectionSettings = sourceBetween('  const STORE_CONNECTION_SETTING_KEYS=[', '  function newStoreCode()');
const createStore = sourceBetween('  function newStoreCode()', '  async function connectByStoreCode(');
const disconnectStore = sourceBetween('  async function disconnectActiveStore(', '  function showStoreConnectionMenu()');

test('a signed-in account creates an isolated root and receives the new Store owner role', async () => {
  const settings = new Map([
    ['currentAccountEmail', 'blair@example.com'], ['userName', 'Blair'],
    ['personalTheme', 'dark'], ['lotkeysProgressV1', {level: 9}],
    ['storeUsers', [{userName: 'Old Store User', adminLevel: 2}]],
    ['monthlyContributionHistory', [{points: 99}]],
  ]);
  let created = 0, verified = 0;
  const context = vm.createContext({
    crypto: webcrypto,
    DB: {del: async (_, key) => settings.delete(key)},
    setting: async (key, fallback) => settings.has(key) ? settings.get(key) : fallback,
    setSetting: async (key, value) => settings.set(key, value),
    authorize: async () => true,
    getGoogleIdentity: async () => ({email: 'blair@example.com', sub: 'google-123'}),
    createFolder: async (name, parent, properties) => {
      created++;
      assert.equal(parent, 'root');
      assert.equal(properties.lotkeysRole, 'storeRoot');
      return {id: 'new-root', name, webViewLink: 'https://drive.google.com/drive/folders/new-root'};
    },
    ensureStoreStructure: async () => {
      assert.deepEqual(settings.get('storeUsers'), undefined);
      assert.deepEqual(settings.get('monthlyContributionHistory'), undefined);
      settings.set('currentUserAdminLevel', 2);
      return {rootId: 'new-root', userId: 'new-user'};
    },
    syncStoreConfig: async structure => {assert.equal(structure.rootId, 'new-root'); verified++},
    findChildByAppProperty: async () => ({id: 'new-access'}),
    findChildByName: async () => null,
    rememberSavedStore: async entry => {assert.equal(entry.folderId, 'new-root'); settings.set('savedStores', [entry])},
  });
  vm.runInContext(`${connectionSettings}\n${createStore}`, context);
  const result = await context.createNewStore('Blair Auto');
  assert.equal(result.rootId, 'new-root');
  assert.equal(created, 1);
  assert.equal(verified, 1);
  assert.match(settings.get('storeCode'), /^LK-[A-F0-9]{16}$/);
  assert.equal(settings.get('storeBootstrapPendingRootId'), '');
  assert.equal(settings.get('personalTheme'), 'dark');
  assert.deepEqual(settings.get('lotkeysProgressV1'), {level: 9});
  await assert.rejects(context.createNewStore('Another Store'), /Disconnect from the current Store/);
  assert.equal(created, 1);
});

test('disconnect keeps personal data and waits for all Store uploads', async () => {
  const settings = new Map([
    ['storeFolderId', 'old-root'], ['storeName', 'INFINITI'], ['storeCode', 'INF-SE034'],
    ['storeUsers', [{userName: 'Blair', adminLevel: 0}]],
    ['currentUserAdminLevel', 0], ['currentAccountEmail', 'blair@example.com'],
    ['personalTheme', 'dark'], ['savedStores', []],
  ]);
  const collections = new Map([
    ['vehicles', [{id: 'v1', syncStatus: 'synced'}]],
    ['listings', [{id: 'l1', syncStatus: 'synced'}]],
    ['analytics', [{id: 'a1'}]], ['requestQueue', [{id: 'q1'}]],
    ['locations', [{id: 'personal-location'}]],
  ]);
  const alerts = [], removed = [];
  const context = vm.createContext({
    DB: {
      get: async (_, key) => ({id: key, value: settings.get(key)}),
      del: async (_, key) => settings.delete(key),
      all: async name => collections.get(name) || [],
      clear: async name => collections.set(name, []),
    },
    setting: async (key, fallback) => settings.has(key) ? settings.get(key) : fallback,
    DriveSync: {
      rememberSavedStore: async entry => settings.set('savedStores', [entry]),
    },
    vehicleSyncJobs: new Map(), listingSyncJobs: new Map(), contributionSyncJobs: new Map(),
    vehicleStateSyncJobs: new Map(), inventoryRefreshBusy: false, listingsRefreshBusy: false,
    garageBackgroundRefreshBusy: false, foregroundResumeBusy: false,
    contributionResumeTimers: new Map(), contributionRetryCounts: new Map(),
    LIVE_MEDIA_PROGRESS_STORAGE: 'live-media',
    localStorage: {removeItem: key => removed.push(key)},
    sessionStorage: {removeItem: key => removed.push(key)},
    ACTIVE_FORM_DRAFT_KEY: 'draft',
    storeProfileThumbCache: new Map(), clearGuideSpotlight: () => {},
    rememberActiveRoute: () => {}, render: async () => {}, toast: () => {},
    alert: message => alerts.push(message), confirm: () => true,
  });
  vm.runInContext(`${connectionSettings}\nlet storeTransitionBusy=false;\n${disconnectStore}`, context);
  context.DriveSync.clearCurrentStoreSettings = vm.runInContext('clearCurrentStoreSettings', context);
  assert.equal(await context.disconnectActiveStore({confirmed: true}), false);
  assert.match(alerts[0], /1 contribution request/);
  assert.equal(settings.get('storeFolderId'), 'old-root');
  collections.set('requestQueue', []);
  assert.equal(await context.disconnectActiveStore({confirmed: true}), true);
  assert.equal(settings.has('storeFolderId'), false);
  assert.equal(settings.has('storeUsers'), false);
  assert.equal(settings.get('currentAccountEmail'), 'blair@example.com');
  assert.equal(settings.get('personalTheme'), 'dark');
  assert.equal(settings.get('savedStores')[0].code, 'INF-SE034');
  assert.deepEqual(collections.get('locations'), [{id: 'personal-location'}]);
  assert.deepEqual(collections.get('vehicles'), []);
  assert.deepEqual(collections.get('listings'), []);
  assert.ok(removed.includes('live-media'));
});

test('an existing Store cannot be claimed as a new owner', () => {
  assert.match(html, /storeBootstrapPendingRootId[^\n]+root\.id&&root\.appProperties\?\.lotkeysRole==='storeRoot'&&root\.owners\?\.some/);
  assert.match(html, /previous\.storeFolderId\?\.value&&previous\.storeFolderId\.value!==found\.root\.id/);
});
