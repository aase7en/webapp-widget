# SESSION-HANDOFF — webapp-widget
<!-- A handoff is a portable checkpoint, NOT a substitute for actual repo/runtime verification. -->
## LATEST CHECKPOINT — 2026-11-04 — Weather LED readability Web Demo (IN PROGRESS)

**Scope:** Repository aase7en/webapp-widget (NOT env-wastewater-webapp). This newer checkpoint supersedes historical 2026-10-22 status statements for this Weather Demo lane only. Old material below remains historical and requires re-verification.

### User goal / unfinished request
- Outdoor hospital LED Weather panel is 432×40 pixels. User cannot read rain chance, humidity, high/low, and 7-day forecast at actual viewing distance.
- User asked for a WEB DEMO comparing A: all 7 days displayed together; B: four days then three days alternating every ~8–10 seconds, with enlarged bold numeric text.
- On 2026-11-04 user interrupted work to request a durable checkpoint and prompt to start a new ChatGPT session. A working new A/B Web Demo and public demo URL DO NOT EXIST yet. Do not claim that they do.
- Do not change approved Water Level, PM2.5, canonical Google Sheet, Apps Script or Production Weather display while building an isolated design demo.

### Verified source / runtime / repository state
- Checked GitHub main and remote origin/main SHA: 81d584fbe457dee7f356802ed3d7bbebe758af78 (merged PR #90; it addressed the last-known Weather data issue). Recheck this on resume.
- Live site: https://aase7en.github.io/webapp-widget/ ; Weather implementation: v2/weather-luxury.html, v2/weather-luxury.js and v2/weather-snapshot.js.
- Mac root checkout: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget on branch fix/weather-unit-persistence-20261101, untracked folders .kilo/, .tmp/, kilo/. DO NOT RESET/STASH/OVERWRITE. Separate agent-owned worktrees exist.
- Shared repo AGENTS.md, .agents/skills/handoff/SKILL.md, root SESSION-HANDOFF.md read. This repo uses one canonical tracked root SESSION-HANDOFF.md; edit it only through an isolated, safe, owned worktree and reviewable PR.
- At 2026-11-04 11:10 UTC, Chrome/Puppeteer read the actual deployed Weather DOM at 432×40; no Browser errors. Rendering draws at 1296×120 and scales by one-third. Effective native font sizes: clock 21.33 px; main temp 30.67 px; four core weather numbers 7.67 px; forecast daily high 4.33 px; daily rain chance 3.33 px; forecast day names 3.67 px; forecast icon ~8.67 px high. This objectively explains unreadable text.
- Read-only Browser CSS injection experiment enlarged four core weather numbers to ~11.67 px native; forecast highs ~9.67 px, daily rain percentages ~7.33 px, day names ~6.67 px, reducing image area and hiding tiny graph. It displayed ONLY the first 4 forecast days. This was not saved to repo, was not published, and was not validated on physical LED. No timed 4+3 rotating demo has been implemented.
- Source sample from existing public weather-data GitHub transport at time of prior check: Open-Meteo MODEL current.time 2026-11-04T16:45 Asia/Bangkok, fetchedAt 2026-11-04T09:55:53.652Z, temperature 28.2°C, humidity 85%, daily data available. This is a time-bound sample, NOT current data when the next agent resumes. The canonical Sheet and bound Script are authoritative for operational values; provider model is not a hospital sensor.

### Durable Mac artifacts OUTSIDE repo
Folder: /Users/aase7en/Desktop/PM25-WebappWidget-Handoff-2026-10-29/LED-READABILITY-DEMO-20261104/
- UTH-Weather-LIVE-432x40-20261104.png = actual production Browser screenshot, not a physical LED photograph.
- UTH-Weather-Concept-4day-432x40-20261104.png = temporary CSS-injected 4-day layout experiment, not approved/deployed.
- UTH-Weather-LIVE-geometry-20261104.json = source DOM box measurements.
- CHECKPOINT-WEATHER-LED-READABILITY-20261104.md = this checkpoint.
- CODEX-OR-CHATGPT-NEW-SESSION-START-20261104.txt = paste-ready new-session prompt.
All files should be inspected/verified again by new agent.

### Completion / blockers
DONE: Production DOM readability audit; baseline screenshot; a static 4-day CSS-injected concept screenshot; recommendation to compare A vs B.
NOT DONE: interactive A/B Web Demo, 4+3 timer, 7-day enlarged option A, mobile zoom/inspector, independent functional visual QA, standalone/shareable demo URL, owner visual approval, repo design PR, merge, deploy.
No demo-related changes to repo or production have occurred.

### One Next Safe Action
Verify actual AGENTS.md/main/worktrees/ownership and the Mac artifacts above. Build a SELF-CONTAINED REVIEWABLE WEATHER WEB DEMO in an isolated owner-controlled directory/worktree: selectable A (seven days still) vs B (four then three days auto-swap every 8–10 seconds), native 432×40 LED view plus enlarged inspector for iPhone and desktop. Use validated current Weather values or clearly label fixtures SIMULATED; preserve observedAt and missing != zero; test clipping, variable digits, reduced motion, no overlap, and no changes to Water Level/PM. Provide an accessible preview link only after a successful isolated demo publish; user approval is required before production mutation.

### References
- https://github.com/aase7en/webapp-widget/pull/90 is already MERGED; do not rerun PR #90 work.
- Repo AGENTS.md and .agents/skills/handoff/SKILL.md, canonical root SESSION-HANDOFF.md, current actual Git/PR/CI.
- Prompt placement policy: aase7en/A-Wiki docs/protocols/prompt-placement-protocol.md.

---

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
