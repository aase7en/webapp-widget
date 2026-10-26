# WO-WATER-LED-LUXURY-V3-20261026 — isolated layered LED Water demo

**Project:** aase7en/webapp-widget (NOT ENV wastewater).
**User approval:** 2026-10-26; modify Demo only; two stations simultaneously; foam overflow INSIDE full LED border. No Production/Backend change.
**Owner/writer:** Sol integrator, only the V3 demo, V3 tests, and this Work Order.
**Base:** main 9bf39bc4d0230a947e05eaf765b1ac3911268030.
**Worktree:** /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-water-luxury-v3-20261026.
**Branch:** feat/demo-water-luxury-v3-20261026.
**Mutation gate:** SAFE_TO_MUTATE=YES for this isolated candidate after verifying remote main, repo rules, other PRs and all worktrees. Mac root and unrelated Windows/Worker work remain protected.

## User-visible acceptance contract
- Keep both HDA004 and S.5 visible in ONE logical 432×40 LED frame; 1296×120 design-space preview.
- Clock/time floating above a dark-to-transparent edge; no clock/animation hard divider.
- Spillway/architecture remains fixed. Reuse five existing owner-approved sprite mappings, dynamic water/foam/whitewater only.
- Station art partially behind glass numeric overlays; gradient cyan-white-mint hero numbers, strong Thai hierarchy.
- Whitewater spills visibly under the clock and art but stays clipped inside the LED border, never obscuring metrics/status.
- Neon watch/green/red styles only with APPROVED per-station thresholds. Until then, neutral 'ยังไม่มีเกณฑ์'. A clearly labelled DEMO watch badge and DEMO reference figures are user-selectable and OFF by default.
- Data comes from existing LED same-origin live source, never fabricated measurements. Simulated reference examples and artwork remain clearly DEMO.
- Responsive/mobile, accessibility/reduced-motion image fallback, no other PM/Weather/backend/frontend production files touched.

