/* LotKeys 0.9.4.96 Device client. Transcripts stay in RAM; saved pairing uses the PIN vault. */
(()=>{'use strict';
const H=window.LotKeysHubCore,V=window.LotKeysPairingVault,te=new TextEncoder(),td=new TextDecoder();
let channel=null,generation=0,pollTimer=null,restoreJob=null,connectJob=null;
let peerSession='',peerName='',peerCaps={},lastPeer=0,lastStatusAt=0,lastHello=0,lastGoodRelay=0;
let activeOwner='',binding='',transportError='',failures=0,polling=false,lastUserActivity=Date.now();
const threads=new Map(),seen=new Set(),pending=new Map(),controllers=new Set();
let nativeMode=false,sourceApp='',focused='',refreshNativeTimer;
let listing={loading:false,hasMore:false,nextOffset:0,total:0,error:''};
const queries=new Map(),historyJobs=new Map();let listJob=null;
const owner=()=>window.LotKeysHubStore.identity();
const locked=()=>document.body.dataset.lotkeysLocked==='true';
const b64=b=>{let s='';for(const n of new Uint8Array(b))s+=String.fromCharCode(n);return btoa(s);};
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const emit=(kind,extra={})=>window.dispatchEvent(new CustomEvent('lotkeys-device',{detail:{kind,...extra}}));
const pauseKey=a=>'lotkeys-device-paused|'+new URL('.',location.href).pathname+'|'+a;
function isPaused(a){try{return sessionStorage.getItem(pauseKey(a))==='1';}catch{return false;}}
function setPaused(a,value){if(!a)return;try{if(value)sessionStorage.setItem(pauseKey(a),'1');else sessionStorage.removeItem(pauseKey(a));}catch{}}
function current(c){return channel===c&&generation===c.g;}
function connected(){return !!channel&&!!peerSession&&(typeof navigator==='undefined'||navigator.onLine!==false)&&(!nativeMode||channel.liveVerified)&&Date.now()-lastPeer<(nativeMode?25000:90000)&&Date.now()-lastGoodRelay<(nativeMode?25000:90000);}
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
async function publish(c,data){const now=Date.now(),body=await seal(c,{...data,id:data.id||H.uid('E'),at:now,expiresAt:now+(data.kind==='send'&&nativeMode?8000:30000)});if(!current(c))throw Error('Connection changed.');return http(c,'/v1/event?room='+encodeURIComponent(c.config.room),{method:'POST',body:JSON.stringify(body)});}
function finishPending(id,result){const job=pending.get(id);if(!job)return;pending.delete(id);clearTimeout(job.timer);const m=threads.get(job.threadId)?.messages.find(m=>m.id===id);if(m)m.state=result.ok?(nativeMode?'Sent by phone · delivery unconfirmed':'Submitted to phone'):result.uncertain?'Not confirmed — check the phone before retrying':'Not sent: '+String(result.error||'Reply rejected');job.resolve(result);}
function cancelPending(message){for(const id of [...pending.keys()])finishPending(id,{ok:false,uncertain:true,error:message});}
function stop({clear=true}={}){
  rejectQueries('Connection ended.');clearTimeout(refreshNativeTimer);listJob=null;historyJobs.clear();listing={loading:false,hasMore:false,nextOffset:0,total:0,error:''};
  generation++;clearTimeout(pollTimer);pollTimer=null;controllers.forEach(c=>c.abort());controllers.clear();polling=false;
  cancelPending('Connection ended. Check the phone before retrying.');
  channel=null;peerSession='';peerName='';peerCaps={};lastPeer=0;lastStatusAt=0;lastGoodRelay=0;lastHello=0;failures=0;
  if(clear){threads.clear();seen.clear();binding='';}else for(const t of threads.values()){t.canReply=false;t.replyToken='';}
}
function disconnect(){const a=activeOwner;setPaused(a,true);stop();V.clear();transportError='';emit('disconnect');}
function trim(){if(!nativeMode){for(const t of threads.values())t.messages=t.messages.slice(-250);while(threads.size>250)threads.delete(threads.keys().next().value);}while(seen.size>3000)seen.delete(seen.values().next().value);}
function receive(c,p){
  if(!current(c)||!p||typeof p.id!=='string'||!p.id||!Number.isFinite(p.at)||!Number.isFinite(p.expiresAt)||p.at<=0||p.at>Date.now()+60000||p.expiresAt>p.at+90000||p.expiresAt<Date.now()||seen.has(p.id))return;
  if(p.capabilities?.nativeSms||nativeMode){receiveNative(c,p);return;}
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

// Native phone mirror: read-only paged snapshots stay in RAM, never in HubStore/Drive.
function rejectQueries(message){for(const [id,q] of queries){clearTimeout(q.timer);q.reject(Error(message));}queries.clear();}
function hideNative(message){
  if(!nativeMode)return;
  if(channel)channel.liveVerified=false;
  peerSession='';lastPeer=0;lastHello=0;lastStatusAt=0;
  rejectQueries(message);cancelPending('Connection interrupted. Check the phone before retrying.');
  threads.clear();historyJobs.clear();listJob=null;listing.loading=false;listing.error=message;transportError=message;
  emit('threads');
}
function queryPhone(kind,fields={}){
  const c=channel;if(!c||!connected())return Promise.reject(Error('Phone unavailable. Reconnect before requesting history.'));
  const id=H.uid('QUERY');
  return new Promise((resolve,reject)=>{
    const q={id,kind,fields,parts:new Map(),resolve,reject,timer:setTimeout(()=>{queries.delete(id);reject(Error('Phone history request timed out. Retry when the phone is online.'));},30000)};
    queries.set(id,q);
    publish(c,{id,kind,session:peerSession,clientId:c.clientId,...fields}).catch(err=>{if(queries.get(id)===q){queries.delete(id);clearTimeout(q.timer);reject(err);}});
  });
}
function finishQuery(id,error,value){const q=queries.get(id);if(!q)return;queries.delete(id);clearTimeout(q.timer);if(error)q.reject(Error(error));else q.resolve(value);}
function acceptThread(row){
  if(!row||typeof row.id!=='string'||!/^smsmms-[0-9]{1,18}$/.test(row.id))throw Error('Invalid phone conversation.');
  const old=threads.get(row.id)||{messages:[],unread:0,loaded:false};
  const t={...old,id:row.id,binding,session:peerSession,title:String(row.title||row.address||'Phone conversation').slice(0,300),address:String(row.address||'').slice(0,120),participants:Array.isArray(row.participants)?row.participants.map(x=>String(x).slice(0,120)):[],group:!!row.group,canReply:row.canReply===true&&!row.group,at:Number(row.at)||0,preview:String(row.preview||'').slice(0,400),unread:(Number(row.at)||0)<=(old.readAt||0)?0:Number(row.unread)||0,count:Number(row.count)||0,nativeSms:true};
  threads.set(t.id,t);return t;
}
function receiveNative(c,p){
  if(p.kind==='status'){
    if(!p.capabilities?.nativeSms)return; // Never mix a legacy notification bridge into a native mirror session.
    if(typeof p.session!=='string'||!p.session||p.at<lastStatusAt)return;
    const fresh=p.challenge&&p.challenge===c.helloId;
    if((!c.liveVerified||peerSession!==p.session)&&!fresh)return;
    const resumed=!c.liveVerified||peerSession!==p.session;
    if(peerSession&&peerSession!==p.session){rejectQueries('Phone restarted.');cancelPending('Phone restarted. Check the phone before retrying.');threads.clear();historyJobs.clear();listJob=null;}
    nativeMode=true;c.liveVerified=true;seen.add(p.id);lastStatusAt=p.at;lastPeer=Math.min(Date.now(),p.at);
    peerSession=p.session;peerName=String(p.deviceName||'My phone');peerCaps=p.capabilities;sourceApp=String(p.sourceApp||'Default SMS app');transportError='';
    if(resumed)scheduleNativeRefresh();emit('status');return;
  }
  if(!nativeMode||!connected()||p.session!==peerSession)return;
  seen.add(p.id);
  if(p.kind==='ack'){
    const job=pending.get(p.requestId);if(!job)return;
    if(p.phase==='accepted'){
      const m=threads.get(job.threadId)?.messages.find(m=>m.id===p.requestId);if(m)m.state='Phone is sending SMS…';emit('threads');return;
    }
    finishPending(p.requestId,{ok:p.phase==='sent',uncertain:p.uncertain===true,error:String(p.error||'')});scheduleNativeRefresh();emit('threads');return;
  }
  if(p.kind==='invalidate'){scheduleNativeRefresh();return;}
  if(!['thread-page','history-page','query-error'].includes(p.kind)||p.target!==c.clientId)return;
  const q=queries.get(p.requestId);if(!q)return;
  if(p.kind==='query-error'){finishQuery(p.requestId,String(p.error||'Phone database unavailable.'));return;}
  if(p.kind==='thread-page'&&q.kind==='threads'){
    if(!Array.isArray(p.threads)||p.threads.length>100||Number(p.offset)!==Number(q.fields.offset||0)){finishQuery(q.id,'Invalid conversation page.');return;}
    finishQuery(q.id,null,p);return;
  }
  if(p.kind==='history-page'&&q.kind==='history'&&p.threadId===q.fields.threadId){
    if(!Number.isInteger(p.part)||p.part<0||p.part>80||!Array.isArray(p.messages)||p.messages.length>40){finishQuery(q.id,'Invalid history page.');return;}
    q.parts.set(p.part,p.messages);
    if(p.done){q.end=p.part;q.meta=p;}
    if(q.end===undefined)return;
    const rows=[];for(let i=0;i<=q.end;i++){if(!q.parts.has(i))return;rows.push(...q.parts.get(i));}
    if(rows.length>40){finishQuery(q.id,'History page exceeded its limit.');return;}
    finishQuery(q.id,null,{...q.meta,messages:rows});
  }
}
function scheduleNativeRefresh(){
  if(refreshNativeTimer)return;
  refreshNativeTimer=setTimeout(()=>{refreshNativeTimer=null;if(!connected()||!nativeMode)return;
    refreshConversations().then(()=>{if(focused&&threads.has(focused)&&!historyJobs.has(focused))return loadHistory(focused);}).catch(()=>{});
  },500);
}
async function refreshConversations({more=false}={}){
  if(!nativeMode)return false;if(listJob)return listJob;
  const c=channel;const limit=more?0:Math.max(40,listing.nextOffset);listing.loading=true;listing.error='';emit('status');
  const task=(async()=>{
    let offset=more?listing.nextOffset:0,page,collected=[];
    do{page=await queryPhone('threads',{offset});if(!current(c)||!connected())throw Error('Phone connection changed.');collected.push(...page.threads);
      const next=Number(page.nextOffset);if(!Number.isFinite(next)||next<offset||(page.hasMore&&next===offset))throw Error('Invalid phone pagination.');offset=next;
    }while(!more&&page.hasMore&&offset<limit);
    const ids=new Set(collected.map(t=>t.id));
    if(!more)for(const id of threads.keys())if(!ids.has(id))threads.delete(id);
    for(const row of collected)acceptThread(row);
    listing={loading:false,hasMore:!!page.hasMore,nextOffset:offset,total:Number(page.total)||offset,error:''};emit('threads');return true;
  })();listJob=task;
  try{return await task;}catch(err){if(current(c)){listing.error=err.message;transportError=err.message;}throw err;}
  finally{if(listJob===task){listJob=null;listing.loading=false;}emit('status');}
}
async function loadHistory(id,{older=false}={}){
  if(!nativeMode)return false;
  if(historyJobs.has(id))return historyJobs.get(id);
  const c=channel,t=threads.get(id);if(!t||!connected())throw Error('Phone unavailable.');
  if(older&&(!t.loaded||!t.hasMore))return false;
  const before=older?t.nextBefore:null;t.loading=true;t.historyError='';emit('threads');
  const task=(async()=>{
    const page=await queryPhone('history',{threadId:id,before});if(!current(c)||!connected())throw Error('Phone connection changed.');
    if(page.thread?.id!==id)throw Error('History belongs to a different conversation.');
    const actual=acceptThread(page.thread);const map=new Map();
    if(older)for(const m of actual.messages)map.set(m.id,m);
    for(const m of page.messages){if(typeof m.id!=='string'||typeof m.text!=='string'||!Number.isFinite(m.at))throw Error('Invalid message in phone history.');
      map.set(m.id,{id:m.id,text:m.text.slice(0,16001),at:m.at,sort:String(m.sort||m.id),outgoing:!!m.outgoing,transport:String(m.transport||''),state:String(m.state||'')});}
    // Preserve pending/unconfirmed send indicators without creating a second authoritative message.
    for(const m of actual.messages.filter(m=>m.id.startsWith('SEND-'))){
      const mirrored=[...map.values()].some(x=>x.outgoing&&x.text===m.text&&Math.abs(x.at-m.at)<120000);
      if(!mirrored&&(pending.has(m.id)||m.state.includes('Not confirmed')))map.set(m.id,m);
    }
    actual.messages=[...map.values()].sort((a,b)=>a.at-b.at||String(a.sort||a.id).localeCompare(String(b.sort||b.id)));
    actual.loaded=true;actual.loading=false;actual.hasMore=!!page.hasMore;actual.nextBefore=page.nextBefore;actual.historyError='';if(focused===id)actual.unread=0;
    emit('threads');return true;
  })();historyJobs.set(id,task);
  try{return await task;}catch(err){const now=threads.get(id);if(current(c)&&now){now.historyError=err.message;now.loading=false;}throw err;}
  finally{if(historyJobs.get(id)===task)historyJobs.delete(id);const now=threads.get(id);if(now)now.loading=false;emit('threads');}
}

async function hello(c){if(Date.now()-lastHello<10000)return;lastHello=Date.now();c.helloId=H.uid('HELLO');c.cursor=0;await publish(c,{id:c.helloId,kind:'hello',session:'',client:'LotKeys Hub',clientId:c.clientId});}
async function poll(c){
  if(!current(c)||polling)return;polling=true;
  try{
    if(await owner()!==c.owner){stop();V.clear();emit('disconnect');return;}
    if(!current(c))return;
    if(Date.now()-lastUserActivity>V.workIdleMs){stop({clear:false});V.clear();transportError='Unlock saved Device access to resume this work session.';emit('status');return;}
    if(!lastPeer||Date.now()-lastPeer>(nativeMode?16000:30000))await hello(c);
    const data=await http(c,'/v1/poll?room='+encodeURIComponent(c.config.room)+'&after='+c.cursor);
    for(const row of data.events||[]){try{const p=await unseal(c,row.envelope);if(!current(c))return;receive(c,p);}catch{if(current(c))emit('warning',{message:'An invalid bridge event was ignored.'});}if(!current(c))return;c.cursor=Math.max(c.cursor,Number(row.seq)||0);}
    trim();failures=0;transportError='';if(nativeMode&&!connected())hideNative('Phone unavailable — waiting for a fresh response.');emit('status');
  }catch(e){if(current(c)){failures++;c.cursor=0;lastHello=0;transportError='Relay temporarily unavailable — retrying automatically.';if(nativeMode)hideNative(transportError);emit('status');}}
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
    nativeMode=false;sourceApp='';const c=channel={config,key,owner:a,cursor:0,g:generation,clientId:H.uid('CLIENT'),helloId:'',liveVerified:false};transportError='';
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
async function resync(){const c=channel;if(!c)throw Error('Device is not connected.');lastHello=0;await hello(c);if(nativeMode&&connected()){await refreshConversations();if(focused)await loadHistory(focused);}if(!polling)poll(c);}
async function unlockSaved(pin){await V.unlock(pin);lastUserActivity=Date.now();return restoreSaved({manual:true});}
async function onAppUnlock(pin){await V.unlock(pin);lastUserActivity=Date.now();const a=await owner();if(!isPaused(a))await restoreSaved();wake();}
async function savedInfo(){return V.info();}
async function forgetSaved(){const a=await owner();setPaused(a,true);stop();await V.forget();emit('saved');emit('disconnect');}
async function send(threadId,text){
  if(locked())throw Error('Unlock LotKeys before replying.');
  const c=channel,t=threads.get(threadId);if(!c||!connected()||!t?.canReply||(!nativeMode&&!t.replyToken))throw Error(nativeMode?'Phone unavailable or this recipient is view-only. Use the phone messaging app.':'No live Reply action is available. Use Continue in Messages or wait for a new notification.');
  if([...pending.values()].some(x=>x.threadId===threadId))throw Error('A reply is already awaiting phone confirmation.');
  if(await owner()!==c.owner||!current(c)){stop();V.clear();throw Error('Account changed.');}
  text=H.text(text);if(!text||text.length>16000)throw Error('Enter a message under 16,000 characters.');
  touch();const id=H.uid('SEND');t.messages.push({id,text,at:Date.now(),outgoing:true,state:'Sending…'});t.at=Date.now();emit('threads');
  const result=new Promise(resolve=>pending.set(id,{threadId,resolve,timer:setTimeout(()=>{finishPending(id,{ok:false,uncertain:true,error:'Phone acknowledgement timed out. Check the phone before retrying.'});emit('threads');},nativeMode?45000:20000)}));
  try{await publish(c,{id,kind:'send',session:peerSession,threadId,replyToken:t.replyToken,text,...(nativeMode?{transport:'sms',address:t.address,clientId:c.clientId}:{})});}
  catch{finishPending(id,{ok:false,uncertain:true,error:'Not confirmed. Check the phone before retrying.'});emit('threads');}return result;
}
function read(id){focused=id;const t=threads.get(id);if(t){t.unread=0;t.readAt=t.at;emit('read');}return t;}
function clearThread(id){const t=threads.get(id);if(!t)return;if([...pending.values()].some(x=>x.threadId===id))throw Error('Wait for the pending reply result before clearing this view.');t.messages=[];t.unread=0;emit('threads');}
function touch(){if(!locked()&&!document.hidden){if(channel&&Date.now()-lastUserActivity>V.workIdleMs){stop({clear:false});V.clear();transportError='Unlock saved Device access to resume this work session.';emit('status');}lastUserActivity=Date.now();V.touch();}}
function status(){return {paired:!!channel,connected:connected(),name:peerName,capabilities:peerCaps,sourceApp,listing:{...listing},lastSeen:lastPeer,error:transportError,paused:isPaused(activeOwner),locked:locked(),binding};}
window.LotKeysDevice={connect,disconnect,wake,resync,restoreSaved,unlockSaved,onAppUnlock,savedInfo,forgetSaved,send,read,clearThread,loadHistory,refreshConversations,unwatch:()=>{focused='';},isSending:id=>[...pending.values()].some(x=>x.threadId===id),threads:()=>nativeMode&&!connected()?[]:[...threads.values()],get:id=>nativeMode&&!connected()?undefined:threads.get(id),status,cryptoTest:{b64,bytes}};
window.addEventListener('lotkeys-hub-identity',e=>{const a=String(e.detail.owner||'');if(activeOwner&&activeOwner!==a){stop();V.clear();activeOwner='';emit('disconnect');}if(a)setTimeout(wake,0);});
window.addEventListener('pagehide',()=>{stop();V.clear();});
window.addEventListener('online',()=>{if(channel){channel.cursor=0;lastHello=0;}wake();});
window.addEventListener('offline',()=>{if(nativeMode)hideNative('Internet unavailable. Your draft is not queued to send.');emit('status');});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){touch();wake();}});
for(const type of ['pointerdown','keydown'])document.addEventListener(type,touch,{passive:true});
setTimeout(wake,700);
})();
