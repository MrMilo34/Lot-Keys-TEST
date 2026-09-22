import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('index.html','utf8');
const start=source.indexOf('async function apiFetch('),end=source.indexOf('async function fetchFileBlob(',start);
assert.ok(start>=0&&end>start,'apiFetch implementation is missing');
const implementation=source.slice(start,end);

function abortError(){const error=new Error('aborted');error.name='AbortError';return error}
function response({status=200,type='application/json',json={ok:true},text='' }={}){
  return {status,ok:status>=200&&status<300,headers:{get:name=>name.toLowerCase()==='content-type'?type:''},json:async()=>json,text:async()=>text};
}
function harness(fetchImpl,{accelerate=true}={}){
  let timerCount=0;
  const shortTimeout=(callback,delay)=>{timerCount++;return setTimeout(callback,accelerate&&delay===30000?8:delay)};
  const factory=new Function('authorize','Headers','AbortController','setTimeout','clearTimeout','fetch','recoverAuthorizationAfter401','clearSessionAuthorization','authRequiredError',`${implementation};return apiFetch`);
  const apiFetch=factory(async()=>'test-token',Headers,AbortController,shortTimeout,clearTimeout,fetchImpl,async()=>{},()=>{},()=>new Error('auth required'));
  return {apiFetch,timerCount:()=>timerCount};
}

{
  const {apiFetch}=harness((url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(abortError()),{once:true})));
  await assert.rejects(apiFetch('https://example.test/hung-headers'),error=>error?.code==='DRIVE_TIMEOUT'&&error?.name==='TimeoutError');
}

{
  let readSignal=null;
  const {apiFetch}=harness(async(url,options)=>{
    readSignal=options.signal;
    return {status:200,ok:true,headers:{get:()=> 'application/json'},json:()=>new Promise((resolve,reject)=>readSignal.addEventListener('abort',()=>reject(abortError()),{once:true})),text:async()=>''};
  });
  await assert.rejects(apiFetch('https://example.test/hung-body'),error=>error?.code==='DRIVE_TIMEOUT'&&error?.name==='TimeoutError');
  assert.ok(readSignal?.aborted,'the GET response body was not aborted');
}

{
  let sawSignal=false;
  const {apiFetch,timerCount}=harness(async(url,options)=>{sawSignal=!!options.signal;return response({json:{healthy:true}})});
  assert.deepEqual(await apiFetch('https://example.test/healthy'),{healthy:true});
  assert.equal(sawSignal,true,'a normal GET did not receive the read timeout signal');
  assert.equal(timerCount(),1,'a normal GET did not create exactly one timeout');
}

{
  let sawSignal=false;
  const {apiFetch,timerCount}=harness(async(url,options)=>{sawSignal=!!options.signal;return response({status:204,type:''})});
  assert.equal(await apiFetch('https://example.test/write',{method:'POST',body:'{}'}),null);
  assert.equal(sawSignal,false,'a Drive write received an ambiguous automatic timeout');
  assert.equal(timerCount(),0,'a Drive write created a timeout timer');
}

console.log('Drive read timeout checks passed: headers and bodies abort cleanly, while writes remain exempt.');
