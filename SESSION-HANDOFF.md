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

## 2026-10-27 — BLUE locked-master visual proof (assistant visual owner; DEMO ONLY)
- User rejected earlier BLUE frame-first full-frame playback as earthquake-like and dizzying, asked image-capable assistant to do visual work directly.
- New isolated worktree branch sol/pm25-blue-locked-master-proof-20261027 based on Kilo's frame-first b07680dc8797af3ad96f7b649158751eb2e357b2, original worktree protected.
- Source BLUE frame 04 locked as master. Only sky/cloud, sun brightness, lower water/reflection and local haze are changed using source-derived masks from 12 existing BLUE frames. No birds, moving leaves or fake particles. 66 derived frames / ~6s at 11fps.
- Work order docs/work-orders/WO-PM25-BLUE-LOCKED-VISUAL-20261027.md. New demo assets assets/pm25-luxury/blue-locked-visual-v1/. Visual owner review and actual hardware approval pending. Production and canonical PM data unchanged.

## 2026-10-27 — PM2.5 BLUE Locked Scene V1.1 (SundayMCP Mac, owner-authorized demo only)
- Owner requested assistant take direct visual ownership and increase BLUE cloud drift and gentle wind-driven water/reflection motion; Kilo not needed for aesthetics.
- Working branch sol/pm25-blue-locked-motion-v11-20261027 from V1 exact SHA 0fd4c3eb0a7911653967e010b9d2e2975d447439. Separate worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-blue-v11-20261027.
- New source-derived asset pipeline assets/pm25-luxury/blue-locked-visual-v11/ with 66-frame WebP, MP4, still fallback, same-scene V1 vs V1.1 HTML compare, mask and QA screenshots. Uses original 12 BLUE tiles, source frame 04 as locked master; protected architecture + riverbank remain stable.
- Wind-driven sky drift up to ~31 source pixels (sky mask only), low-amplitude broad water refraction and changing existing source reflections. Rejected an initial digital-looking zigzag water warp in visual review and repaired it before checkpoint.
- Work order docs/work-orders/WO-PM25-BLUE-LOCKED-V11-20261027.md. No live/backend/Weather/Water/tier changes. Check exact current SHA and browser QA before claiming production readiness; human owner visual gate still required.

## 2026-10-27 — GREEN/YELLOW/ORANGE/RED Luxury Locked Scenes (assistant visual owner, DEMO)
- Owner explicitly assigned visual production of the four remaining PM2.5 tier scenes to the image-capable assistant via SundayMCP Mac; Kilo/GLM is for independent nonvisual engineering only.
- Repo aase7en/webapp-widget. Isolated writer branch sol/pm25-green-red-locked-visual-20261027 from accepted BLUE V1.1 demo SHA 0e6c24ec6cf82a8d51ab715b157bfaf08c53e88b. Worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-tiers-locked-20261027. Original owner frame assets/other worktrees protected.
- Owner original counts VERIFIED: 10 frames each for GREEN, YELLOW, ORANGE and RED, already normalized 1296x120. BLUE has 12. No invented 12 native green/red frames.
- New path assets/pm25-luxury/locked-tiers-v1/. Per tier 54 DERIVED frames, 9fps MP4 + 54f WebP, still fallback, original 10-frame contact links, 6-phase contact, motion mask and real Chrome browser screenshot. Masters GREEN05/YELLOW04/ORANGE03/RED04, structures exact locked before encode. Shared player selects four tiers and supports pause/speed/reduced-motion.
- Task contract docs/work-orders/WO-PM25-GREEN-RED-LOCKED-20261027.md. Engineering source/loop and real Chrome 4-tier test pass; no real data, threshold, Water, Weather, production or backend edits.
- Next action: verify full repo tests, isolate allowed paths, commit/push Draft PR, recheck immutable hosted preview, get owner visual approval. Do not publish live widget without separate release authorization.

