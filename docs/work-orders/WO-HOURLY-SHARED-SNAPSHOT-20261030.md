# Shared hourly API snapshots — work in progress

## Objective
Use the existing container-bound `API Report_PM2.5` spreadsheet and script for scheduled, bounded upstream collection. All production widget readers should consume the stored snapshot without causing GISTDA, Open-Meteo, ThaiWater or other upstream fetches. The 432×40 display must preserve freshness, source and missing-data distinctions.

## Verified state on 2026-10-30
- `origin/main`: ba62de4c2a59287f833d6e1eccfd777c58582322.
- The existing bound script's parent is the canonical spreadsheet; current public web app is version 37. `BackendApi.gs` at the base commit has the same SHA-256 as current live script HEAD. The repository's `Code.gs` is sanitized and differs from live source; NEVER overwrite live Code.gs with the sanitized repository copy.
- `PM25_Hourly` contains actual hourly readings. Its existing collector retains validated PM rows for 90 days. `History_Batch` mixes channels and `Water_Level_History` contains legacy/verified-backfill rows. Do not bulk delete those tabs.
- In the production widget, browser `v2/api-client.js` still calls Open-Meteo directly for hourly forecast and wind. `action=data` can call GISTDA and Open-Meteo on cache miss. Water widget reads the existing Sheet-backed `water_history` route, currently fed by two daily batches. The separate legacy `water.html`/`water.js` calls GloFAS directly; the GitHub water-data workflow also calls ThaiWater. Legacy Apps Script UI and triggers require an explicit consumer inventory.
- Owner UI showed three triggers: one `BackendApiPm25Hourly_` and two `BackendApiHistoryBatch_`. Triggers created by other accounts are not fully visible. Do not delete or replace them.

## Candidate only — not deployed
`HourlySnapshot.gs` adds a private scheduled collector, durable one-hour attempt guard, separate PM/current-weather/forecast rows, a read-only JSON/JSONP endpoint, and bounded cleanup. Valid dedicated snapshot rows for PM and weather expire after 90 days; larger forecast payloads expire after two days. Malformed, unrecognized and mixed legacy rows are never removed. The `snapshot_v1` route and `getCachedChannels` export are additive. Candidate frontend now reads this route rather than calling Open-Meteo; candidate reuses the existing PM hourly trigger for snapshot and hourly water collection, and offers an owner-gated staged legacy-route cutover. None of this is installed or deployed. Retention runs only with a successfully authorized collection invocation.

## Required before deployment
1. Complete frontend integration checks: validate time-stamped snapshot channels and remove all remaining production browser-to-provider requests, including the legacy flood page. Keep safe unavailable/stale states and original measurement time, including daylight/forecast data. Ensure the old `action=data` route and legacy consumers do not continue to cause request-driven upstream traffic after cutover.
2. Verify the candidate water collector at the requested hourly cadence; preserve station IDs, observed timestamps and non-live status. Cover legacy GloFAS and scheduled water-data workflow without breaking rollback.
3. Benchmark snapshot reads and cache safely: a flood of clients still consumes Apps Script quota; cache/edge delivery must not renew stale values. Test actual payload size, 429/backoff, repeated triggers, duplicates, partial failures, future timestamps, wrong location, retention and overlapping executions.
4. Inspect real script HEAD/deployment and available trigger inventory again, preserve owner code and a private verified backup, install only the required exact owner trigger, warm and verify the snapshot before changing readers. Handle the visibility limit on triggers from other accounts; never claim exhaustive inventory.
5. Complete independent review, all tests and CI on exact SHA. Deploy the existing bound web-app version only after full compatibility and rollback checks, and verify the live page makes zero provider-origin requests and scheduled data updates without page traffic. Do not mark this draft complete until then.
