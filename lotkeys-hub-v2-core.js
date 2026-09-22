/* LotKeys Hub V2 — pure helpers only. No app database, Drive, or routing access. */
(()=>{
'use strict';

const text=value=>String(value??'').trim();
const uid=(prefix='HUB')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const escape=value=>String(value??'').replace(/[&<>'"]/g,char=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  "'":'&#39;',
  '"':'&quot;'
}[char]));
const timestamp=value=>{
  const date=new Date(value||0);
  if(!Number.isFinite(date.getTime()))return '';
  const today=new Date();
  return date.toDateString()===today.toDateString()
    ? date.toLocaleTimeString('en-CA',{hour:'numeric',minute:'2-digit',hour12:true})
    : date.toLocaleDateString('en-CA',{month:'short',day:'numeric'});
};
const phone=value=>{
  const raw=text(value);
  if(!raw)return '';
  const digits=raw.replace(/\D/g,'').slice(0,15);
  return digits?(raw.startsWith('+')?'+':'')+digits:'';
};
const internalRows=value=>(Array.isArray(value)?value:[]).map(row=>{
  const messages=Array.isArray(row?.messages)?row.messages:[];
  const last=messages[messages.length-1]||{};
  return {
    id:String(row?.id||''),
    source:'lotkeys',
    title:String(row?.partyName||row?.peerDisplayName||row?.peerUserName||row?.peerPhone||'LotKeys conversation'),
    preview:String(last.text||'No messages yet'),
    at:Date.parse(last.createdAt||row?.updatedAt||row?.createdAt||0)||0,
    unread:Math.max(0,Number(row?.unread)||0),
    group:row?.type==='party'
  };
}).filter(row=>row.id);

window.LotKeysHubV2Core={text,uid,escape,timestamp,phone,internalRows};
})();
