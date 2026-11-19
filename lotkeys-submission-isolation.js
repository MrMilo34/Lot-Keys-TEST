(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LotKeysSubmissionIsolation=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // No browser setting, advertised processor capability or retained plan enables
  // this path. A verified disposable binding must be pinned in both builds first.
  const DEPLOYMENT_BINDING=null;
  const ID=/^[A-Za-z0-9_-]{8,200}$/;
  function denied(){return Object.assign(Error('Background submission is disabled until a verified disposable TEST destination is bound. Originals are retained.'),{nativeTransfer:true,code:'NATIVE_TEST_DESTINATION_REQUIRED'});}
  function createPolicy(binding){
    const b=binding?JSON.parse(JSON.stringify(binding)):null;
    const valid=!!(b&&b.kind==='lotkeys-disposable-store-v1'&&b.enabled===true&&ID.test(b.store)&&typeof b.account==='string'&&b.account.includes('@')&&['folderIds','requestFileIds','existingFileIds'].every(k=>Array.isArray(b[k])&&b[k].every(id=>typeof id==='string'&&ID.test(id)))&&b.folderIds.includes(b.store)&&b.requestFileIds.length);
    const account=valid?b.account.trim().toLowerCase():'',folders=new Set(valid?b.folderIds:[]),requests=new Set(valid?b.requestFileIds:[]),files=new Set(valid?b.existingFileIds:[]);
    function allowsContext(scope){return valid&&scope?.account?.toLowerCase()===account&&scope.store===b.store;}
    function assertContext(scope){if(!allowsContext(scope))throw denied();}
    function assertPlan(plan){
      assertContext(plan?.context);
      if(plan.version!==3||!Array.isArray(plan.assets)||plan.finalizers?.length!==1)throw denied();
      const op=plan.finalizers[0],request=op.request;
      if(op.type!=='vehicle-submission'||!folders.has(op.parentId)||!requests.has(op.fileId)||request?.context?.rootId!==b.store||request.userEmail?.toLowerCase()!==account)throw denied();
      for(const asset of plan.assets)if(!folders.has(asset.parent)||(asset.driveId&&!files.has(asset.driveId)))throw denied();
      for(const [key,id]of Object.entries(request.folders||{}))if(key.endsWith('Id')&&id&&!folders.has(id))throw denied();
      for(const items of Object.values(request.media||{}))for(const item of items)if(item.driveFileId&&!files.has(item.driveFileId))throw denied();
    }
    return Object.freeze({enabled:valid,allowsContext,assertContext,assertPlan});
  }
  return Object.freeze({createPolicy,policy:createPolicy(DEPLOYMENT_BINDING)});
});
