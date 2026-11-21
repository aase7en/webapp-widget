# Current: canonical Sheet ten-tab audit and retention candidate (2026-11-21)

Owner requested delete unused/duplicate tabs and cap all historical data at one year. Actual Sheet shows 10 tabs; important candidates are ชีต1 last Oct17 (17 rows, one embedded chart and Code.gs reference), ชีต2 last Oct16 (990 rows, 346 older than 2025-11-21 and Code.gs reference). Other active data and config tabs must stay. Full audit + one-year policy: docs/work-orders/WO-WIDGET-SHEET-RETENTION-20261121.md.

Clean isolated Mac SundayMCP worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-retention-audit-20261121, branch feat/widget-sheet-retention-audit-20261121, base main 7359c928198d84efbd6fb5361d48ecc87eb7c3ac. Source candidate extends PM/Water known-row retention 90 to 365 days, adds default DRY_RUN History_Batch cleanup under existing trigger, leaves snapshots <=90 days, and preserves all live Sheets and script deployment. Root weather worktree untracked files protected. Actual bound Apps Script version/triggers UNKNOWN; no live deletion, rollout or activation. ONE safe next action: full Node QA, independent review and PR; then verified trigger inventory, backup, owner-approved deployment and exact dry run before enabling/removing legacy tabs.

---

# Latest owner data-freshness correction — 2026-11-21

Current six-hour display rule: PM2.5 and Water use last verified measurement in existing canonical Sheet for <=6h from observedAt, then dominant — and badge ข้อมูลเก่าเกิน 6 ชม. Weather remains 3h model freshness. At checked 2026-11-21 22:49 TH: PM 21:00, HDA004 21:40, S5 18:00 observed; S5 at ~4h49 should NOT have been blank. Existing Sheet still receives writes.

Work Order docs/work-orders/WO-WIDGET-SIX-HOUR-FRESHNESS-20261121.md. Isolated Mac SundayMCP worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-six-hour-freshness-20261121 branch fix/pm-water-six-hour-freshness-20261121 from main v1.0.0 97b3ec75cdfbdce523d99f9a6008c9a78422fc50. Root weather checkout has protected untracked .kilo/.tmp/kilo. Implement scoped frontend and test/documentation only, target product patch v1.0.1. No Google Sheet or bound Apps Script changes. PM 3–6h uses existing verified Sheet PM history API fallback (hourly only, no invented 24h health category) while old backend snapshot reader still has 3h limit. Water browser computes age from measured timestamp even if backend's historical status uses old3h. Next: full tests, independent exact-SHA review, hosted CI and exact merge, Pages/build/real-data smoke and release tag. Backend script status alignment remains a separate deployment-gated task. Historic sections below retained as archives.

---

# CURRENT CONTINUATION — Uthai Widget v1.0.0, production percent approved (2026-11-21)

**Source facts verified:** aase7en/webapp-widget main SHA 33926944e3535f7e7fae14ac4584f60de01e4b29 from merged PR #109, Github Pages built exact SHA 2026-11-21T15:19:30Z and public critical assets 7/7 HTTP 200 byte-exact. Latest user approved original Water design plus percent/metres/verified directional arrow and asked for professional README, formal version and a plan to port all three panels to new hospitals and provider APIs. Prior lines stating Water is demo-only are ARCHIVAL and superseded by this front section.

**Active lane:** docs/widget-v1-release-portability-20261121, isolated clean worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-release-docs-20261121, base production SHA above. Docs-only changes: product VERSION 1.0.0, CHANGELOG, professional three-panel screenshot README, current asset-version matrix, Design System, AGENTS, this root single handoff, Multi-Site Adoption Plan. Image examples are SIMULATED and must not be called current readings.

**Protected:** original Mac root checkout has untracked .kilo/.tmp/kilo (do NOT reset/stash). Existing Weather and other open PRs are separate owners. Canonical API Report_PM2.5 Sheet and bound Apps Script remain unmodified, and Uthai station/lat-lon source mapping stays single-site. No multi-site runtime/adapters shipped with v1.0.0. Protect source/data licensing, privacy and station/datum semantics.

**Release gates:** exact docs PR SHA + source-link/image/Node checks, independent review, expected-head docs merge, Pages built SHA + HTTP byte checks, and annotated v1.0.0 Git Tag at the final reviewed merged main SHA. A tag/README is not proof that all three panel values are LIVE; physical LED visual observation remains a separate gate.

**One next safe action:** verify and close out docs/version PR, publish first verified v1.0.0 tag/release and record exact commit, then begin a separate Phase-0 Multi-Site API/config hardcode inventory Work Order only after governance/licensing decisions. DO NOT automatically change Uthai APIs or production backend.

