'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Deferred=require('../lotkeys-deferred-save.js'),Core=require('../lotkeys-transfer-core.js'),Native=require('../lotkeys-native-transfers.js');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const scope={account:'blair@example.test',store:'store-folder-123',record:'vehicle',revision:'17'};
function vehicle(){return{id:'vehicle',name:'2021 Jeep',year:'2021',make:'Jeep',model:'Grand Cherokee',stock:'DT3526A',updatedAt:17,carfaxOneOwner:true,photos:[{id:'p1',name:'original.jpg',blob:new Blob(['original'])}],videos:[],attachments:[],drive:{profileFolderId:'profile-folder-123',sharedFolderId:'shared-folder-123',adminSheetId:'sheet-file-123',photosFolderId:'photos-folder-123',videosFolderId:'videos-folder-123',documentsFolderId:'docs-folder-123'}};}
test('all media and the PDF get stable IDs before the foundation sheet is written',()=>{
  const v=vehicle(),analysis=Deferred.analyze(v),assets=Deferred.assign(v,analysis,['photo-reserved-123','pdf-reserved-123']);assert.equal(v.photos[0].driveFileId,'photo-reserved-123');assert.equal(v.drive.directoryPdfId,'pdf-reserved-123');assert.equal(assets[0].driveId,'photo-reserved-123');assert.equal(v.drive.nativeFinalizationPending,true);
});
test('the retained plan includes the complete PDF work, unchanged links/badges, media order and revision',()=>{
  const v=vehicle(),assets=Deferred.assign(v,Deferred.analyze(v),['photo-reserved-123','pdf-reserved-123']),op=Deferred.directory(v,{storeName:'Legacy Wetaskiwin'},'template-file-123','fp','https://mrmilo34.github.io/Lot-Keys-TEST/assets/'),plan=Deferred.plan(v,scope,assets,op,'index-file-123','2026-11-07T12:00:00Z');
  assert.equal(plan.version,2);assert.equal(plan.finalizers[0].type,'vehicle-directory');assert.equal(plan.finalizers[1].type,'vehicle-cover');assert.equal(plan.finalizers[1].assetKey,'photo:p1');assert.equal(plan.inventory[0].id,'p1');assert.equal(op.values['{{STOCK_NUMBER}}'],'DT3526A');assert.equal(op.badges[0].enabled,true);assert.equal(op.badges[2].height,41);assert.ok(op.links.some(row=>row[1].includes('photos-folder-123')));
});
for(const [name,files] of [['removal',[{id:'extra-drive-123',name:'other.jpg'}]],['rename',[{id:'existing-file-123',name:'02 - wrong.jpg',appProperties:{lotkeysAssetId:'p1'}}]]])test('an existing '+name+' uses established reconciliation instead of native deletion',()=>{assert.equal(Deferred.analyze(vehicle(),{photos:files}).eligible,false);});
test('missing source bytes and incomplete reserved IDs cannot be accepted',()=>{
  const v=vehicle();delete v.photos[0].blob;assert.throws(()=>Deferred.analyze(v),/original/);const ready=vehicle();assert.throws(()=>Deferred.assign(ready,Deferred.analyze(ready),['one-id-only']),/reserve/);
});
test('v2 staging uses bounded 1 MiB packets, verifies every byte, and only then allows switching',async()=>{
  const bytes=new Blob([new Uint8Array(1500000)]),asset={key:'photo:p',parent:'photos-folder-123',name:'photo.jpg',size:bytes.size},plan={...Core.batch(scope,[asset]),version:2,stagingChunkBytes:1048576};let staged=0;const chunks=[],progress=[];
  await Native.handoff(plan,new Map([[asset.key,bytes]]),{phone:{uploadCall:async(op,input)=>{if(op==='prepare')return{...plan,id:'batch',state:'staging',assets:[{...asset,staged:0}]};if(op==='chunk'){const size=Buffer.from(input.base64,'base64').length;chunks.push(size);assert.equal(input.offset,staged);staged+=size;return{staged};}assert.equal(op,'commit');assert.equal(staged,bytes.size);return{...plan,state:'queued'};}},onProgress:value=>progress.push(value)});
  assert.deepEqual(chunks,[1048576,451424]);assert.equal(progress.at(-1).version,2);assert.match(Native.presentation(progress.at(-1)).message,/Ready to switch apps/);assert.equal(Native.presentation(progress[0]).backgroundReady,false);
});
test('a restarted v2 job retains the larger packet bound and finishing plan without staging again',async()=>{
  const plan={...Core.batch(scope,[]),version:2,finalizers:[{type:'vehicle-directory',pdfId:'pdf-reserved-123'}]},calls=[];await Native.handoff(plan,new Map(),{phone:{uploadCall:async op=>{calls.push(op);return{...plan,id:'batch',state:'queued'};}}});assert.deepEqual(calls,['prepare','commit']);
});
test('a refresh cannot replace a native pending row or undo a completed native finalization',()=>{
  const pending={id:'v',updatedAt:17,drive:{nativeFinalizationPending:true}},complete={id:'v',updatedAt:17,drive:{nativeFinalizationPending:false,lastDirectoryFingerprint:'done'}};
  assert.deepEqual(Deferred.mergeIndex([{id:'v',updatedAt:100,drive:{}}],[pending]),[pending]);assert.deepEqual(Deferred.mergeIndex([pending],[complete]),[complete]);
  assert.deepEqual(Deferred.mergeIndex([],[complete],{retainedIds:['v']}),[complete]);assert.deepEqual(Deferred.mergeIndex([pending],[pending],{removeId:'v'}),[]);
});
test('a current explicit edit can supersede its old pending index row without dropping other jobs',()=>{
  const next={id:'v',updatedAt:200,drive:{nativeFinalizationPending:true}},other={id:'other',drive:{nativeFinalizationPending:true}};const merged=Deferred.mergeIndex([next],[{id:'v',updatedAt:17,drive:{nativeFinalizationPending:true}},other],{recordId:'v'});assert.deepEqual(merged,[next,other]);
});
function preparationFixture(capable=true){
  const v=vehicle();v.drive={};const original=structuredClone(v),events=[],saved=[];let pendingChildren=0,release;const allChildren=new Promise(resolve=>{release=resolve;});
  const ctx={window:{LotKeysDeferredSave:Deferred,LotKeysTransferCore:Core,LotKeysPhone:{uploadCapabilities:async()=>({uploadAccount:scope.account,capabilities:{deferredVehicleFinalization:capable}})}},Blob,URL,Date,Map,Promise,location:{href:'https://mrmilo34.github.io/Lot-Keys-TEST/'},FOLDER_MIME:'folder',DB:{get:async()=>original},setting:async key=>({currentAccountEmail:scope.account,storeFolderId:scope.store,directoryTemplateFileId:'template-file-123'}[key]),findChildByAppProperty:async()=>null,createFolder:async()=>({id:'profile-folder-123'}),createSpreadsheet:async()=>({id:'sheet-file-123'}),
    ensureFolder:async(_,name)=>{events.push('folder:'+name);if(name!=='Shared'){pendingChildren++;if(pendingChildren===3)release();await allChildren;}return{id:name.toLowerCase()+'-folder-123'};},saveVehicleSyncState:(row)=>saved.push(structuredClone(row)),listFiles:async()=>[],qEscape:value=>value,apiFetch:async()=>({ids:['photo-reserved-123','pdf-reserved-123']}),directoryFingerprint:()=> 'fp',sheetFingerprint:()=> 'sf',writeVehicleSheet:async(_,row)=>{events.push('sheet');assert.equal(row.photos[0].driveFileId,'photo-reserved-123');row.drive.lastSheetUpdatedAt='2026-11-07T12:00:00Z';},updateInventoryIndex:async()=>events.push('index'),findInventoryIndex:async()=>({id:'index-file-123'})};
  vm.createContext(ctx);const start=html.indexOf('  async function prepareDeferredVehicleSave(');vm.runInContext(html.slice(start,html.indexOf('  async function finishDeferredVehicleSave(',start)),ctx);return{v,ctx,events,saved};
}
test('the actual foundation overlaps child folders and saves essential data and a durable work plan without rendering a PDF',async()=>{
  const f=preparationFixture();assert.equal(await f.ctx.prepareDeferredVehicleSave(f.v,{rootId:scope.store,inventoryId:'inventory-folder-123'},{},()=>{}),true);assert.deepEqual(f.events,['folder:Shared','folder:Photos','folder:Videos','folder:Documents','sheet','index']);assert.equal(f.saved.at(-1).drive.nativeTransfer.plan.version,2);assert.equal(f.saved.at(-1).drive.nativeTransfer.id,'');
});
test('the old connector leaves the complete working browser path available',async()=>{const f=preparationFixture(false);assert.equal(await f.ctx.prepareDeferredVehicleSave(f.v,{rootId:scope.store},{},()=>{}),false);assert.deepEqual(f.events,[]);});
test('the foundation rejects a real Store switch before creating folders',async()=>{const f=preparationFixture();f.ctx.setting=async key=>({currentAccountEmail:scope.account,storeFolderId:'different-store-123',directoryTemplateFileId:'template-file-123'}[key]);await assert.rejects(f.ctx.prepareDeferredVehicleSave(f.v,{rootId:scope.store},{},()=>{}),/Store or Vehicle edit changed/);assert.deepEqual(f.events,[]);});
