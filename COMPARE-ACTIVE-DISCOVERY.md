# Active Compare preparation — unreleased

Status: 2026-11-15. This is preparation based on TEST .49 / main a3cbd0a.
It is not a working live-source integration or a .50 release. index.html, service
worker, release metadata and APK are unchanged. Do not merge/promote this as
completed automatic search. Unrelated .48 upload work remains paused.

## Required outcome

Vehicle Wanted is an exact listing URL, not an Inventory-only selector. Read and
verify its facts through an authorized source. Each source has its own vehicle
criteria or reuses Wanted: base year plus/minus an inclusive year delta, make,
model and preferred trim. Other trims remain labelled alternatives. Blank low or
high prices mean no bound. A dealer source accepts a website; a platform offers
only regions/distances its connected service and subscription actually support.

Results show the starred Wanted reference among price-sorted alternatives, with
linked Stock #, mileage, vehicle location and price difference. Keep unknown
facts, provenance and reliable same-vehicle deduplication. The existing single
replaceable private Drive report and account/Store boundaries must be retained.

## Saved implementation

- `lotkeys-compare-search.js`: injectable discovery coordinator, URL/query checks,
  capabilities, exact target check, per-source requests, pagination/request/result
  budgets, bounded waits/cancellation, account/Store checks and partial coverage.
  Explicit source filters are rechecked; unknown bounded facts are separated for
  review. Known generation/body conflicts are excluded; other trims are retained.
- `lotkeys-compare-search-ui.js`: standalone source field component. It emits a
  query or edits to its owner; it does not persist, fetch or call Google. It shows
  disconnected status and disables Find until a ready service is supplied.
  Retired components cannot emit edits. It is not wired into the app controller.
- `lotkeys-compare.js`: location-aware normalization, report/copy/Docs output,
  conflicting source locations retained, discovery coverage/criteria and review
  sections. Existing manual reports keep their explicit manual limitation.
- New Node, DOM and Chromium component checks are included in the web workflow.
  Existing Compare controller remount/receipt protections are unchanged.

No vendor transport, hosted backend, key, source account or subscription exists
in this patch. Tests inject synthetic capabilities and listings. A caller cannot
turn this into authorized access merely by setting `status: 'ready'`.

## Service contract

`createCoordinator(io)` requires these async functions:

- `context()` returns a fresh account/sub/Store/root/epoch identity. The coordinator
  snapshots it and rejects changed contexts before adopting delayed results.
- `capabilities({signal})` returns `{status, maxSources, maxRequests, sources}`.
  Each source advertises id/name/kind/status, priceRange and maxPages. Dealer
  sources advertise websiteFilter and approved websiteHosts. Platform sources
  advertise distanceRequired where applicable and distanceOptions: radius in km,
  province with supported codes, or national with actual country support.
- `resolveWanted(exactUrl, {signal})` returns `{row}` only after verifying that exact
  listing. The row URL must match its canonical URL. The adapter must preserve a
  verified relationship if a publisher legitimately redirects a listing; do not
  silently substitute another vehicle. Unknown facts remain empty.
- `search(plan, {cursor, signal})` returns `{rows, nextCursor}` from the authorized
  source. Row facts include year/make/model/trim, price/currency, stock, VIN,
  generation/body when known, kilometres or explicit odometer unit, exact listing
  URL, actual vehicle city/province/country/location, distanceKm when verified,
  and observedAt. Dealer group headquarters is not a vehicle location.

The trusted service must enforce authentication/Store entitlement, source
allowlists and licence, quota and spending limits, unit/currency conversion,
response bounds and actual geographic semantics. The client does not perform
those server security functions. HTTPS/public-URL checks are not SSRF protection:
any server-side URL reader must validate DNS/resolved addresses and each redirect,
reject private/local destinations and limit body size/content type/time/redirects.
Never embed provider keys in GitHub Pages JavaScript or ask users to paste keys
into Compare. Do not forward LotKeys Drive tokens to an unrelated listing vendor.
Keep backend details outside ordinary customer UI.

Budgets in this preparation bound client service requests, not all downstream
provider/tool queries or charges. Enforce the latter on the server. Do not bypass
source restrictions with an importer, proxy, user-agent change or alternate URL.

