/* LotKeys Hub V2 identity boundary — account identity only, never app data. */
(()=>{
'use strict';

let lastOwner='';

async function identity(){
  const bridge=window.LotKeysMessagingBridge;
  if(!bridge?.getSetting)throw Error('LotKeys account services are not ready yet.');
  const email=String(await bridge.getSetting('currentAccountEmail','')||'').trim().toLowerCase();
  const subject=String(await bridge.getSetting('currentAccountSub','')||'').trim();
  const owner=email?(subject||email):'';
  if(!owner)throw Error('Sign into your LotKeys Google account before connecting a phone.');
  if(owner!==lastOwner){
    lastOwner=owner;
    window.dispatchEvent(new CustomEvent('lotkeys-hub-v2-identity',{detail:{owner}}));
  }
  return owner;
}

window.LotKeysHubV2Identity={identity};
})();
