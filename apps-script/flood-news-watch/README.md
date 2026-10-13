# Uthai Flood News Watch (separate Apps Script)

This code belongs to a NEW standalone Google Apps Script project, not `API Report_PM2.5`. The public repository includes a placeholder `__PRIVATE_SHEET_ID__`; only the authorized hospital-owned private copy under `L:\My Drive\A-Wiki-Data\hospital-uthai\flood-news-watch\source` includes the actual Sheet ID. Never publish that private source or credentials.

The linked private Sheet contains `ระดับน้ำ`, `ข่าวและประกาศ`, `ทะเบียนแหล่งข่าว`, `บันทึกการทำงาน` and `คู่มือ`. The water sheet captures modelled GloFAS river discharge (m³/s) rather than verified local water-level readings (m). River mapping has NOT been verified. Hospital flood risk remains UNAVAILABLE/blank, not LOW/SAFE. No public warnings or LED integration.

The news registry ranks sources Uthai district (priority 1), Ayutthaya province (priority 2), and neighboring provinces (priority 3). All news sources default to NOT enabled. Only a row with an approved authorized HTTPS RSS/Atom URL plus `APPROVED_RSS`, `APPROVED`, `YES` may be fetched. Facebook/TikTok pages (including ที่นี่อุทัย) are REGISTERED for later permission review, not scraped. Headlines require human verification. No Gemini/OpenRouter calls are enabled in this release; API rights/keys and third-party data/privacy terms remain unapproved.

Start safely: in the script editor run `dryRunWatch` and authorize, inspect its result. Then run `runWatch` once and verify Sheet rows/source labels and the run log. Only after this succeeds run `installThirtyMinuteTrigger` once, which is idempotent and changes triggers ONLY in this separate script. Rollback is `disableWatchTrigger`. Do not use `createDailyTrigger` from the legacy PM2.5 project.

Provenance: Open-Meteo Flood API https://open-meteo.com/en/docs/flood-api and CC BY 4.0. No official Thai station/vertical datum or threshold has been connected. An absent news cue NEVER means no flood. No credentials in Git, HTML, Sheet or logs.
