import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const bytes=name=>fs.readFileSync(new URL(name,root));
const expect=(value,message)=>{if(!value)throw new Error(message);};
const hash=name=>crypto.createHash('sha256').update(bytes(name)).digest('hex');

const protectedFiles={
  'lotkeys-messaging.js':'a68a68bce8b5af44a183f02dcbd32757a1f884be44d69684feebba9088bf79ae',
  'lotkeys-awards.js':'4aa7f90519582cbd801f1003da9b01f0919954f17bbd09fb6dd6ed757c0ba931',
  'lotkeys-info.js':'a5f1494ccad72632333ebc635f7e5b6e465be76d86dc5320b00df269fd5c81a4',
  'processor/Code.gs':'5efc13c07a9549718cff0add5488c6d35dc09c4ca4ef1d0f7f2744e71ae32c0c',
  'processor/appsscript.json':'f5f547d64b0566ec4ef39b0ebe966ca190fd8f8126b14fcc50070015ff851cf2',
  'extension/latest.json':'f96b51c341a7c1fbe84b234ae0bf039dc68d950b4873b030e4f7709cb5e77615',
  'extension/releases/LotKeys-Facebook-Assistant-Beta-v0.1.23.zip':'4a72c636cb3d60716672d53ea0f25f543d30ea4766ac749583f6d6690f41f293'
};
for(const [name,wanted] of Object.entries(protectedFiles))expect(hash(name)===wanted,`${name} changed from the approved V0.9.4.81 baseline`);

const baselineCommit='13e50428fb13ef1c296d1bb79fccdb88c57e1cd2';
const baseline=execFileSync('git',['show',`${baselineCommit}:index.html`],{cwd:new URL('.',root),encoding:'utf8'});
const current=read('index.html');

function normalizedIndex(value,{currentBuild=false}={}){
  let result=value;
  if(currentBuild){
    result=result.replace(/^\s*<link rel="stylesheet" href="\.\/lotkeys-hub-v2\.css\?v=09500" \/>\n/m,'');
    result=result.replace(/^\s*<script src="\.\/lotkeys-(?:hub-v2-core|hub-v2-identity|device-pairing|device-client|hub-v2)\.js\?v=09500"><\/script>\n/gm,'');
    result=result.replace('type="button" aria-label="Open Hub"><span>💬</span><small>Hub</small>','type="button" aria-label="Chat. Press and hold for the most recent conversation bubble"><span>💬</span><small>Chat</small>');
    result=result.replace('/* V0.9.5.0 keeps the V0.9.4.81 app core and adds an isolated phone-truth Hub V2 overlay. */','/* V0.9.4.81 keeps V0.9.4.80 media speed, refreshes video discovery, and polishes Management Updates. */');
  }
  result=result.replaceAll('0.9.5.0','0.9.4.81').replaceAll('09500','09481');
  result=result.split('\n').map(line=>line.includes('async function showVersionInfo(){')?'  __LOTKEYS_RELEASE_NOTES__':line).join('\n');
  return result;
}
expect(normalizedIndex(current,{currentBuild:true})===normalizedIndex(baseline),'index.html changed outside the approved Hub integration/version edges');

const html=current;
const required=[
  'lotkeys-hub-v2.css',
  'lotkeys-hub-v2-core.js',
  'lotkeys-hub-v2-identity.js',
  'lotkeys-device-pairing.js',
  'lotkeys-device-client.js',
  'lotkeys-hub-v2.js'
];
for(const name of required){
  expect(fs.existsSync(new URL(name,root)),`Missing Hub V2 runtime file: ${name}`);
  expect(html.includes(name),`index.html does not load ${name}`);
  expect(read('sw.js').includes(`./${name}`),`service worker does not cache ${name}`);
}

const order=['lotkeys-messaging.js','lotkeys-hub-v2-core.js','lotkeys-hub-v2-identity.js','lotkeys-device-pairing.js','lotkeys-device-client.js','lotkeys-hub-v2.js'];
for(let index=1;index<order.length;index++)expect(html.indexOf(order[index-1])<html.indexOf(order[index]),`Runtime order is incorrect: ${order[index-1]} must load before ${order[index]}`);

const shell=read('lotkeys-hub-v2.js');
for(const forbidden of [
  /\bDB\s*\./,
  /\bDriveSync\b/,
  /refreshInventoryFromDrive/,
  /refreshListingsFromDrive/,
  /syncStoreConfig/,
  /showVehicle\s*\(/,
  /showListing\s*\(/,
  /resumable/i,
  /objectStore\s*\(/,
  /indexedDB\s*\./,
  /localStorage\s*\./
])expect(!forbidden.test(shell),`Hub V2 shell crossed a protected boundary: ${forbidden}`);

const device=read('lotkeys-device-client.js');
expect(!/LotKeysMessagingBridge\.(?:DB|DriveSync)/.test(device),'Device transport reaches into app DB/Drive sync');
expect(!/setTimeout\s*\(\s*wake\s*,/.test(device),'Device transport auto-starts during normal LotKeys boot');
expect(!/localStorage\s*\./.test(device),'Device transport persists phone transcript data');
expect(device.includes('const threads=new Map()'),'Device threads are no longer held in session memory');
expect(device.includes("window.addEventListener('lotkeys-hub-v2-open'"),'Device transport does not wait for explicit Hub interaction');

for(const name of ['lotkeys-hub-v2-core.js','lotkeys-hub-v2-identity.js','lotkeys-device-pairing.js','lotkeys-device-client.js','lotkeys-hub-v2.js']){
  new Function(read(name));
}

expect(fs.existsSync(new URL('device-bridge/android/app/src/main/java/ca/lotkeys/bridge/PhoneMirrorService.java',root)),'Phone Mirror service source is missing');
expect(fs.existsSync(new URL('device-bridge/android/app/src/main/java/ca/lotkeys/bridge/Protocol.java',root)),'Phone Mirror protocol source is missing');
expect(read('version.json').includes('"version": "0.9.5.0"'),'version.json is not V0.9.5.0');
expect(read('sw.js').includes("lotkeys-app-v09500-hub-v2-isolated-phone-truth"),'service-worker cache key is not V0.9.5.0');

console.log('Hub V2 isolation checks passed: V0.9.4.81 core protected, Device transport explicit, phone transcripts memory-only.');
