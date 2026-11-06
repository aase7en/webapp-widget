# PM2.5 Luxury Animation — incremental roadmap

Status: PLANNED ONLY; R0 docs phase. All phase gates require source, diff and review evidence.
Epic: docs/work-orders/WO-PM25-LUXURY-SPRITES-20261026.md
Proposed production target: aase7en/webapp-widget LED 432x40, ONLY after owner visual and release approval.
Development branch/worktree must remain isolated from the dirty sol/native-led-frontend-20261017 root and current Weather demo lane.

| Phase | Work | Verifiable deliverable | Advance only if |
|---|---|---|---|
| P0 | Confirm live PM source, aggregations, observation time, old 26/38/51/91 cutoffs, physical clock bounding box | source contract + actual screenshot coordinates + five-tier unit-test fixtures | data semantics and Thai thresholds approved |
| P1 | Draw FIVE aligned master still scenes (blue/green/yellow/orange/red) using a locked city camera, single layout guide | 5-image contact sheet, 1 neutral unavailable fallback; labels as test-only DOM | owner chooses/approves look of 5 levels |
| P2 | Generate ONE green tier motion proof (8 transparent haze frames + minimal glint), extract/pack sprite atlas | inspectable demo-only animation + manifest; frame-first/last seam test | owner accepts motion quality and readability |
| P3 | Expand to blue, yellow, orange, red overlay loops via same composition/frames policy | total 5 motion states, common 432x40 crop, alpha clean, no frame jitter | 5-tier visual QA, memory and download budget measured |
| P4 | Implement PM2.5 real value mapping after approved aggregation and threshold correction; fail-closed | deterministic band tests at boundaries, stale/unavailable, real DOM data | source/health classification independent review |
| P5 | Align PM/Weather/Water clock common coordinates; apply Weather luxury family without invented 7d forecast | 3-slide stable clock screenshot diff, weather demo overlay with valid fields | physical LED and fallback end-to-end pass |
| P6 | Review and production staging | isolated PR with exact SHA, CI, screenshot/bench evidence and rollback | separate owner approval to merge live and post-deploy verification |

## R0/R2 governance reuse (A-Sunday Conductor and AI Hero)
- /research -> documented SSOT, no UI changes before source checks.
- /to-spec -> PLAN.md; /to-tickets -> this ROADMAP and focused subcontracts.
- /prototype -> discardable 5 still preview plus one green loop; no independent production write.
- /code-review -> exact candidate-SHA independent verifier; /handoff -> existing tracked SESSION-HANDOFF.md (no second SSoT).
- Claim one writer per hotspot; visual art and domain-band math must be separately reviewed; no parallel changes to root dirty files.

## Small measurable acceptance suite
1. Classification fixtures: 0, 15, 15.1, 25, 25.1, 37.5, 37.6, 75, 75.1, null, negative, NaN, future timestamp, stale 24h sample. Confirm boundary rounding policy with source BEFORE implementing.
2. Visual: 5 band previews share same horizon coordinates; maintain large number, status label and source timestamp; no unintended purple.
3. Clock: same baseline and width for all 3 states (target <=1 CSS px); no reflow across slide transitions; comparison after loading real Thai fonts.
4. Motion: no seam flash at loop junction, no text obstruction; reduced-motion screenshot stable; image fail shows readable static.
5. Performance: benchmark real physical display browser for render FPS/frame time/network bytes after assets built; keep 22s carousel cadence and no main-thread stalls.
6. Backend: do not add a Sheet or Apps Script. PM source remains canonical existing bound Google Sheet; original observedAt/freshness preserved.

## Risks and mitigations
- R1: inconsistent AI image frames -> scene locked + separate transparent motion, visual diff checks.
- R2: incorrect Thai PM bands/aggregation -> first prove exact PM statistic; compare official 2026 DoH mapping; threshold tests before deployment.
- R3: animation too heavy / Wi-Fi flaky -> single active atlas, lazy-load, still fallback, reduced motion.
- R4: clock jumps because slide markup differs -> common coordinate spec, visual regression tests, parent clock only as separately accepted option.
- R5: concurrent dirty Weather demo work -> DOCS-ONLY worktree now; implementation ownership must be reconciled before any source mutation.
- R6: default concept mockup was 3:1 whereas LED is 10.8:1 -> judge the real 432x40 crop, not concept image visual density.

## Next permitted action
Owner evaluates PLAN.md + this roadmap. Once the visual concept and mapping are accepted: verify exact PM source aggregation and draft FIVE STATIC scene cards in a new isolated demo lane. DO NOT merge or generate 40 sprite frames first.
