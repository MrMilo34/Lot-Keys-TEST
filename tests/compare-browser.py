"""Real-browser Compare checks using synthetic data and blocked external traffic.

No Google credentials or live Drive writes. Run after installing Playwright Chromium.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('COMPARE_EVIDENCE_DIRECTORY', tempfile.mkdtemp(prefix='lotkeys-compare-')))
OUT.mkdir(parents=True, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/'
errors, external, sizes = [], [], []
try:
    with sync_playwright() as p:
        options = {'headless': True}
        if os.environ.get('LOTKEYS_CHROMIUM'):
            options['executable_path'] = os.environ['LOTKEYS_CHROMIUM']
        browser = p.chromium.launch(**options)
        context = browser.new_context(viewport={'width': 1280, 'height': 960}, service_workers='block')
        page = context.new_page()
        page.on('pageerror', lambda err: errors.append(str(err)))
        def route(request):
            if request.request.url.startswith(origin):
                request.continue_()
            else:
                external.append(request.request.url)
                request.abort()
        page.route('**/*', route)
        page.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedComparisonText=text;}}})")
        page.goto(origin, wait_until='domcontentloaded')
        page.wait_for_selector('#home-compare', timeout=20000)
        # Initial disconnected onboarding is outside this synthetic comparison test.
        # Wait for it before seeding; the Google transport remains blocked/mocked.
        page.wait_for_selector('#lotkeys-auth-overlay', state='visible')
        page.evaluate('''async()=>{
          const b=LotKeysMessagingBridge;
          for(const [id,value] of Object.entries({currentAccountEmail:'comparison@example.test',currentAccountSub:'test-sub',personalProfileDriveFolderId:'synthetic-personal',storeFolderId:'synthetic-store',storeName:'LotKeys QA',userName:'Comparison QA',lastInventoryRefreshAt:Date.now(),lastListingsRefreshAt:Date.now(),onboardingSeen:true}))await b.DB.put('settings',{id,value});
          await b.DB.put('vehicles',{id:'target-1',year:'2024',make:'Lincoln',model:'Nautilus',trim:'Reserve',generation:'Second generation',body:'SUV',name:'2024 Lincoln Nautilus Reserve - QA-1',stock:'QA-1',price:30000,odometer:25000,odometerUnit:'KM',vin:'5LMPJ8KA5RJ825421',originalListingUrl:'https://dealer.example/target',updatedAt:Date.now(),photos:[]});
          b.DriveSync.loadComparisonReport=async()=>null;
          window.compareSaves=[];
          b.DriveSync.saveComparisonReport=async report=>{compareSaves.push(report);if(window.failComparisonSave)throw new Error('Simulated unavailable Drive');return {fileId:'synthetic-report',url:'https://docs.google.com/document/d/synthetic-report/edit',runId:report.runId,text:LotKeysCompare.documentBody(report).text};};
          for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
          await b.rerender();
          document.querySelector('#lotkeys-auth-overlay').hidden=true;
          document.body.dataset.lotkeysSigningIn='false';
        }''')
        page.wait_for_selector('.home-compact-search')
        style = page.evaluate('''()=>{
          const input=document.querySelector('.home-compact-search input'),reference=document.createElement('div');reference.className='compact-list-search';reference.innerHTML='<input>';document.body.append(reference);
          const a=getComputedStyle(input),b=getComputedStyle(reference.firstChild);
          const result={font:a.fontSize,referenceFont:b.fontSize,padding:a.padding,referencePadding:b.padding,radius:a.borderRadius,referenceRadius:b.borderRadius,gradient:getComputedStyle(document.querySelector('.home-compact-search')).backgroundImage};reference.remove();return result;
        }''')
        assert style['font'] == style['referenceFont'], style
        assert style['padding'] == style['referencePadding'], style
        assert style['radius'] == style['referenceRadius'], style
        assert 'linear-gradient' in style['gradient'], style
        page.screenshot(path=str(OUT / 'home-desktop.png'), full_page=True)
        page.locator('.compare-panel>summary').click()
        source = [{'price':price,'year':2025,'make':'Lincoln','model':'Nautilus','trim':trim,'generation':'Second generation','body':'SUV','stock':stock,'kilometres':30000,'url':'https://dealer.example/'+stock,'observedAt':'2026-11-14T12:00:00Z','currency':'CAD'} for price,trim,stock in [(28000,'Reserve','CHEAPER'),(31500,'Reserve','HIGHER'),(25000,'Premiere','WRONG-TRIM')]]
        page.locator('#compare-text-0').fill(json.dumps(source))
        page.locator('.compare-open').click()
        page.wait_for_selector('dialog[open] #compare-form')
        page.locator('#compare-target').select_option('target-1')
        assert page.locator('#compare-target-generation').input_value() == 'Second generation'
        page.locator('#compare-form button[type=submit]').click()
        page.wait_for_function('compareSaves.length===1')
        page.wait_for_function("document.querySelector('.compare-results .compare-status')?.textContent==='Saved to Drive'")
        assert page.locator('.compare-results table').count() == 0
        assert page.locator('.compare-results .compare-results-list > .compare-lines > .compare-row').count() == 3
        assert page.locator('.compare-results .compare-results-list > .compare-lines > .compare-row').first.inner_text().startswith('$28,000')
        assert page.locator('.compare-results .compare-target .compare-result-line').inner_text().startswith('⭐ $30,000')
        assert page.locator('.compare-results .compare-target a').get_attribute('href') == 'https://dealer.example/target'
        assert page.locator('.compare-results .compare-excluded .compare-row').count() == 1
        page.locator('.compare-results .compare-copy-results').click()
        page.wait_for_function("window.copiedComparisonText?.includes('⭐ $30,000.00 - 2024 Lincoln Nautilus Reserve - QA-1')")
        assert 'no automatic website search' in page.evaluate('copiedComparisonText')
        for width in [1280, 390, 320]:
            page.set_viewport_size({'width':width,'height':844})
            page.locator('.compare-results').scroll_into_view_if_needed()
            dims=page.evaluate("({page:document.documentElement.scrollWidth,width:innerWidth,modal:document.querySelector('#modal').getBoundingClientRect().width,results:document.querySelector('.compare-results').scrollWidth,resultsWidth:document.querySelector('.compare-results').clientWidth})")
            assert dims['page'] <= width+1, dims
            assert dims['results'] <= dims['resultsWidth']+1, dims
            sizes.append(dims)
            page.screenshot(path=str(OUT / f'results-{width}.png'))
        page.evaluate('window.failComparisonSave=true')
        page.locator('#compare-form button[type=submit]').click()
        page.wait_for_selector('#compare-form .compare-error:not([hidden])')
        assert 'New results remain' in page.locator('#compare-form .compare-error').inner_text()
        assert page.locator('.compare-results a',has_text='previous saved').count()==1
        assert page.evaluate("async()=>{const v=await LotKeysMessagingBridge.DB.get('vehicles','target-1');return v.price===30000&&v.odometer===25000&&v.photos.length===0}")
        page.locator('.modal-head .close').click()
        page.screenshot(path=str(OUT / 'home-mobile-expanded.png'),full_page=True)
        page.reload(wait_until='domcontentloaded')
        page.wait_for_selector('.compare-panel')
        page.locator('.compare-panel>summary').click()
        assert 'New results are local' in page.locator('.compare-status').inner_text()
        page.locator('.compare-open').click()
        page.wait_for_selector('dialog[open] #compare-form')
        page.evaluate("LotKeysMessagingBridge.setSetting('currentAccountEmail','different@example.test')")
        page.wait_for_function("!document.querySelector('#modal').open")
        assert page.locator('#home-compare').inner_text()==''
        assert not any(any(host in url for host in ['autotrader','cargurus','dealer.example']) for url in external),external
        assert not errors,errors
        summary={'checks':['actual Home search dimensions and gradient','source and target controls','price-sorted compact lines','target star and stock hyperlink','known trim exclusion','Copy results manual limitation','1280/390/320px no horizontal overflow','failed save retains pending results and previous link','Inventory unchanged','reload retains pending report','account change clears report'],'sizes':sizes,'homeStyle':style,'pageErrors':errors,'externalRequestsBlocked':len(external),'liveDriveTested':False,'physicalPhoneTested':False}
        (OUT/'browser-results.json').write_text(json.dumps(summary,indent=2))
        print(json.dumps(summary,indent=2))
        browser.close()
except Exception:
    if 'page' in globals():
        try:
            page.screenshot(path=str(OUT / 'failure.png'))
        except Exception:
            pass
    raise
finally:
    server.shutdown()
    server.server_close()
