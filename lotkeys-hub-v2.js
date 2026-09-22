/*
 * LotKeys Hub V2 — clean overlay boundary.
 *
 * The existing LotKeys Chat remains its own application surface.
 * Phone messages live only in the phone and this module's in-memory transport.
 * This shell never starts app sync, reads vehicle media, or owns LotKeys routing.
 */
(()=>{
'use strict';

const H=window.LotKeysHubV2Core;
const I=window.LotKeysHubV2Identity;
const D=window.LotKeysDevice;
const M=window.LotKeysMessaging;
const Bridge=window.LotKeysMessagingBridge;
if(!H||!I||!D||!M||!Bridge){
  console.error('LotKeys Hub V2 did not finish loading.');
  return;
}

const PANEL_ID='lotkeys-hub-v2';
const CONVERSATION_KEY='lotkeysMessagingConversationsV1';
let panel=null;
let source='all';
let filter='all';
let query='';
let activeDeviceId='';
let previousNav=null;
let clockTimer=null;
let paintTimer=null;
let painting=false;
let paintAgain=false;
const drafts=new Map();

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const e=H.escape;

function navHeight(){
  const nav=$('.bottom-nav');
  return nav?Math.ceil(nav.getBoundingClientRect().height):64;
}

function ensurePanel(){
  if(panel?.isConnected)return panel;
  panel=document.createElement('section');
  panel.id=PANEL_ID;
  panel.hidden=true;
  panel.setAttribute('aria-label','LotKeys Hub');
  document.body.appendChild(panel);
  return panel;
}

function setNavActive(on){
  const button=$('#chat-nav-btn');
  if(!button)return;
  if(on){
    previousNav=$('.bottom-nav .nav-btn.active:not(#chat-nav-btn)');
    $$('.bottom-nav .nav-btn').forEach(item=>item.classList.toggle('active',item===button));
  }else{
    button.classList.remove('active');
    if(previousNav?.isConnected)previousNav.classList.add('active');
    previousNav=null;
  }
}

function clockParts(){
  const now=new Date();
  return {
    time:now.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit',hour12:true}),
    date:now.toLocaleDateString('en-CA',{month:'2-digit',day:'2-digit',year:'numeric'})
  };
}

function updateClock(){
  const value=clockParts();
  const time=$('[data-hub2-clock-time]',panel);
  const date=$('[data-hub2-clock-date]',panel);
  if(time)time.textContent=value.time;
  if(date)date.textContent=value.date;
}

function startClock(){
  clearInterval(clockTimer);
  updateClock();
  clockTimer=setInterval(updateClock,30000);
}

function stopClock(){
  clearInterval(clockTimer);
  clockTimer=null;
}

function isOpen(){return !!panel&&!panel.hidden;}

async function internalRows(){
  try{return H.internalRows(await Bridge.getSetting(CONVERSATION_KEY,[]));}
  catch{return [];}
}

function deviceRows(){
  return D.threads().map(thread=>({
    id:String(thread.id||''),
    source:'device',
    title:String(thread.title||thread.address||'Phone conversation'),
    preview:String(thread.preview||thread.messages?.[thread.messages.length-1]?.text||'Open to read from phone'),
    at:Number(thread.at)||0,
    unread:Math.max(0,Number(thread.unread)||0),
    group:!!thread.group,
    address:String(thread.address||'')
  })).filter(row=>row.id);
}

function matches(row){
  if(source!=='all'&&row.source!==source)return false;
  if(filter==='unread'&&!row.unread)return false;
  const term=query.trim().toLowerCase();
  return !term||`${row.title} ${row.preview} ${row.address||''}`.toLowerCase().includes(term);
}

function statusText(){
  const status=D.status();
  if(status.connected)return {
    title:status.name||'Phone connected',
    detail:`Phone is the live message source${status.sourceApp?` · ${status.sourceApp}`:''}`,
    connected:true
  };
  if(status.paired)return {
    title:'Phone paired · waiting for a live response',
    detail:status.error||'Open Phone Mirror on the phone, then refresh.',
    connected:false
  };
  return {
    title:'Device not connected',
    detail:status.error||'Saved customer records stay separate; phone messages remain on the phone.',
    connected:false
  };
}

function sourceLabel(value){return value==='device'?'Device':value==='lotkeys'?'LotKeys':'All';}

function rowHtml(row){
  const icon=row.source==='device'?'📱':row.group?'👥':'💬';
  const badge=row.unread?`<span class="hub2-unread">${row.unread>99?'99+':row.unread}</span>`:'';
  return `<button class="hub2-row" type="button" data-source="${e(row.source)}" data-id="${e(row.id)}">
    <span class="hub2-avatar ${row.source==='device'?'device':''}">${icon}</span>
    <span class="hub2-copy"><strong>${e(row.title)}</strong><small>${e(row.preview)}</small><em>${e(sourceLabel(row.source))}${row.source==='device'?' · phone truth':''}</em></span>
    <span class="hub2-meta">${e(H.timestamp(row.at))}${badge}</span>
  </button>`;
}

async function paintHome(){
  const [lotkeys,device]=await Promise.all([internalRows(),Promise.resolve(deviceRows())]);
  const rows=[...lotkeys,...device].filter(matches).sort((a,b)=>b.at-a.at);
  const status=statusText();
  const clock=clockParts();
  panel.innerHTML=`<div class="hub2-shell">
    <header class="hub2-head">
      <div class="hub2-brand"><img src="./assets/lotkeys-icon-192.png" alt=""><div><strong>LotKeys</strong><small>Hub V2</small></div></div>
      <input class="hub2-search" id="hub2-search" type="search" autocomplete="off" placeholder="Search LotKeys and Device" aria-label="Search Hub" value="${e(query)}">
      <div class="hub2-clock"><strong data-hub2-clock-time>${e(clock.time)}</strong><small data-hub2-clock-date>${e(clock.date)}</small></div>
    </header>
    <nav class="hub2-source-tabs" aria-label="Hub source">
      ${['all','lotkeys','device'].map(value=>`<button class="hub2-tab ${source===value?'active':''}" type="button" data-hub2-source="${value}">${sourceLabel(value)}</button>`).join('')}
    </nav>
    <nav class="hub2-filter-tabs" aria-label="Conversation filter">
      <button class="hub2-tab ${filter==='all'?'active':''}" type="button" data-hub2-filter="all">All</button>
      <button class="hub2-tab ${filter==='unread'?'active':''}" type="button" data-hub2-filter="unread">Unread</button>
    </nav>
    <div class="hub2-status ${status.connected?'connected':''}">
      <span class="hub2-status-dot"></span>
      <span class="hub2-status-copy"><strong>${e(status.title)}</strong><small>${e(status.detail)}</small></span>
      <button type="button" data-hub2-action="device">${status.connected?'Manage':'Connect'}</button>
    </div>
    <main class="hub2-list">
      <div class="hub2-section"><strong>${e(sourceLabel(source))} conversations</strong><small>${rows.length} shown</small></div>
      ${rows.length?rows.map(rowHtml).join(''):`<div class="hub2-empty"><span>${source==='device'?'📱':'💬'}</span><strong>${query?'No matching conversations':source==='device'?'Connect the phone to read messages':'Nothing in this view yet'}</strong><small>${source==='device'?'The Hub does not keep a transcript. Conversations appear only while the paired phone is available.':'LotKeys Chat and live Device conversations meet here without changing Inventory or Listings.'}</small><button class="hub2-btn" type="button" data-hub2-action="${source==='device'?'device':'lotkeys'}">${source==='device'?'Connect phone':'Open LotKeys Chat'}</button></div>`}
    </main>
    <div class="hub2-fab-row"><button class="hub2-fab secondary" type="button" data-hub2-action="refresh" aria-label="Refresh Hub">↻</button><button class="hub2-fab" type="button" data-hub2-action="new" aria-label="New Hub action">＋</button></div>
  </div>`;

  $('#hub2-search',panel).oninput=event=>{query=event.target.value;schedulePaint(80);};
  $$('[data-hub2-source]',panel).forEach(button=>button.onclick=()=>{source=button.dataset.hub2Source;filter='all';schedulePaint();});
  $$('[data-hub2-filter]',panel).forEach(button=>button.onclick=()=>{filter=button.dataset.hub2Filter;schedulePaint();});
  $$('.hub2-row',panel).forEach(button=>button.onclick=()=>openRow(button.dataset.source,button.dataset.id));
  bindActions(panel);
}

function messageHtml(message){
  return `<div class="hub2-message ${message.outgoing?'out':'in'}"><div class="hub2-bubble">${e(message.text||'')}<small>${e(H.timestamp(message.at))}${message.state?` · ${e(message.state)}`:''}</small></div></div>`;
}

async function paintDeviceConversation(){
  const thread=D.get(activeDeviceId);
  if(!thread){activeDeviceId='';return paintHome();}
  const messages=Array.isArray(thread.messages)?thread.messages:[];
  const connected=D.status().connected;
  const draft=drafts.get(thread.id)||'';
  panel.innerHTML=`<div class="hub2-shell">
    <header class="hub2-chat-head">
      <button class="hub2-icon" type="button" data-hub2-action="back" aria-label="Back to Hub">‹</button>
      <div class="hub2-chat-title"><strong>${e(thread.title||thread.address||'Phone conversation')}</strong><small>${e(thread.address||'SMS/MMS from paired phone')}</small></div>
      <button class="hub2-icon" type="button" data-hub2-action="refresh-thread" aria-label="Refresh from phone">↻</button>
    </header>
    <div class="hub2-phone-truth"><strong>Phone is the truth.</strong> This transcript is being read live from the paired phone and is not copied into LotKeys or Google Drive.</div>
    <main class="hub2-messages" id="hub2-messages">
      ${thread.hasMore?'<button class="hub2-btn secondary" type="button" data-hub2-action="older">Load older messages</button>':''}
      ${thread.loading?'<div class="hub2-empty"><span>📱</span><strong>Reading from phone…</strong></div>':messages.length?messages.map(messageHtml).join(''):'<div class="hub2-empty"><span>📱</span><strong>No messages returned</strong><small>The phone may be offline or this conversation may be empty.</small></div>'}
      ${thread.historyError?`<div class="hub2-error">${e(thread.historyError)}</div>`:''}
    </main>
    <form class="hub2-compose" id="hub2-compose">
      <textarea id="hub2-draft" rows="2" maxlength="16000" placeholder="Reply through the phone" ${connected&&thread.canReply&&!thread.group?'':'disabled'}>${e(draft)}</textarea>
      <button class="hub2-btn" type="submit" ${connected&&thread.canReply&&!thread.group?'':'disabled'}>Send</button>
    </form>
  </div>`;
  bindActions(panel);
  const input=$('#hub2-draft',panel);
  if(input)input.oninput=()=>drafts.set(thread.id,input.value);
  const form=$('#hub2-compose',panel);
  if(form)form.onsubmit=async event=>{
    event.preventDefault();
    const value=String(input?.value||'').trim();
    if(!value)return;
    const button=$('button[type="submit"]',form);
    button.disabled=true;
    try{
      const result=await D.send(thread.id,value);
      if(result.ok){drafts.delete(thread.id);input.value='';}
    }catch(error){showInlineError(error.message||error);}
    finally{schedulePaint();}
  };
  requestAnimationFrame(()=>{const box=$('#hub2-messages',panel);if(box)box.scrollTop=box.scrollHeight;});
}

async function openRow(kind,id){
  if(kind==='lotkeys'){
    close();
    await M.open();
    return;
  }
  const thread=D.read(id);
  if(!thread)return;
  activeDeviceId=id;
  await paint();
  D.loadHistory(id).then(()=>schedulePaint()).catch(error=>{showInlineError(error.message||error);schedulePaint();});
}

function showInlineError(message){
  let box=$('.hub2-error',panel);
  if(!box){box=document.createElement('div');box.className='hub2-error';$('.hub2-shell',panel)?.appendChild(box);}
  box.textContent=String(message||'Something needs another try.');
}

async function refresh(){
  try{
    if(D.status().paired){
      await D.resync();
      if(D.status().connected)await D.refreshConversations();
    }else await M.refresh();
  }catch(error){showInlineError(error.message||error);}
  schedulePaint();
}

function bindActions(root){
  $$('[data-hub2-action]',root).forEach(button=>button.onclick=async()=>{
    const action=button.dataset.hub2Action;
    if(action==='device')return deviceDialog();
    if(action==='lotkeys'){close();return M.open();}
    if(action==='refresh'||action==='refresh-thread')return refresh();
    if(action==='new')return source==='device'?deviceDialog():(close(),M.open());
    if(action==='back'){D.unwatch();activeDeviceId='';return schedulePaint();}
    if(action==='older'){
      button.disabled=true;
      try{await D.loadHistory(activeDeviceId,{older:true});}catch(error){showInlineError(error.message||error);}
      return schedulePaint();
    }
  });
}

function dialogFrame(title){
  const dialog=document.createElement('dialog');
  dialog.className='hub2-dialog';
  dialog.innerHTML=`<div class="hub2-dialog-body"><div class="hub2-dialog-head"><h2>${e(title)}</h2><button class="hub2-icon" type="button" aria-label="Close">×</button></div><div data-hub2-dialog-content></div></div>`;
  document.body.appendChild(dialog);
  $('.hub2-dialog-head button',dialog).onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.showModal();
  return dialog;
}

async function deviceDialog(){
  const dialog=dialogFrame('Device connection');
  const content=$('[data-hub2-dialog-content]',dialog);
  let saved={saved:false,configured:false};
  try{saved=await D.savedInfo();}catch{}
  const status=D.status();
  content.innerHTML=`
    ${saved.saved?`<div class="hub2-saved"><strong>Previously used: ${e(saved.label||'My phone')}</strong><small>Pairing is encrypted with your LotKeys PIN/password. Messages are not saved with it.</small></div><label class="hub2-field">LotKeys PIN / password<input id="hub2-pin" type="password" autocomplete="current-password" placeholder="Unlock saved Device access"></label><div class="hub2-actions"><button class="hub2-btn" id="hub2-unlock" type="button">Unlock & reconnect</button><button class="hub2-btn secondary" id="hub2-forget" type="button">Forget saved pairing</button></div>`:''}
    <details ${saved.saved?'':'open'}><summary><strong>Connect another device / advanced setup</strong></summary>
      <label class="hub2-field">Hub pairing code<textarea id="hub2-code" spellcheck="false" autocomplete="off" placeholder='{ "url": "https://…", "room": "…", "token": "…", "key": "…" }'></textarea></label>
      <label class="hub2-field">Phone label<input id="hub2-label" value="My phone" maxlength="80"></label>
      <label class="hub2-field">PIN/password — only required to remember pairing<input id="hub2-save-pin" type="password" autocomplete="current-password"></label>
      <div class="hub2-actions"><button class="hub2-btn secondary" id="hub2-session" type="button">Connect this session</button><button class="hub2-btn" id="hub2-save" type="button">Save & connect</button></div>
    </details>
    ${status.paired?`<div class="hub2-actions"><button class="hub2-btn secondary" id="hub2-resync" type="button">Refresh phone</button><button class="hub2-btn danger" id="hub2-disconnect" type="button">Disconnect session</button></div>`:''}
    <p class="hub2-note">The phone owns SMS/MMS history and sending. If the phone or relay is unavailable, Device conversations disappear from Hub until the live connection returns. LotKeys Chat remains available separately.</p>
    <div class="hub2-error" id="hub2-dialog-error"></div>`;
  const error=$('#hub2-dialog-error',dialog);
  const run=async(button,job)=>{
    button.disabled=true;
    error.textContent='';
    try{await I.identity();await job();dialog.close();schedulePaint();}
    catch(reason){error.textContent=String(reason?.message||reason);button.disabled=false;}
  };
  $('#hub2-unlock',dialog)?.addEventListener('click',event=>run(event.currentTarget,()=>D.unlockSaved($('#hub2-pin',dialog).value)));
  $('#hub2-forget',dialog)?.addEventListener('click',event=>run(event.currentTarget,()=>D.forgetSaved()));
  $('#hub2-session',dialog)?.addEventListener('click',event=>run(event.currentTarget,()=>D.connect($('#hub2-code',dialog).value,{save:false,label:$('#hub2-label',dialog).value})));
  $('#hub2-save',dialog)?.addEventListener('click',event=>run(event.currentTarget,()=>D.connect($('#hub2-code',dialog).value,{save:true,pin:$('#hub2-save-pin',dialog).value,label:$('#hub2-label',dialog).value})));
  $('#hub2-resync',dialog)?.addEventListener('click',event=>run(event.currentTarget,async()=>{await D.resync();if(D.status().connected)await D.refreshConversations();}));
  $('#hub2-disconnect',dialog)?.addEventListener('click',()=>{D.disconnect();dialog.close();schedulePaint();});
}

async function paint(){
  if(!isOpen())return;
  if(painting){paintAgain=true;return;}
  painting=true;
  try{
    if(activeDeviceId)await paintDeviceConversation();
    else await paintHome();
  }finally{
    painting=false;
    if(paintAgain){paintAgain=false;schedulePaint();}
  }
}

function schedulePaint(delay=0){
  clearTimeout(paintTimer);
  paintTimer=setTimeout(()=>paint().catch(error=>showInlineError(error.message||error)),delay);
}

async function open(){
  await I.identity();
  M.close();
  ensurePanel();
  panel.style.setProperty('--hub2-nav-height',`${navHeight()}px`);
  panel.hidden=false;
  document.body.classList.add('lotkeys-hub-v2-open');
  setNavActive(true);
  activeDeviceId='';
  startClock();
  window.dispatchEvent(new CustomEvent('lotkeys-hub-v2-open'));
  await paint();
}

function close(){
  clearTimeout(paintTimer);
  D.unwatch();
  activeDeviceId='';
  if(panel)panel.hidden=true;
  document.body.classList.remove('lotkeys-hub-v2-open');
  setNavActive(false);
  stopClock();
}

function init(){
  ensurePanel();
  const button=$('#chat-nav-btn');
  if(button){
    const label=$('small',button);
    if(label)label.textContent='Hub';
    button.title='Hub · LotKeys Chat and live phone conversations';
    button.setAttribute('aria-label','Open Hub');
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      open().catch(error=>{console.error(error);alert(error.message||error);});
    },true);
  }
  $$('.bottom-nav .nav-btn[data-route]').forEach(route=>route.addEventListener('click',()=>{if(isOpen())close();},true));
  window.addEventListener('lotkeys-device',event=>{
    if(!isOpen())return;
    const kind=String(event.detail?.kind||'');
    // A healthy transport heartbeat must not steal focus from an active reply draft.
    if(activeDeviceId&&kind==='status'&&D.status().connected)return;
    schedulePaint(60);
  });
  window.addEventListener('pagehide',close);
}

window.LotKeysHubV2={open,close,refresh,version:'0.9.5.0'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
