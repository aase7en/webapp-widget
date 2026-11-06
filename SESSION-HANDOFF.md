# ACTIVE HANDOFF — Three-page LED visual approval and Weather Motion (2026-11-07 Asia/Bangkok)

> **This section is the current continuation checkpoint for the LED visual lane.** The 2026-10-22 Sheet/Apps Script content below is retained as historical context, **not** the active next action for this visual task. Re-verify repo/runtime/PRs before any mutation. One canonical tracked handoff: root `SESSION-HANDOFF.md`.

## Context and owner intent
- **Exact repository:** `aase7en/webapp-widget`, **NOT** `env-wastewater-webapp`.
- The owner likes the Luxury Weather 4+3 layout, crisp Rain/Humidity/High/Low metrics, fixed clock and border. The owner also likes the newer vivid rain/thunderstorm animation and wants to compare three screens' typography/alignment before approving a change to the real website.
- Requested final next-session discussion: review the *interactive* PM2.5, Weather, Water Level before/after comparison; decide which adjustments (if any) to move to Production. The user's 2026-11-06 17:00 instruction explicitly requires seeing **all 3** before approval.
- Do **not** infer approval to merge the three-page typography preview. Do not infer the owner's positive feedback on animation is a final production merge authorization. Suggest optional 2.5D cloud depth / restrained luxury lighting, but avoid sacrificing visibility at 432×40.

