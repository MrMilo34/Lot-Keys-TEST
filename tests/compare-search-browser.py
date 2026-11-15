"""Unreleased query component only: synthetic capabilities, no live search or Drive."""
import json
import os
from pathlib import Path
import re
import tempfile
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('COMPARE_EVIDENCE_DIRECTORY', tempfile.mkdtemp(prefix='compare-query-')))
OUT.mkdir(parents=True, exist_ok=True)
css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', (ROOT / 'index.html').read_text(), re.S))
css += (ROOT / 'lotkeys-compare.css').read_text()
errors, requests, sizes = [], [], []
with sync_playwright() as p:
    options = {'headless': True}
    if os.environ.get('LOTKEYS_CHROMIUM'):
        options['executable_path'] = os.environ['LOTKEYS_CHROMIUM']
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1280, 'height': 960})
    page.on('pageerror', lambda e: errors.append(str(e)))
    def block(route):
        requests.append(route.request.url)
        route.abort()
    page.route('**/*', block)
    page.set_content('<style>' + css + '</style><main id="main"><div id="query"></div></main>')
    for name in ['lotkeys-compare.js', 'lotkeys-compare-search-ui.js']:
        page.add_script_tag(content=(ROOT / name).read_text())
    page.evaluate('''()=>{
      window.searches=[];window.queryUI=LotKeysCompareSearchUI.mount({host:document.querySelector('#query'),wanted:{year:2024,make:'Toyota',model:'Highlander',trim:'XLE',city:'Wetaskiwin',province:'AB'},capabilities:{status:'ready',sources:[{id:'dealer',name:'Synthetic dealer feed',kind:'dealer',status:'ready'},{id:'platform',name:'Synthetic limited platform',kind:'platform',status:'ready',distanceOptions:[{id:'100',label:'100 km',kind:'radius',kilometres:100},{id:'province',label:'Provincial',kind:'province',provinces:['AB','BC']}]}]},onDiscover:query=>searches.push(query)});
    }''')
    page.locator('[data-wanted-url]').fill('https://dealer.example/vehicle/target')
    page.locator('[data-query-field="website"]').fill('https://dealer.example')
    page.locator('[data-query-field="years"]').fill('3')
    page.locator('[data-add-search-source]').click()
    platform = page.locator('[data-query-source="1"]')
    platform.locator('[data-query-field="sourceId"]').select_option('platform')
    platform.locator('[data-query-field="distanceId"]').select_option('100')
    assert platform.locator('[data-query-field="origin"]').input_value() == 'Wetaskiwin, AB'
    options = platform.locator('[data-query-field="distanceId"] option').all_text_contents()
    assert options == ['Choose a supported region', '100 km', 'Provincial'], options
    for width in [1280, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 844})
        dims = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
        assert dims['scroll'] <= width + 1, dims
        sizes.append(dims)
        page.screenshot(path=str(OUT / f'query-{width}.png'), full_page=True)
    page.locator('[data-discover]').click()
    value = page.evaluate('searches[0]')
    assert value['sources'][0]['criteria']['years'] == '3'
    assert value['sources'][0]['criteria']['priceMin'] == ''
    assert value['sources'][1]['distanceId'] == '100'
    page.evaluate('queryUI.updateCapabilities({status:"unavailable",sources:[]})')
    assert page.locator('[data-discover]').is_disabled()
    assert 'do not search websites' in page.locator('#query').inner_text()
    assert not errors, errors
    assert not requests, requests
    result = {'sizes': sizes, 'pageErrors': errors, 'externalRequests': requests, 'liveDiscoveryTested': False, 'physicalPhoneTested': False, 'componentOnly': True}
    (OUT / 'query-browser-results.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result))
    browser.close()
