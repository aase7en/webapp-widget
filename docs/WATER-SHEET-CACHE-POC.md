# UTH[AI] Water to Google Sheets bridge (candidate; NOT production)

SCOPE: aase7en/webapp-widget only. Branch: sol/water-sheet-bridge-20261022.
This is an isolated candidate: no production web page, PM2.5 script or existing trigger is changed.

## Grounded sources (2026-10-22)
Primary: https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load
Station HDA004 has HII station.id=471583, tele_station_oldcode=HDA004.
Station S.5 has HII station.id=2607, tele_station_oldcode=S.5.
Fallback: https://raw.githubusercontent.com/aase7en/webapp-widget/water-data/water.json
Fallback source preserves original HII measurement time. It is not always current.

RID website: https://hyd-app-db.rid.go.th/hydro5h.html
RID GetColModelHL group 704 maps S.26 (RID ID 353) and S.5 (RID ID 349).
Hourly endpoint: /webservice/getGroupHourlyWaterLevelReportHL.ashx with POST form.
RID group 1072 includes C.35. No HDA004 mapping verified in inspected RID groups.
HII 2607 and RID 349 are different provider identifiers, even though both label S.5.
RID wlvalues columns depend on dynamic source/date mapping; qvalues may be
unavailable as ** rather than zero. RID adapter is OUT OF SCOPE pending reviewed
station/datum/time/column contract and provider access limits.

## Dedicated Google Sheet
- water_latest: latest verified real observations by station.
- water_history: deduplicated station/time snapshots.
- sync_log: successes, source failures and exception logging.
- station_registry: validated station metadata.
Sheet remains private. Only public-provider station readings may be served by
a public Apps Script endpoint, after deliberate review.

## Activation instructions (still pending)
1. In script.google.com create a NEW standalone Apps Script project,
   NOT the existing hospital PM2.5 Script.
2. Copy apps-script/WaterSheetBackend.gs from this branch. Choose V8 and
   set project timezone to Asia/Bangkok.
3. In Project Settings -> Script Properties, set UTH_WATER_SHEET_ID
   to the ID of the dedicated new Water Level Cache Google Sheet.
   This ID is provided to the owner privately; do not commit it into code.
4. Run syncWaterLevels once and approve the required Google permissions.
   Verify latest/history/log and time provenance in the Sheet.
5. Run installWaterTriggers once. Verify two time-driven daily jobs:
   ~06:00 and ~18:00 Asia/Bangkok (nearMinute scheduling allows ±15 min).
6. Deploy -> New deployment -> Web app; execute as owner; grant public
   access ONLY after confirming these public station observations are
   appropriate for anonymous read. Test GET /exec?action=water for JSON and
   /exec?action=water&callback=waterCb_1 for read-only validated JSONP.
7. Observe morning and evening executions before integrating in UI.
   ContentService redirects to googleusercontent; do not assume CORS fetch
   works on older browsers. JSONP is read-only non-sensitive public data.
8. Build a distinct reviewed frontend PR to optionally read this backend.
   Preserve existing working GitHub water-data feed during rollout.
   NO LIVE CUTOVER from this candidate.

## Freshness and safety contract
- FRESH only when SOURCE OBSERVED TIME age is at most 3 hours.
- HISTORICAL between 3h and 48h, with clear old-reading label.
- MISSING beyond 48h, unreadable, invalid or unknown: levelMslM is null,
  never an invented zero. Actual numeric zero is retained if source says 0.
- observedAt is real provider observation time, never fetchedAt or generatedAt.
- 2/day monitoring cannot be used as an early-warning realtime flood service.
- Never infer a present flood safety level from older observations.

## Verification
Node test harness runs six checks for station IDs, timestamp validation,
dedupe/failure, stale/historical, JSONP safety and time-trigger creation.
It mocks Apps Script; these tests do not demonstrate actual Google auth,
real triggers or deployed URL behavior.

Rollback: keep production GitHub Pages and existing Action unchanged.
For the standalone project only, disable its two new triggers if required.
Preserve historical Sheet rows and sync logs for audit. Do not delete
other people's triggers or edit PM2.5 existing Code.gs/BackendApi.gs.