## Source of truth, verified 2026-11-07
- Current `origin/main`: `aa2c61ed4390c87e465d05695c2019e1aada4d08` (PR #94 degree-unit and Luxury border fix). Production website: https://aase7en.github.io/webapp-widget/ and Weather page https://aase7en.github.io/webapp-widget/v2/weather-luxury.html .
- Owner-requested Weather Animation PR **#95 OPEN, not merged**, head `2e76f427c4ef51f9963be44a75505f1b87cb14d5`, base `aa2c61e`, two Hosted CI jobs successful (`verify`, `water-led-test`), no GitHub review approvals as checked. https://github.com/aase7en/webapp-widget/pull/95
- PR #95 scope: plump blue clouds placed lower, higher-contrast mixed rain droplets, animated lightning and gusts on day/night thunderstorms; four 128×128/96-frame APNG conditions and independent `*-led-poster.png` reduced-motion hero posters. Existing mini forecast posters deliberately remain byte-identical. Work order: `docs/work-orders/WO-WEATHER-STORM-MOTION-20261106.md` **in PR #95 branch**, not current main. Source generator `scripts/build-weather-storm-motion.py`; QA `scripts/qa-weather-storm-motion.cjs` in that branch. Current PR head is clean on the Mac worktree:
  `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-weather-storm-clarity-20261106`, branch `feat/weather-storm-clarity-20261106`.
- **Published isolated animated Preview:** https://aase7en.github.io/uth-weather-led-ab-preview-20261104/storm-motion-20261106/ ; four selectable conditions (rain, thunderstorm, night rain, night storm), APNG/poster toggle, native 432×40 / zoom 3×. Layout/background/values are **SIMULATED**, never operational data.
- **Published interactive 3-page comparison:** https://aase7en.github.io/uth-weather-led-ab-preview-20261104/typography-review-20261106/?v=8367836 ; source repo `aase7en/uth-weather-led-ab-preview-20261104` main `83678368ae990db2e3a848c81b4ff4c295817b33`, Pages status BUILT, HTTP 200, Mac worktree clean at `/Volumes/MAC_WORK/DevWorkspace/Github/uth-weather-led-ab-preview-20261104`.
- Comparison includes PM2.5, Weather, Water Level; three modes `current` / `aligned` / `before+after`, centerline at native LED y=20, native 1× / zoom 3×, iPhone-size mobile horizontal scroll. Live public URL tested Chrome/Puppeteer **PASS**, no relevant failed page assets (optional site favicon 404 excluded). All numbers are **SIMULATED** design fixtures; Water Level contains two stations, HDA004 and S.5.
- The proposed typography is **not approved** and is only a visual CSS experiment: pre-scale board 1296×120 (native LED divides by 3): PM2.5 `112px / 1000` -> `100px / 900`; Weather temperature `92px / 900` -> `90px / 900` with minor vertical shift; Water Level `66px / 1000` -> `68px / 1000` with reading row shifted ~6 pre-scale pixels down. Clock `64px / 900`, native x≈6.67px unchanged. **Recommendation:** optical alignment, not identical font-size; preserve unit legibility and station names.
- The Mac repository root `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget` is **dirty with untracked `.kilo/`, `.tmp/`, `kilo/`** on branch `fix/weather-unit-persistence-20261101`. Never stash/reset/edit it. Windows worktree must be rechecked. Treat other agents' branches/worktrees as owned by them.
- This handoff itself is prepared on a NEW isolated docs-only worktree/branch `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-handoff-threepage-20261107`, `docs/handoff-three-page-led-20261107`. It does not grant any Production mutation authority.

## Safety and release gates
- One canonical Google Sheet `API Report_PM2.5` (ID `1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w`) with **existing bound Apps Script**. Never create extra Sheet/Script or change their data in a visual design task. Preserve `Source`, `observedAt`, `HISTORICAL` / `UNAVAILABLE`, model-vs-measured provenance, and null != zero.
- Preserve existing Weather, Water, PM2.5 pipelines, Luxury clock, border, icon animation fallback, accessibility, reduced motion, 4+3 daily rotation and 432×40 presentation. Prefer scoped CSS/renderer edits and rollback.
- A previous off-platform GLM review on an earlier PR #95 head identified forecast poster cropping, corrected by separate hero `*-led-poster.png`. **Independent review at current exact SHA `2e76f42` has not been confirmed**; do not claim review gate passed merely from CI.
- Real physical LED long-distance visibility and real iPhone Safari remain **UNVERIFIED**. Production integration requires owner visual decision plus exact-SHA independent review, hosted CI, browser QA (432×40 and mobile), scoped PR, rollback and post-merge Pages checks. A public Preview build is not a Production release.

## ONE next safe action
**Open and review the three-page interactive Preview with the owner and obtain an explicit per-page design choice** (keep current / accept aligned / specify custom refinements), including whether to apply the new Weather animation from PR #95. Reverify latest main, branch ownership, PR #95, and page status first; do not redo completed comparison work. Once choices are explicit, prepare scoped implementation plan/work order and isolated worktree(s) before changing Production. Report Verified / Unverified and any release decision needed.

## References / suggested skills
- `AGENTS.md`, `.agents/skills/handoff/SKILL.md`, `SESSION-HANDOFF.md`, `docs/work-orders/WO-WEATHER-HYBRID-LIVE-20261105.md`, PR #95 work order, tests and GitHub Actions.
- A-Wiki prompt placement protocol `aase7en/A-Wiki:docs/protocols/prompt-placement-protocol.md` — for new-chat continuation use **CHAT — NORMAL**, not a replacement Goal.
- Use project-local `handoff`, `code-review`, browser QA and, if needed, Google Sheets connector *read-only*, with evidence from the current live system. No secret/PHI/PII/raw-data disclosures.

---

# SESSION-HANDOFF — webapp-widget
<!-- A handoff is a portable checkpoint, NOT a substitute for actual repo/runtime verification. -->
**Checkpoint:** 2026-10-22, Asia/Bangkok. **Focus:** one existing Google Sheet + its container-bound Apps Script; continuity when swapping sessions.
**Repository (not ENV wastewater app):** https://github.com/aase7en/webapp-widget
**Worktree for this checkpoint:** /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-handoff-20261022
**Source/review:** https://www.aihero.dev/skills-handoff and https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md

## First action for a fresh agent
1. Read `AGENTS.md`, then this file and only relevant `README.md`, `LED-ROTATION.md`, `WATER-LED.md`, `apps-script/BackendApi.gs`, PRs and tests.
2. Verify GitHub origin/main SHA, the true running Apps Script deployment, the exact linked Google Sheet's current schema/data, its trigger inventory, and all local worktrees/dirty ownership. Recheck all facts below; do not assume this checkpoint is still current.
3. **ONE next safe action:** compare the now-verified bound Apps Script source and deployed versions with repo-sanitized Code.gs and BackendApi.gs; check its trigger inventory and the canonical Water_Level_History, capture a secure baseline backup, resolve ownership/approval before any change. Do not create a new script.

## Verified bound Apps Script identity — 2026-10-22 (authenticated read-only API)

- Owner-provided editor URL: https://script.google.com/u/0/home/projects/1H7_0yH9yFDSDKhe66IhhRvyeVgV4rdI8R96stDY0cIbnOfemiCHvlejj/edit
- Script ID: 1H7_0yH9yFDSDKhe66IhhRvyeVgV4rdI8R96stDY0cIbnOfemiCHvlejj.
- Google Apps Script projects.get HTTP 200; title API Report_PM2.5; parentId EXACT MATCH to canonical spreadsheet ID 1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w. Existing container-bound Script positively identified.
- Google Apps Script projects.getContent HTTP 200; files: appsscript JSON, BackendApi server JS, code server JS, index HTML.
- Google Apps Script deployments.list HTTP 200; 21 deployment records at checkpoint. Which deployment is currently in use is NOT verified by this count.
- Prior clasp list returned only 10 listed projects, excluding this Script; a non-exhaustive listing caused the previous discovery failure. The owner does NOT need to supply this link again.
- NOT YET VERIFIED: active installed triggers, production deployed version, current runtime-vs-GitHub source diff, actual two-daily water history execution. NO Apps Script editing, trigger changes or deployment performed here.
- Never expose token-containing source files, account tokens or Script Properties in GitHub logs, PRs, public files or screenshots; use sanitized comparison/checksum and owner-controlled backups.

## Owner decisions (per latest explicit instruction)
- **SINGLE CANONICAL DATA BACKEND:** existing Google Spreadsheet named `API Report_PM2.5`, ID `1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w`. Google Sheets is the durable data store for PM2.5/Weather/Water and historical snapshots as applicable.
- **SINGLE SCRIPT:** reuse the Apps Script *already container-bound to this same spreadsheet*. Do not create another Spreadsheet or standalone Apps Script for widget data without explicit new approval.
- Reuse existing `Water_Level_History` tab (18-column schema). As checked 2026-10-22 it had its header but no rows at A2:R8. Do not replace/clear the existing header; verify actual sheet before writing.
- New water intake should operate in the existing script/scheduler, twice daily morning/evening if confirmed by contract; existing `BackendApiHistoryBatch_`, setup and trigger guard must be reviewed first. No automated triggers are confirmed installed from this checkpoint.
- Do not confuse `observed_at` (provider's actual measurement time) with `fetched_at` or `saved_at`. Missing is null, not 0. Mark 3h+ observations `HISTORICAL`, never flood-current warnings; verify appropriate age limits as product decision.
- Current GitHub Action `water-data` feed is an *existing legacy transport cache*, not authority to create a parallel Google data store. Do not delete the working fallback until replacement is verified.
- Luxury Motion UI is independent work; keep separate from water-data changes. Never accidentally mix `env-wastewater-webapp` and `webapp-widget`.

## Verified facts / provenance at checkpoint
- Google Drive delete of mistakenly created `UTH[AI] Water Level Cache — HDA004 and S.5` (former ID `1b-O381T9yRqQp6r5khZa9FcGskfhK4rpNkdrVgDmOAo`) succeeded; subsequent metadata lookup returned HTTP 404. **Do not recreate it.**
- Primary original `API Report_PM2.5` remains accessible and has a `Water_Level_History` tab. Source of truth: Google Drive exact ID above; not conversation-uploaded `.xlsx` snapshot.
- Obsolete separate-sheet Apps Script prototype in **PR #18** closed as superseded; never install its `WaterSheetBackend.gs` or use its script properties. Branch may remain for audit; not authoritative.
- Luxury Demo URL: https://aase7en.github.io/uthai-led-luxury-preview/demo/luxury-live-preview.html. Separate visual draft **PR #19**; no approval to merge into Live from this handoff.
- Spillway demo PR #21 open at checkpoint; out of water-sheet scope.
- `hyd-app-db.rid.go.th/hydro5h.html`: RID S.5 mapping in group 704 (RID id 349) and HII S.5 id 2607 are **provider-specific distinct IDs**. HDA004 HII id 471583. Do not conflate station IDs or claim RID HDA004 mapping without evidence.
- GitHub `main` observed at `578c54fc1ca3bd05c790b72f2e4be05330d80bb2` before this handoff branch. Verify again on resume.
- Mac root checkout `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget` was on `sol/native-led-frontend-20261017` with ~20 modified and untracked files including a local-only `SESSION-HANDOFF.md`; all protected. DO NOT overwrite/stash/reset/checkout over it. Windows repo must likewise be checked before any mutation.
- No new Apps Script triggers, live bound-script deployment, water backend cutover or live UI change has been performed in this handoff task.

## Pending queue / gates
- **P0 — Read existing bound Script:** identify script ID via authorized owner account and container binding, inspect deployments, installed triggers, Code.gs/BackendApi.gs, project properties safely (never emit tokens). Create verified backup before touching owner scripts. If permission is missing, stop with `AUTHORIZATION_REQUIRED` on only this lane.
- **P1 — Integrate water into canonical Sheet:** use existing `Water_Level_History` and approved scheduler with de-duplication, source times, status, provenance, history, failure log. Do NOT create alternate sheet/script. Retain existing PM2.5 and other channels unchanged.
- **P2 — Validate:** live and historical cases, HTTP 429/outage, station identity, trigger twice/day, every read status, Google Script deployment, 432x40 LED stale label and network fallback. Review exact SHA independently before merge/cutover.
- **P3 — Luxury visual:** review PR #19 with design owner separately after water lane; no unreviewed live publish.

## Suggested skills (per AI Hero handoff)
- `handoff` (project-local `.agents/skills/handoff/SKILL.md`) for model/session/harness transfer; maintain this **single** canonical tracked handoff.
- `code-review` before candidate acceptance, `diagnosing-bugs` for API failures; use test/build/browser tools for verification rather than trusting summaries.
- `google-sheets` connector workflow for exact tab metadata / bounded row writes; use available `clasp` for read-only Apps Script verification only after identity/auth check.

## Stop/rollback
- No production or unrelated legacy Script/trigger overwrite; no deleting Google Sheets other than the explicitly identified mistaken file, now verified absent.
- If any script/owner/dirty-branch conflict exists, keep other lanes read-only and record blocker. Next agent must reproduce actual state, not treat this checkpoint as approval.


## Active 2026-10-22 new work — PM LED and historical water integration

- Owner explicitly requested actual live PM threshold legend readability and water fetch at most twice daily, canonical Google Sheet historical rows, full report trend charts, and production publication (subject to verification/release gates).
- Worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-water-history-ui-20261022 ; branch feat/led-aqi-water-history-20261022 (do not edit dirty Mac root).
- Dedicated release contract and rollback plan: docs/WATER-HISTORY-RELEASE-20261022.md.
- The existing same bound GAS Script API Report_PM2.5, and exact Sheet API Report_PM2.5 are authoritative. No additional Sheets or Scripts.
- Current Sheet Settings hours: 06 and **16**, not 18; History_Batch has morning/evening rows. Piggyback existing BackendApiHistoryBatch_ — NO new trigger.
- Added 4 **real measured** backfill rows in Water_Level_History: 2 stations x 2 timestamps, status VERIFIED_BACKFILL; they are not current/live readings or model data.
- UI browser tested 432x40 exact, PM expanded colored ticks, station tiny graph plus full report charts with TEST FIXTURE. New candidate tests and existing suite 275/275 passed before handoff.
- Source planned GAS changes: additive WaterHistory.gs, one doGet route in existing Code.gs, scheduler wrapper in BackendApi.gs. These are local/public-repo candidate only until separately confirmed deployment.
- Recurring GitHub Action water-cache 15-minute schedule will be removed by same PR AFTER verified GAS source and deployed Web App accept new ?action=water_history; manual dispatch retained.
- New GAS Web App endpoint must be deployed by updating existing fixed deployment ID (current V1.5 @32), never creating new deployment; secured read-only backup already exists OUTSIDE repo at /tmp/uthai-widget-gas-secure-backup-GLIoEAO7; avoid token disclosure.
- GLM independent review found and corrected mismatch of evening expected schedule. Other prior review note about chart aria endpoint order was fixed. Re-review exact SHA after freeze.
- Rollback requires Web App redeploy old V32 AND restoration of bound script HEAD trigger source, GitHub Pages revert; do not modify PM historical data.
- Next action: review/stage/PR full candidate and verify source/CI, then safe owner GAS release and public Pages deployment, finally test real Sheet trends.
