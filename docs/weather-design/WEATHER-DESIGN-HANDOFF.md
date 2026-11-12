# Weather 432 × 40 — design and implementation handoff

Checkpoint: 2026-10-30, Asia/Bangkok. This is a handoff, not proof that production has changed. Recheck live GitHub and Apps Script before acting.

## Owner's decisions

- The owner likes the overall style of the generated Weather concept and wants to continue in this direction. The concept is **static**; it is not approval of finished animation, artwork accuracy, readability at actual LED size, or deployment.
- Target output is **432 × 40 physical pixels, 10.8:1**. The generated image is 2060 × 763 including surrounding margins; it is not a 432 × 40 production layout. Build and capture the real 432 × 40 viewport, rather than stretching this image. A proportional 1296 × 120 authoring canvas is a possible implementation; preserve aspect ratio when scaled.
- Visual language: luxurious dark navy/cyan, seamless glowing frame like the current PM2.5 page, with Japanese anime-style scenery and crisp 2.5D/3D-looking weather icons. The date and clock must match the water-level page 3 and PM page in position, size, color and font, so they appear stationary during rotation. Blend the clock and text backdrops into the scenery without hard edges while keeping text readable.
- Left: weather-appropriate animated background and a matching animated icon; prominent temperature with near full-height numerals and a small unit, as in the approved PM design. No location label required. Do not claim the illustrative hospital is an accurate image of the real hospital.
- Show feels-like temperature and an appropriate heat precaution when warranted; include hourly-updated humidity and rain probability, daily high/low, plus a **7-day** forecast with daily icon, rain percentage and temperature trend line/area, replacing the current hourly forecast. Use space efficiently and retain readable hierarchy; test physical LED legibility before declaring every small label usable.
- Generate additional background scenes and animated icons for the relevant weather conditions; the current image is a style reference, not a replacement for those assets. Keep animation looping while the page is visible; support iPhone and reduced-motion accessibility.
- Approval of the five existing PM2.5 animations still stands; do not replace them while working on Weather. Existing unrelated worktrees and unfinished changes must be preserved.

## References, included in this branch

- [Owner-approved visual direction](assets/weather-owner-approved-concept.png) — generated concept, SHA-256 `a1461f24c48198a34f6cb5c0db602263df082ed1eb6a5f77372481ea33ccb882`. All its values and imagery are illustrative, not live measurements. 2060 × 763; not the LED aspect ratio.
- [Original owner reference](assets/weather-owner-reference.jpg) — SHA-256 `6e336e35fd71a1debd3aaae0f81ddd5caaed1c621ccaa6eb20738cfebe921a8f`.
- The user wants a viewable example before finalizing the Weather page. Provide a clearly identified demo and a link accessible to the owner; a static mockup cannot demonstrate animation. Do not present simulated data as real readings.

## Practical layout and asset plan

1. Measure the existing PM and water clock against the actual rotation viewport. Make a 432 × 40 layout prototype with sample data visibly identified as demo outside the public display. Allocate space to clock, scenery, big temperature, compact details, and seven-day forecast; iterate at native pixels and on iPhone. Prioritize the temperature and clock if tiny details cannot be read; review layout with owner before production.
2. Apply `a-2-5d-animation` v0.8.0 (`/Users/aase7en/.codex/plugins/cache/created-by-me-remote/a-2-5d-animation/0.8.0/skills/a-2-5d-animation/SKILL.md`; locate installed version if path changed). For each design, lock an approved clean Static Master; generate each full-size transparent motion asset or frame separately with matching linework/color and real alpha. Never make a collage and crop frames. Protect architecture and edges, retain editable sources and provenance, test actual movement and seamless loops.
3. Cover Open-Meteo WMO weather codes with a deliberate mapping and fallback: clear day/night (0), partly cloudy/cloudy (1–3), fog (45/48), drizzle (51–57), rain/showers (61–67, 80–82), thunderstorm (95/96/99); handle snow/ice and unknown codes gracefully without falsely depicting a different event. Day/night variants where appropriate. Confirm the current provider's full code list before implementation. Reuse shared layers where visually consistent; scene selection must come from actual data.
4. Optimize for repeated rotation and low-end devices: pre-size assets, retain a poster/static fallback, use muted inline looping H.264 MP4 (`yuv420p`, fast start) and WebM where useful, preload/cache selectively, measure size and startup on the target device. Do not claim a static preview proves movement. Honor `prefers-reduced-motion` and verify iPhone autoplay/loop behavior. Review actual displayed frames, transitions, continuity and video decode.
5. Keep all 7 forecast days aligned to Asia/Bangkok dates; account for missing/null data and preserve actual provider timestamp and freshness. Test high/low and time boundaries. At 432 × 40, provide the owner an enlarged faithful pixel rendering as well as actual native-size output.