## 2026-10-27 PM2.5 Orange/Red chimney motion demo candidate
- User assigned current visual assistant via SundayMCP Mac; source SHA 521a3d8 from original sol/pm25-green-red-locked-visual-20261027. Owner requested continuous rising chimney smoke for Orange/Red, dense suspended dust in Red, no reverse smoke playback, luxury palette.
- Isolated branch: fix/pm25-orange-red-smoke-v2-20261027, worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-stack-plume-v2-20261027. Task details: docs/work-orders/WO-PM25-ORANGE-RED-FORWARD-SMOKE-20261027.md.
- Implemented dedicated smoke_atmosphere.py with forward-only packet age/trajectory and periodic upward/downwind texture movement; source-matched red atmospheric volumetric haze and fine dust. The 54-frame export loops but chimney smoke does not ping-pong. All original images and GREEN/YELLOW outputs unchanged.
- Engineering verified deterministic forward direction, protected architecture, real Chrome playback/pause/reduced-motion, 313/313 root tests. Must still obtain owner review on physical LED before merging or production integration. No deployment authority.

## 2026-10-28 03:00 Asia/Bangkok — CONTEXT ROLLOVER checkpoint: PM2.5 Luxury Orange/Red forward-only smoke (DEMO)

**Status:** Implementation COMPLETE_VERIFIED as demo; owner Visual/physical-LED approval PENDING; no production authority. This entry supersedes the earlier 2026-10-27 "candidate"/"next commit" status for THIS smoke lane only. It does not supersede other lanes. Latest conversation request: checkpoint context and start a new session with zero chat dependence.

- **Project identity:** `aase7en/webapp-widget`, NOT `env-wastewater-webapp`. Production page: `https://aase7en.github.io/webapp-widget/` remains untouched by this feature. Confirm actual live SHA before making future release claims.
- **Repo/worktree:** `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-stack-plume-v2-20261027`; branch `fix/pm25-orange-red-smoke-v2-20261027`; implementation commit `75bc10518b2c64fd42e8b2136d1c756ff57d7309`. At 2026-10-28 03:00 (+07:00), both local HEAD and remote ref equal that SHA; tree clean after removing verified script-generated `__pycache__`. `origin/main` `82cb7fc06d501ce4482b6ad21fd33777ed018ffb`. Must reverify every SHA/status on next session; this note is not authority.
- **Work Order (authoritative scope):** `docs/work-orders/WO-PM25-ORANGE-RED-FORWARD-SMOKE-20261027.md`; asset root `assets/pm25-luxury/locked-tiers-v1/`. Repo instructions `AGENTS.md`, handoff process `.agents/skills/handoff/SKILL.md`. Only this branch's isolated demo files plus this append-only checkpoint are in scope.
- **GitHub:** Draft PR #56 `https://github.com/aase7en/webapp-widget/pull/56` points to this branch; targets `sol/pm25-green-red-locked-visual-20261027` at `521a3d8` (PR #53, also Draft). Draft base chain includes BLUE V1.1 via PR #52. No merge of PR #56 into base or main.
- **Original/canonical art:** Five owner color scenes (BLUE 12 source cells; GREEN/YELLOW/ORANGE/RED 10 each) are stored under `assets/pm25-luxury/locked-scene-v3/originals/` with already extracted `source_frames/` and Frame-first proof. Avoid reimport/duplicates. Main asset scene uses one fixed architecture master/tier, derived video frames for sky/water/haze, not 54 independent original photographs.
- **Current change:** only ORANGE and RED animation (54 DERIVED frames each), 4 smoke-stack mouths/tier. `scripts/smoke_atmosphere.py` implements new smoke packets that emit every 6 frames, move upward/downwind by increasing age, fade and die before loop reset (never play smoke backward); RED adds forward-drifting, soft suspended dust/haze. New source-matched smoke proof `orange/qa/stack-motion-six-zoom.webp`, `red/qa/stack-motion-six-zoom.webp`. GREEN/YELLOW images and actual owner inputs remain unchanged. No UI backend, GISTDA, bound Google Sheet/Apps Script, PM thresholds, weather, or Water Level mutation.
- **Verification:** `python3 assets/pm25-luxury/locked-tiers-v1/scripts/verify_emissions.py` PASS (two 4-stack plume cases, 42 forward-age stages, red airborne-haze/dust); `python3 assets/pm25-luxury/locked-tiers-v1/scripts/verify_all.py` PASS 4/4 tier manifests/source-frame counts/pixel locks/seam; previously 313/313 `node --test tests/*.test.cjs` PASS on exact implementation candidate, confirmed again at session end; GitHub Actions "Uthai LED rotation" SUCCESS on `75bc105`; Draft PR #56 open/unmerged. Actual hosted assets and HTML HTTP 200. Human subjective "luxury"/physical LED QA remain PENDING; deterministic PASS != owner aesthetic approval.
- **LIVE REVIEW:** `https://raw.githack.com/aase7en/webapp-widget/75bc10518b2c64fd42e8b2136d1c756ff57d7309/assets/pm25-luxury/locked-tiers-v1/index.html` (choose Orange/Red; pause/speed). Direct animated WebP `.../orange/orange-locked-54f.webp`, `.../red/red-locked-54f.webp` under that asset root and full SHA.
- **Art direction/owner decisions:** match CURRENT LIVE Water Level Luxury visual language and physical 432×40 LED shape; locked city/hospital/temple/bridge and large legible numbers; do not revive rejected animated birds/floating leaves/independent decorative particle-overlay V4 PR #50. ORANGE smoke must rise from factory stacks without ping-pong; RED smoke visibly heavier + fine diffuse airborne dust, luxurious and not cartoonish.
- **Related in-progress lanes:** Kilo's `demo/pm25-cinematic-demo-20261026` at historical `648fae5` already has clock/PM status/classifier/slide controls but is not automatically integrated with the approved locked-scene variants; docs/frame-first PRs and reference PR #55 exist. These are separate worker-owned hotspots. Confirm up-to-date refs and active claims before visual/data integration. Repository production currently must NOT be changed on the basis of this demo evidence.
- **Owner/claim:** User explicitly assigned current visual correction to assistant using `@SundayMCP Mac`; text-only GLM/Kilo may assist read-only technical review, but not aesthetic approval. Ownership is per worktree/hotspot; no presumption that other worker branches can be edited.
- **Blocked/risk:** No human sign-off on smoke luxury/real physical LED, no verified end-to-end merged integration with live PM source, no release authorization. PR #56 Draft, even if CI green; separately review upstream PR stack and production interface if later approved.
- **ONE NEXT SAFE ACTION:** Open exact-SHA hosted Orange/Red demo and the two 6-moment zoom proofs, independently assess/up to human visual acceptance; then, only if owner explicitly approves, plan a distinct scoped demo integration into the existing cinematic widget with verified ownership, tests, SHA and release gates. Do not merge/deploy automatically.

