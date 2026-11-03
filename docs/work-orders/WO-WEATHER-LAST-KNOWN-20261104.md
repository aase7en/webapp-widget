# WO — Weather latest-available continuity (2026-11-04)

## Scope and authority
- Repo: \`aase7en/webapp-widget\`. Base: \`main\` at \`4dc8426f74741aabae27f5fbc4f3738cd188f6ee\`.
- Owner requirement: render the newest verified weather model observation available during outages; avoid an intrusive stale banner on the 432×40 LED, notify the operator when actual observation age exceeds six hours.
- Canonical operational store remains the EXISTING \`API Report_PM2.5\` Google Sheet and its existing bound Apps Script. No new Sheet/Script/trigger/deployment. No weather model value may be relabeled as live telemetry.
- This worktree: \`/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-weather-lastknown-20261104\`. Exclusive edit scope: weather-luxury renderer/snapshot adapter, cache version pointers, focused tests, this note.
- Forbidden: Water Level, PM model/thresholds, live GAS code or credentials, production Sheet content, weather-data transport publisher, unrelated agent worktrees.

## Verified incident (2026-11-03)
- \`snapshot_v1\` returned \`weatherDiagnostic: {status:'failed',httpStatus:429}\` and only PM channel at 16:55 UTC.
- GitHub Actions scheduled weather publisher had a multi-hour scheduling gap; last valid weather observation in the canonical Sheet exceeded the frontend's three-hour currency gate.
- GitHub weather-data public transport recovered at 16:38 UTC; Apps Script snapshot recovered at 16:56 UTC; live Weather rendered again at 17:02 UTC. No source measurement was invented.

## Candidate contract
1. Use Sheet \`snapshot_v1\` as primary; preserve strict fresh-only parser for normal operation.
2. If the Sheet Weather channel is missing/stale/unreachable, first retain the most recent validated lastGood in localStorage. A fresh browser with no localStorage may read the existing public GitHub weather-data transport cache (read-only; no direct upstream weather provider calls). Verify exact requested coordinates, model grid, timezone, units, source timestamp, bounds and JSON shape.
3. Pick the newest actual \`observedAt\` (not \`savedAt\`/\`fetchedAt\`) and persist that source time. Never synthesize timestamps, weather values or health advice. Avoid changing other widget channels.
4. Mark DOM \`data-freshness=HISTORICAL\` when observation age exceeds three hours. Show compact \`ข้อมูล ณ ...\` source-time attribution in the existing secondary weather line (not a large public stale-error banner); suppress time-sensitive heat advice on historical models. When data is fresh return to \`MODEL_LATEST\` automatically.
5. The operator's independent hourly ChatGPT condition-watch alerts privately if the actual weather observation is older than six hours; the notification monitor is not a second data store. If both Sheet and existing transport have no trustworthy observation, show unavailable instead of zero or demo data.
6. Do not change the configured GitHub Scheduler, bound Apps Script deployment or live Sheet records as part of this frontend-only resilience repair.

## Acceptance / rollback
- Strict fresh-parser regression unchanged; historical parser and transport rejection tests (future/wrong location/invalid units/invalid observation) included.
- Fault-injection browser test at 432×40: simulated 8.5-hour-old transport observation rendered with \`HISTORICAL\` provenance, zero JS exceptions; subsequent fresh Sheet recovered to \`MODEL_LATEST\`, with no layout collision.
- Full \`node --test tests/*.test.cjs\`: 501/501 PASS (before independent review/final candidate).
- Independent read-only review and exact-SHA hosted CI are mandatory before merge. The implementer is not their own independent review.
- Rollback: revert this frontend PR; no Apps Script redeployment, Sheet mutation, or transport-branch reset required.
- After merge: verify GitHub Pages propagated and the fresh live board plus a stale fault-injection smoke test. Report if a reviewer/CI/release gate blocks completion.

