# WO — Live Water Luxury and Latest Stored Reading (2026-10-26)

## Authority / scope
- Owner requested Water Luxury V3.2 to replace ONLY production Water Slide in main, retain PM/Weather rotation, canonical Google Sheet intake, and display latest stored verified observation if no new record.
- Repo aase7en/webapp-widget; isolated worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-water-live-20261026; branch feat/live-water-luxury-20261026 from main 9bf39bc4d0230a947e05eaf765b1ac3911268030.
- Sole candidate writer: integrator. Source Visual: Demo PR #46 head f095100f7dd8d4532a19f077efd0a2c2dcd63c55. Repo AGENTS and SESSION-HANDOFF checked. Other worktrees protected.
- Allowed candidate files: v2/water-luxury-live.{html,css,js}, v2/index.html, v2/api-client.js, apps-script/WaterHistory.gs, tests, this WO.
- Forbidden: new Sheet/Script/trigger, modifying unrelated PM/Weather/GAS BackendApi, wiping rows, fake environmental data, unverified flood warnings or new secrets.
- SAFE_TO_MUTATE isolated branch=YES. SAFE_TO_DEPLOY_GAS_OR_MERGE_MAIN=NO until below gates.

## Data evidence and contract
- One canonical Google Sheet API Report_PM2.5, exact ID 1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w; existing 18-column Water_Level_History.
- Observed actual saved evening 26 Oct 2026: HDA004 2.81 m MSL at 16:10 TH; S5 2.48 m MSL at 15:00 TH. Existing Settings 06 and 16. These are HII REFERENCE STATIONS, not hospital sensors, dam discharge or gate openings. Saved rows show existing daily intake; trigger inventory still unverified.
- Current public bound Script ?action=water_history returns missing for both and two trend points, despite Sheet having typed DATE_TIME newer readings. Bug fix from pending PR #45 incorporated into candidate (text/Date normalization and sync dedupe). No bound-Script release has occurred.
- Last stored verified observation is always historical after 3h, retains ORIGINAL observedAt even after 48h. Unknown/null remains unavailable. Trend history uses real points from 14d window only. No inferred safety threshold: risk always unassessed.
- Ground-to-minimum-bank fraction is only derived from same MSL reference: (water_msl-ground_msl)/(bank_msl-ground_msl); never call it water volume, discharge or an approved risk status.
- Backend reader must use existing container-bound Apps Script and original Sheet, not create a parallel source. Existing fallback water-data is legacy; not a new backend.

## UI implementation
- v2/index.html overlays water-only iframe inside Water article; old PM, Weather, three-slide rotation and legacy water DOM remain for safe rollback.
- New physical 432x40 Water Luxury draws HDA004/S5 and sampled animation artwork, strictly no sample mode/buttons/fictional numbers. All readable measurements and timestamps are from UthApiClient.getWater (existing fixed canonical Sheet route).
- Browser check: parent three slides, child 2 stations, zero DEMO controls; injected test-only values 7 days old correctly show 2.81 and 2.48 m MSL, historical badges and original dates, with derived 92.2 and 83.3 percent. The injected fixture is NOT real current provider response.

## Mandatory Release gates (not yet met)
1. Verify existing container-bound Apps Script ID 1H7_0yH9yFDSDKhe66IhhRvyeVgV4rdI8R96stDY0cIbnOfemiCHvlejj, current HEAD/content hash, original public Web App deployment ID/version and trigger inventory. Take verified secure content+version backup. Authenticated Apps Script API operation is currently blocked by available runtime security; NEVER circumvent by disabling TLS/security or copying tokens into commands/logs.
2. Independent review of backend and frontend, complete regression, hosted CI on exact candidate SHA and documented rollback.
3. Deploy updated WaterHistory.gs to the SAME bound Script and EXISTING Web App deployment ID only after authenticated safe backup. Verify ?action=water_history returns latest canonical Sheet records with real source observedAt and ?action=data&v=1 PM/Weather still operates. Check no extra triggers/no new Sheets.
4. ONLY THEN merge candidate PR into main with expected head SHA. Verify deployed https://aase7en.github.io/webapp-widget/ through actual PM/Weather/Water rotation and latest-stored historical case; rollback by approved GitHub revert if failed.

