import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const BASE='13e50428fb13ef1c296d1bb79fccdb88c57e1cd2';
const read=file=>fs.readFileSync(file,'utf8');
const fail=message=>{throw new Error(message)};
const expect=(condition,message)=>{if(!condition)fail(message)};

const index=read('index.html');
const version=JSON.parse(read('version.json'));
const manifest=JSON.parse(read('manifest.webmanifest'));
const sw=read('sw.js');

expect(version.version==='0.9.4.97','version.json must identify V0.9.4.97');
expect(version.build==='09497','version.json build must be 09497');
expect(version.basedOnCommit===BASE,'version.json must record the approved V0.9.4.81 base');
expect(manifest.start_url.includes('09497'),'manifest must request build 09497');
expect(sw.includes("lotkeys-app-v09497-stable-81-core-phone-hub"),'service-worker cache key is stale');
expect(index.includes("const build='09497'"),'index build marker is stale');
expect(index.includes('const VERSION = 3;'),'IndexedDB must remain forward-compatible with V0.9.4.96 phones');

for(const forbidden of ['vehicleSummaries','listingSummaries','vehicleCovers','listingCovers','Inventory needs another try','Listings needs another try','Opening Inventory…','Opening Listings…']){
  expect(!index.includes(forbidden),`abandoned V0.9.4.95/.96 route-cache code returned: ${forbidden}`);
}

for(const required of ['lotkeys-hub-core.js','lotkeys-hub-store.js','lotkeys-device-pairing.js','lotkeys-device-client.js','lotkeys-hub.js','lotkeys-hub.css']){
  expect(index.includes(required),`index is missing Hub asset ${required}`);
  expect(fs.existsSync(required),`Hub asset is missing from the repository: ${required}`);
  expect(sw.includes(`./${required}`),`service worker is missing Hub asset ${required}`);
}

const protectedPaths=['processor','extension','assets','lotkeys-awards.js','lotkeys-info.js','lotkeys-info.json'];
try{
  execFileSync('git',['diff','--quiet',BASE,'--',...protectedPaths]);
}catch{
  fail('A protected V0.9.4.81 Processor, Posting Buddy, asset, Award or Info file changed');
}

const diff=execFileSync('git',['diff','--unified=0',BASE,'--','index.html'],{encoding:'utf8'});
const permittedOldLines=new Set([512,518,522,562,607,1438,2989,3000,3056,3117,4282,4403,4411,4423]);
for(const match of diff.matchAll(/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/gm)){
  const oldLine=Number(match[1]);
  expect(permittedOldLines.has(oldLine),`index.html changed outside the approved V0.9.4.81 Hub/version integration points at old line ${oldLine}`);
}

const inlineScripts=[...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(code=>code.trim());
for(const [position,code] of inlineScripts.entries()){
  try{new Function(code)}catch(error){fail(`inline script ${position+1} does not parse: ${error.message}`)}
}
for(const file of ['lotkeys-messaging.js','lotkeys-hub-core.js','lotkeys-hub-store.js','lotkeys-device-pairing.js','lotkeys-device-client.js','lotkeys-hub.js']){
  try{new Function(read(file))}catch(error){fail(`${file} does not parse: ${error.message}`)}
}

console.log(`Stable-core checks passed: ${inlineScripts.length} inline scripts, V0.9.4.81 core boundary, Hub assets and V0.9.4.97 cache/version consistency.`);
