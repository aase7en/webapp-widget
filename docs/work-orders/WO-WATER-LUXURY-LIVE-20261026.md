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
