/* LotKeys Hub V0.9.4.93 — pure models, filtering and appointment utilities. */
(function(root){
'use strict';
const uid=(prefix='H')=>prefix+'-'+(globalThis.crypto?.randomUUID?.()||Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join(''));
const text=x=>String(x??'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color=x=>/^#[0-9a-f]{6}$/i.test(text(x))?text(x):'';
function phone(x){let s=text(x).replace(/^tel:/i,'').replace(/(?:ext\.?|x)\s*\d+$/i,'').replace(/[^+\d]/g,'');if(s.startsWith('00'))s='+'+s.slice(2);let d=s.replace(/\D/g,'');if(d.length===10)return '+1'+d;if(d.length===11&&d[0]==='1')return '+'+d;return s.startsWith('+')&&d.length>=7&&d.length<=15?'+'+d:d;}
function validPhone(x){return /^\+?\d{7,15}$/.test(phone(x));}
function primary(c){return (c?.fields||[]).find(f=>f.kind==='phone'&&f.primary)||(c?.fields||[]).find(f=>f.kind==='phone')||null;}
function nextLabel(fields,kind,label){const taken=new Set(fields.map(f=>text(f.label).toLowerCase()));if(!taken.has(label.toLowerCase()))return label;let n=2;while(taken.has((label+' '+n).toLowerCase()))n++;return label+' '+n;}
const LABELS={phone:'Cellphone',email:'Email',alias:'Alias',birthday:'Birthday',address:'Address',text:'Custom field'};
function field(fields,kind='text',base=''){return {id:uid('F'),kind,label:nextLabel(fields,kind,base||LABELS[kind]||'Field'),value:'',...(kind==='phone'?{phoneType:'cell',primary:!fields.some(f=>f.kind==='phone')}:{} )};}
function validateContact(c){if(!text(c.name))throw Error('Enter a contact name.');const fs=c.fields||[],ps=fs.filter(f=>f.kind==='phone');for(const f of ps){if(text(f.value)&&!validPhone(f.value))throw Error('Check '+(f.label||'phone number')+'.');}if(ps.length&&ps.filter(f=>f.primary).length!==1)throw Error('Select one primary number.');if(ps.length&&!validPhone(ps.find(f=>f.primary)?.value))throw Error('The primary phone number must be valid.');for(const f of fs){if(f.kind==='email'&&text(f.value)&&! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value))throw Error('Check '+(f.label||'email')+'.');}return c;}
function contactSearch(c){return [c.name,...(c.fields||[]).flatMap(f=>[f.label,f.value,...(f.kind==='phone'?[phone(f.value)]:[])])].join(' ').toLowerCase();}
function matches(c,q){q=text(q).toLowerCase();if(!q)return true;if(contactSearch(c).includes(q))return true;const digits=q.replace(/\D/g,'');return digits.length>=3&&(c.fields||[]).some(f=>f.kind==='phone'&&phone(f.value).replace(/\D/g,'').includes(digits));}
function conversationMatch(r,q){return matches(r.contact||{name:r.title,fields:[{kind:'phone',value:r.phone||r.address||''},{kind:'email',value:r.email||''}]},q)||text(r.title+' '+(r.preview||'')).toLowerCase().includes(text(q).toLowerCase());}
const CUSTOMER_STATES=[['active','Active'],['followup','Follow-up'],['paused','Paused'],['outofmarket','Out of market'],['archived','Archived']];
function customerState(c){return CUSTOMER_STATES.some(([id])=>id===c?.lifecycle)?c.lifecycle:'active';}
function stateLabel(c){return CUSTOMER_STATES.find(([id])=>id===customerState(c))[1];}
function filtered(rows,{scope='all',filter='all',category='',categories=[],query='',customerState:stage='current'}={}){
  const wanted=Array.isArray(categories)?categories.filter(Boolean):[];
  return rows.filter(r=>{
    if(scope!=='all'&&r.source!==scope)return false;
    if(r.source==='device'){
      const assigned=r.contact?.categoryId||'__uncategorized';
      if(wanted.length&&!wanted.includes(assigned))return false;
      if(!wanted.length&&category&&assigned!==category)return false;
      const state=customerState(r.contact);
      if(stage==='current'&&state==='archived')return false;
      if(!['current','all'].includes(stage)&&state!==stage)return false;
    }else if(wanted.length||category)return false;
    return (filter!=='unread'||r.unread>0)&&(filter!=='groups'||r.group===true)&&(filter!=='contacts'||r.favorite||r.contact)&&(filter!=='saved'||!!r.contact)&&conversationMatch(r,query);
  }).sort((a,b)=>(b.at||0)-(a.at||0)||text(a.title).localeCompare(text(b.title)));
}
function normalizeNeeds(n={}){
  const out={};for(const k of ['purchaseMethod','bodyStyle','carfaxPreference','reason','timeframe','features'])out[k]=text(n[k]).slice(0,1000);
  for(const k of ['maxPrice','maxOdometerKm']){const raw=text(n[k]).replace(/,/g,'');if(raw==='')out[k]='';else{const value=Number(raw);if(!Number.isFinite(value)||value<0)throw Error('Enter a valid non-negative '+(k==='maxPrice'?'budget':'kilometre limit')+'.');out[k]=value;}}
  return out;
}
function localDay(d=new Date()){const x=d instanceof Date?d:new Date(d);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-');}
function atLocal(date,time){const d=new Date(date+'T'+time+':00');if(!Number.isFinite(d.getTime())||localDay(d)!==date||String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')!==time)throw Error('That local date/time does not exist. Check the date and daylight-saving change.');return d.toISOString();}
function agenda(rows,date){return rows.filter(a=>localDay(a.start)===date&&!a.deleted).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));}
function overlap(rows,a){return rows.filter(b=>b.id!==a.id&&!b.deleted&&!['Cancelled','Completed','No show'].includes(b.status)&&Date.parse(a.start)<Date.parse(b.end)&&Date.parse(a.end)>Date.parse(b.start));}
function monthCells(d){d=new Date(d.getFullYear(),d.getMonth(),1,12);const begin=new Date(d);begin.setDate(begin.getDate()-begin.getDay());return Array.from({length:42},(_,i)=>{const day=new Date(begin);day.setDate(begin.getDate()+i);return day;});}
function ics(a){const clean=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');const stamp=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const encoder=new TextEncoder(),fold=line=>{let out='',part='',count=0;for(const ch of line){const n=encoder.encode(ch).length;if(count+n>75){out+=part+'\r\n';part=' ';count=1;}part+=ch;count+=n;}return out+part;};return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LotKeys//Hub//EN','BEGIN:VEVENT','UID:'+String(a.id||'appointment').replace(/[^A-Za-z0-9_-]/g,'_')+'@lot-keys.ca','DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(a.start),'DTEND:'+stamp(a.end),'SUMMARY:'+clean(a.title),'LOCATION:'+clean(a.location),'DESCRIPTION:'+clean(a.vehicleLabel||''),'END:VEVENT','END:VCALENDAR',''].map(fold).join('\r\n');}
const questions=[
 ['purchaseMethod','Cash or financing','Are you planning to pay cash, or would you like financing options?'],
 ['budget','Budget / payment target','What price range or payment range would feel comfortable for you?'],
 ['downPayment','Down payment','Have you thought about an amount you would like to put down?'],
 ['reason','Reason for buying','What would you like your next vehicle to do better than your current one?'],
 ['timeframe','Purchase timeframe','When would you ideally like to have the next vehicle?'],
 ['searchDuration','Time spent searching','How long have you been looking, and what have you already tried?'],
 ['trade','Trade-in & details','Are you replacing a vehicle? What is the year, make, model and mileage?'],
 ['decisionMakers','People involved','Will anyone else want to see or discuss the vehicle before you decide?'],
 ['dealType','In person or remote','Would you prefer to visit us or work through the details by phone?'],
 ['coApplicant','Co-applicant discussion','Would anyone else be applying for financing with you?'],
 ['features','Important features','Which features are must-haves for you?']
];
// Local, conservative suggestions; never credit decisions or automatic CRM writes.
function suggestNotes(input){const s=text(input).slice(0,12000);if(/\b(?:SIN|social insurance|social security|licen[cs]e\s*(?:number|#))\b/i.test(s))return [];const out=[];const add=(key,value,m)=>{if(m&&!/\b(?:not|don't|won't|no longer|maybe|if|isn't|wasn't|without)\b/i.test(s.slice(Math.max(0,m.index-50),m.index+m[0].length)))out.push({key,value,source:m[0].slice(0,160)});};let m=s.match(/\b(?:pay(?:ing)?|buy(?:ing)?|purchase)\s+(?:with |in |by )?cash\b/i);add('purchaseMethod','Cash',m);m=s.match(/\b(?:want|need|using|use|choose|interested in)\s+(?:to |the )?financ(?:ing|e)\b/i);add('purchaseMethod','Financing',m);m=s.match(/\b(?:down payment|money down|put down)\s*(?:is |of |about |would be )?\$?([\d,]+(?:\.\d{1,2})?)\b/i)||s.match(/\$([\d,]+(?:\.\d{1,2})?)\s*(?:as a )?down payment\b/i);add('downPayment',m?'$'+m[1]:'',m);m=s.match(/\b(?:my |our )?budget\s*(?:is|of|around|about|:)\s*\$?([\d,]+(?:\.\d{1,2})?)\b/i);add('budget',m?'$'+m[1]:'',m);return out.filter((x,i)=>out.findIndex(y=>y.key===x.key)===i);}
const api={CUSTOMER_STATES,customerState,stateLabel,normalizeNeeds,uid,text,esc,color,phone,validPhone,primary,nextLabel,field,validateContact,matches,filtered,localDay,atLocal,agenda,overlap,monthCells,ics,questions,suggestNotes};root.LotKeysHubCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