## Current next action
- Complete isolated candidate tests and PR, then obtain AUTHORIZED bound-Script runtime/deployment/trigger inventory, arrange independent review and verified backup. Do not merge or claim LIVE until all gates pass.

## Owner correction — replace old Water Slide, never overlay (2026-10-26 evening TH)
- The user inspected candidate PR #47 and reported both old and new Water UI visible at once. Root cause confirmed in v2/index.html: old Water station DOM, graphs and render handler were retained, with new iframe inserted as a sibling overlay. This approach was incorrect for Production.
- **Repair:** remove the ENTIRE legacy Water article content and old Water-only JS handlers; replace article #3 with ONE iframe Water Luxury V3.2. Preserve existing PM and Weather article, their sources, and three-item 22s rotation. Inactive legacy CSS selector declarations remain temporarily inert pending separate safe cleanup, but NO legacy Water DOM or handlers remain. The parent button now forwards refresh to the single new iframe; no duplicated data rendering.
- Browser DOM verification: three slide articles, one child Water iframe 432×40, exactly two source stations, old station/gate/spill and old history elements count=0, no test/demo switches, PM/Weather present, zero JS errors.
- In child water-luxury-live.js, preserve a previously VERIFIED in-memory measured reading and original timestamp if a later transport response becomes missing or older. Keep it historical when it ages, never relabel fetched time as observed time; reload still depends on the canonical Apps Script endpoint.
- Data blocker reconfirmed against actual source: existing Water_Level_History shows 26 Oct 2026 evening HDA004 2.81 m MSL observed 16:10 and S5 2.48 m MSL observed 15:00; deployed public ?action=water_history returns missing/null both as of ~19:55 local TH. Correcting the HTML does not remedy deployed Apps Script. It is unsafe to merge production UI before the existing GAS reader is updated with verified backup/runtime review.
- Correctness decision: no backend deployment, no main merge, no Sheet writes, no fabricated values until the pre-existing runtime/deployment verification gate is satisfied.

## Backend production incident resolved — 2026-10-26 20:xx Asia/Bangkok
- The owner explicitly requested the canonical Backend be fixed because Water Luxury showed missing values.
- Verified **existing Google Apps Script** project ID and SAME public deployment ID (ends EvE6dk): active pre-change version 33. Authorized official Google clasp 3.4.1 connected with the existing owner account. Pulled protected source both HEAD and immutable version 33; their five source files were byte-identical.
- Before any mutation, copied all five live source files to a 0700-owned private Mac backup directory with file permissions 0600 and SHA-256 manifest; deployment 33 retained as rollback point. No secrets, tokens, or raw backend sources added to repo.
- Only candidate WaterHistory.gs was copied into the pulled runtime project as WaterHistory.js. Diff vs v33: interpret typed Google Sheets DATE_TIME as Date; normalize/de-dupe observed timestamps; select newest eligible Sheet record irrespective of age; separate 14d real-trend window from latest-ever saved observation; always risk='unassessed'. Four other script sources and manifest were validated byte-identical before and after push.
- Full 312/312 local tests passed; independent **read-only** third-party model review of WaterHistory and tests returned PASS. Reviewer of production Water UI also returned PASS. No code-writing permissions delegated.
- Authorized clasp push committed matching source to existing Script HEAD, created immutable **version 34**, updated EXACT SAME active Web App deployment to v34 (no new Script, Sheet, trigger or alternate deployment). Clasp deployment listing confirmed v34.
- Verified actual public GET ?action=water_history returns HDA004 status historical, 2.81 m MSL observed 2026-10-26T09:10:00Z, bank 3.03, ground .227; S5 historical, 2.48 m MSL observed 2026-10-26T08:00:00Z, bank 4.7, ground -8.59. Both with nine real trend points and unassessed risk.
- Independently fetched existing ?action=data&v=1: PM2.5 status ok, Weather status ok. Verified read-only in Chrome: hosted candidate PR #47 Water Luxury renders both real values/times, historical badges, 92.2/83.3% derived elevation intervals without DEMO controls and no JS exceptions.
- Verified *currently deployed main* old Water slide on GitHub Pages now also displays HDA004=2.81, S5=2.48, with HISTORICAL source note and zero JS exceptions. Thus the owner's immediate 'numbers missing' issue is fixed even before UI merge.
- Trigger inventory exact count was not accessible: existing read-only verifyLedBackend command returned Google Script execution NOT_FOUND; **no triggers were installed/deleted/changed** by this release. Existing Sheet rows still evidence scheduled morning/evening intake. Do not claim trigger inventory has been independently audited.
- **Status:** GAS release v34 DEPLOYED & VERIFIED; main frontend still older version, PR #47 remains DRAFT, not merged. Next safe action: finish trigger inventory/UI release governance, confirm branch CI/head against main, then merge PR #47 if all gates satisfy; verify actual GitHub Pages Water Luxury 3-slide rotation and use revert of merge commit if frontend regression. Backend rollback target: existing deployment version 33, whose missing latest readings bug must be considered before rollback.

