import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const version=JSON.parse(read('version.json'));
const manifest=JSON.parse(read('manifest.webmanifest'));
const serviceWorker=read('sw.js');

assert.equal(version.version,'0.9.4.96');
assert.equal(version.build,'09496');
assert.equal(manifest.start_url,'./?build=09496');
assert.ok(serviceWorker.includes(`const CACHE='${version.serviceWorkerCache}'`),'service-worker cache must match version.json');
assert.ok(index.includes("const build='09496'"),'index build marker must match version.json');

const goStart=index.indexOf('async function go(r){');
const renderStart=index.indexOf('async function render(context=null){',goStart);
assert.ok(goStart>0&&renderStart>goStart,'route entry points must exist');
const goSource=index.slice(goStart,renderStart);
assert.ok(goSource.indexOf('showRouteLoading(context)')<goSource.indexOf('await render(context)'),'old body must be replaced before route reads begin');
assert.match(goSource,/const slowWatchdog=setTimeout/);
assert.match(goSource,/hardWatchdog=setTimeout/);
assert.match(goSource,/showRouteError\(context,/);
assert.doesNotMatch(goSource,/timeoutContext/,'a slow read must not invalidate the render that can still finish');

const renderEnd=index.indexOf('function empty(',renderStart);
const renderSource=index.slice(renderStart,renderEnd);
assert.doesNotMatch(renderSource,/await updateProfileNavIcon/);
assert.doesNotMatch(renderSource,/await updateListingNavAlert/);
assert.match(renderSource,/scheduleListingNavAlert\(\)/);

for(const routeName of ['Home','Vehicles','Listings','Profile','Settings']){
  assert.match(index,new RegExp(`async function render${routeName}\\(context=null\\)`));
}
assert.match(index,/function routeRenderCurrent\(context\)/);
assert.match(index,/context\.epoch===routeRenderEpoch/);
assert.match(index,/document\.querySelectorAll\('\[src\^="blob:"\],\[href\^="blob:"\]'\)/);
assert.match(index,/new MutationObserver\(\(\)=>queueMicrotask\(\(\)=>cleanupUrls\(\)\)\)/);
assert.match(index,/const VERSION = 3/);
for(const store of ['vehicleSummaries','listingSummaries','vehicleCovers','listingCovers'])assert.ok(index.includes(`'${store}'`),`${store} must be part of the phone cache`);
assert.match(index,/allVehicles=await DB\.all\('vehicleSummaries'\)/);
assert.match(index,/DB\.all\('listingSummaries'\)/);
assert.match(index,/scheduleVehicleCoverHydration\(vs\)/);
assert.match(index,/scheduleListingCoverHydration\(ls,listingLookup\)/);

const firstInline=[...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].find(match=>match[1].includes('function lotKeysVehicleListSummary'))?.[1];
assert.ok(firstInline,'phone-cache summary helpers must be present');
const summaryContext={};
vm.runInNewContext(firstInline,summaryContext,{filename:'index.html:cache-summary'});
const vehicleBlob={large:'video-or-photo'},vehicle=summaryContext.lotKeysVehicleListSummary({id:'VP1',photos:[{id:'P1',blob:vehicleBlob,driveFileId:'D1'}],videos:[{id:'V1',blob:vehicleBlob}],attachments:[{id:'A1',blob:vehicleBlob}],ownerSubmissionDraft:{large:true},stock:'ABC'});
assert.equal(vehicle.photos.length,1);
assert.equal(vehicle.photos[0].driveFileId,'D1');
assert.ok(!('blob' in vehicle.photos[0]));
assert.equal(vehicle.videos.length,0);
assert.equal(vehicle.attachments.length,0);
assert.ok(!('ownerSubmissionDraft' in vehicle));
const listing=summaryContext.lotKeysListingListSummary({id:'L1',listingAssets:[{id:'LP1',blob:vehicleBlob,driveFileId:'LD1'}]});
assert.equal(listing.listingAssets[0].driveFileId,'LD1');
assert.ok(!('blob' in listing.listingAssets[0]));

const listingHydrationStart=index.indexOf('async function hydrateListingCardCover(');
const listingHydrationEnd=index.indexOf('function scheduleListingCoverHydration(',listingHydrationStart);
const listingHydrationSource=index.slice(listingHydrationStart,listingHydrationEnd);
assert.doesNotMatch(listingHydrationSource,/DB\.put\('vehicles'/,'card hydration must never overwrite a full Vehicle with a lightweight summary');
assert.doesNotMatch(listingHydrationSource,/DB\.put\('listings'/,'card hydration must never overwrite a full Listing with a lightweight summary');

assert.match(index,/Uploading photos \+ video together/,'parallel photo/video upload behavior must remain intact');
assert.match(index,/photoConcurrency=kind==='photo'.*Math\.min\(3,uploadable\.length\)/,'three-worker Vehicle photo uploads must remain intact');
assert.match(index,/resumableCreate\(/,'resumable upload support must remain intact');

let inlineCount=0;
for(const match of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(!match[1].trim())continue;
  inlineCount++;
  new vm.Script(match[1],{filename:`index.html:inline-${inlineCount}`});
}
assert.ok(inlineCount>0,'inline scripts must be found');

for(const file of ['sw.js','lotkeys-info.js','lotkeys-messaging.js','lotkeys-awards.js','lotkeys-hub-core.js','lotkeys-hub-store.js','lotkeys-device-pairing.js','lotkeys-device-client.js','lotkeys-hub.js']){
  new vm.Script(read(file),{filename:file});
}

console.log(`Navigation regression checks passed (${inlineCount} inline scripts + version/cache consistency).`);
