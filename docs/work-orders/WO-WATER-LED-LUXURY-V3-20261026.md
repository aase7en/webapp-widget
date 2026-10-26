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
