/* LotKeys 0.9.4.91: local, account-scoped pairing vault. No message bodies. */
(()=>{'use strict';
const te=new TextEncoder(),td=new TextDecoder();
const IDB_NAME='lotkeys-device-pairing-v1',KDF_ROUNDS=600000,WORK_IDLE=4*60*60*1000;
let dbPromise,material=null,materialOwner='',credentialId='',lastUse=0,unlockJob=null,vaultEpoch=0;
const b64=b=>{let s='';for(const n of new Uint8Array(b))s+=String.fromCharCode(n);return btoa(s);};
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const identity=()=>window.LotKeysHubStore.identity();
const core=()=>window.LotKeysMessagingBridge;
const scope=a=>location.origin+'|'+new URL('.',location.href).pathname+'|'+a+'|pairing-v2';
const locked=()=>document.body.dataset.lotkeysLocked==='true';
function database(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const r=indexedDB.open(IDB_NAME,1);
    r.onupgradeneeded=()=>{for(const name of ['keys','pairings'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name);};
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>{dbPromise=null;reject(r.error);};
  });return dbPromise;
}
async function read(store,id){const db=await database();return new Promise((resolve,reject)=>{
  const tx=db.transaction(store,'readonly'),r=tx.objectStore(store).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});}
async function readPair(a){const scoped=await read('pairings',scope(a));if(scoped)return scoped;const legacy=await read('pairings',a);return legacy&&legacy.schema!==2?legacy:null;}
async function write(id,row){const db=await database();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['keys','pairings'],'readwrite');
  if(row)tx.objectStore('pairings').put(row,scope(id));else tx.objectStore('pairings').delete(scope(id));
  tx.objectStore('pairings').delete(id);
  // New rows never store the PIN-derived decryption key beside the ciphertext.
  tx.objectStore('keys').delete(id);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
});}
async function credentials(){
  const a=await identity(),[hash,salt]=await Promise.all([core().getSetting('lotkeysLockCredentialHash',''),core().getSetting('lotkeysLockCredentialSalt','')]);
  if(a!==await identity())throw Error('Account changed. Reopen Device connection.');
  return {owner:a,hash:String(hash||''),salt:String(salt||''),id:String(hash||'')+'|'+String(salt||'')};
}
function clear(){vaultEpoch++;material=null;materialOwner='';credentialId='';lastUse=0;}
function isUnlocked(a){return !!material&&materialOwner===a&&Date.now()-lastUse<WORK_IDLE;}
async function derive(m,salt){return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:KDF_ROUNDS,hash:'SHA-256'},m,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function assertOwner(a){if(a!==await identity())throw Error('Account changed. Nothing was connected or saved.');}
async function verifyPin(pin,c){
  if(!c.hash)throw Error('Set a LotKeys Lock Screen PIN/password in Account first. Automatic locking may remain off.');
  if(typeof pin!=='string'||!pin||pin.length>1024)throw Error('Enter your LotKeys PIN/password.');
  const rateKey='lotkeys-device-pin-attempts|'+scope(c.owner);
  let rate={};try{rate=JSON.parse(sessionStorage.getItem(rateKey)||'{}');}catch{}
  if(Number(rate.until)>Date.now())throw Error('Wait '+Math.ceil((rate.until-Date.now())/1000)+' seconds before trying the PIN again.');
  let digest;
  const buf=te.encode(pin);
  try{
    if(c.salt){const m=await crypto.subtle.importKey('raw',buf,'PBKDF2',false,['deriveBits']);digest=await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(c.salt),iterations:120000,hash:'SHA-256'},m,256);}
    else digest=await crypto.subtle.digest('SHA-256',buf);
  }finally{buf.fill(0);}
  const actual=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  let difference=actual.length^c.hash.length;for(let i=0;i<actual.length;i++)difference|=actual.charCodeAt(i)^(c.hash.charCodeAt(i)||0);
  await assertOwner(c.owner);
  if(difference){rate.count=(Number(rate.count)||0)+1;rate.until=rate.count>=5?Date.now()+Math.min(300000,30000*Math.pow(2,rate.count-5)):0;try{sessionStorage.setItem(rateKey,JSON.stringify(rate));}catch{}throw Error('That LotKeys PIN/password did not match.');}
  try{sessionStorage.removeItem(rateKey);}catch{}
}
async function decryptRow(row,a,m){
  if(row.schema===2){
    if(row.iterations!==KDF_ROUNDS||bytes(row.salt).length!==16||bytes(row.iv).length!==12)throw Error('Saved pairing format is invalid.');
    const k=await derive(m,bytes(row.salt));
    return td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(row.iv),additionalData:te.encode(scope(a))},k,bytes(row.ciphertext)));
  }
  // One-time .90 migration, only reached AFTER the user has entered a valid PIN.
  const legacy=await read('keys',a);if(!legacy)throw Error('The saved pairing key is missing.');
  return td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(row.iv),additionalData:te.encode(a)},legacy,bytes(row.ciphertext)));
}
async function encryptRow(raw,c,m,label,previous,epoch=vaultEpoch){
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),k=await derive(m,salt);
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode(scope(c.owner))},k,te.encode(raw));
  await assertOwner(c.owner);
  if(epoch!==vaultEpoch)throw Error('Device access changed. Nothing was saved.');
  await write(c.owner,{schema:2,salt:b64(salt),iv:b64(iv),ciphertext:b64(ciphertext),iterations:KDF_ROUNDS,label:String(label||'My phone').slice(0,80),createdAt:previous?.createdAt||Date.now(),updatedAt:Date.now()});
}
async function unlock(pin){
  if(unlockJob)return unlockJob;
  unlockJob=(async()=>{
    const epoch=vaultEpoch;
    if(locked())throw Error('Unlock LotKeys first.');
    const c=await credentials();await verifyPin(pin,c);
    const buf=te.encode(pin);let m;try{m=await crypto.subtle.importKey('raw',buf,'PBKDF2',false,['deriveKey']);}finally{buf.fill(0);}
    const row=await readPair(c.owner);let raw='';
    if(row){try{raw=await decryptRow(row,c.owner,m);}catch{throw Error('The saved pairing could not be unlocked. If your PIN changed, reconnect with the Hub pairing code.');}}
    await assertOwner(c.owner);
    if(epoch!==vaultEpoch)throw Error('Device unlock cancelled. Try again when ready.');
    if(row&&row.schema!==2)await encryptRow(raw,c,m,'My phone',row,epoch);
    if(locked()||epoch!==vaultEpoch)throw Error('Device unlock cancelled. Try again when ready.');
    material=m;materialOwner=c.owner;credentialId=c.id;lastUse=Date.now();
    return true;
  })().finally(()=>{unlockJob=null;});return unlockJob;
}
async function readUnlocked(){
  const c=await credentials();if(!isUnlocked(c.owner)||credentialId!==c.id){clear();return '';}
  const row=await readPair(c.owner);if(!row)return '';
  const m=material,raw=await decryptRow(row,c.owner,m);await assertOwner(c.owner);if(material!==m)return '';return raw;
}
async function save(raw,label='My phone'){
  const c=await credentials();if(!isUnlocked(c.owner)||credentialId!==c.id)throw Error('Unlock saved Device access with your LotKeys PIN first.');
  const m=material,epoch=vaultEpoch,previous=await readPair(c.owner);await encryptRow(typeof raw==='string'?raw:JSON.stringify(raw),c,m,label,previous,epoch);lastUse=Date.now();
}
async function info(){try{const c=await credentials(),row=await readPair(c.owner);return {saved:!!row,legacy:!!row&&row.schema!==2,updatedAt:row?.updatedAt||0,label:row?.label||'My phone',unlocked:isUnlocked(c.owner)&&credentialId===c.id,configured:!!c.hash,owner:c.owner};}catch{return {saved:false,unlocked:false,configured:false,owner:''};}}
async function forget(){clear();const a=await identity();await write(a,null);}
function touch(){if(material&&!locked())lastUse=Date.now();}
window.LotKeysPairingVault={unlock,readUnlocked,save,info,forget,clear,touch,isUnlocked,workIdleMs:WORK_IDLE};
window.addEventListener('lotkeys-hub-identity',ev=>{if(materialOwner&&materialOwner!==ev.detail.owner)clear();});
window.addEventListener('pagehide',clear);
})();
