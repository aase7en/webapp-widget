# WO — Audit ten canonical Sheet tabs and 365-day data retention

Owner request: 2026-11-21. One operational Sheet only: API Report_PM2.5, ID 1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w. Repo: aase7en/webapp-widget.

## Live tab audit, 2026-11-21 Asia/Bangkok

| Tab | Data rows | Assessment |
| --- | ---: | --- |
| Settings | 5 | KEEP: active config |
| Locations | 1 | KEEP: identity and coordinates |
| API_Sources | 2 | KEEP: provider metadata |
| Charts | 1 note | KEEP: charts generated from History_Batch |
| History_Batch | 73 | KEEP: scheduled morning/evening history and chart source |
| PM25_Hourly | 340 | KEEP: observed PM history and browser fallback |
| Water_Level_History | 860 | KEEP: HII HDA004 and S5 including protected backfill |
| Widget_Hourly_Snapshots | 822 | KEEP: PM 517, weather 278, forecast 27; 262 repeated channel+observed_at combinations may be legitimate repeat captures with different saved_at |
| ชีต1 | 17 | LEGACY CANDIDATE: last recorded 2026-10-17; Code.gs main() reference and one embedded chart |
| ชีต2 | 990 | LEGACY CANDIDATE: last recorded 2026-10-16; Code.gs logGistdaData() reference; 346 rows before 2025-11-21 |

No exact duplicated batch IDs, PM hourly observed stamps or Water station+observedAt pairs in inspected ranges. Actual deployed bound Apps Script triggers/source could NOT be verified; repo trigger-migration notes do not establish live absence. NO LIVE DELETE OR SCRIPT DEPLOY in this audit.

## Safe source candidate

- Known-owned PM25_Hourly: change existing 90-day pruning to 365 days from observedAt.
- Known-owned Water_Level_History hourly_v1: change existing 90-day pruning to 365 days from observedAt, with original schema/station/provenance guard. Backfill/unknown kept for separate review.
- History_Batch: new strictly validated 365-day Bangkok date cutoff; exactly-365-day-old rows retained; max 150 rows deleted per scheduled run, descending ranges, under existing BackendApiHistoryBatch_ lock. Default DRY_RUN; apply only with approved ScriptProperties mode and owner-verified backup timestamp.
- Widget_Hourly_Snapshots: existing 90-day PM/weather and 2-day forecast cap stays, already below max one year. Full-year raw JSON would worsen size.
- Settings, Locations, API_Sources, Charts: no automatic deletion.
- Legacy ชีต1, ชีต2: keep pending exact live trigger inventory, dependents, backup and explicit destructive approval.

## Production release gate (NOT SATISFIED)

Verify actual bound script project/deployment/triggers and rollback; export and restore-test a timestamped backup of all ten tabs/charts; deploy reviewed candidate with owner approval; run private widgetRetentionPreview_() for eligible/protected counts; only then set widget_retention_mode_v1=APPROVED_AFTER_BACKUP and widget_retention_backup_verified_at_v1 to verified UTC ISO. Existing history trigger performs automatic guarded pruning after opt-in; no extra trigger or source. Validate live row counts and PM/Water sources afterward. No unknown/manual rows removed. A one-year hard cap cannot be guaranteed for unaudited legacy/backfill data.

Worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-retention-audit-20261121, branch feat/widget-sheet-retention-audit-20261121, base main 7359c928198d84efbd6fb5361d48ecc87eb7c3ac. Original Mac weather checkout dirty/untracked remains protected. Human approval required for live destructive/deployment actions.
