import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const version=JSON.parse(read('version.json'));
const manifest=JSON.parse(read('manifest.webmanifest'));
const serviceWorker=read('sw.js');

assert.equal(version.version,'0.9.4.95');
assert.equal(version.build,'09495');
assert.equal(manifest.start_url,'./?build=09495');
assert.ok(serviceWorker.includes(`const CACHE='${version.serviceWorkerCache}'`),'service-worker cache must match version.json');
assert.ok(index.includes("const build='09495'"),'index build marker must match version.json');

const goStart=index.indexOf('async function go(r){');
const renderStart=index.indexOf('async function render(context=null){',goStart);
assert.ok(goStart>0&&renderStart>goStart,'route entry points must exist');
const goSource=index.slice(goStart,renderStart);
assert.ok(goSource.indexOf('showRouteLoading(context)')<goSource.indexOf('await render(context)'),'old body must be replaced before route reads begin');
assert.match(goSource,/const watchdog=setTimeout/);
assert.match(goSource,/epoch:\+\+routeRenderEpoch/);

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
