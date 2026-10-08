'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('const WebsiteInfo = (()=>{');
const end = html.indexOf('\n})();', start) + '\n})();'.length;
assert.ok(start >= 0 && end > start, 'WebsiteInfo module must exist');
const normalizers = html.slice(html.indexOf('const FACEBOOK_BODY_STYLE_OPTIONS='), html.indexOf('function seedListingFacebookFields('));
const source = html.slice(start, end).replace('return{scan,scanFacts,imageBlob};', 'return{scan,scanFacts,imageBlob,parseText,detectVehiclePrice,headingVehicle,carfaxReportUrl,extractCarfaxReportUrl};');
const context = vm.createContext({ URL, Date, AbortController, setTimeout, clearTimeout });
vm.runInContext(normalizers + source + '\nglobalThis.importer = WebsiteInfo;', context);
const importer = context.importer;

// Transcribed from Blair's supplied screenshot; this is not a live-site capture.
const listing = fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy-listing.txt'), 'utf8');
const legacyUrl = 'https://www.legacydodgewetaskiwin.com/vehicles/2023/jeep/grand-wagoneer/wetaskiwin/ab/71380234/?sale_class=used';
const reportUrl = 'https://vhr.carfax.ca/?id=PHaYmcXfU70iH2wRsnrlJWBW6g93B4az';
const vehicle = { year: '2023', make: 'Jeep', model: 'Grand Wagoneer Series II', stock: 'BT2556' };
const sticker = { price: 79507, source: 'jsonld', name: '2023 Jeep Grand Wagoneer Series II', stock: 'BT2556', availability: 'https://schema.org/InStock' };

test('Legacy import uses sale price and preserves the supplied vehicle facts and report', () => {
  const fields = importer.parseText(listing, legacyUrl, { carfaxUrl: reportUrl }, vehicle);
  assert.equal(fields.price.value, '70990');
  assert.equal(fields.price.label, 'legacy price');
  assert.equal(fields.price.confidence, 'high');
  assert.equal(fields.price.identityBound, true);
  assert.equal(fields.price.ambiguous, false);
  assert.equal(fields.year.value, '2023');
  assert.equal(fields.make.value, 'Jeep');
  assert.equal(fields.model.value, 'GRAND WAGONEER SERIES II');
  assert.equal(fields.stock.value, 'BT2556');
  assert.equal(fields.odometer.value, '39446');
  assert.equal(fields.odometerUnit.value, 'KM');
  assert.equal(fields.bodyStyle.value, 'SUV');
  assert.equal(fields.exteriorColor.value, 'Blue');
  assert.equal(fields.transmission.value, 'Automatic');
  assert.equal(fields.fuelType.value, 'Gasoline');
  assert.equal(fields.carfaxUrl.value, reportUrl);
  assert.equal(fields.carfaxOneOwner, undefined, 'report findings require separate verification');
  assert.equal(fields.carfaxNoAccidents, undefined);
});

test('Legacy sale label outranks matching structured sticker metadata', () => {
  const fields = importer.parseText(listing, legacyUrl, { structuredPrices: [sticker] }, vehicle);
  assert.equal(fields.price.value, '70990');
  assert.equal(fields.price.source, 'text');
  assert.equal(fields.price.label, 'legacy price');
});

test('new imports without an expected identity still use Legacy sale price', () => {
  for (const host of ['www.legacydodgewetaskiwin.com', 'legacydodgewetaskiwin.ca']) {
    const fields = importer.parseText(listing, `https://${host}/vehicles/71380234/`, { structuredPrices: [sticker] });
    assert.equal(fields.price.value, '70990');
    assert.equal(fields.price.confidence, 'suggested');
    assert.equal(fields.price.identityBound, false, 'new import must not claim an existing identity match');
  }
});

test('Legacy preference cannot override a different expected stock number', () => {
  const expected = { ...vehicle, stock: 'OTHER123' };
  const matched = { ...sticker, stock: expected.stock, price: 65000 };
  const fields = importer.parseText(listing, legacyUrl, { structuredPrices: [matched] }, expected);
  assert.equal(fields.price, undefined, 'mismatched sale text and sticker metadata cannot establish a sale price');
});

test('conflicting Legacy sale labels remain ambiguous', () => {
  const fields = importer.parseText(`${listing}\n${'Details '.repeat(65)}\nLegacy Price $72,990`, legacyUrl, {}, vehicle);
  assert.equal(fields.price.ambiguous, true);
  assert.equal(fields.price.confidence, 'low');
  assert.deepEqual(Array.from(fields.price.alternatives, x => x.price).sort(), [70990, 72990]);
});

test('payment amounts and a negative discount cannot become a vehicle price', () => {
  const text = '2023 Jeep Grand Wagoneer Series II - $271.41 /WK\nStock #: BT2556\nDiscount $-8,517\nFinance Price $1,200/bw\nLegacy Price $1,500 per month';
  const fields = importer.parseText(text, legacyUrl, {}, vehicle);
  assert.equal(fields.price, undefined);
});

test('a recently rejected Legacy price is not preferred over matched structured data', () => {
  const expected = { ...vehicle, websitePriceFinding: { feedback: [{ at: new Date().toISOString(), detectedPrice: 70990, reason: 'wrong-price' }] } };
  const fields = importer.parseText(listing, legacyUrl, { structuredPrices: [sticker] }, expected);
  assert.equal(fields.price, undefined, 'rejected sale price must not cause a sticker-price substitution');
});

test('missing Legacy sale price does not fall back to Vehicle Price or metadata', () => {
  const noSale = listing.replace('Legacy Price\n$70,990\n', '');
  assert.equal(importer.parseText(noSale, legacyUrl, { structuredPrices: [sticker] }, vehicle).price, undefined);
  assert.equal(importer.parseText(noSale, legacyUrl, { structuredPrices: [sticker] }).price, undefined);
});

test('Legacy rules stay confined to the recognized dealership hosts', () => {
  for (const url of ['https://dealer.example/vehicle', 'https://legacydodgewetaskiwin.com.example/vehicle']) {
    const fields = importer.parseText(listing, url, { structuredPrices: [sticker] }, vehicle);
    assert.equal(fields.price.value, '79507');
    assert.equal(fields.price.label, 'structured');
  }
  const fields = importer.parseText('2023 Jeep Grand Wagoneer Series II\nSale Price $70,990\nStock #: BT2556', 'https://dealer.example/vehicle', {}, vehicle);
  assert.equal(fields.price.value, '70990');
  assert.equal(fields.price.confidence, 'high');
});

test('call-for-price status still takes priority over a nearby price', () => {
  const fields = importer.parseText(`${listing}\nCall for Price`, legacyUrl, { structuredPrices: [sticker] }, vehicle);
  assert.equal(fields.price, undefined);
  assert.equal(fields.priceStatus.value, 'call-for-price');
});

test('weekly and monthly title payments are removed while model hyphens survive', () => {
  for (const suffix of [' - $271.41 /WK', ' - $510/bw', ' $650 per month', ' - $500 bi-weekly']) {
    const fields = importer.headingVehicle(`2023 Ford F-150 Lariat${suffix}`);
    assert.equal(fields.model, 'F-150 Lariat');
  }
  assert.equal(importer.headingVehicle('2023 Ford F-150 Lariat').model, 'F-150 Lariat');
});

test('CARFAX View Report anchors and button attributes retain the exact report query', () => {
  for (const attr of ['href', 'data-carfax-url', 'data-href', 'data-url']) {
    const doc = { querySelectorAll: () => [{ getAttribute: name => name === attr ? reportUrl : null }] };
    assert.equal(importer.extractCarfaxReportUrl(doc, '', legacyUrl), reportUrl);
  }
  assert.equal(importer.carfaxReportUrl(reportUrl.replace('https:', ''), legacyUrl), reportUrl);
});

test('reader links and escaped page data extract each listing’s own CARFAX report', () => {
  assert.equal(importer.extractCarfaxReportUrl(null, `[View Report](${reportUrl})`, legacyUrl), reportUrl);
  assert.equal(importer.extractCarfaxReportUrl(null, JSON.stringify({ report: reportUrl }).replaceAll('/', '\\/').replace('=', '\\u003d'), legacyUrl), reportUrl);
  const anotherReport = 'https://vhr.carfax.ca/?id=OtherVehicle123&language=en';
  assert.equal(importer.extractCarfaxReportUrl(null, `<button data-url="${anotherReport.replace('&', '&amp;')}">View Report</button>`, legacyUrl), anotherReport);
  assert.equal(importer.parseText(listing, legacyUrl).carfaxUrl, undefined, 'never reuse the example vehicle report when none is present');
});

test('CARFAX assets, trade-in pages and unrelated hosts are rejected', () => {
  for (const url of ['https://vhr.carfax.ca/badge.svg', 'https://www.carfax.ca/trade-in', 'https://vhr.carfax.ca.example/?id=123', 'ftp://vhr.carfax.ca/?id=123']) {
    assert.equal(importer.carfaxReportUrl(url, legacyUrl), '');
  }
  assert.equal(importer.extractCarfaxReportUrl(null, '<img src="https://vhr.carfax.ca/badge.png">', legacyUrl), '');
});

test('reader fallback passes the Legacy URL and extracted report into the real scan path', async () => {
  context.fetch = async url => {
    if (url === legacyUrl) throw new Error('Direct fetch blocked');
    assert.equal(url, 'https://r.jina.ai/' + legacyUrl);
    return { ok: true, text: async () => listing + `\n[View Report](${reportUrl})` };
  };
  const result = await importer.scanFacts(legacyUrl, () => {}, vehicle);
  assert.equal(result.mode, 'reader');
  assert.equal(result.fields.price.value, '70990');
  assert.equal(result.fields.carfaxUrl.value, reportUrl);
  assert.equal(result.fields.model.value, 'GRAND WAGONEER SERIES II');
});