## Data semantics and backend — unfinished work

Existing main, checked 2026-10-30 at `171edafa614a4ae809cfc184ad7a2f4e93958aa1`, still serves Weather from `v2/weather.html`, `v2/weather-live.js`, `v2/weather-conditions.js`, `v2/weather-advisories.js`, and `v2/api-client.js`. Its Weather client still calls Open-Meteo directly and shows an hourly forecast. **Do not state the shared hourly backend is live.** Verify HEAD and live deployment again.

The owner wants all widget provider API calls centralized: existing bound Apps Script fetches at most hourly, stores in the existing canonical Google Sheet, and websites read the shared snapshot instead of each visitor calling the provider. PM history retains at most 90 days; bounded automatic cleanup should delete only known-owned, verified excess records and preserve unknown/unrelated content. The owner has allowed removal of unused Sheet data, but no unknown tab or record has been identified as safe to delete. No Sheet data was deleted in this handoff.

Candidate work is [Draft PR #67](https://github.com/aase7en/webapp-widget/pull/67), branch `sol/hourly-shared-api-20261030`, last checked head `4c2e8ee6ec4a0c348dbc014de1f7ab87d4136716`, separate worktree `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-hourly-shared-api-20261030`. At that checkpoint CI `verify` and `water-led` passed and 369 local tests passed; a fixture at 432 × 40 did not contact providers. Independent review, actual deployed script/trigger validation, and live end-to-end cutover remain outstanding. The PR has not been merged or deployed. Recheck all facts and exact SHA; avoid duplicate hourly triggers. See `/Users/aase7en/Desktop/PM25-WebappWidget-Handoff-2026-10-29/HOURLY-SHARED-API-2026-10-30.md` if available. Do not commit or expose private Apps Script backups, tokens, or Script Properties.

The standing `AGENTS.md` contract identifies the existing spreadsheet and its bound script. Before editing live Apps Script, verify identity, deployed source, owner-visible trigger inventory and a private backup, then validate actual snapshots and rollback. Trigger visibility can be account-limited. Do not create a separate spreadsheet or script. On errors, show unavailable/stale appropriately; no fabricated readings, zeros for missing data, or silent display of demo history as real.

Separately verify the PM requirement: current hourly displayed value and a **24-hour average** as the severity/color decision basis. Prior main behavior used an hourly value for classification; do not call the requested averaging complete without evidence and test coverage.

## Open-Meteo contract to verify

Use [Open-Meteo forecast documentation](https://open-meteo.com/en/docs) for current field names and semantics. Candidate fields: `temperature_2m`, `relative_humidity_2m`, `apparent_temperature`, `weather_code`, `is_day`; hourly `precipitation_probability`; daily `weather_code`, `temperature_2m_max`, `temperature_2m_min`, `precipitation_probability_max`. The daily maximum probability is the maximum of hourly probabilities, not necessarily the probability of rain at any time that day; label accordingly and verify available units/time zone. Forecast model estimates are not station measurements. `apparent_temperature` is not automatically the same as a formally calculated heat index; choose accurate Thai wording and use a documented source for any safety threshold, such as [US National Weather Service heat guidance](https://www.weather.gov/safety/heat-index). Avoid presenting an invented medical diagnosis.

## Resume and acceptance

1. Read `AGENTS.md` and this document; verify current GitHub main, PR #67 SHA/status, active worktrees, source and deployment without resetting, stashing or overwriting unrelated work. Use an isolated worktree and a clear branch.
2. Continue the hourly backend candidate through exact-SHA review, CI and verified live readiness, including duplicate-trigger avoidance, bounded retention, outage/429, stale values, no browser-to-provider calls, and actual Sheet data. Keep production cutover subject to existing owner authorization and release gates; record actual deployment state.
3. Build a separate Weather demo with truthful fixtures and all needed approved assets, show a working accessible link to the owner, and get visual approval for final scenes/motion. Test 432 × 40, iPhone, looping, static and reduced-motion, missing/stale data, Bangkok midnight, 7-day values, code mappings, transitions and low-end performance.
4. Run suitable automated tests and independent review on the exact final SHA, check hosted CI, then document release/rollback and obtain any required explicit authorization before merge or production deployment. Update `SESSION-HANDOFF.md` with verified evidence.

**First next safe action:** check current main and PR #67 head/status, then inspect the existing Weather implementation and make a native-ratio 432 × 40 demo plan in an isolated worktree; do not infer that a previous CI run or this handoff verifies the live system.