**Suggested next-session tools/skills:** `@SundayMCP Mac` read-only snapshot/inspection; GitHub PR #56/#53 and exact-SHA CI; repo `.agents/skills/handoff/SKILL.md`; source-of-truth `AGENTS.md`; independent browser/LED visual verification. Avoid relying on this note without actual verification.


## 2026-10-28 — Resume QA + physical LED geometry correction (DEMO ONLY)
- Repo: `aase7en/webapp-widget`; writer worktree `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-stack-plume-v2-20261027`, branch `fix/pm25-orange-red-smoke-v2-20261027`. Existing Work Order: `docs/work-orders/WO-PM25-ORANGE-RED-FORWARD-SMOKE-20261027.md`.
- Starting exact local/remote HEAD `0cc4aa668df2fb2fafb8080f9a1b364b939c9a19`; base `521a3d8e18db7fc57366adeb8541cf2041d53397`; PR #56 Draft/open/mergeable/unmerged; PR #53 Draft/open/unmerged; remote main `82cb7fc06d501ce4482b6ad21fd33777ed018ffb`. Starting writer tree clean; Mac root worktree dirty 22 modified + 8 untracked, untouched.
- Read full 211-line master resume at commit `0f9397fbcbb237b271c02e048901ece261ccc54e`, current `AGENTS.md`, handoff skill, full canonical handoff and active Work Order; compared PR #56 current remote diff/reviews/CI.
- Independent Chrome CDP QA on local exact-checkpoint files: ORANGE and RED 1296×120 MP4s genuinely play, pause to still, speed 1.5×, reduced-motion still fallback; no JS exceptions. Existing zoom proof images visually inspected. No physical LED hardware test and no definitive owner luxury-aesthetic acceptance.
- NEW verified defect: simulated `432×40` display measured border-box 432×43.625 CSS px; interior video 428×39.625 because CSS border added to content. This contradicts required true LED viewport.
- Focused fix in existing allowed scope ONLY: `assets/pm25-luxury/locked-tiers-v1/index.html` changes `.scene.led` from a 2px border inherited from `.scene` to border 0 + 2px outline. No artwork, generated media, JS, data, backend, live Water/Weather, production or main changed.
- Post-fix independent Chrome CDP: ORANGE video/frame 432×40 exact; RED video/frame 432×40 exact; static fallback/frame 432×40 exact; mobile 375px viewport retains responsive fit (LED box 307×28.422). Video plays after selecting tiers.
- Post-fix deterministic check: Node `node --test tests/*.test.cjs` 313/313 PASS; `PYTHONDONTWRITEBYTECODE=1 python3 -B .../scripts/verify_emissions.py` PASS; `.../scripts/verify_all.py` 4/4 PASS; `git diff --check` PASS.
- GitHub Actions at former PR #56 SHA `0cc4aa6`: SUCCESS; independent GitHub review submissions: zero. New review SHA and its hosted CI must be checked after this checkpoint commit is published.
- Browser caveat: Chrome opening the historical raw.githack preview showed an External Content Notice in this headless session, despite curl returning correct demo HTML and MP4 (HTTP 200). The actual repeatable interactive QA above used the same exact local repo artifacts, not an asserted hosted real-world LED test.
- Scope/ownership: isolated pre-existing writer branch, no concurrent SundayMCP lanes or active sessions observed. No production authority, no merge; user and Work Order prohibit auto release. Code/CI PASS does not imply owner Visual PASS or physical hardware acceptance.
- ONE NEXT SAFE ACTION: verify exact updated PR #56 head/files/CI and a usable hosted browser review, then request owner visual/432×40 physical LED acceptance; do not merge/production-deploy or integrate into another owner's UI lane without separate permission.


