# Work Order — UTH[AI] Water LED Luxury V2 / Kilo Code

**ID:** WO-WATER-LED-LUXURY-V2-20261026
**Repository:** `aase7en/webapp-widget` (**not** `env-wastewater-webapp`)
**State:** Owner-approved direction; production integration NOT yet approved.
**Reference baseline observed:** `main` at `7eb344b82252f28ff3468dc73991dba86c80dfef`; reverify before execution.
**Working visual demo:** `https://aase7en.github.io/webapp-widget/demo/water-led-glass-overlay.html` (PR #42).
**Owner goal:** Make the water level slide as close as practicable to the original blue-water, white-foam, gold-lit cinematic spillway reference, while preserving LED **432×40 logical pixels** and existing PM2.5 / Weather functionality.

## Operating protocol and source recovery

1. FIRST read repo-local `AGENTS.md` and `SESSION-HANDOFF.md`, then this Work Order, `WATER-LED.md`, `docs/WATER-HISTORY-RELEASE-20261022.md`, current `v2/` UI and tests. Inspect actual Git remote `main`, current PRs, active Work Orders, dirty/untracked files and worktree ownership before any mutation. Current-state truth outranks this file. The root Mac checkout has protected existing dirty work; DO NOT reset, clean, checkout over or overwrite it.
2. Use a **separate clean Git worktree and branch** for the V2 demo, one mutable owner per file. Explicitly record `SAFE_TO_MUTATE = YES` (or NO and blocker), base SHA, branch, worktree, allowed scope, task owner and evidence paths.
3. Preferred executor is **Kilo Code / CoinTH GLM-5.3** when exact model/auth/quota is verified; do not print or commit any credentials. A positive model roll-call is not proof of remaining quota. If route/quota unverified, produce the durable task and use a native implementation fallback; do not fabricate GLM work.
4. The user approved preparation toward production, **not permission to deploy into the real LED now**. New demo PR first, separate production PR after review and explicit cutover decision.

## Plan 1 — Visual design: match the reference but respect 432×40

**Art direction:** deep midnight blue, cyan-blue glowing water curtain, brilliant white/cyan foam, subtle floating spray, reflected ripples, warm gold dam lights, clean curved navy/cyan glowing outside frame. Animated water behaves as *decorative layered sprite motion*, not a realtime hydraulic simulation. For every state, dam/towers/railings/camera/clock must remain fixed; only water/foam/splashes/ripple move.

**Composition and hierarchy:**

- Exactly **432×40 CSS logical pixels** in actual LED mode. Also 3× enlarged review at **1296×120**, same aspect and line breaks. No sideways overflow. Screenshot both sizes plus 390px mobile.
- Left: white, large legible Bangkok clock and small Thai Buddhist Era date on a **black-to-transparent gradient**. Its dark region is solid behind digits, then fades near the water. Do not add a visible hard divider between clock and art.
- Left-center *within each station panel*: existing approved spillway icon/animation, source frame **640×320 (2:1)**, contained without aspect distortion. Not a full-width background; no visible divider at its right edge. Soft vignette/mask blends art into numeric glass overlay. Give water its original depth/dimensional appearance, not a stretched wallpaper. Use no fabricated water levels in production-like display.
- Right of each art zone: smaller station name; **hero water-level number** large and bright with cyan→white→mint gradient; clear `ม.` unit; indicator for actual change only where sourced; observation/freshness time. 7-day mini trend on right from validated Sheet history only, or truthful unavailable placeholder. No invented lines or missing=zero.
- Status **neon green Normal / amber Watch / red Critical** is rendered only with verified thresholds that share gauge vertical datum and are approved. Otherwise neutral `ไม่ทราบสถานะ/ยังไม่มีเกณฑ์` badge; never green Normal merely because an API succeeded.
- Both HDA004 ช่องสะเดา and S.5 สะพานปรีดี remain accessible. The reference is visually single-station, while current production Water slide contains two. **Compare two design variants in demo:** A compact two-station in one 432×40 view; B *single-station focus* with a manual selector for the two stations. Do not silently auto-rotate the real LED before owner decision.
- No unapproved changes to PM2.5 or Weather slides. Avoid added decorative vertical borders, excessively dense text or powerful bloom obscuring digits.

**Five visual intensity modes** (manual DEMO/SIMULATED only):

| Label | Reused source sprite filename suffix |
| --- | --- |
| 0% | `0_0pct` |
| 1–25% | `1_1_25pct` |
| 26–50% | `2_26_50pct` |
| 51–75% | `4_76_100pct` (swapped by owner for apparent intensity) |
| 76–100% | `3_51_75pct` (swapped by owner for apparent intensity) |

Full assets live in `assets/water-gate/5-levels/`. Do not replace original binaries. Use a fixed architectural first-frame layer and update *only* the falling water/whitewater/spray region from sprite atlas. Avoid moving architectural edges. Use a small animation loop (~7–12fps given 4 distinct frames), normal view and paused/reduced-motion fallback. Existing code in `demo/water-led-glass-overlay.html` is a useful starting point; evolve, do not rewrite the widget.

**Phase 1 deliverables:** pixel-layout specification; demo A/B comparison; 432×40, 1296×120, mobile screenshots; before/after reference comparison; perf/animation/fallback evidence.

## Plan 2 — Existing Google Sheet/App Script data contract

**ONE backend only:** existing Google Sheet **`API Report_PM2.5`** and its existing container-bound Apps Script (details in repo `AGENTS.md`/handoff). Existing `Water_Level_History` tab. Do NOT create a second Sheet/Script, trigger, database, public API or duplicate scheduler. No credential leakage.

**Read-only audit first:**

- Verify actual current `Water_Level_History` headers/columns in source rather than assuming the conceptual schema; confirm station IDs/provider mappings, real measured rows, date fields, source/provenance, and installed scheduler/deployment in the live bound script through an authorized connector.
- Preserve `observed_at` vs `fetched_at` vs `persisted_at`; separate REAL/LATEST/HISTORICAL/UNAVAILABLE and explicit SIMULATED visual animation. Normal daily/manual measurements are not LIVE sensor data.
- Query historical series for **7 complete prior days**, in Asia/Bangkok, ordered by real observed timestamps, show only confirmed readings and preserve gaps/null; require ≥2 valid points to render a line. Distinguish provider failures or HTTP 429 from zero water levels. Retry/backoff at existing **backend** cadence (owner preferred morning/evening); do not hammer the provider directly from each client.
- `percent_of_bank`: must not use `gauge_level_m/bank_m` blindly. Required: confirmed same vertical datum, approved bank elevation, baseline and formula; do not confuse gauge height with physical gate opening percentage. Until validated, show `—`, keep the five-band animation only as explicitly MANUAL *visual scenarios*, never automatic hydraulic truth.
- Status thresholds: per-station Normal/Watch/Critical require approved numerical thresholds in the same datum and a freshness policy. Absence of approved thresholds → neutral state. No claim of hospital flood safety based on nearby station readings alone.
- Do not overwrite/recreate Sheet tabs or Apps Script deployments; prepare an **audited additive plan** for any eventual separate backend work order only if actual source shows a gap.

**Phase 2 deliverables:** verified data-contract table (field/exact source/unit/timestamp/freshness/null behavior), adapter tests with **TEST_FIXTURE** values clearly marked, read-only integration plan, explicit blockers for unknown bank/threshold/deployment and API 429 failure behavior.

## Plan 3 — Demo, tests and release readiness

**Allowed first code scope:** NEW isolated `demo/water-led-luxury-v2.html` and optionally adjacent `demo/water-led-luxury-v2.css`, `demo/water-led-luxury-v2.js`, `tests/water-led-luxury-v2.test.cjs`, plus this Work Order's factual evidence. Existing `SESSION-HANDOFF.md` is the one repo continuity file; avoid parallel global SSoT.

**Forbidden until new gate:** production `index.html`, `v2/index.html`, production `v2/` CSS/JS, `apps-script/*`, live bound script and triggers, Google Sheet mutations, GitHub Actions, thresholds, original animation binary assets, `data/raw`, secrets, unrelated agent-owned dirty files. Review-only inspection of production source is allowed.

**UI controls:** five selectable visual bands; two demo layout choices (dual-station and focus HDA004/S.5); PM2.5/Weather side-by-side comparison or link with no changes to production; optional reduced motion/pause, real/unavailable backend provenance states. Every control wired; default screen safe for unknown data.

**Acceptance verification:**

1. Chrome browser at **432×40** and **1296×120** pixel screenshot, mobile 390px; stable frame within 432×40 and no overflow, readable Thai/B.E. date, clipped-free values/units/status/trend.
2. Programmatically assert upper fixed dam frame hashes match at t0/t1 per band, lower water region hashes change; all five assets HTTP 200 and correct swapped intensity mapping; image source aspect remains 2:1.
3. Validate history present/missing/stale/empty/offline/HTTP429 and unknown threshold/percent handling, no invented gauge readings or flood flags. 7-day chart must use real source points only.
4. Test rapid state switching, repeated slide navigation, memory/RAF cleanup, reduced-motion still fallback, tab/keyboard/contrast and low-end/restricted network; ensure JS error count zero.
5. Run focused + related repository tests and browser QA; freeze exact SHA, run independent review + GitHub CI; remediate. Open **demo-only PR** and verify public GitHub Pages URL after merge. **Never** auto-merge into production UI; a separate user-visible release decision/rollback gate is needed.
6. Report in Thai: what changed, actual preview URL, PR/head SHA, status of each phase, tests, verified source-data gaps, production blockers, ONE next safe action. Do not promise work later or leave an opaque status.

## Kilo Code execution instruction — copyable, zero chat-history dependency

**PLACEMENT:** Kilo Code CLI, from a CLEAN isolated `webapp-widget` Git worktree.
**MODE:** CLI / TERMINAL.
**PURPOSE:** implement and verify the Water Level luxury V2 **demo only**, independently auditing real data paths read-only and preparing production release gate.
**REPLACE GOAL?:** NO.
**APPEND TO GOAL?:** NO.
**INTERRUPT CURRENT WORK?:** NO.
**SUBGOAL/QUEUE?:** NO.
**WHEN TO SEND:** after exact repo/route/quota/worktree preflight; use as a new scoped task.

```text
You are Kilo Code working on aase7en/webapp-widget (NOT ENV wastewater).
Read AGENTS.md, SESSION-HANDOFF.md, docs/work-orders/WO-WATER-LED-LUXURY-V2-20261026.md, the current approved demo and tests FIRST.

Task: Execute Plan 1 and Plan 3 fully as a NEW isolated, browser-tested, GitHub Pages visual DEMO. Execute Plan 2 as a VERIFIED READ-ONLY data contract audit. Preserve the original PM2.5/Weather and real 432×40 LED Production unchanged.

RECOVER: inspect actual GitHub main SHA/PRs/CI, local worktrees/dirty owners, active claims and exact repo-local instructions. Select a new clean worktree/branch and show SAFE_TO_MUTATE=YES only when all gates are met. Refuse unsafe overwrite.

VISUAL: match the owner reference cinematic cyan water, bright white foam, gold-lit dam, soft black-gradient clock and large luminous gradient measured-level numerals. Keep spillway animation constrained to left-center of each station (2:1 art); no stretched background, no hard vertical separators; preserve architectural frame fixed and water moving. Work at EXACT 432×40 LED plus 3× review 1296×120. Provide both dual-station and single-station-focus layouts as demo alternatives. Five SIMULATED visual states with user-requested 51–75/76–100 source swap. Preserve asset originals.

DATA: use ONLY existing API Report_PM2.5 Sheet + bound Apps Script + Water_Level_History. Verify read-only exact schema/deployed history path; draw REAL 7-day trends when available; no fake levels, timestamps, percentage-of-bank, flood-safety status, triggers or new Sheet. Gate any bank% calculation on verified same-datum bank reference and approved formula; otherwise show — and neutral unknown state. Model missing/429/stale safely.

IMPLEMENT: new demo-only HTML/CSS/JS+tests within allowed Work Order paths, render real screenshots in browser at 432×40 / 1296×120 / iPhone 390. Add automated frame-stability/water-motion, no-overflow, source-integrity, reduced-motion and failure tests. Fix defects before candidate freeze. Do not touch production or backend. Record findings/provenance into the Work Order's evidence section (no secrets).

COMPLETE: inspect diff, run affected/full tests, freeze exact commit SHA, have independent read-only review and hosted CI, correct if needed, open a DEMO-ONLY PR and merge only when policy/review allow. Verify published Pages URL and client asset loading. Report final evidence in Thai and identify the one remaining production release gate. Production cutover needs separate explicit approval; DO NOT publish directly to real LED.

If Kilo route/quota or ownership is unavailable, stop the dependent lane with typed blocker but preserve the verified read-only spec/progress; do not invent results or ask the owner to relay agent output.
```
## Evidence and release blockers — 2026-10-26, Asia/Bangkok

**Visual candidate — Plan 1 and 3, local before PR:**
- New isolated demo/water-led-luxury-v2.html with 2-station vs 1-station focus comparison; 5 original approved animated sprite strips with user-corrected 51–75/76–100 mapping. All existing PM2.5, Weather, v2 and backend files remain unchanged.
- Actual Chromium screenshots confirm the full LED element exactly 432×40 CSS pixels in both dual and focus variants; 1296×120 enlarged view and 390px phone without overflow. All five scene controls work, water animation advances, reduced-motion mode detected, no JS error.
- Full source test command node --test tests/*.test.cjs passed 303/303 locally.
- Status and hero readings still correctly display UNAVAILABLE rather than fake values. Because reference art ratio is ~3.3:1 but LED ratio 10.8:1, choice of dual vs focus is a visual product decision, not a pixel-perfect clone.

**Verified canonical Google Sheet (read-only connector):**
- API Report_PM2.5, timezone Asia/Bangkok, existing Water_Level_History tab (sheetId 202610210) has 18 columns, header:
  batch_key, batch_date, slot, location_id, station_code, station_id, station_name_th, level_msl_m, observed_at_th, fetched_at_utc, reading_status, provider, source_url, bank_msl_m, ground_msl_m, datum, location_relation, saved_at_utc.
- HDA004 provider id 471583 and S5 provider id 2607 have actual saved observations through 2026-10-26 morning; earlier seed records are explicitly VERIFIED_BACKFILL. Settings values say 06:00/16:00 Asia/Bangkok, but scheduler trigger installation is NOT independently verified.
- Bank/ground MSL references are stored, but station-specific approved threshold and bank-percentage formula, and physical gate opening telemetry, are NOT verified. Do not infer these.

**Production data blocker (read-only):**
- Existing fixed public Web App action=water_history endpoint from v2/api-client.js returned HTTP200 with schema:1 and LAST_OBSERVATION_NOT_LIVE, but BOTH HDA004/S5 returned status:missing and no observedAt, each with ONLY two trendPoints.
- This conflicts with the newer data verified in canonical Water_Level_History. It is NOT evidence of a provider HTTP 429. Reconcile source/deployed version/parent spreadsheet/active deployment/read filter before any production cutover; do not assert root cause without a controlled check.
- Current repo WaterHistory.gs also computes watch/critical presentation from bank minus fixed offset; this is not an approved hospital flood-warning threshold. Treat as UNASSESSED until separately validated.
- No Sheets writes, trigger edits, script update, redeployment or operational threshold activation made during this task.

**One safe next action:** publish isolated visual demo after GitHub PR+CI; keep production data release on hold for a separately reviewed deployment/data read-path fix and owner layout choice.


## Post-merge checkpoint — 2026-10-26 (verified on public GitHub Pages)

**Scope state:** Plans 1 and 3 completed for **isolated public visual demo**. Plan 2 completed only as a read-only contract/source audit; the actual production data-path discrepancy is **OPEN / BLOCKED**. The owner has not approved production cutover. Do not report the entire production launch as done.

- **Merged PR:** https://github.com/aase7en/webapp-widget/pull/43 ; merged main SHA 1b6a604bf34d14c891755d1e74ae5470235d49cd. This adds only the new demo file, this Work Order and its test. Earlier Glass preview PR #42 is also on main.
- **Public visual demo:** https://aase7en.github.io/webapp-widget/demo/water-led-luxury-v2.html — verified HTTP 200 (28183 bytes) against actual GitHub Pages; title matched. Pages workflow run 40247785547 completed **success** on the merge SHA.
- **Current live URL still untouched:** https://aase7en.github.io/webapp-widget/ . Demo is NOT the PM2.5/Weather/Water production rotation.
- **Browser verification on public URL (Mac Chrome headless):** both dual and focus layouts selectable; focus can switch HDA004 or S.5. Five buttons 0–4 select correct band and each animated Canvas changes its frame sample over ~450ms. Design-stage canvas 1296×120 at desktop; responsive iPhone-width 390px resulted document.scrollWidth === 390, no script errors or failed network requests. The actual 432×40 CSS LED arrangement was previously tested before PR #43; visible enlarged preview uses 3× scale. These are browser/runtime checks, not proof of physical LED panel readability.
- **Data honesty:** browser readout reported both water levels null, and demo renders unavailable placeholders. No fake station readings, historical trend, percent-of-bank or green Normal status introduced. Seven-day chart / thresholds are **not production ready** until the existing canonical backend serves validated measurements and approved per-station thresholds.
- **Independent readiness blocker:** source sheet contains newer actual history while existing published water_history endpoint was verified by prior source audit as returning missing station status / only two trend points. Current live source reader is not verified reconciled. Do not classify as provider 429 or mutate Apps Script/trigger based on unproven cause.
- **Kilo continuation:** detailed zero-chat-history Kilo Code execution instructions remain above in this same Work Order. The CLI exists and cointh-glm/glm-5.3 appeared in the Mac model catalog; successful roll-call was observed earlier, but specific remaining quota was **not independently established**. Do not claim long-running Kilo execution occurred unless verified in its own task/session.
- **NEXT SAFE ACTION:** read-only trace current bound Apps Script deployment vs canonical Water_Level_History, station filtering, timestamps and response fields; draft independent defect fix/release plan, no new Sheet/Script, no backend mutation or production cutover absent separate verification/authorization. Owner visual choice dual versus focus remains open before production release.