## Source investigation and blocker

Checked primary documentation 2026-11-15; availability/pricing/licences can change.
No purchase, signup, account creation, permission change or vendor contact occurred.

- A sampled Legacy exact vehicle page responded HTTP 200 without an
  Access-Control-Allow-Origin header for TEST. Its robots file does not itself
  establish a commercial feed licence. A browser-only direct reader is therefore
  insufficient; approved feed/server access and terms remain unresolved.
- AutoTrader's [terms](https://www.autotrader.ca/company/terms-of-use/) and
  [CarGurus terms](https://www.cargurus.ca/about/terms-of-use) restrict automated
  collection. CarGurus' [selector API](https://www.cargurus.com/Cars/developers/docs/CarSelector.html)
  provides selectors/redirects, not the needed inventory result feed. No live
  platform adapter or entitlement is available.
- [Google Custom Search JSON](https://developers.google.com/custom-search/v1/overview)
  is closed to new customers; existing access ends January 1, 2027.
- [Gemini grounding](https://ai.google.dev/gemini-api/docs/google-search) can actively
  search, but its [terms](https://ai.google.dev/gemini-api/terms#grounding-with-google-search)
  restrict modifying/interspersing results and programmatic storage/collection.
  Do not assume it permits parsing, sorting and automatically replacing a Drive
  report. Assess a permitted output design or obtain written permission first.
  URL Context is not permission to crawl a prohibited source.
- [OmniaAuto pricing/licence](https://omniaauto.ca/pricing) and
  [terms](https://omniaauto.ca/terms) limit standard plans to internal use; exposing
  data in a customer-facing product needs permission. Its [integration notes](https://omniaauto.ca/llms.txt)
  say listing_url is omitted from REST/feed/snapshot and appears only in MCP.
  Low prepaid call pricing alone does not make it fit the linked public product.
- [MarketCheck Canadian inventory](https://docs.marketcheck.com/docs/api/cars/inventory/inventory-search)
  is a possible licensed feed, subject to entitlement and product rights. Its
  [published plans](https://www.marketcheck.com/pricing) cap Free/Basic radius at
  100 miles; do not offer 500 km or national for those plans. Mileage/radius/dist
  are miles even with Canadian inventory; price is CAD for country=ca. No live
  account, exact-URL target lookup or adapter has been verified. Its current
  [terms](https://www.marketcheck.com/terms-of-service), sections 3–6, allow live
  user-driven application queries but restrict persistent/independent datasets,
  competing data services and data-acquisition targeting. A small, replaceable
  shareable Drive report is not established as permitted or prohibited by that
  general wording; the intended use needs confirmation. Commercial integration
  may require a separate agreement. Never treat API availability as report rights.
- [Cardog](https://cardog.app/docs) documents Canadian listings and a
  [listing search API](https://cardog.app/docs/reference/listings) with registered
  make/model refs, year/price bounds, seller IDs and latitude/longitude/radius in
  kilometres. A seller-ID filter is not a verified arbitrary dealer-website
  filter, and radius support does not establish provincial/national options.
  Its [API terms](https://cardog.app/api-terms), sections 3, 5 and 11, permit
  automation and subordinate use/display within authorized customer applications,
  subject to required attribution, response metadata, data-family retention and
  source restrictions. Bulk standalone data redistribution is restricted. Keep
  freshness/unknown facts and source metadata; do not infer report-export rights
  from the general display licence. Legacy coverage, exact Wanted-URL resolution,
  live stock/link mapping, price/odometer units and permission to retain/share
  the replaceable Drive report remain unverified. The published detail example
  includes `sourceUri`, `stockNumber`, location and observation timestamps; those
  are documented fields, not evidence of Legacy coverage or current availability.
  [Published pricing](https://cardog.app/pricing), checked 2026-11-15, offers
  50 free credits monthly with no card and stops at the allowance (after any
  separately purchased packs). Listing search/count/facets/detail each cost one
  credit per request. Prices are USD; actual account entitlement/metering has not
  been tested. No key, signup, API call or purchase was made. This remains a
  research candidate, not a connected integration. The reviewed listing reference
  does not settle data-family attribution/retention or shareable report rights.
- [Brave Search](https://brave.com/search/api/) has low per-query pricing but says
  storage rights need a custom plan; its [standard terms](https://api-dashboard.search.brave.com/documentation/resources/terms-of-service)
  limit caching/storage and redistribution. Do not assume a persisted Drive
  comparison is permitted under its standard search plan.

The immediate blocker is an approved feed/search entitlement that permits this
product's result display, listing links and private replaceable report, plus an
approved private host for credentials. Prefer evaluating an existing authorized
dealer feed for the smallest pilot; do not silently create a paid vendor account
or start a new infrastructure migration. Ask for provider name/access method via
secure setup, never a secret in chat. A source-selection question is pending.

## Cardog coverage check — design only

No signup, API use, spending or outreach is authorized by this research update.
If access is separately authorized later, use the existing provider-neutral
contract and a private server-side key, with a total ceiling of 10 credits for
an initial check. That is a proposed engineering limit, not a provider promise
or an executed test. Include ref resolution, pages, details and any retry in the
budget, inspect credit headers and stop before exceeding it. Do not buy packs,
upgrade plans, automatically retry or assume 50 credits means 50 full comparisons.

Use one small source search and only a few details, resolving required refs first.
Verify a known Legacy vehicle's exact URL or VIN relationship, dealer/site mapping,
stock, CAD price, odometer units and real location. Treat zero matches as inconclusive.
Preserve last-seen/verification timestamps, status and source metadata; neither a
successful response nor `updatedAt` alone proves a live, recently observed vehicle.
Check practical coverage separately from the documented filter support. Do not
crawl returned source links or assume arbitrary website/exact-URL lookup exists.

Keep the initial result ephemeral. Establish required attribution, freshness,
retention and permission for a private shareable Drive report before adding any
provider result to the existing saved-report flow. No duplicate source-specific
UI, new adapter or change to app/Drive/account/remount code is needed for this
research step. A useful free allowance removes neither the source-rights blocker
nor the secure-backend/app-integration and real-account validation gates.

## Validation and continuation

Local: 533 Node tests, 35 DOM tests and 33 JavaScript syntax checks pass; diff
check passes. New-source tests use synthetic data, not live provider responses.
Local Chromium cannot launch because the execution environment denies its Unix
socket operation. [CI 43670313470](https://github.com/MrMilo34/Lot-Keys-TEST/actions/runs/43670313470)
passed at source commit 901e0478, including the existing full-app browser/remount
checks and the new standalone query component at 1280/390/320 px. The component
had no overflow, page errors or external requests. Its 320/1280 screenshots were
also inspected. Follow-up changes add source research and preserve exclusion
precedence when a returned listing has no URL. The regression first reproduced
on a 2010 vehicle in a 2024 search; year/make/model/price/region mismatches remain
excluded, with the missing-link diagnostic retained. Otherwise eligible unlinked
vehicles still require review. Existing Drive/account/remount safeguards are
unchanged. Record follow-up CI against its actual revision in the PR. No physical
phone, real source, LotKeys browser OAuth renewal or authenticated app Drive test
has occurred here.

Before TEST promotion:

1. Resolve source entitlement, budget and secure backend ownership. Verify exact
   Wanted resolution, actual listings/links, CAD/mileage/location and query limits
   against a small approved sample. Label incomplete coverage honestly.
2. Implement and test the adapter and authentication. Wire this component and
   coordinator into the existing Compare controller using its owner/epoch,
   serialized persistence and successful-receipt reconciliation. Do not introduce
   new settings keys or overwrite saved source/target edits during migration.
3. Verify delayed/cancelled searches, low bandwidth, partial source errors,
   remounts, account/Store switching, updated source edits and price/region bounds.
4. Verify app-authorized isolated Drive replacement/reload without changing real
   user reports or resetting authorization. Then exercise a real phone separately.
5. Update version/build/service-worker together for the actual release, run normal
   TEST checks, and verify Pages/live bytes. Preserve .48 rollback f7ec1b8,
   original signed .46 APK, existing data/queues and production.