## 2026-10-28 06:18+07 onwards — Owner visual approval withdrawn; focused Orange/Red smoke correction

- Latest explicit owner instruction **does not approve** visuals, overriding the earlier contradictory approval from 10 seconds before. No integration, main merge or production deployment authorized. Repo `aase7en/webapp-widget`; isolated writer worktree `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-stack-plume-v2-20261027`; branch `fix/pm25-orange-red-smoke-v2-20261027`. Begin from `b4afaeddbf8b8124ce25779068db39d0ac63e5f8`, PR #56 Draft/open/unmerged; PR #53 parent Draft/unmerged, main `82cb7fc06d501ce4482b6ad21fd33777ed018ffb` at preflight.
- Full repo-local `AGENTS.md`, existing Work Order, tracked handoff and handoff skill re-read; lane list empty, no active SundayMCP sessions, no overlapping writer process observed. Protected Mac main dirty worktree and every unrelated lane. Existing Work Order scope allows only `locked-tiers-v1/**`, WO and append-only handoff.
- Visual compare at 6 source-aligned frames identified a real issue: the added charcoal emission layer formed large opaque diagonal bands across soft cloud textures. Existing original art and building geometry were not defective. Experimented read-only variants in OS `/tmp/uth-pm25-visual-audit/` before adjusting repository output; selected softer, source-matched color.
- `scripts/smoke_atmosphere.py`: palette ORANGE (147,111,86), RED (118,79,66), effective packet alpha 0.73 of old, growth radius X .39 vs .52 and Y .30 vs .40. Forward-only motion, four stack anchors, 42-frame packet lifetime, RED haze/dust, protected masks unchanged.
- Rebuilt only ORANGE/RED via existing `build.py --tier` and `export_mp4.py --tier`, refreshed both `qa/stack-motion-six-zoom.webp`, and captured actual Chrome 432×40 MP4 screenshots to each tier's `qa/browser-*.png`.
- Verification: `verify_emissions.py` PASS (new plume source RGB delta orange 4.141 / red 4.531), `verify_all.py` PASS 4/4 tier native hashes/54 frames/landmarks, `node --test tests/*.test.cjs` PASS 313/313, local Chrome MP4 plays, pauses with still, exactly 432×40 for ORANGE/RED, reduced-motion PASS, no JS exceptions. Mean seam RGB Orange 1.815, Red 1.518. Near-plume alpha >0.65 pixel fraction fell Orange .1372→.0806, Red .1727→.1186; illustrative visual QA only, NOT PM2.5 data. No physical LED test or owner visual sign-off.
- Target release surface is **existing PR #56 DRAFT only**. New SHA and GitHub Actions CI must be verified after commit/push; do NOT infer a prior CI result applies to the change. Original owner art, GREEN/YELLOW outputs, backend, Water, Weather, production and real sensor data unchanged.
- **ONE NEXT SAFE ACTION:** owner reviews new Orange and Red exact-SHA animation from updated Draft PR #56; until explicit aesthetic sign-off, hold integration, PR merge and production release.