## Evidence (26 Oct 2026 Bangkok)
- Source worktree started clean at main SHA above; no owner/hotspot overlap detected for NEW V3-only paths.
- Local Chrome actual 1296×120 screenshot; browser CDP checks confirmed two independent water canvases, changing lower water pixels and stable upper dam pixels at successive frames; all five visual bands selectable.
- Browser CDP confirmed default unavailable values '—', DEMO buttons reveal reference example data explicitly labelled DEMO; no real risk inference.
- A forced 432px scaled element reports 432×40 logical px. A 390px mobile browser without forced width previously reported scrollWidth 390 and no sideways overflow. Reduced motion reload path draws a static frame on asset load.
- Repository command: node --test tests/*.test.cjs : 307/307 PASS including 4 new V3 tests. Additional CDP checks were run read-only on isolated localhost HTTP server, no backend edits.
- Original V2 demo and all legacy production/Apps Script files remain unchanged. Demo V3 is not a data/backend release; PR #45 data reader fix still separate.

## Release gate and next action
- Freeze exact SHA, verify intended file diff, run independent read-only review and hosted CI before any merge.
- Demo-only PR may merge only under current repo policy; Pages preview requires a successful deployment of approved DEMO file.
- NEVER change production v2/index.html, root index.html, apps-script, any Sheet/Script/trigger, or physical LED without separate authorization.
- One next safe action after PR: independent review of frozen V3 candidate plus Pages publication gate.

## Owner-requested V3.1 refinement (26 Oct 2026 afternoon, Asia/Bangkok)
- Preserve V3 demo only and re-use PR #46 in the isolated clean worktree. Explicit user direction: soften sharp visual break after clock, let dam architecture extend behind clock and station readings using dark translucent overlays, make water-level readings larger and badges adjacent, shift S.5 toward right by reclaiming the illegible source strip.
- Change limited to NEW demo-only stylesheet `demo/water-led-luxury-v3-polish.css`, existing V3 HTML, these V3 tests and this Work Order. No source/water backend changed.
- Frame stays 1296×120 design-space = 432×40 logical LED. Dam sprite retains source 2:1 aspect; architecture static and lower water animated. Added left-to-right mask fade for scenery, softened overlays; source credit moved below LED with explicit HII provenance, not removed from page.
- DEMO numbers/status toggles stay OFF by default. Neutral `ยังไม่มีเกณฑ์` remains the only automatic badge while thresholds unapproved.
- Chrome CDP measured: exact scaled element 432×40; both stations visible and S.5 farther right; adjacent badges contained in station info; source strip absent; Focus S.5 still works; mobile 390px no document overflow; 0 uncaught exceptions. Two different lower-water frame hashes with identical upper-dam hashes confirmed.
- Captured local screenshot `/tmp/uth-v31-demo-led.png` using localhost HTTP served clean worktree; screenshot contains explicit example DEMO labels, NOT live observations. Review CSS + HTML + test diff before PR update.
- Prod gate stays CLOSED: no merge/deploy to physical LED, no Apps Script changes, no flood-status claims without approved thresholds.

## Owner-approved V3.2 visual polish and water datum audit (2026-10-26, Asia/Bangkok)
- Confirmed scoped owner approval: V3.x demo only; same PR #46; no Production, Apps Script or canonical Sheet writes. Mutation gate remained YES: clean V3 worktree at 9ee6d082c867bc70145fa8cc598c68fc38664a9c and matching GitHub PR #46 HEAD at preflight.
- Visual: enlarged clock 64px and lifted date; dark blurred `info::before` background; large 30px-high warning badge ABOVE 7-day chart; foam composed from station-anchored feathered native-sprite patches instead of repeated hard-edged tiles. Two-station 1296×120 stage and existing 5-band mapping preserved.
- Canonical Sheet read-only: `API Report_PM2.5 / Water_Level_History` still has HDA004 and S5 `level_msl_m`, `bank_msl_m`, `ground_msl_m`, MSL datum. Direct upstream HII waterlevel_load read-only snapshot at 2026-10-26 local afternoon: HDA004 observed 16:40 level 2.81 MSL, min_bank 3.03, ground 0.227, bank gap 0.22 m; S5 observed 15:00 level 2.48 MSL, min_bank 4.70, ground -8.59, bank gap 2.22 m. Provider `waterlevel_m` and `discharge` absent in those rows. These are nearby reference **station water-surface elevations**, NOT hydraulic gate discharge or opening.
- Percentage is NOT `level_msl / bank_msl`. Guarded **derived fraction of ground-to-lowest-bank elevation interval** = 100*(levelMsl-groundMsl)/(minBankMsl-groundMsl), and ONLY when numeric fields share proven MSL contract and bank>ground. A ratio is NOT channel storage/cross-sectional capacity, physical gate opening or approved flood-risk status. Demo reference example numbers 2.87/3.17 display 94.3% / 88.5% with DEMO labels; current source snapshot 2.81/2.48 would produce 92.2% / 83.3% if the existing client returned them together.
- Existing `v2/api-client.js` already has `UthApiClient.getWater()` and validates `bankM`, `groundMsl`, `levelMsl`, observed timestamps. New demo safely reuses its already embedded same-origin cached client; never calls HII directly. **Actual browser test** of this client returned both stations `status:missing`, `level:null` despite bank/ground values, so V3.2 correctly rendered `—%` for both. PR #45 canonical Sheet typed-Date correction remains separate, and this UI PR DOES NOT fix that production data-path.
- No invented threshold statuses: badge stays neutral except a clearly marked DEMO-only watch example. Provider `situation_level` is not silently mapped to hospital flood safety thresholds. All non-provider readings remain null/unavailable.
- Browser CDP V3.2 checked: badge above chart, 64px clock, 2 stations, 5-band controls, upper dam hash stable while lower water hash changes, example derived % values and DEMO labels, focus S5, exact 432×40 scaled geometry, mobile 390px no horizontal overflow, zero JS runtime exceptions. Evidence: local /tmp/uth-v32-led-demo.png and browser logs from isolated Chrome; no screenshot uploaded to repository.
- Risk gate: release only isolated demo branch for owner review, independent PR review still needed for merge; production LED and backend remain **NOT APPROVED**.

## Owner V3.2b micro-polish (2026-10-26)
- User requested a very small rightward shift of the water-level and station-name overlay, to reveal more of the dam's right edge, and slightly clearer overflow directly beneath the clock at the LED bottom.
- Owner/writer unchanged: isolated `feat/demo-water-luxury-v3-20261026` PR #46, demo CSS/HTML/test/this WO only. Started clean at SHA `2bf7fe59c3c4800b556fe064125675cd3b09b203`, matching remote PR HEAD; root production and backend untouched.
- Moved dual station overlay left inset 173->185 design px (+12), focus 290->302; width saved with second grid column 151->148. Dam architecture and split unchanged.
- Foam foreground height 35->38, opacity .81->.88; station A sprite patch offset 172->186 px (14px more under the clock) and alpha .79->.88; retained horizontal/vertical feather mask, screen blending and internal LED containment.
- Real Chrome CDP measured both overlay positions, status/chart fit, 38px foam/0.88 opacity, 432x40 scale, 390px mobile with no horizontal overflow and zero uncaught exceptions; screenshot `/tmp/uth-v32b-LED-1296x120.png` in Mac temporary folder.
- Data contract unaffected; DEMO numbers remain labeled and actual unknown values remain unavailable; no additional provider API requests.
- Production/merge gate remains closed awaiting independent review. NO deploy to physical LED.

## Owner V3.2c fine-tuning — 26 Oct 2026
- Explicit request: move the entire station-information columns three Thai-keyboard spaces right and strengthen only foreground water spilling below the clock.
- Preflight: SundayMCP Mac connected; isolated worktree clean and remote PR #46 head SHA a22953b15e97a7bd3dc1d879545e0d59a62dcef1 match, base main 9bf39bc4d0230a947e05eaf765b1ac3911268030; repo AGENTS.md reviewed; one writer within demo-owned paths.
- Shift dual station overlay left inset 185 -> 203px (+18 design px), focus inset 302 -> 320px; status-trend grid second column 148 -> 142px to retain readable room. No station artwork positioning or layout split modified.
- Foreground water height 38 -> 41px, opacity .88 -> .94, anchored to LED bottom 0px; feather vertical ramp enhanced. Only HDA004 water patch extends 186 -> 202px leftward under the clock with alpha .88 -> .96. No extra sprite, provider requests, data fabrication or production code modifications.
- Chrome CDP: both station names/levels shifted; badges and trend boxes contained; sprite architecture upper frame fixed while lower water animated; LED 432x40 geometry; mobile 390px no horizontal scroll; no uncaught JavaScript errors. Screenshot /tmp/uth-v32c-led.png, generated locally for QA.
- Release: Draft PR demo-only, leave production/Apps Script/physical LED untouched and do not merge without independent approval.
