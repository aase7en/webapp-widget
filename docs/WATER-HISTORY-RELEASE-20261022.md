# Water History + LED PM AQI scale — release contract (2026-10-22)

**Repository:** aase7en/webapp-widget (NOT env-wastewater-webapp).
**Canonical datastore:** existing Google Sheet `API Report_PM2.5`, exact original Sheet ID `1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w`.
**Only Apps Script project:** existing container-bound Script ID `1H7_0yH9yFDSDKhe66IhhRvyeVgV4rdI8R96stDY0cIbnOfemiCHvlejj`. DO NOT create new Sheet or Script.

## Observed source and cadence

- Source: verified HII public waterlevel_load, station identity HDA004/471583 and S.5/2607, timestamp in Asia/Bangkok and datum MSL.
- Existing `Settings` has `history_morning_hour=6` and `history_evening_hour=16`; existing `History_Batch` recorded both slots through 2026-10-22.
- Code attaches `WaterHistory.sync()` to **existing** `BackendApiHistoryBatch_` owner schedule. No new triggers. At most 1 HII GET per run, checked backup GitHub water-data only if primary is unavailable/incomplete. No HII fetch from WebApp doGet or LED browser.
- Once the existing Apps Script is live, remove GitHub water-cache GitHub Action recurring 15-minute cron; preserve manual dispatch fallback.
- Append validated HII reading to existing `Water_Level_History` header preserving all 18 columns and de-duping station+source observation timestamp.
- Existing Sheet already has 4 verified_seed rows, real source times: S5 2.98 @2026-10-22 20:00, HDA004 2.91 @2026-10-22 21:20, S5 3.00 @2026-10-22 23:00, HDA004 2.91 @2026-10-23 00:00. These are verified snapshots not simulated trends. `fetched_at_utc` deliberately blank where source fetch instant was unrecorded.
- Web App public `?action=water_history` = **read-only Sheet data**; no provider API; JSONP callback strictly validated; no hospital or private data in response.
- Distinguish latest 0-3h, historical 3-48h and missing >48h. No counterfeit zero, future timestamps or flood-safety warning from history. HII station values are not on-premise measurements.

## Browser/release contract

- `v2/index.html` is mounted inside the 432x40 public root iframe. PM tick bar: 47→64px; five colored spaced labels, right-aligned location with no overflow.
- Full, non-LED report shows 2 historical charts driven by distinct true timestamps; 432x40 LED shows tiny station sparklines (large full-report charts suppressed in LED mode).
- Client first tries existing GAS deployment `?action=water_history`; static GitHub water-data fallback only if uninstalled/unavailable; source age always revalidated.
- Existing PM2.5/Weather routes and private production Google Script credentials MUST remain byte-identical outside strictly reviewed patch portions.

## Verification/release order — no shortcuts

1. Confirm no unowned dirty files in rollout worktree and no unexpected branch changes. Preserve dirty root Mac checkout.
2. Run 275+ unit tests plus independent exact-SHA review. Browser test actual 432x40, full chart and status with fixture (fixture is not real).
3. Preserve secure byte-for-byte **pre-change** current bound Apps Script clone OUTSIDE repo. Never copy private `code.js` into public GitHub.
4. In a separate secure deploy clone, patch only the live original code.js doGet router and BackendApi.js wrapper and append WaterHistory.js. Preserve old appsscript manifest/html and other code. Verify diff is only approved hunks; re-check no drift before push. Do not push sanitized reference `Code.gs` with redacted tokens to owner Script.
5. Use clasp push to same existing script and clasp version to create immutable version; update **the existing** public WebApp deployment ID (V1.5 @32 before release) with `clasp deploy -i`, never create a new WebApp URL. Re-check existing `?action=data&v=1` PM backend and new `?action=water_history` JSONP with true sheet data.
6. After backend acceptance, merge reviewed PR changing frontend and disabling GitHub 15min cron. Reconfirm GitHub Pages public LED and report in Chrome, Graphs >1 observed point from Sheet, true non-live labelling.
7. Rollback: redeploy same WebApp ID to pre-change version 32, revert frontend/GitHub workflow change via an approved rollback commit, preserve canonical Sheet history. Note that source HEAD (trigger runtime) may require reverting patch in same Script to restore old scheduled handler (secure original clone). Never create alternative spreadsheet/script.

## Documentation checkpoints
- `AGENTS.md` canonical backend invariant.
- `SESSION-HANDOFF.md` current status/pending exact-SHA release.
- `.agents/skills/handoff/SKILL.md` compact safe handoff.
