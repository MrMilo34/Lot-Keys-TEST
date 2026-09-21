/* LotKeys 0.9.4.91 Device client. Transcripts stay in RAM; saved pairing uses the PIN vault. */
(()=>{'use strict';
const H=window.LotKeysHubCore,V=window.LotKeysPairingVault,te=new TextEncoder(),td=new TextDecoder();
let channel=null,generation=0,pollTimer=null,restoreJob=null,connectJob=null;
let peerSession='',peerName='',peerCaps={},lastPeer=0,lastStatusAt=0,lastHello=0,lastGoodRelay=0;
let activeOwner='',binding='',transportError='',failures=0,polling=false,lastUserActivity=Date.now();
const threads=new Map(),seen=new Set(),pending=new Map(),controllers=new Set();
const owner=()=>window.LotKeysHubStore.identity();
const locked=()=>document.body.dataset.lotkeysLocked==='true';
const b64=b=>{let s='';for(const n of new Uint8Array(b))s+=String.fromCharCode(n);return btoa(s);};
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const emit=(kind,extra={})=>window.dispatchEvent(new CustomEvent('lotkeys-device',{detail:{kind,...extra}}));
const pauseKey=a=>'lotkeys-device-paused|'+new URL('.',location.href).pathname+'|'+a;
function isPaused(a){try{return sessionStorage.getItem(pauseKey(a))==='1';}catch{return false;}}
function setPaused(a,value){if(!a)return;try{if(value)sessionStorage.setItem(pauseKey(a),'1');else sessionStorage.removeItem(pauseKey(a));}catch{}}
function current(c){return channel===c&&generation===c.g;}
function connected(){return !!channel&&!!peerSession&&Date.now()-lastPeer<90000&&Date.now()-lastGoodRelay<90000;}
function validate(raw){
  let c;try{const clean=String(raw||'').trim().replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g,'').replace(/\u00a0/g,' ').replace(/[\u201c\u201d]/g,'"');c=JSON.parse(clean);}catch{throw Error('The Hub pairing code is not valid JSON. Clear the box, then paste hub.json once.');}
  if(c?.version!==1||c.role!=='hub')throw Error('Use the Hub pairing code here, not the Device code.');
  let u;try{u=new URL(c.url);}catch{throw Error('The pairing has an invalid relay address.');}
  const loop=['localhost','127.0.0.1','[::1]'];
  if(u.protocol!=='https:'&&!(u.protocol==='http:'&&loop.includes(u.hostname)&&loop.includes(location.hostname)))throw Error('A trusted HTTPS relay is required.');
  if(u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname))throw Error('Use only the relay origin, without credentials or a path.');
  let key;try{key=bytes(c.key);}catch{throw Error('The pairing key is invalid.');}
  if(!/^[a-zA-Z0-9_-]{16,80}$/.test(c.room)||typeof c.token!=='string'||c.token.length<40||c.token.length>2048||key.length!==32)throw Error('The Hub pairing code is incomplete or invalid.');
  return {version:1,role:'hub',url:u.href.replace(/\/$/,''),room:c.room,token:c.token,key:c.key};
}
async function seal(c,data){const iv=crypto.getRandomValues(new Uint8Array(12)),ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode(c.config.room)},c.key,te.encode(JSON.stringify(data)));return {v:1,iv:b64(iv),ciphertext:b64(ciphertext)};}
async function unseal(c,x){if(x?.v!==1||typeof x.ciphertext!=='string'||x.ciphertext.length>100000||bytes(x.iv).length!==12)throw Error('Invalid encrypted event.');return JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(x.iv),additionalData:te.encode(c.config.room)},c.key,bytes(x.ciphertext))));}
async function http(c,path,opts={}){
  if(!current(c))throw Error('Connection changed.');
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);controllers.add(ctl);
  try{const r=await fetch(c.config.url+path,{...opts,headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.config.token},credentials:'omit',redirect:'error',cache:'no-store',signal:ctl.signal});
    if(!current(c))throw Error('Connection changed.');
    if(!r.ok)throw Error('Relay request failed ('+r.status+').');
    const data=await r.json();if(!current(c))throw Error('Connection changed.');lastGoodRelay=Date.now();return data;
  }finally{clearTimeout(timer);controllers.delete(ctl);}
}
async function publish(c,data){const now=Date.now(),body=await seal(c,{...data,id:data.id||H.uid('E'),at:now,expiresAt:now+30000});if(!current(c))throw Error('Connection changed.');return http(c,'/v1/event?room='+encodeURIComponent(c.config.room),{method:'POST',body:JSON.stringify(body)});}
function finishPending(id,result){const job=pending.get(id);if(!job)return;pending.delete(id);clearTimeout(job.timer);const m=threads.get(job.threadId)?.messages.find(m=>m.id===id);if(m)m.state=result.ok?'Submitted to phone':result.uncertain?'Not confirmed — check the phone before retrying':'Not sent: '+String(result.error||'Reply rejected');job.resolve(result);}
function cancelPending(message){for(const id of [...pending.keys()])finishPending(id,{ok:false,uncertain:true,error:message});}
function stop({clear=true}={}){
  generation++;clearTimeout(pollTimer);pollTimer=null;controllers.forEach(c=>c.abort());controllers.clear();polling=false;
  cancelPending('Connection ended. Check the phone before retrying.');
  channel=null;peerSession='';peerName='';peerCaps={};lastPeer=0;lastStatusAt=0;lastGoodRelay=0;lastHello=0;failures=0;
  if(clear){threads.clear();seen.clear();binding='';}else for(const t of threads.values()){t.canReply=false;t.replyToken='';}
}
function disconnect(){const a=activeOwner;setPaused(a,true);stop();V.clear();transportError='';emit('disconnect');}
function trim(){for(const t of threads.values())t.messages=t.messages.slice(-250);while(threads.size>250)threads.delete(threads.keys().next().value);while(seen.size>3000)seen.delete(seen.values().next().value);}
function receive(c,p){
  if(!current(c)||!p||typeof p.id!=='string'||!p.id||!Number.isFinite(p.at)||!Number.isFinite(p.expiresAt)||p.at<=0||p.at>Date.now()+60000||p.expiresAt>p.at+90000||p.expiresAt<Date.now()||seen.has(p.id))return;
  if(!['status','message','ack','removed'].includes(p.kind))return;
  if(p.kind==='status'){
    if(typeof p.session!=='string'||!p.session||p.at<lastStatusAt)return;
    seen.add(p.id);lastStatusAt=p.at;
    if(peerSession&&peerSession!==p.session){cancelPending('The phone restarted. Check the phone before retrying.');for(const t of threads.values()){t.canReply=false;t.replyToken='';}}
    peerSession=p.session;peerName=String(p.deviceName||'My phone');peerCaps=p.capabilities||{};lastPeer=Date.now();emit('status');return;
  }
  if(!peerSession||p.session!==peerSession)return;
  seen.add(p.id);lastPeer=Date.now();
  if(p.kind==='removed'){const t=threads.get(p.threadId);if(t){t.canReply=false;t.replyToken='';emit('threads');}return;}
  if(p.kind==='ack'){finishPending(p.requestId,{ok:p.ok===true,error:String(p.error||'')});emit('threads');return;}
  if(typeof p.threadId!=='string'||!p.threadId||typeof p.text!=='string')return;
  let t=threads.get(p.threadId)||{id:p.threadId,binding,title:String(p.title||p.address||'Device contact'),address:String(p.address||''),messages:[],unread:0,group:!!p.group};
  t.title=String(p.title||t.title);t.address=String(p.address||t.address);t.canReply=!!p.canReply;t.replyToken=String(p.replyToken||'');t.at=p.at;t.session=peerSession;t.binding=binding;
  const mid=String(p.messageId||p.id);
  let existing=t.messages.find(m=>m.id===mid);
  if(!existing&&p.outgoing){existing=t.messages.find(m=>m.outgoing&&m.text===p.text&&Math.abs(m.at-p.at)<30000&&m.id.startsWith('SEND-'));if(existing){existing.echoId=mid;existing.state='Submitted to phone';}}
  if(!existing&&!t.messages.some(m=>m.echoId===mid)){t.messages.push({id:mid,text:p.text.slice(0,16000),at:Number.isFinite(p.messageAt)?p.messageAt:p.at,outgoing:!!p.outgoing,state:''});if(!p.outgoing)t.unread++;}
  threads.set(t.id,t);trim();emit('message',{threadId:t.id,outgoing:!!p.outgoing});
}
async function hello(c){if(Date.now()-lastHello<15000)return;lastHello=Date.now();await publish(c,{kind:'hello',session:'',client:'LotKeys Hub'});}
async function poll(c){
  if(!current(c)||polling)return;polling=true;
  try{
    if(await owner()!==c.owner){stop();V.clear();emit('disconnect');return;}
    if(!current(c))return;
    if(Date.now()-lastUserActivity>V.workIdleMs){stop({clear:false});V.clear();transportError='Unlock saved Device access to resume this work session.';emit('status');return;}
    if(!lastPeer||Date.now()-lastPeer>30000)await hello(c);
    const data=await http(c,'/v1/poll?room='+encodeURIComponent(c.config.room)+'&after='+c.cursor);
    for(const row of data.events||[]){try{const p=await unseal(c,row.envelope);if(!current(c))return;receive(c,p);}catch{if(current(c))emit('warning',{message:'An invalid bridge event was ignored.'});}if(!current(c))return;c.cursor=Math.max(c.cursor,Number(row.seq)||0);}
    trim();failures=0;transportError='';emit('status');
  }catch(e){if(current(c)){failures++;transportError='Relay temporarily unavailable — retrying automatically.';emit('status');}}
  finally{if(current(c)){polling=false;pollTimer=setTimeout(()=>poll(c),Math.min(15000,1500*Math.pow(2,Math.min(failures,3))));}}
}
async function connect(raw,{save=true,pin='',label='My phone'}={}){
  if(connectJob)throw Error('A connection attempt is already in progress.');
  connectJob=(async()=>{
    const requestGeneration=generation;
    if(locked())throw Error('Unlock LotKeys first.');
    const config=validate(raw),a=await owner();
    if(pin)await V.unlock(pin);
    if(save&&!(await V.info()).unlocked)throw Error('Enter your LotKeys PIN/password to remember this pairing, or choose a session-only connection.');
    if(a!==await owner())throw Error('Account changed. Reopen Device connection.');
    const key=await crypto.subtle.importKey('raw',bytes(config.key),'AES-GCM',false,['encrypt','decrypt']);
    if(a!==await owner()||locked())throw Error('Unlock LotKeys in the correct account first.');
    const hash=await crypto.subtle.digest('SHA-256',te.encode(config.room));
    const nextBinding=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
    const currentOwner=await owner();if(requestGeneration!==generation||locked()||a!==currentOwner)throw Error('Connection attempt cancelled. Reopen Device connection.');
    const preserve=binding===nextBinding&&activeOwner===a;
    stop({clear:!preserve});activeOwner=a;binding=nextBinding;lastUserActivity=Date.now();setPaused(a,false);
    const c=channel={config,key,owner:a,cursor:0,g:generation};transportError='';
    try{
      await hello(c);
      if(a!==await owner()||!current(c))throw Error('Account changed during pairing.');
      if(save){await V.save(JSON.stringify(config),label);if(!current(c)||a!==await owner())throw Error('Account changed during pairing.');emit('saved');}
    }catch(e){if(current(c)){stop({clear:false});transportError=e.message;emit('status');}throw e;}
    await poll(c);return true;
  })().finally(()=>{connectJob=null;});return connectJob;
}
async function restoreSaved({manual=false}={}){
  if(channel)return true;if(restoreJob)return restoreJob;if(connectJob)return false;
  restoreJob=(async()=>{
    const requestGeneration=generation;
    let a;try{a=await owner();}catch{return false;}
    if(locked()||(!manual&&isPaused(a)))return false;
    const raw=await V.readUnlocked();if(!raw)return false;
    if(a!==await owner()||requestGeneration!==generation||locked()||(!manual&&isPaused(a)))return false;
    try{await connect(raw,{save:false});return true;}catch(e){transportError=e.message;emit('saved-error',{message:transportError});return false;}
  })().finally(()=>{restoreJob=null;});return restoreJob;
}
function wake(){if(locked()&&!channel)return;if(!channel){if(!restoreJob&&!connectJob)restoreSaved().catch(()=>{});return;}clearTimeout(pollTimer);pollTimer=null;if(!polling)poll(channel);emit('status');}
async function unlockSaved(pin){await V.unlock(pin);lastUserActivity=Date.now();return restoreSaved({manual:true});}
async function onAppUnlock(pin){await V.unlock(pin);lastUserActivity=Date.now();const a=await owner();if(!isPaused(a))await restoreSaved();wake();}
async function savedInfo(){return V.info();}
async function forgetSaved(){const a=await owner();setPaused(a,true);stop();await V.forget();emit('saved');emit('disconnect');}
async function send(threadId,text){
  if(locked())throw Error('Unlock LotKeys before replying.');
  const c=channel,t=threads.get(threadId);if(!c||!connected()||!t?.canReply||!t.replyToken)throw Error('No live Reply action is available. Use Continue in Messages or wait for a new notification.');
  if([...pending.values()].some(x=>x.threadId===threadId))throw Error('A reply is already awaiting phone confirmation.');
  if(await owner()!==c.owner||!current(c)){stop();V.clear();throw Error('Account changed.');}
  text=H.text(text);if(!text||text.length>16000)throw Error('Enter a message under 16,000 characters.');
  touch();const id=H.uid('SEND');t.messages.push({id,text,at:Date.now(),outgoing:true,state:'Sending…'});t.at=Date.now();emit('threads');
  const result=new Promise(resolve=>pending.set(id,{threadId,resolve,timer:setTimeout(()=>{finishPending(id,{ok:false,uncertain:true,error:'Phone acknowledgement timed out. Check the phone before retrying.'});emit('threads');},20000)}));
  try{await publish(c,{id,kind:'send',session:peerSession,threadId,replyToken:t.replyToken,text});}
  catch{finishPending(id,{ok:false,uncertain:true,error:'Not confirmed. Check the phone before retrying.'});emit('threads');}return result;
}
function read(id){const t=threads.get(id);if(t){t.unread=0;emit('read');}return t;}
function clearThread(id){const t=threads.get(id);if(!t)return;if([...pending.values()].some(x=>x.threadId===id))throw Error('Wait for the pending reply result before clearing this view.');t.messages=[];t.unread=0;emit('threads');}
function touch(){if(!locked()&&!document.hidden){if(channel&&Date.now()-lastUserActivity>V.workIdleMs){stop({clear:false});V.clear();transportError='Unlock saved Device access to resume this work session.';emit('status');}lastUserActivity=Date.now();V.touch();}}
function status(){return {paired:!!channel,connected:connected(),name:peerName,capabilities:peerCaps,lastSeen:lastPeer,error:transportError,paused:isPaused(activeOwner),locked:locked(),binding};}
window.LotKeysDevice={connect,disconnect,wake,restoreSaved,unlockSaved,onAppUnlock,savedInfo,forgetSaved,send,read,clearThread,threads:()=>[...threads.values()],get:id=>threads.get(id),status,cryptoTest:{b64,bytes}};
window.addEventListener('lotkeys-hub-identity',e=>{const a=String(e.detail.owner||'');if(activeOwner&&activeOwner!==a){stop();V.clear();activeOwner='';emit('disconnect');}if(a)setTimeout(wake,0);});
window.addEventListener('pagehide',()=>{stop();V.clear();});
window.addEventListener('online',wake);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){touch();wake();}});
for(const type of ['pointerdown','keydown'])document.addEventListener(type,touch,{passive:true});
setTimeout(wake,700);
})();
