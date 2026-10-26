# WO-PM25-LUXURY-SPRITES-20261026 — planning/design only

Status: DESIGN_PLAN_PREPARED / OWNER_REVIEW_PENDING.
Risk: R0 docs-only now; eventual PM health-band source change + live release are R2/R3 as applicable.
Authority: owner request 2026-10-26 to PLAN first, research A-Sunday Conductor, AI Hero and open-source assets, then gradually create sprites for five Thai PM2.5 tiers. No authorization yet for a sprite implementation or live modification.
Source/roadmap:
- docs/design/pm25-luxury-animation/PLAN.md
- docs/design/pm25-luxury-animation/ROADMAP.md
- existing tracked root SESSION-HANDOFF.md (single canonical handoff)

## Boundary and claim
Repository: aase7en/webapp-widget. Parent origin/main pinned 82cb7fc06d501ce4482b6ad21fd33777ed018ffb.
Isolated worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-luxury-plan-20261026
Branch: docs/pm25-luxury-sprite-plan-20261026
Writer/claim: this integrator, only 3 planning files + append-only root SESSION-HANDOFF.md.
Allowed: docs/design/pm25-luxury-animation/{PLAN,ROADMAP}.md, this WO, one append-only handoff checkpoint.
Forbidden: root dirty project worktree; v2 PM/Weather/Water frontend; Apps Script; backend; sensors/data; assets/sprite binary generation; main merge; production changes.
Overlap note: root sol/native-led-frontend-20261017 has unstaged Weather demo, backend and handoff edits. Entire root dirty state is protected. Existing weather work owner/claim must be resolved before actual UI implementation.
SAFE_TO_MUTATE_DOCS_ONLY=YES after exact repo/worktree/head/dirty/owner verification. SAFE_TO_MUTATE_SOURCE_ASSETS_LIVE=NO.

## Current actual state evidence
- Project original root worktree has 22 unstaged and 8 untracked items on a separate branch. New docs worktree was created CLEAN from origin/main.
- main deployed Water Luxury source from PR #47; Water atlas 5-level sprite strips are already tracked, a reusable pattern.
- Existing live v2/live-widgets.js PM health mapping still has outdated 26/38/51/91 thresholds and must be corrected only after proving field aggregation and source contract.
- Official 2026 DoH guidance uses five mass-concentration color tiers: 0–15, >15–25, >25–37.5, >37.5–75, >75 µg/m³. Difference from AQI and old guidance is material. See PLAN.md source links.

## Execution DAG after owner review
A: verify PM source/aggregation (data reader, independent factual review).
B: five STATIC aligned master concepts / contrast review; may proceed with fixtures only while A executes.
C: green 8-frame alpha sprite proof -> motion/loop/low-end review (depends B).
D: four other tier loops (depends C) with one visual writer.
E: bind approved tier mapping to real data and fix prior classifications (depends A, C, independent data review).
F: shared clock alignment & Weather family (depends E and ownership gate).
G: exact-SHA PR, CI, external review, owner production approval and post-live verification.

## Acceptance
- 5/5 imagery categories correspond to approved Thai 2026 tier and example 22 is GREEN/ดี, not ดีมาก.
- One prototype smooth loop + accessible static fallback first, then expansion after owner acceptance.
- No sample PM/Weather numeric value ships as real data; units and observed times preserved.
- Three-slide PM/Weather/Water date/time clock anchor stable to <=1 CSS px measured in Chrome.
- Performance/low-end browser and 432x40 real screen tests, CI, independent review before any merge.

## Bootstrap surfaces
RDC Windows + Mac available; five SunDay Workers responded but their Active Project is ENV not this widget. Do not rebind/steal merely for a docs task. Git remote main verified; A-Conductor documentation read-only reviewed. GLM offload assessment: deterministic research/docs drafting is more appropriate locally, no eligible bounded GLM implementation yet; quota/model dispatch not required for docs-only phase.
A-Conductor adoption classification: REUSE its entry/graph/work-order/evidence/handoff ideas; no new scheduler, claim registry or automation.
AI Hero adoption classification: WRAP the conceptual research/spec/tickets/prototype/review/handoff chain around existing work order; no install performed.

## One next safe action
Collect owner's approval or requested changes to design PLAN + five states. Then prove PM data aggregation and obtain a scoped, non-overlapping demo implementation claim before generating any new art or code.