---

# LATEST OWNER DESIGN CORRECTION — original Water visuals + percent reading (2026-11-21)

> Supersedes the earlier percent-demo ART DIRECTION, not the validated ground-to-bank metric meaning. User approved previous demo typography and rough positioning only; explicitly wants the ORIGINAL production Water visual (colors, 2.5D animated gate/spray, existing 7-day graph, clock, border and badges) while overlaying percentage, up/down arrow and metres remaining. Do NOT replace the original visuals with the first flat-blue redesign.

## Current verified state
- Production widget GitHub main: 0d12f09bc0577299a3fdfc19a39ce1df892a27b7; Pages built same. Original Water production JavaScript still byte-exact and prominently displays m MSL. No UI/data/backend release was performed in this follow-up.
- Corrected SIMULATED preview in separate repo aase7en/uth-weather-led-ab-preview-20261104: PR #8 merged as e6cfe81d0c2a79bf78c79447dd3d63254d6b6957, Pages built exact SHA, 8/8 public assets byte-identical, public Chrome 432x40 confirmed percent/arrow, graph and animated canvas with visible DEMO labels.
- Approved style source: actual production v2/water-luxury-live.css, original renderer and sprite PNG, copied byte-identical in preview. Only DEMO renderer metric section/arrow and narrow CSS overrides differ. Native Chrome checks for both stations confirm reading/secondary boxes fit, arrows do not overlap graph, and no external API calls.
- Corrected preview for owner review: https://aase7en.github.io/uth-weather-led-ab-preview-20261104/water-bank-original-style-20261121/ . The FIRST preview remains a reference for text scale/position only: https://aase7en.github.io/uth-weather-led-ab-preview-20261104/water-bank-clarity-20261121/ .
- Reference numbers and arrows in BOTH preview pages are SIMULATED, not latest HII observations. Percent is NOT flood probability, capacity, certified alert or evacuation guidance. Real source freshness/provenance policy must be verified prior to release.

## ONE next safe action
Owner reviews the corrected ORIGINAL-design preview and requests final positioning adjustments or accepts the design. ONLY after explicit owner acceptance implement a separate Widget production feature on verified Sheet/API source, preserving original renderer and historical/unknown status; require independent review, CI, physical LED check and exact-SHA post-release verification.

---

# CURRENT FRONTIER — Water Level public-readability DEMO, production unchanged (2026-11-21 Asia/Bangkok)

> **This is the latest bounded handoff and supersedes the former Nov 7 active-task section below.** Older context is retained as history; recheck actual Git/GitHub/runtime rather than trusting previous PR statuses. The Nov 7 typography approval remains historical; it is NOT automatic approval for Water % production deployment.

## Verified actual source / runtime
- Repository: aase7en/webapp-widget (NOT env-wastewater-webapp). GitHub main at audit: 6b4111ec5413983ece25788a074dc3e7e9c2b95b, Pages build built on that SHA (published build timestamp 2026-11-13T18:38:11Z).
- Public root index, v2 index, Water HTML/JS/CSS plus prior VERSIONS.md checked 2026-11-21: 6/6 HTTP 200 and byte-for-byte match to audited main. Production still displays large m MSL readings on Water. Query keys and validation dates documented in docs/readme/VERSIONS.md.
- Actual Water input is existing UthApiClient from canonical Sheet/Apps Script, exposing levelMsl, groundMsl, bankM, observedAt, status for stations HDA004 and S5; m MSL is the original dominant display. Formula bankIntervalPercent exists in v2/water-luxury-live.js, but is secondary in production.
- Dedicated PREVIEW repository aase7en/uth-weather-led-ab-preview-20261104 published demo via PR #7, merge SHA 36e5798cd30f3e8953b3ebc4d47848aad5785da2, Pages built and 3/3 public HTML/CSS/JS exact. URL: https://aase7en.github.io/uth-weather-led-ab-preview-20261104/water-bank-clarity-20261121/
- Demo is entirely static SIMULATED: two-station or one-station focus, six scenarios, zoom 1x/2x/3x. Chrome 432x40, reduced motion, mobile and no external fetch PASS. No actual Water UI, Sheet, backend or production behavior was changed by preview.

