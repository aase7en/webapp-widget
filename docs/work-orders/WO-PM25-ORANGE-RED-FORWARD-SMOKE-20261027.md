# WO-PM25-ORANGE-RED-FORWARD-SMOKE-20261027

Status: DEMO-ONLY IMPLEMENTATION, no production permission.
Authority: Owner explicitly requested assistant implementation via SundayMCP Mac for Orange/Red stack smoke rising continuously without reversed loop and red suspended air pollution haze.
Repo: aase7en/webapp-widget (not ENV).
Base HEAD: 521a3d8e18db7fc57366adeb8541cf2041d53397, source branch sol/pm25-green-red-locked-visual-20261027.
Writer: visual integrator in isolated branch fix/pm25-orange-red-smoke-v2-20261027, worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-stack-plume-v2-20261027.
Allowed scope: assets/pm25-luxury/locked-tiers-v1/**, this WO and append-only SESSION-HANDOFF.md.
Forbidden: main, live Water, Weather, PM, v2/frontend, backend, Google Sheet/GAS, original owner art, GREEN/YELLOW outputs, other lanes.
Mutation gate: verified exact clean base HEAD and matching remote, AGENTS.md and prior work order. SAFE_TO_MUTATE_DEMO=YES, SAFE_TO_MUTATE_PRODUCTION=NO.

## Root cause
Original builder used source keyframes back-and-forth and moved a limited smoke-like cloud patch via the sky mask. Chimney mouths did not independently emit smoke. RED aerosol had no atmospheric movement. Pixel-locked city must remain unchanged.

## Correction
- Four physical smokestack outlets per color, staggered new smoke births every 6/54 frames.
- Each smoke packet ages strictly forward: Y decreases (rises), X decreases (downwind), radius grows, fades and expires before reappearing. No packet reverses at the loop boundary.
- Coherent smoke texture is advected by periodic forward phase so steady emissions are visibly moving, never a static cloud.
- RED adds volumetric moving red/brown source-matched haze and 170 tiny fading slowly drifting suspended aerosols, without large decorative dots.
- Architecture, smokestack walls, hospital, bridge and temple remain pixel locked. Only eligible sky gets emissions.
- Artistic illustration only, not measured stack emissions or actual PM distribution.
- Same ten native owner cells, each 54 derived keys, 1296x120, and original 432x40 preview. No changes to data, risk classification or dashboard production.

## Test gates
verify_emissions.py checks all emitted lifecycles for strictly forward x/y trajectories, lifetime expiration, spatial smoke change, protected skyline and RED haze/aerosol motion.
verify_all.py verifies SHA of source cells, frame count, landmark locks, MP4 presence, RGB seam and original tier masks.
Full root Node tests plus hosted browser interaction and visual/LED QA required before draft PR delivery.
Owner retains subjective luxury/artistic acceptance; never auto-merge.

## Verified implementation result
- Built ORANGE and RED only: 10 original owner cells each, 54 derived frames each; 9fps MP4s decoded. GREEN/YELLOW source and outputs unchanged.
- Physical plume has 4 chimney mouths per tier. Every test packet X decreases downwind and Y decreases upward for all 42 stages, then fades before expiry. A periodic drifting smoke texture fixes the earlier near-static-density problem. Measured motion mean RGB change inside plume support: ORANGE 13.934, RED 10.468.
- RED moving haze covers ~34,405 image pixels; fine, staggered drifting aerosols have ~14,647 nonzero pixels at the test frame. Those figures describe illustrative raster coverage only, not environmental concentration.
- Existing pixel-locked landmark checks verified. The skyline is allowed to change only in sky above chimneys, not physical roofs, walls or smokestack bodies.
- Browser QA exercised all four tiers, confirmed real video time advances, pause freezes, reduced-motion renders static, 428x39.6 video inside exact 432x40 bordered LED box, zero JS exceptions.
- Root Node suite: 313 of 313 PASS; verify_all.py all four scenes PASS; verify_emissions.py PASS; git diff --check clean. Owner luxury quality / physical LED approval still pending.
- Zoom-frame motion proof added under each changed tier QA directory: qa/stack-motion-six-zoom.webp. No main, Water, Weather, PM data or live backend changes.


## 2026-10-28 focused visual correction — owner approval NOT granted

Latest owner instruction supersedes the earlier visual approval: ORANGE/RED visual sign-off is **PENDING/REJECTED FOR NOW**, and Demo Integration is NOT authorized. Existing isolated DEMO worktree and PR #56 only. Neither merge nor production deployment is permitted.

Visual root cause established by pixel-aligned six-timestamp comparison against the pre-emissions base commit `521a3d8`: the added plume appeared as broad opaque charcoal diagonal slabs that obscured source cloud texture. In the pre-fix rendered industrial-sky ROI, fraction of alpha >0.65 was ORANGE 0.1372 / RED 0.1727. The original fixed smokestacks and source colors were intact; the synthetic smoke overlay was the problem, not the original art.

Focused repair in `scripts/smoke_atmosphere.py` only: source-compatible warm palette ORANGE RGB (147,111,86), RED (118,79,66); packet opacity scale 0.73; radius growth X .52→.39 and Y .40→.30 source px/frame. Packets still rise, drift left, fade and expire by age 42; four stack mouths/tier remain pixel-locked. RED source-matched volumetric haze and tiny suspended aerosols remain unchanged. Regenerated only ORANGE and RED WebP/MP4/still, their manifests, QA contact sheets and Chrome screenshots. Ten immutable original owner source cells per tier and GREEN/YELLOW media unchanged.

Verification after repair: alpha >0.65 area in the same fixed ROI decreased to ORANGE 0.0806 / RED 0.1186; `verify_emissions.py` PASS (forward age/direction and Red dust, delta orange 4.141, red 4.531), `verify_all.py` PASS all four tiers (WebP seam orange 1.815, red 1.518 mean RGB), `node --test tests/*.test.cjs` 313/313 PASS. Chrome CDP actual MP4 advanced, both LED boxes exactly 432×40, Pause/static fallback and Reduced Motion PASS, no JS exception. No physical LED hardware/artistic owner acceptance or integration acceptance claimed.

Stop: keep PR #56 DRAFT, no merge, no production changes. One next safe action: owner reviews new Orange/Red animation and optionally supplies visual-specific adjustments; do not start PM Cinematic Integration before an explicit later approval.
