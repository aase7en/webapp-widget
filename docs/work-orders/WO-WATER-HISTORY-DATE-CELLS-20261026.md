# WO-WATER-HISTORY-DATE-CELLS-20261026 — Restore canonical Water Level history reader

**Project:** aase7en/webapp-widget (NOT ENV wastewater)
**Owner:** SOL integrator, candidate-only native source/test author
**Current scope:** proposal and isolated candidate, NOT deployed to the bound Apps Script
**Canonical backend:** existing API Report_PM2.5 spreadsheet with container-bound Google Apps Script; reuse Water_Level_History. Never create a second Sheet or Script.

## Read-only incident evidence (2026-10-26 Asia/Bangkok)
- Source spreadsheet ID confirmed in AGENTS.md, metadata title API Report_PM2.5, Water_Level_History 18 columns and 18 headers. Settings hour slots: 06, 16 BKK.
- The header observed_at_th is column I. Rows I2:I3 (verified backfill) had Sheets effectiveValue.stringValue; newer automatically written rows I6:I7 and I14:I17 had DATE_TIME effectiveValue.numberValue / format yyyy-mm-dd h:mm. Google Apps Script getValues() returns JavaScript Date for typed date cells.
- Existing repo apps-script/WaterHistory.gs read_ rejected all non-string column I values with typeof r[8] !== 'string'; obs_ rejected non-string as well. The dedupe key on sync_ used String(r[8]), which formats Date differently from the canonical upstream timestamp and could append duplicate readings after the next scheduled run.
- Prior verified public fixed Web App action=water_history produced missing station statuses / only two trend points although canonical Sheet held newer valid station measurements. The reader type mismatch matches this symptom. **This is a source/code mismatch diagnosis, not confirmation of exact deployed Apps Script version.** Do not claim provider 429 or alter trigger based on it.
- Additional safety hazard: existing read_ derived risk (critical, watch, below_watch) from bank level and a hardcoded -0.5m threshold. These are NOT hospital-approved flood warnings. Candidate preserves unassessed irrespective of station level pending a separate approved threshold contract.

## Candidate changed scope
- apps-script/WaterHistory.gs: normalize valid JS Date cells to Asia/Bangkok yyyy-MM-dd HH:mm before strict timestamp validation; preserve string support; reject invalid Date / unknown and null. Reuse normalizer for history and idempotent sync dedupe. No new upstream requests, schedulers, tabs, deployments or operational numbers.
- tests/water-history-sheet.test.cjs: mixed text/Date regression, source timestamps, backfill/live distinction, idempotency after Google Sheets typed-Date conversion, null/unknown and risk unassessed.
- This Work Order: risk, evidence and cutover gate only.

## Mutation boundary
**ALLOWED:** independent clean candidate branch/source/tests/docs. **FORBIDDEN:** edits to the running container-bound Script, its deployment, Settings trigger, Google Sheet data, v2 production UI, legacy transport cache, PM2.5/Weather code, other dirty worktrees, secrets, data/raw.

## Before Production
1. Freeze exact candidate SHA and inspect diff, run full/relevant tests.
2. Independently review Date/Bangkok timezone handling, especially GAS runtime getValues() and Date representations, preserve data classification and dedupe idempotency.
3. Reverify active Apps Script project, current HEAD, fixed deployment ID, deployed version, installed trigger list, and source diff; snapshot/backup before any release. No automatic hot swap.
4. Deploy reviewed fix only by authorized safe update to the SAME bound Script and intended existing fixed deployment. Do not create new Script or change triggers.
5. Read public action=water_history, verify HDA004 and S5 return the newest valid observed timestamps, non-zero truth (including legitimate zero when measured), at least two actual historical points, and allowed status. Check time/freshness, network failure and 429.
6. Validate client adapter + chart in 432x40 and desktop; check unknown/unapproved risk remains neutral. Only then independently gate Live Water LED deployment and offer owner a visual A/B choice and rollback.
7. Roll back safely to previous script/deployment if validation fails; do not replace historical rows.

## Current state and next safe action
Candidate preparation/test only. **SAFE_TO_DEPLOY_TO_PRODUCTION = NO** until authorized review and live deployment verification. One next safe action: have an independent read-only reviewer assess frozen candidate and bound GAS discrepancy, without changing the live script.
