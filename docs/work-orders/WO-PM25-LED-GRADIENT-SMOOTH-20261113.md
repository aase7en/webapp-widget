# WO — PM2.5 LED chart visual continuity (physical screenshot feedback, 2026-11-13)

## Authority / scope
- Owner: PM2.5 visual-only correction requested from physical mobile/LED screenshot.
- Repo: aase7en/webapp-widget; base main efb8fcda04bc4cf929b53da93a4d58c19163d2ba.
- Branch: fix/pm25-led-chart-gradient-20261113.
- Isolated worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm-chart-fill-led-20261113.
- One writer (integrator). Other dirty worktrees, Weather PR #99, Backend, Sheets, Water, sensors and cache transport untouched.

## Root cause
Original chart combined opacity masks whose gradient was anchored to frame Y (then per-segment oblique masks). It produced visibly uneven vertical intensity bands between true readings, exacerbated by different gap vs continuous opacity. Gap links used dash styles that made the trend resemble dotted fragments.

## Correction / compatibility
- Use narrowly layered translucent SVG ribbons under every real line segment. Alpha varies with distance below the observed line, not a fixed viewport Y or independent mask orientation; neighboring segments share matching intensity at their endpoints.
- Preserve color interpolation between the actual PM tier colors; keep 24h timestamp X and existing monotonic asinh Y transform (15–35 emphasis). No source values, health bands, timestamps, or historical gap semantics changed.
- Show uniformly weighted solid lines and softly glowing colored real-reading points. Gaps remain tagged data-gap, have a visibly distinct white double-slash over the solid bridge, and are explicitly described in the accessible SVG label. Connecting endpoints denotes visual tendency, not an intervening measurement; no fabricated data points. Do not infer missing values.
- Make SVG taller within the same frame (viewBox 300×40, CSS height 48), time labels smaller (7px board units), preserve right-edge, scale, badge, and reading overlap protection.
- Scoped cache updates only PM iframe and PM JS, with root iframe version bump. Weather and Water assets/version pins unchanged.

## Verification / release gates
- Focused Node PM/Weather regression, full Node suite, real Chrome at 432×40/DPR3 with explicitly SIMULATED QA fixture (continuous, missing-hour, outlier), review of rendered images / frame geometry, and diff check.
- Need exact SHA independent read-only review, hosted CI checks, expected-SHA merge, Pages built SHA, and HTTP byte-by-byte post-deploy checks before claiming production.
- Physical LED and iOS Safari screenshots supplied by user are observations but post-release physical panel verification remains outstanding.

## Candidate evidence
- Full Node suite after P1 missing-data double-slash repair: 547/547 PASS (original candidate 546/546 PASS).
- Browser Chrome headless: continuous 24 points / 23 solid links, six missing samples removed leaving 18 points and 4 marked solid bridging intervals, one missing/outlier scenario leaves 23 points and 1 marked bridge. All zero dash segments, 432x40/DPR3, no page errors. Test fixtures are SIMULATED, never actual PM.
- Full-screen screenshot visual review: uneven vertical bands resolved, glow close to curve, smaller timeline labels, within frame. Physical LED device not post-release checked.
- git diff --check PASS.
- Follow-up independent review: initial PR #103 SHA cf27b480a9fe69c7b5f8c0033a1ace1f5c62b322 was BLOCKED because invisible data-gap on a solid line could mislead LED viewers. Repair adds a visible white double-slash marker at every gap midpoint (not an observation), plus regression and Chrome QA assertions. Re-review of updated SHA required.
