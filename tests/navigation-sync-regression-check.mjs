import fs from 'node:fs';

const source=fs.readFileSync('index.html','utf8');
const fail=message=>{throw new Error(message)};
const expect=(condition,message)=>{if(!condition)fail(message)};
const between=(start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  expect(a>=0,`missing start marker: ${start}`);expect(b>a,`missing end marker after ${start}`);
  return source.slice(a,b);
};

const routeSection=between('const ROUTE_TITLES=', 'function empty(');
expect(routeSection.includes('showRouteLoading(context)'),'navigation must paint a selected-route loading shell');
expect(routeSection.includes('Still opening the saved phone copy…'),'slow reads need a truthful non-fatal status');
expect(!routeSection.includes('render timed out'),'navigation must not cancel a valid slow IndexedDB read');
expect(!/stillOpening[\s\S]*?\+\+routeRenderEpoch/.test(routeSection),'the soft status timer must not invalidate route ownership');
expect(routeSection.includes("updateProfileNavIcon().catch"),'profile icon work must not block route paint');
expect(routeSection.includes('scheduleListingNavAlert()'),'listing alert work must be deferred from route paint');

const renderChecks=[
  ['renderHome(context=null)', 'function normalizeVehicleSearchText', 3],
  ['renderVehicles(context=null)', 'function assetViewUrl', 4],
  ['renderListings(context=null)', 'async function analyticsFor', 3],
  ['renderProfile(context=null)', 'function managementFileSize', 3],
  ['renderSettings(context=null)', 'window.addEventListener', 4]
];
for(const [start,end,minChecks] of renderChecks){
  const body=between(`async function ${start}`,end);
  const checks=(body.match(/routeRenderCurrent\(context\)/g)||[]).length;
  expect(checks>=minChecks,`${start} has only ${checks} route-ownership checks; expected at least ${minChecks}`);
}

const garageLayout=between('async function enhanceGarageLayout(', 'async function renderSettings(');
expect(garageLayout.includes('context=null'),'the Garage layout helper must inherit route ownership');
expect((garageLayout.match(/routeRenderCurrent\(context\)/g)||[]).length>=4,'the Garage layout helper must recheck ownership after asynchronous settings reads');
expect(source.includes('await enhanceGarageLayout({isOwner,context})'),'Garage rendering must pass its route context into the layout helper');

const contextMatch=source.match(/function routeRenderContext\(target,context=null\)\{[\s\S]*?\n  \}/);
const currentMatch=source.match(/function routeRenderCurrent\(context\)\{[^\n]+\}/);
expect(contextMatch,'routeRenderContext implementation is missing');
expect(currentMatch,'routeRenderCurrent implementation is missing');
const harness=new Function(`let route='home',routeRenderEpoch=0;${contextMatch[0]};${currentMatch[0]};return{navigate(target){route=target;return routeRenderContext(target)},rerender(target,context=null){return routeRenderContext(target,context)},current:routeRenderCurrent}`)();
const oldHome=harness.navigate('home');
const inventory=harness.navigate('vehicles');
expect(!harness.current(oldHome),'an older Home render still owns the DOM after Inventory navigation');
expect(harness.current(inventory),'the newest Inventory render must own the DOM');
const inventoryRefresh=harness.rerender('vehicles');
expect(!harness.current(inventory),'an older same-route Inventory render still owns the DOM after a newer repaint');
expect(harness.current(inventoryRefresh),'the newest same-route Inventory repaint must own the DOM');
expect(harness.rerender('vehicles',inventoryRefresh)===inventoryRefresh,'a child render must retain its parent navigation context');
const listings=harness.navigate('listings');
expect(!harness.current(inventoryRefresh),'an older Inventory render still owns the DOM after Listings navigation');
expect(harness.current(listings),'the newest Listings render must own the DOM');

const cleanupMatch=source.match(/function cleanupUrls\(\{force=false\}=\{\}\)\{[\s\S]*?\n  \}/);
expect(cleanupMatch,'safe Blob URL cleanup implementation is missing');
const revoked=[];
const cleanupHarness=new Function('document','URL',`${cleanupMatch[0]};let objectUrls=['blob:visible','blob:stale'];return{cleanup:cleanupUrls,urls:()=>objectUrls}`)(
  {querySelectorAll:()=>[{src:'blob:visible',currentSrc:'blob:visible',href:''}]},
  {revokeObjectURL:url=>revoked.push(url)}
);
cleanupHarness.cleanup();
expect(JSON.stringify(cleanupHarness.urls())===JSON.stringify(['blob:visible']),'visible Blob URLs must survive cleanup');
expect(JSON.stringify(revoked)===JSON.stringify(['blob:stale']),'only detached Blob URLs should be revoked');
cleanupHarness.cleanup({force:true});
expect(cleanupHarness.urls().length===0&&revoked.includes('blob:visible'),'forced teardown must revoke the remaining Blob URLs');

const dbSection=between('const DB = (() => {', '</script>');
const summarySection=dbSection.slice(dbSection.indexOf('function stateSummary'),dbSection.indexOf('function readState'));
expect(summarySection.includes("name==='vehicles'"),'Vehicle sync metadata summary is missing');
expect(summarySection.includes("name==='listings'"),'Listing sync metadata summary is missing');
for(const mediaField of ['photos','videos','attachments','listingAssets','blob'])expect(!summarySection.includes(mediaField),`metadata mirror must not store ${mediaField}`);
expect(dbSection.includes('stateRows(name){return readState(name)}'),'DB must expose disposable metadata reads');
expect(source.includes("state=DB.stateRows('listings')"),'the routine Listing alert badge must prefer metadata');

const quickInventory=between('async function quickRefreshInventoryFromDrive(', 'async function hydrateVehicleAssets(');
expect(quickInventory.includes("DB.stateRows('vehicles')||await DB.all('vehicles')"),'routine Inventory checks must prefer metadata');
expect(!quickInventory.includes('await reconcileListingVehicleProfiles()'),'an unchanged Inventory check must not rescan full records');
const quickListings=between('async function quickRefreshUserListingsFromDrive(', 'async function adminReadUserListings(');
expect(!quickListings.includes('await reconcileListingVehicleProfiles()'),'an unchanged Listings check must not rescan full records');
expect(source.includes('INVENTORY_FOLDER_AUDIT_MS=5*60*1000'),'folder audit must use the five-minute refresh cadence');

const driveFetch=between('async function apiFetch(', 'async function fetchFileBlob(');
expect(driveFetch.includes("method==='GET'"),'only read-only Drive requests may receive the general timeout');
expect(driveFetch.includes('setTimeout(()=>controller.abort(),30000)'),'read-only Drive requests need the 30-second release bound');
expect(driveFetch.includes("timeout.code='DRIVE_TIMEOUT'"),'Drive read timeout must remain distinguishable from an empty remote index');
expect(source.includes('fetchFileBlob(f.id,true,30000)'),'Inventory and Listings index downloads need the bounded read');

const resumes=between('async function resumePendingVehicleSyncs()', 'async function refreshInventory(');
expect(resumes.includes("DB.stateRows('vehicles')"),'Vehicle resume discovery must prefer metadata');
expect(resumes.includes("DB.stateRows('listings')"),'Listing resume discovery must prefer metadata');
expect(resumes.includes("DB.get('vehicles',row.id)"),'Vehicle resume must load only selected full records');
expect(resumes.includes("DB.get('listings',row.id)"),'Listing resume must load only selected full records');

console.log('Navigation/sync regression checks passed: stale renders lose ownership and unchanged sync checks avoid media-heavy full scans.');
