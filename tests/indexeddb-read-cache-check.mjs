import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=source.indexOf('const DB = (() => {');
const end=source.indexOf('\n})();',start);
if(start<0||end<0)throw new Error('Could not locate the IndexedDB wrapper in index.html');
const dbSource=`${source.slice(start,end+6)}\nDB;`;

const stores=new Map();
const names=['vehicles','listings','locations','analytics','settings','requestQueue'];
for(const name of names)stores.set(name,new Map());
const firstVehicle={id:'VP-1',name:'Cached Vehicle',syncStatus:'synced',photos:[{id:'P-1',blob:new Blob(['large-media-placeholder'])}]};
stores.get('vehicles').set(firstVehicle.id,firstVehicle);

const calls={getAll:0,get:0,index:0,put:0};
let releasePut=null;
const request=work=>{
  const req={result:undefined,error:null,onsuccess:null,onerror:null};
  queueMicrotask(()=>{try{req.result=work();req.onsuccess?.()}catch(error){req.error=error;req.onerror?.()}});
  return req;
};
const objectStore=name=>({
  getAll(){calls.getAll++;return request(()=>[...stores.get(name).values()])},
  get(id){calls.get++;return request(()=>stores.get(name).get(id))},
  put(value){
    calls.put++;
    const req={result:undefined,error:null,onsuccess:null,onerror:null};
    releasePut=()=>{stores.get(name).set(value.id,value);req.result=value.id;req.onsuccess?.()};
    return req;
  },
  delete(id){return request(()=>stores.get(name).delete(id))},
  clear(){return request(()=>stores.get(name).clear())},
  index(field){return{getAll(key){calls.index++;return request(()=>[...stores.get(name).values()].filter(row=>row?.[field]===key))}}}
});
const database={
  objectStoreNames:{contains:name=>stores.has(name)},
  createObjectStore:name=>objectStore(name),
  transaction:name=>({objectStore:()=>objectStore(name)})
};
const indexedDB={open(){
  const req={result:database,error:null,onupgradeneeded:null,onsuccess:null,onerror:null,onblocked:null};
  queueMicrotask(()=>req.onsuccess?.());return req;
}};
const storage=new Map();
const localStorage={getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const context={window:{indexedDB},indexedDB,localStorage,console,Blob,queueMicrotask,setTimeout,clearTimeout};
const DB=vm.runInNewContext(dbSource,context);

const first=await DB.all('vehicles');
const second=await DB.all('vehicles');
if(calls.getAll!==1)throw new Error(`Expected one full IndexedDB clone, received ${calls.getAll}`);
if(first[0]!==second[0])throw new Error('The in-session cache must reuse the first complete record object');

const byId=await DB.get('vehicles','VP-1');
if(byId!==first[0]||calls.get!==0)throw new Error('A hydrated store must serve individual reads without another IndexedDB clone');

const pending=DB.put('vehicles',{...first[0],name:'Updated Vehicle'});
await new Promise(resolve=>setTimeout(resolve,0));
const whileWriting=await Promise.race([DB.all('vehicles'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Cached read waited behind a write')),50))]);
if(whileWriting.length!==1)throw new Error('Cached store contents disappeared during a pending write');
releasePut?.();await pending;
const after=await DB.all('vehicles');
if(after[0].name!=='Updated Vehicle')throw new Error('Successful writes must update the in-session read cache');

await DB.byIndex('vehicles','syncStatus','synced');
if(calls.index!==0)throw new Error('A hydrated store must serve indexed filters from memory');

const beforeConcurrent=calls.getAll;
await Promise.all([DB.all('listings'),DB.all('listings'),DB.all('listings')]);
if(calls.getAll!==beforeConcurrent+1)throw new Error('Concurrent first reads must share one IndexedDB getAll request');

console.log('IndexedDB read-cache checks passed: one full clone per store, cached navigation reads, and write-through updates.');
