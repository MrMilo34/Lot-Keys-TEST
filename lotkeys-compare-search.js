(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./lotkeys-compare.js'):root.LotKeysCompare);if(typeof module==='object'&&module.exports)module.exports=api;else root.LotKeysCompareSearch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
  'use strict';
  const text=v=>String(v??'').trim().slice(0,300);
  const key=v=>text(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function error(code,message){return Object.assign(new Error(message),{code});}
  function publicUrl(value,{listing=false}={}){
    const safe=C.safeUrl(value);if(!safe)throw error('INVALID_URL','Use a full HTTPS website or listing link.');
    const u=new URL(safe),h=u.hostname.toLowerCase();
    if(!h.includes('.')||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)||h.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(h)||/\.(local|internal|localhost|test|invalid)$/.test(h)||u.port)throw error('INVALID_URL','Use a public website; local/private addresses and custom ports are unavailable.');
    if(listing&&u.pathname==='/'&&!u.search)throw error('EXACT_LISTING_REQUIRED','Vehicle Wanted needs the exact vehicle listing link.');
    u.hash='';return u.href;
  }
  function integer(value,label,min,max){const s=text(value);if(!/^\d+$/.test(s)||!Number.isSafeInteger(+s)||+s<min||+s>max)throw error('INVALID_CRITERIA',`${label} must be a whole number from ${min} to ${max}.`);return +s;}
  function bound(value,label){if(value==null||text(value)==='')return null;const n=C.number(value);if(n==null)throw error('INVALID_CRITERIA',`${label} must be a non-negative amount, or blank for no bound.`);return n;}
  function criteria(raw={},wanted={}){
    const reused=raw.reuseWanted!==false,base=reused?wanted:raw;
    const year=integer(base.year??base.baseYear,'Base year',1900,2099),years=integer(raw.years??0,'Years either side',0,100);
    if(year-years<1900||year+years>2099)throw error('INVALID_CRITERIA','The requested year range must stay between 1900 and 2099.');
    const make=text(base.make),model=text(base.model),trim=text(base.trim);
    if(!make||!model)throw error('MISSING_VEHICLE_FACTS','Supply make/model, or read a Vehicle Wanted listing that provides them.');
    const priceMin=bound(raw.priceMin,'Low price'),priceMax=bound(raw.priceMax,'High price');
    if(priceMin!=null&&priceMax!=null&&priceMin>priceMax)throw error('INVALID_CRITERIA','Low price cannot exceed high price.');
    return {reuseWanted:reused,baseYear:year,years,yearMin:year-years,yearMax:year+years,make,model,preferredTrim:trim,includeTrimVariants:true,priceMin,priceMax};
  }
  function sourcePlan(raw,wanted,capabilities){
    const cap=capabilities?.sources?.find(x=>x.id===raw.sourceId);
    if(!cap||cap.status!=='ready')throw error('SOURCE_NOT_CONNECTED','This source is not connected for active listing discovery.');
    const plan={sourceId:cap.id,name:text(cap.name),kind:cap.kind,criteria:criteria(raw.criteria,wanted),website:'',distance:null};
    if(cap.kind==='dealer'){
      plan.website=publicUrl(raw.website);
      if(!cap.websiteFilter)throw error('UNSUPPORTED_FILTER','This source cannot search a specified dealership website.');
      const host=new URL(plan.website).hostname.toLowerCase();
      if(cap.websiteHosts?.length&&!cap.websiteHosts.some(h=>host.replace(/^www\./,'')===text(h).toLowerCase().replace(/^www\./,'')))throw error('SOURCE_NOT_AUTHORIZED','This dealership website is not approved for the connected source.');
    }else if(cap.kind!=='platform')throw error('SOURCE_NOT_CONNECTED','This source type is not supported.');
    if((plan.criteria.priceMin!=null||plan.criteria.priceMax!=null)&&!cap.priceRange)throw error('UNSUPPORTED_FILTER','This source cannot apply the requested price bounds.');
    if(cap.distanceRequired&&!raw.distanceId)throw error('MISSING_ORIGIN','Choose a supported distance/region for this source.');
    if(raw.distanceId){
      const d=cap.distanceOptions?.find(x=>x.id===raw.distanceId);
      if(!d)throw error('UNSUPPORTED_DISTANCE','Choose a distance actually supported by the connected source.');
      plan.distance={id:d.id,kind:d.kind};
      if(d.kind==='radius'){
        if(!Number.isFinite(d.kilometres)||d.kilometres<=0)throw error('UNSUPPORTED_DISTANCE','This source returned an invalid radius option.');
        const origin=text(raw.origin||wanted.searchOrigin||wanted.postalCode||wanted.location||[wanted.city,wanted.province].filter(Boolean).join(', '));
        if(!origin)throw error('MISSING_ORIGIN','A radius search needs a city, postal code or verified Vehicle Wanted location.');
        Object.assign(plan.distance,{kilometres:d.kilometres,origin});
      }else if(d.kind==='province'){
        const province=text(raw.province||wanted.province).toUpperCase();
        if(!province||!d.provinces?.includes(province))throw error('UNSUPPORTED_DISTANCE','Select a province supported by this source.');
        plan.distance.province=province;
      }else if(d.kind==='national')plan.distance.country=d.country||'CA';
      else throw error('UNSUPPORTED_DISTANCE','This geographic search is unsupported.');
    }
    return plan;
  }
  function inspectListing(row,plan){
    const excluded=[],review=[],notes=[],q=plan.criteria;
    if(!row.year)review.push('Year unknown; requested range unverified');
    else if(+row.year<q.yearMin||+row.year>q.yearMax)excluded.push('Outside requested year range');
    for(const field of ['make','model']){
      if(!row[field])review.push(`${field} unknown; requested filter unverified`);
      else if(key(row[field])!==key(q[field]))excluded.push(`Different requested ${field}`);
    }
    if(q.preferredTrim&&row.trim&&key(q.preferredTrim)!==key(row.trim))notes.push('Different preferred trim; included for equipment/price comparison');
    else if(q.preferredTrim&&!row.trim)review.push('Trim unknown; preference unverified');
    if(q.priceMin!=null||q.priceMax!=null){
      if(row.price==null)review.push('Price unknown; requested price bounds unverified');
      else if((q.priceMin!=null&&row.price<q.priceMin)||(q.priceMax!=null&&row.price>q.priceMax))excluded.push('Outside requested price bounds');
    }
    const d=plan.distance;
    if(d?.kind==='radius'){
      if(row.distanceKm==null)review.push('Distance unknown; requested radius unverified');
      else if(row.distanceKm>d.kilometres)excluded.push('Outside requested radius');
    }else if(d?.kind==='province'){
      if(!row.province)review.push('Province unknown; requested province unverified');
      else if(row.province.toUpperCase()!==d.province)excluded.push('Outside requested province');
    }else if(d?.kind==='national'){
      if(!row.country)review.push('Country unknown; requested country unverified');
      else if(row.country.toUpperCase()!==d.country)excluded.push('Outside requested country');
    }
    return {status:excluded.length?'excluded':review.length?'review':'included',reasons:[...excluded,...review,...notes]};
  }
  const sortPrice=(a,b)=>(a.price??Infinity)-(b.price??Infinity)||Number(b.target)-Number(a.target)||a.stock.localeCompare(b.stock);
  async function bounded(task,external,timeoutMs){
    const controller=new AbortController();let timer,onAbort;
    try{return await new Promise((resolve,reject)=>{
      const fail=e=>{controller.abort();reject(e);};
      onAbort=()=>fail(error('ABORTED','Search cancelled; previous report retained.'));
      if(external?.aborted){onAbort();return;}external?.addEventListener('abort',onAbort,{once:true});
      timer=setTimeout(()=>fail(error('SOURCE_TIMEOUT','Source response timed out; coverage is not complete.')),timeoutMs);
      Promise.resolve().then(()=>{if(controller.signal.aborted)throw error('ABORTED','Search cancelled; previous report retained.');return task(controller.signal);}).then(resolve,reject);
    });}finally{clearTimeout(timer);external?.removeEventListener('abort',onAbort);}
  }
  function createCoordinator(io){
    if(!io||typeof io.context!=='function'||typeof io.resolveWanted!=='function'||typeof io.search!=='function'||typeof io.capabilities!=='function')throw error('SOURCE_NOT_CONNECTED','A connected, authorized discovery service is required.');
    async function discover(request,{signal,onProgress=()=>{}}={}){
      request=structuredClone(request);
      const origin=structuredClone(await io.context()),timeout=Math.max(5,Math.min(Number(io.requestTimeoutMs)||12000,30000));
      const guard=async()=>{if(signal?.aborted)throw error('ABORTED','Search cancelled; previous report retained.');if(!C.generationMatches(origin,await io.context()))throw error('CONTEXT_CHANGED','Account or Store changed; search results were not adopted.');};
      const wantedUrl=publicUrl(request.wantedUrl,{listing:true});await guard();const caps=await bounded(s=>io.capabilities({signal:s}),signal,timeout);await guard();
      if(caps?.status!=='ready')throw error('SOURCE_NOT_CONNECTED','Active listing discovery is not connected. Manual rows are not an automatic search.');
      if(!Array.isArray(request.sources)||!request.sources.length||request.sources.length>integer(caps.maxSources??5,'Source budget',1,10))throw error('INVALID_CRITERIA','Choose one to five connected search sources.');
      for(const raw of request.sources)if(!caps.sources?.some(c=>c.id===raw.sourceId&&c.status==='ready'))throw error('SOURCE_NOT_CONNECTED','A selected source is not connected; no listing search was run.');
      onProgress({stage:'wanted',message:'Reading the exact Vehicle Wanted link'});
      const response=await bounded(s=>io.resolveWanted(wantedUrl,{signal:s}),signal,timeout);await guard();
      if(!response?.row||C.canonicalListingUrl(response.row.url)!==C.canonicalListingUrl(wantedUrl))throw error('TARGET_NOT_VERIFIED','The source did not verify the exact Vehicle Wanted listing; previous report retained.');
      const now=io.now?.()||Date.now(),wanted=C.normalize(response.row,{name:'Vehicle Wanted',target:true},now);
      wanted.match={status:'target',reasons:['Exact Vehicle Wanted listing reference']};
      const plans=request.sources.map(s=>sourcePlan(s,response.row,caps));
      const coverage=[],rows=[],excluded=[],review=[];let requests=0;const maxRequests=integer(caps.maxRequests??10,'Request budget',1,25);
      for(const plan of plans){
        await guard();let cursor=null,pages=0,status='complete',failure='',found=0;const seen=new Set();
        const cap=caps.sources.find(x=>x.id===plan.sourceId),maxPages=integer(cap.maxPages??1,'Source page budget',1,10);
        try{
          do{
            onProgress({stage:'source',sourceId:plan.sourceId,page:pages+1,message:`Searching ${plan.name}`});
            if(requests>=maxRequests)throw error('REQUEST_BUDGET','Search request budget reached; coverage is partial.');requests++;
            const page=await bounded(s=>io.search(plan,{cursor,signal:s}),signal,timeout);await guard();
            if(!Array.isArray(page?.rows)||page.rows.length>500)throw error('INVALID_SOURCE_RESPONSE','The source returned an invalid listing page.');
            pages++;
            for(const raw of page.rows){
              if(1+rows.length+excluded.length+review.length>=2000)throw error('RESULT_LIMIT','Result limit reached; source coverage is partial.');
              const row=C.normalize(raw,{name:plan.name,url:plan.website},now);
              row.sourceCriteria=plan;row.discovery=inspectListing(row,plan);row.flags.push(...row.discovery.reasons);
              const match=C.matchVehicle(row,wanted);row.match=match;
              if(!row.url){if(row.discovery.status!=='excluded')row.discovery.status='review';row.flags.push('Source supplied no exact listing URL; not a verified linked alternative');}
              // Explicit source criteria determine inclusion; target differences remain visible.
              if(match.status==='excluded'){row.flags.push(...match.reasons);if(match.reasons.some(r=>/Different (generation|body) from target/.test(r))){row.discovery.status='excluded';row.discovery.reasons.push('Different known generation/body from Vehicle Wanted');}else row.match={status:'requested',reasons:match.reasons};}
              if(row.price!=null&&wanted.price!=null)row.priceDifference=row.price-wanted.price;
              (row.discovery.status==='excluded'?excluded:row.discovery.status==='review'?review:rows).push(row);found++;
            }
            cursor=page.nextCursor??null;
            if(cursor!=null){const k=JSON.stringify(cursor);if(seen.has(k))throw error('REPEATED_CURSOR','The source repeated a page cursor; coverage is partial.');seen.add(k);}
            if(cursor!=null&&pages>=maxPages)status='partial';
          }while(cursor!=null&&pages<maxPages);
        }catch(e){await guard();status=found?'partial':'failed';failure=text(e.message);}
        coverage.push({name:plan.name,url:plan.website,sourceId:plan.sourceId,rows:found,pages,status:`${status}${failure?': '+failure:''}`,criteria:plan.criteria,distance:plan.distance});
      }
      await guard();
      if(coverage.every(c=>c.status.startsWith('failed')))throw error('ALL_SOURCES_FAILED','Every source failed; previous report retained.');
      const all=C.deduplicate([wanted,...rows]);all.sort(sortPrice);excluded.sort(sortPrice);review.sort(sortPrice);
      return {schema:3,runId:'discovery-'+now+'-'+Math.random().toString(36).slice(2),generatedAt:new Date(now).toISOString(),staleHours:24,discovery:{mode:'authorized-search',wantedUrl,complete:coverage.every(c=>c.status==='complete')},coverage,rows:all,excluded,filterReview:review,matchingPolicy:'Source year/make/model/price/geographic filters are checked. Other trims remain included. Unknown bounded facts require review. Vehicle Wanted stays starred even outside source filters. Generation/body and target differences remain explicit; no missing facts are invented.'};
    }
    return {discover};
  }
  return {publicUrl,criteria,sourcePlan,inspectListing,createCoordinator};
});
