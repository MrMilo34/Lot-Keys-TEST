import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const index=read('index.html'),sw=read('sw.js');
const fail=message=>{throw new Error(message)};
const expect=(condition,message)=>{if(!condition)fail(message)};
const clean=value=>value.split('?')[0].replace(/^\.\//,'');

const localScripts=[...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map(match=>match[1]).filter(value=>!/^https?:/i.test(value)).map(clean);
const localStyles=[...index.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  .map(match=>clean(match[1]));
const expectedScripts=[
  'lotkeys-info.js','lotkeys-messaging.js','lotkeys-awards.js','lotkeys-hub-core.js',
  'lotkeys-hub-store.js','lotkeys-device-pairing.js','lotkeys-device-client.js','lotkeys-hub.js'
];
const expectedStyles=['lotkeys-hub.css'];
expect(JSON.stringify(localScripts)===JSON.stringify(expectedScripts),`unexpected executable script set: ${JSON.stringify(localScripts)}`);
expect(JSON.stringify(localStyles)===JSON.stringify(expectedStyles),`unexpected stylesheet set: ${JSON.stringify(localStyles)}`);
for(const file of [...localScripts,...localStyles])expect(fs.existsSync(file),`referenced runtime file is missing: ${file}`);

const coreMatch=sw.match(/const CORE=\[([\s\S]*?)\n\];/);
expect(coreMatch,'service-worker CORE list is missing');
const core=[...coreMatch[1].matchAll(/["'](\.\/[^"']+)["']/g)].map(match=>match[1]);
expect(core.length>0,'service-worker CORE list is empty');
for(const item of core){
  const file=clean(item);
  if(!file)continue;
  expect(fs.existsSync(file),`service worker references a missing file: ${item}`);
}

const forbiddenPrefixes=['.github/','device-bridge/','extension/','processor/','tests/'];
const forbiddenNames=['README.md','BUILD.txt','CHECKSUMS.txt','RELEASE-'];
for(const item of [...localScripts,...localStyles,...core.map(clean)]){
  expect(!forbiddenPrefixes.some(prefix=>item.startsWith(prefix)),`non-web project folder entered the runtime: ${item}`);
  expect(!forbiddenNames.some(name=>item.startsWith(name)),`documentation/build file entered the runtime: ${item}`);
}

console.log(`Runtime audit passed: ${localScripts.length} local scripts, ${localStyles.length} stylesheet and ${core.length} service-worker files; project/docs/Android folders are not executable runtime inputs.`);
