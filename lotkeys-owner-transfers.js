(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./lotkeys-transfer-core.js'),require('./lotkeys-native-transfers.js'),require('./lotkeys-submission-isolation.js'));
  else root.LotKeysOwnerTransfers=factory(root.LotKeysTransferCore,root.LotKeysNativeTransfers,root.LotKeysSubmissionIsolation);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core,Native,Isolation){
  'use strict';
  const ID=/^[A-Za-z0-9_-]{8,200}$/;
  const kinds=[['photos','photo'],['videos','video'],['attachments','document']];
  const plural=kind=>kind==='photo'?'photos':kind==='video'?'videos':'documents';
  function failure(message,code='NATIVE_OWNER_SUBMISSION'){return Object.assign(Error(message),{nativeTransfer:true,code});}
  function sameOwner(a,b){return a&&b&&a.account===b.account&&a.store===b.store&&a.record===b.record;}
  function sourceMap(v){const map=new Map();for(const [field,kind]of kinds)for(const item of v[field]||[])if(item.blob instanceof Blob)map.set(kind+':'+item.id,item.blob);return map;}
  function snapshot(v){
    const out={...v,drive:{...(v.drive||{})}};
    for(const field of ['nativeTransfer','lastNativeSubmission','previousNativeSubmission'])delete out.drive[field];
    for(const field of ['mediaUpload','localRecoverySnapshot','ownerSubmissionDraft'])delete out[field];
    for(const [field]of kinds)out[field]=(v[field]||[]).map(item=>{const row={...item};delete row.blob;if(String(row.url||'').startsWith('blob:'))delete row.url;return row;});
    return JSON.parse(JSON.stringify(out));
  }
  function plan({vehicle,request,scope,workspace,assets,media,fileId}){
    scope=Core.context(scope);
    if(!ID.test(fileId)||!ID.test(workspace.pendingFolderId)||!ID.test(workspace.vehicleFolderId))throw failure('The private submission workspace is incomplete.');
    if(String(request.userEmail||'').toLowerCase()!==scope.account||String(request.vehicleId)!==scope.record||String(vehicle.updatedAt||0)!==scope.revision)throw failure('The submission identity or Vehicle edit changed.','NATIVE_CONTEXT_MISMATCH');
    const create=!vehicle.drive?.profileFolderId,base=create?null:vehicle.ownerSubmissionBaseRevision;
    if(!create&&(!Number.isSafeInteger(base)||base<=0))throw failure('Refresh this Vehicle before editing it so background posting can protect its Inventory revision.');
    const body=JSON.parse(JSON.stringify({...request,schemaVersion:3,app:'LotKeys',recordType:'vehicleRequest',vehicleId:scope.record,vehicleName:String(vehicle.name||scope.record),type:create?'vehicle-native-create':'vehicle-native-owner-update',status:'pending',updatedAt:new Date().toISOString(),userEmail:scope.account,context:{...(request.context||{}),rootId:scope.store,email:scope.account,revision:scope.revision},nativeSubmissionGuard:{version:1,baseRevision:base},vehicle:snapshot(vehicle),media,folders:{...(request.folders||{}),moreVehicleFolderId:workspace.vehicleFolderId,moreVehicleFolderUrl:workspace.vehicleFolderUrl||'',moreMediaFolderId:workspace.mediaFolderId||'',moreMediaFolderUrl:workspace.mediaFolderUrl||'',pendingFolderId:workspace.pendingFolderId}}));
    const value=Core.batch(scope,assets,[{type:'vehicle-submission',fileId,parentId:workspace.pendingFolderId,request:body}]);
    value.version=3;value.key=JSON.stringify(['owner-submission',Core.key(scope),request.id]);value.stagingChunkBytes=1024*1024;
    const referenced=new Set();
    for(const [field,kind]of [['photos','photo'],['videos','video'],['documents','document']]){
      if(!Array.isArray(body.media[field]))throw failure('The selected media plan is incomplete.');
      const seen=new Set();
      for(const item of body.media[field]){
        if(!item.id||seen.has(item.id))throw failure('Selected media identifiers must be unique.');seen.add(item.id);
        if(!item.assetKey){if(!ID.test(item.driveFileId))throw failure('A selected photo, video or document has no saved original.');continue;}
        const asset=value.assets.find(row=>row.key===item.assetKey),p=asset?.properties;
        if(!asset||referenced.has(item.assetKey)||item.driveFileId||p?.lotkeysAssetId!==item.id||p?.lotkeysAssetKind!==kind||p?.lotkeysContributionId!==body.id||p?.lotkeysVehicleId!==scope.record||p?.lotkeysRole!=='vehicleContributionAsset'||item.parentFolderId!==asset.parent)throw failure('An original does not match its frozen submission.');
        referenced.add(item.assetKey);
      }
    }
    if(referenced.size!==value.assets.length)throw failure('Every retained original must be included in the submission.');
    if(JSON.stringify(value).length>1024*1024)throw failure('This submission is too large for one background save.');
    return value;
  }
  function completed(receipt,snapshot){
    Native.verifyHandoff(snapshot,receipt.plan,receipt.id,true);
    if(snapshot.state!=='complete')throw failure('Android has not completed this submission.');
    const op=receipt.plan.finalizers[0],proof=snapshot.finalizerResults?.submission;
    if(!proof||proof.id!==op.fileId||proof.requestId!==op.request.id||!['pending','approved','rejected','dismissed','withdrawn'].includes(proof.status))throw failure('Android has not confirmed the saved Inventory request. Its files are retained for checking.');
    const request=JSON.parse(JSON.stringify(op.request)),results=Core.completed(snapshot,receipt.context);
    for(const field of ['photos','videos','documents'])for(const item of request.media[field]||[])if(item.assetKey){
      const result=results[item.assetKey];if(!ID.test(result?.id))throw failure('A selected original has no confirmed Drive file.');
      item.driveFileId=result.id;delete item.assetKey;
    }
    return {...request,status:proof.status,processorError:['pending','approved'].includes(proof.status)?'':String(proof.message||'Inventory did not accept this submission. Your originals are saved; review the current Profile.'),driveRequestFileId:proof.id,driveRequestFileUrl:'https://drive.google.com/file/d/'+proof.id+'/view'};
  }
  async function run({vehicle,request,scope,phone,processorReady,prepare,persist,retire,submitted,check,onProgress=()=>{},visibility=globalThis.document,isolation=Isolation.policy}){
    scope=Core.context(scope);let receipt=vehicle.drive?.nativeTransfer;
    // Retained protocol3 plans fail closed before status/cancel/staging calls.
    // New unsupported saves retain the existing .46/browser fallback unchanged.
    if(receipt&&receipt.kind!=='owner-submission')throw failure('A retained save belongs to a different account, Store or workflow. Its originals have been kept.','NATIVE_CONTEXT_MISMATCH');
    if(receipt?.kind==='owner-submission')isolation.assertPlan(receipt.plan);
    if(!isolation.allowsContext(scope)){if(receipt?.kind==='owner-submission')isolation.assertContext(scope);return null;}
    const callerCheck=check;
    check=async()=>{await callerCheck();isolation.assertContext(scope);if(receipt)isolation.assertPlan(receipt.plan);};
    await check();
    if(receipt){
      if(receipt.kind!=='owner-submission'||!sameOwner(receipt.context,scope))throw failure('A retained save belongs to a different account, Store or workflow. Its originals have been kept.','NATIVE_CONTEXT_MISMATCH');
      if(!Core.sameContext(receipt.context,scope)){
        if(receipt.id){
          const old=await Native.readStatus(receipt.id,phone);Native.verifyHandoff(old,receipt.plan,receipt.id);
          await check();if(!['complete','cancelled'].includes(old.state))await phone.uploadCall('cancel',{id:receipt.id});
        }
        await check();await retire(receipt);receipt=null;
      }
    }
    if(!receipt){
      if(!processorReady||!phone?.uploadCapabilities||typeof Native.verifyHandoff!=='function')return null;
      let capabilities;try{capabilities=await phone.uploadCapabilities();}catch{return null;}
      if(capabilities?.capabilities?.backgroundUploads!==true||capabilities?.capabilities?.submissionFinalization!==true||String(capabilities.uploadAccount||'').toLowerCase()!==scope.account)return null;
      // A legacy request may already exist at this ID. Its existing foreground
      // reconciliation is preserved instead of replacing it with a native plan.
      if(request.driveRequestFileId)return null;
      await check();const value=await prepare();await check();
      isolation.assertPlan(value);
      if(value.version!==3||!Core.sameContext(value.context,scope))throw failure('The prepared submission changed context.','NATIVE_CONTEXT_MISMATCH');
      receipt={kind:'owner-submission',context:scope,plan:value,id:'',handoffComplete:false};await persist(receipt,'plan');
    }
    const progress=value=>{
      const state=Native.presentation(value);
      onProgress({...state,kind:value.phase==='staging'?'handoff':'owner-update',percent:value.phase==='staging'?5+Math.floor(value.percent*.45):value.phase==='finalizing'?96:50+Math.floor(value.percent*.45),loadedBytes:value.staged,totalBytes:value.total,fileName:value.fileName,fileIndex:value.fileIndex,fileCount:value.fileCount});
    };
    await Native.handoff(receipt.plan,sourceMap(vehicle),{phone,check,onProgress:progress,onPrepared:async value=>{await check();receipt.id=value.id;await persist(receipt,'staging');},onCommitted:async(value,timing)=>{await check();receipt.handoffComplete=true;receipt.handoffTiming=timing;await persist(receipt,'queued');}});
    let final;
    await Native.wait(receipt.id,scope,{phone,check,visibility,onProgress:progress,onSnapshot:value=>{final=value;}});
    const result=completed(receipt,final);await check();await submitted(result,final,receipt);
    if(result.processorError)throw failure(result.processorError,'OWNER_REQUEST_REJECTED');
    onProgress({kind:'owner-update',status:'complete',percent:100,message:result.status==='approved'?'Submission confirmed · refreshing Inventory':'Upload submitted · awaiting shared Inventory publication'});
    return result;
  }
  return {plan,run,completed,sourceMap,snapshot,plural};
});
