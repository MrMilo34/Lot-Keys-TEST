import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const BASE81='13e50428fb13ef1c296d1bb79fccdb88c57e1cd2';
const BASE97='7e18944c3f86789d6541085b5017d960d7739b77';
const read=file=>fs.readFileSync(file,'utf8');
const fromGit=(commit,file)=>execFileSync('git',['show',`${commit}:${file}`],{encoding:'utf8'});
const fail=message=>{throw new Error(message)};
const expect=(condition,message)=>{if(!condition)fail(message)};
const slice=(source,start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  expect(a>=0,`protected start marker is missing: ${start}`);
  expect(b>a,`protected end marker is missing after ${start}: ${end}`);
  return source.slice(a,b);
};

const index=read('index.html');
const base97=fromGit(BASE97,'index.html');
const version=JSON.parse(read('version.json'));
const manifest=JSON.parse(read('manifest.webmanifest'));
const sw=read('sw.js');

expect(version.version==='0.9.4.99','version.json must identify V0.9.4.99');
expect(version.build==='09499','version.json build must be 09499');
expect(version.basedOnCommit===BASE81,'version.json must record the approved V0.9.4.81 base');
expect(version.release==='stable-81-indexeddb-navigation-cache','version.json release label is stale');
expect(manifest.start_url.includes('09499'),'manifest must request build 09499');
expect(sw.includes("lotkeys-app-v09499-indexeddb-navigation-cache"),'service-worker cache key is stale');
expect(index.includes("const build='09499'"),'index build marker is stale');
expect(index.includes('const VERSION = 3;'),'IndexedDB must remain forward-compatible with V0.9.4.96 phones');
expect(index.includes("const STORES = ['vehicles','listings','locations','analytics','settings','requestQueue'];"),'the original IndexedDB store set changed');

for(const forbidden of ['vehicleSummaries','listingSummaries','vehicleCovers','listingCovers','migrationV09496SummaryCache','render timed out','timedOut:true']){
  expect(!index.includes(forbidden),`abandoned route-deadline/summary-store code returned: ${forbidden}`);
}
for(const required of ['routeRenderEpoch','routeRenderCurrent(context)','data-route-loading','Still opening the saved phone copy','STATE_PREFIX','stateRows(name)','INVENTORY_FOLDER_AUDIT_MS=5*60*1000','hydratedStores','pendingStoreReads','rememberStore(name,rows=[])']){
  expect(index.includes(required),`V0.9.4.99 repair is missing: ${required}`);
}

for(const required of ['lotkeys-hub-core.js','lotkeys-hub-store.js','lotkeys-device-pairing.js','lotkeys-device-client.js','lotkeys-hub.js','lotkeys-hub.css']){
  expect(index.includes(required),`index is missing Hub asset ${required}`);
  expect(fs.existsSync(required),`Hub asset is missing from the repository: ${required}`);
  expect(sw.includes(`./${required}`),`service worker is missing Hub asset ${required}`);
}

const protectedPaths=['processor','extension','assets','lotkeys-awards.js','lotkeys-info.js','lotkeys-info.json'];
try{execFileSync('git',['diff','--quiet',BASE81,'--',...protectedPaths])}
catch{fail('A protected V0.9.4.81 Processor, Posting Buddy, asset, Award or Info file changed')}

// Guards may surround these functions, but the proven upload, full
// reconciliation and remote-write implementations stay byte-for-byte .97.
const protectedSpans=[
  ['async function resumableCreate(', 'async function ensureManagementUpdatesFolder('],
  ['async function refreshInventoryFromDrive(', 'async function quickRefreshInventoryFromDrive('],
  ['async function reconcileListingVehicleProfiles(', 'async function refreshUserListingsFromDrive('],
  ['async function refreshUserListingsFromDrive(', 'async function quickRefreshUserListingsFromDrive('],
  ['async function syncVehicle(v,', 'async function syncVehicleState('],
  ['async function syncListingAssets(', 'async function syncListing(l,'],
  ['async function syncListing(l,', 'async function deleteListing('],
  ['async function syncVehicleNow(', 'function vehicleNeedsAutomaticResume('],
  ['async function syncListingNow(', 'async function copyText(']
];
for(const [start,end] of protectedSpans){
  expect(slice(index,start,end)===slice(base97,start,end),`protected V0.9.4.97 implementation changed: ${start}`);
}

const inlineScripts=[...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.trim());
for(const [position,code] of inlineScripts.entries()){
  try{new Function(code)}catch(error){fail(`inline script ${position+1} does not parse: ${error.message}`)}
}
for(const file of ['lotkeys-messaging.js','lotkeys-hub-core.js','lotkeys-hub-store.js','lotkeys-device-pairing.js','lotkeys-device-client.js','lotkeys-hub.js']){
  try{new Function(read(file))}catch(error){fail(`${file} does not parse: ${error.message}`)}
}

console.log(`Stable-core checks passed: ${inlineScripts.length} inline scripts, protected Drive/upload spans, Hub assets and V0.9.4.99 cache/version consistency.`);
