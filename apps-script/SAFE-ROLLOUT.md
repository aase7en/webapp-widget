# Safe Apps Script repair and release — hospital LED

**Production has NOT been modified.** Source under `apps-script/` is a versioned candidate, not a direct deployment to Google Apps Script.

## Verified problem

Execution `main`, 9 October 2026 06:41:13 Asia/Bangkok, logged:
`Failed to import data to spreadsheet: Cannot read properties of undefined (reading 'pm10')`.

The previous code accessed `global.data.iaqi.pm10.v` without guarding the nested object. The precise error text `reading pm10` indicates `global.data.iaqi` was undefined in that execution; it does **not** prove a numeric PM10 value alone was absent. It swallowed errors in `main()`, so Executions could show **Completed** even when `ชีต1` was not written.

## Minimal hotfix strategy

Choose this instead of wholesale replacement if live Apps Script contains additional functions, triggers, or dependencies not represented in the GitHub snapshot:

1. In live `importDataToSpreadsheet(airData)`, validate PM2.5 from GISTDA independently of WAQI PM10. Optional WAQI data access must be guarded, e.g. `airData?.global?.data?.iaqi?.pm10?.v`.
2. WAQI `iaqi.pm10.v` is an air-quality *subindex*, not verified concentration in `µg/m³`. Leave the PM10 concentration cell **blank** until a true concentration source is established. A missing value is not zero. Preserve PM2.5=0 if genuinely returned.
3. If actual live `main()` catches errors, log and **rethrow** on failure, so Apps Script Executions reports a failed run. Avoid swallowing provider or spreadsheet failures.
4. Never run `createDailyTrigger()` for this hotfix; trigger configuration is an unrelated production mutation.
5. For the legacy Widget front end, ensure an API refresh failure shows **ไม่มีข้อมูลล่าสุด** and resets any previous reassuring colour/value.

The PR versioned `Code.gs` implements a GISTDA-only alternative and independent mocked tests. **Do not replace the entire live `Code.gs` from the PR without a full live-source comparison.** The repo and project code may diverge.

## Release safety gate

1. Read the **actual live** Apps Script Code.gs, HTML, appsscript.json, triggers and current deployment IDs; compare against GitHub branch.
2. Back up the current source and record existing Web App deployment version/ID in a private location, **not** public GitHub (legacy code contains credentials).
3. Prepare a tiny scoped patch; review diff and test mocked runtime. Verify exact `ชีต1` and `ชีต2` schema and dependencies.
4. Only after verifying the effect and backing up the spreadsheet, deliberately run `main()` **once**, then check one new `ชีต1` row: PM2.5 24-hour numeric value, missing PM10 blank, no `NaN`.
5. Remember that time-based **HEAD triggers can execute changed source immediately**, independently of `/exec` Web App version deployment.
6. If a Web App change is needed, use **Manage deployments → Edit existing deployment → New version**, preserving the current `/exec` URL.
7. Smoke-test `https://aase7en.github.io/webapp-widget/`, direct Apps Script URL, 432×40 px display, missing data and reconnection.
8. Roll back the source or deployment version immediately if critical public data is incorrect; verify after rollback.

## Current access limits

The connected Google Drive integration can retrieve Apps Script *file metadata* but direct native source read was rejected with HTTP 403; no authenticated `clasp`/Apps Script API session was found on the connected Mac. **No live Apps Script edit or Sheet mutation has been performed.** Use a properly authorized OAuth workflow before deployment; never paste passwords or API keys into chat.

## Evidence

`node --test tests/*.test.cjs` covers missing PM10, zero, NaN, provider error, Sheets append error, trigger isolation and legacy Widget refresh stale reset. Passing mocked tests **does not** prove a successful production Sheet write.

## Prepared minimal production hotfix (2026-10-09)

The separate [`LIVE-HOTFIX-CANDIDATE.gs`](LIVE-HOTFIX-CANDIDATE.gs) is a
**reference patch**, not a new app entry point and not an automatically
deployed Apps Script source file.

**Scope of the user-provided original `Code.gs` only:**

- REPLACE the *existing* live `main()` with the version in the candidate,
  so `main` fetches GISTDA independently instead of requiring WAQI
  `global.data.iaqi`, and throws after logging failed writes.
- REPLACE the *existing* live `importDataToSpreadsheet(airData)`.
  This preserves the five columns in `ชีต1`, writes legitimate numerical
  zero, blanks unavailable AQI and PM10 concentration, and avoids deleting
  historical rows during a hotfix.
- ADD new helpers `optionalPM25_()` and `gistdaForMain_()` once.
- **DO NOT** add the candidate .gs alongside the existing live `Code.gs`
  without removing/replacing the duplicate function definitions.
- **DO NOT** change existing `doGet`, `getWidgetData`, `logGistdaData`,
  `logPm25ToSheet2`, web app deployment, triggers, or secrets in this patch.
  `logGistdaData` is a distinct independently operating handler; review
  later, after confirming the primary sheet repair.
- Preserve `CONFIG.SPREADSHEET_ID` and `CONFIG.API_ENDPOINTS.GISTDA_AIR`
  in the private live source; **do not copy public/expired WAQI or LINE tokens
  into the new patch**.

**Proof before writing live:** the user's Execution screenshot at
2026-10-09 06:41:18 explicitly logged
`Cannot read properties of undefined (reading 'pm10')`;
the user's historical `Code.gs` contains the unguarded
`global.data.iaqi.pm10.v` expression. The failure is caused by
accessing `pm10` through an absent `iaqi` object; a missing PM10 mass
concentration must be blank, not zero.

**Live gate:** retrieve the actual source and its deployment identifier,
compare it with the user-provided historical script, then back up privately
before surgically applying the patch. Test the functions with mocks, compare
the resulting patch to the live source, and perform a supervised single
`main` execution followed by a targeted `ชีต1` read. The scheduled HEAD
triggers may pick up edited code immediately. Stop/rollback if the resulting
data is incorrect; changing the web-app deployment version does not roll back
time-based HEAD triggers.

**Verification:** `node --test tests/live-hotfix.test.cjs` (five
deterministic tests). This does not replace a supervised real Sheet write and
cannot authorize a production deployment by itself.