## Owner decision / boundaries / memory
- Owner accepted showing public-friendly ground-to-lowest-bank percent alongside remaining metres to bank, and explicitly requested a visual Demo **before** deployment. No final acceptance of exact demo geometry or authorization to merge an implementation into production has been given.
- Percent is NOT flood probability, river/storage capacity, official flood alert or evacuation order. Freshness is based on actual observedAt; stale, unknown and invalid datum cannot be rendered as current. Keep station name, source and staff-accessible m MSL.
- Canonical current continuity: this root SESSION-HANDOFF.md only. Historical engineering lessons: docs/defects/LED-UX-DEFECT-MEMORY.md (non-authoritative). No separate AGENT.md or independent agent memory registry was found on audited main.
- Ownership: isolated docs-only worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-water-bank-docs-20261121 branch docs/water-bank-percent-demo-audit-20261121. The inherited Mac root is dirty with other work; never clean/reset/stash it. Open historical PR #99 and other old PRs remain separate.

## ONE next safe action
Ask owner to inspect the hosted Demo and choose any alignment/readability refinements. After explicit design acceptance, prepare an isolated production feature Work Order, validate real API/Sheet contract, no false official alerts, history quality and stale states, tests/Chrome/physical LED, exact SHA independent review, CI, owner release approval and post-Pages verification. Do not auto-promote the Preview into production.

---

# CURRENT OWNER DECISION — Aligned ALL THREE pages APPROVED (2026-11-07, after PR #96 checkpoint)

> **Latest explicit Owner Decision supersedes earlier text below.** The owner has
> APPROVED the **Aligned Typography design for PM2.5, Weather and BOTH Water
> Level stations** from the already published interactive three-page comparison.
> **Do not request renewed typography approval.** This is NOT an authorization
> to bypass code review, CI, browser/visual QA or production release gates.

## Current frontier — code / preview / release
- Repository: **aase7en/webapp-widget only**, not env-wastewater-webapp.
- Additional mandatory Weather fix: move/strengthen **Feels Like** (thermometer)
  and **Heat Warning** (warning icon) into separate safe zones at physical LED
  432×40 without clipping temperature, °C, clock, rain animation or forecast.
  Preserve existing heat-index thresholds, stale suppression, observedAt,
  provenance/HISTORICAL/UNAVAILABLE, mobile fallback and reduced motion.
- Visual integration **PR #97 OPEN**, SHA
  `68f71518aa0cd984ff4e1c29f5534c975e44baa9`, stacked on PR #95
  `2e76f427c4ef51f9963be44a75505f1b87cb14d5`. This change affects only
  presentation, scoped frontend cache keys, tests and SIMULATED QA evidence.
  Work Order `docs/work-orders/WO-LED-THREE-PAGE-ALIGNED-BADGES-20261107.md`
  and screenshots in PR #97 (not current main). Local 520/520 Node tests PASS;
  Browser 432×40 and 390px mobile, 7 warnings, reduced motion PASS.
  Physical LED and real iPhone Safari unverified.
- Preview-only PR #1 in `aase7en/uth-weather-led-ab-preview-20261104`
  was merged as `aabda3fd8627a9d83701a2355ad7e47b38e07f5e`.
  Intended gallery URL:
  https://aase7en.github.io/uth-weather-led-ab-preview-20261104/badge-review-20261107/
  **Publication HTTP 200 must be verified before claiming it live.**
- PR #95: 2 Hosted CI jobs passed exact HEAD, but no GitHub independent review
  record at initial checkpoint. GLM-5.3 separate read-only review for
  PR #95 and #97 was dispatched; neither counts as accepted until results
  are harvested and checked. PR #97 2 hosted workflows also passed its
  SHA at first check; current exact-SHA status still requires recheck.
- PR #91 (Nov 4 Weather A/B *pre-implementation* checkpoint) and PR #96
  (Nov 7 newer handoff) both modify `SESSION-HANDOFF.md`.
  This handoff retains the entire older PR #91 checkpoint below as an
  **archival** section, in addition to PR #96 and Oct 22 content, rather
  than overwriting another Agent's historical continuity. PR #91 claims
  that a demo did not exist were true THEN, not now.
- **No Production merge/deploy yet** for PR #95/#97. No Sheet/Apps Script
  change, no fabricated operational data, and no root dirty-worktree reset.

## ONE next safe action
Harvest/challenge independent review at exact SHAs; reconcile any blockers.
Verify hosted CI and published Preview. If PR #95 gate passes, merge at
its approved SHA, then retarget/revalidate PR #97 against merged main.
Recheck exact SHA, scope diff, Production URL and source/observedAt only
after all merge/release gates. Never blindly merge old PR #91.

---

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

## ARCHIVE — PR #91 Weather-readability checkpoint (2026-11-04; superseded)

> The following historical section was preserved from PR #91, not rewritten
> as a current task. Its early descriptions and unfinished-demo statements
> are superseded by the above current 2026-11-07 implementation and preview.

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