## Owner-authorized go-live — 2026-10-26 21:xx Asia/Bangkok
- Owner explicitly directed live main deployment with HII API -> existing scheduled bound Apps Script -> canonical existing Google Sheet -> Widget. On HII failure, leave Sheet data untouched; Widget reads latest stored verified observation as HISTORICAL with actual observedAt, never claims live/flood safety.
- Final frontend candidate removes the former GitHub/direct HII fallback in v2/api-client.js and retains ONLY existing water_history bound-Sheet JSONP transport. Previous verified in-memory snapshot is retained on transient Sheet transport failure; no independent provider data is substituted. Removed dead direct-HII parser and set risk unassessed unconditionally.
- Canonical apps-script/WaterHistory.gs sync now fetches ONLY the configured HII API on existing scheduled runs; it no longer fetches water-data GitHub backup. HTTP 429 regression confirms failure causes no new Sheet rows and preserves last stored observations.
- Independent read-only review: PASS. Final full unit suite: 313/313 PASS. Chrome with real v35 backend: HDA004 2.81 m MSL, S5 2.48 m MSL, both historical with true observed times and zero JS exceptions. Exactly one Water iframe replaces all old Water DOM; PM/Weather still on original three-slide rotation.
- Backed up authorized existing bound Apps Script v34 privately on Mac (private directory 0700, files 0600, checksum manifest, immutable version rollback). Changed only WaterHistory.js; all other Script source files and manifest byte-identical after pull. Created immutable v35 and deployed SAME existing public Web App ID ending EvE6dk, no new Script/Sheet/trigger.
- Actual public ?action=water_history after v35 returns 2.81 HDA004 at 2026-10-26 16:10 TH and 2.48 S5 at 15:00 TH, both historical and risk unassessed. PM2.5 and Weather from ?action=data&v=1 continue reporting ok.
- Exact trigger inventory count remains unknown because Script execution API returned NOT_FOUND; no trigger was created/deleted/modified, with current morning/evening Sheet rows verifying actual scheduled ingest. Do NOT misreport direct trigger inventory as verified. Owner explicitly requested cutover after successful backend/UI verification.
- Main release only via exact-SHA CI-green reviewed PR merge; after merge verify public GitHub Pages real 3-slide rotation and values; rollback frontend with revert merge if necessary. Backend rollback target v34; v33 has typed DATE_TIME bug.
