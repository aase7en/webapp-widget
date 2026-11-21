# Multi-Site Adoption Plan — Environmental LED Widget

**Status: PROPOSAL ONLY, not implemented in v1.0.0**
**Baseline:** aase7en/webapp-widget, production Water percent release from PR #109, merge SHA 33926944e3535f7e7fae14ac4584f60de01e4b29.
**Reviewed:** 21 November 2026 (Asia/Bangkok). This plan does not authorize a rewrite, new production backend, a new canonical Sheet or automated deployments.

## 1. Problem / goal

The current static LED visual experience (PM2.5, Weather, Water) is tailored to Uthai Hospital, Thailand. Other hospitals or communities might reuse the presentation, but cannot safely just replace URLs: the existing client hardcodes the Uthai location, canonical bound Apps Script and two HII water station identifiers, and validates a fixed payload contract. Providers differ in units, geographic coverage, timestamps, quality, licensing and flood datum. Replacing a hardcoded endpoint without validation can silently display unrelated measurements as local.

**Goal:** an opt-in, maintainable Site Profile + Provider Adapter layer, retaining the proven three-page UI, original animation/graph, static output and explicit data status. Reuse existing application; avoid an unnecessary framework rewrite or multi-tenant cloud backend by default.

## 2. Verified v1.0.0 state

- Frontend: GitHub Pages static hosting; 432×40 LED within larger display, rotating PM2.5 / Weather / Water.
- Current API client: v2/api-client.js calls hardcoded, owner-bound Apps Script water_history and snapshot_v1 routes from one canonical Sheet called API Report_PM2.5. Station mapping HDA004 → 471583 and S5 → 2607. This is safe to preserve for Uthai, not a general external URL-input field.
- PM source: GISTDA regional measurements; weather source: Open-Meteo forecast model; water source: HII/ThaiWater reference stations. All are mediated through the validated current Sheet/Apps Script contract, not direct arbitrary browser fetches.
- Data semantics: observedAt differs from fetchedAt/savedAt. LATEST / HISTORICAL / MODEL / SIMULATED / UNAVAILABLE need explicit domain-specific status and labels; null does not become zero.
- Water display: percent of ground-reference-to-lowest-bank MSL elevation interval with remaining metres, NOT percent flood probability, bank overtopping forecast, hospital risk or official emergency decision. The original level MSL remains available in an accessibility label.

## 3. Proposed layered architecture

~~~text
Local Site Profile (selected by deployment, NOT user-supplied URL)
        │ siteId, lat/lon, language, timezone, station references
        │ provider names, trust policies, brand/logo permissions
        ▼
Source Adapter per data category
        │ GISTDA / other approved PM provider
        │ Open-Meteo / other weather model
        │ HII / other authorized hydrology provider
        ▼
Validated normalized data contracts / provenance / time checks
        │ Observed value ≠ model forecast ≠ historical snapshot
        ▼
Existing three-page Widget UI + 432×40 + fallback
        ▼
Static site / hospital kiosk
~~~

**Key decision:** configuration declares *which trusted adapter* to use, never accepts a free-form unreviewed URL or arbitrary code in a public browser. API credentials belong in a trusted collector or existing approved service, not JavaScript/HTML. Support single-site deploys first, then evaluate whether a central multi-tenant service is justified.

## 4. Proposed Site Profile contract (illustration, not operational config)

~~~json
{
  "schemaVersion": 1,
  "siteId": "example-hospital",
  "displayName": "Example Hospital",
  "locale": "th-TH",
  "timezone": "Asia/Bangkok",
  "location": { "latitude": null, "longitude": null },
  "display": { "width": 432, "height": 40, "modules": ["pm25", "weather", "water"] },
  "providers": {
    "pm25": { "adapter": "approved-pm-source", "station": null },
    "weather": { "adapter": "approved-model-source", "coordinateProfile": "site" },
    "water": { "adapter": "approved-water-source", "stations": [] }
  },
  "safety": { "siteFloodRiskDetermination": "unavailable" }
}
~~~

The example has intentionally missing location/station details. **Do not publish it as an actual hospital configuration or silently default missing data to Uthai values.**

Validation rules: unique siteId, bounded/valid geo coordinates, IANA timezone, allowed locale, exact known adapter identifiers, site-approved stations and their geographic relationships; optional modules remain UNAVAILABLE rather than inventing readings; branding assets only where reuse rights are verified.

## 5. Proposed provider data contracts

| Module | Normalized fields | Required quality gates |
| --- | --- | --- |
| PM2.5 | value, unit, period, observedAt, station/coverage area, source, status, avg24h when verified | Unit µg/m³; hourly value distinct from 24h average; no fabricated hourly health classifications |
| Weather | temperatureC, humidityPct, weatherCode, observedAt, forecast issuedAt/validAt, model/source, status | Model forecast must never be called a sensor observation; timezone-aware forecast; missing rainfall remains null |
| Water | levelMsl, groundMsl, bankM, observedAt, stationId, stationLabel, datum, source, status, verified history | Compatible vertical datum; validate bank > ground; station identity; timestamp alignment; no public arrow with duplicate/conflicting history; no official flood alarm from percent |

For all modules, carry **source provenance, data period, observedAt, fetchedAt, savedAt, freshness window, data quality flag, last verified timestamp and unavailable reasons**. Distinguish VERIFIED OBSERVATION, LATEST AVAILABLE, HISTORICAL, DERIVED, MODEL, SIMULATED and UNAVAILABLE at every source-to-render boundary.

### Risk/safety semantics

- A remote water station's percentage against its bank is a local geometric reference, not a forecast, a probability, a general river-capacity percentage or an official risk tier.
- No automated emergency/evacuation instruction. If a future site wishes to display official alerts, create a separately reviewed first-party authority adapter with its own expiry and jurisdiction, not a color gradient derived from percentage.
- The source provider might report different vertical datums (MSL, local zero gauge, ellipsoid). Never mix level and bank from different datums or silently apply guessed offsets.

## 6. Security, reliability and operational design

1. **Source onboarding:** require owner/operator consent and provider license/terms review. Confirm published API documentation, units, rate limits, permitted redisplay and observed/fetched timestamp semantics.
2. **Trusted data ingestion:** keep API keys server-side on an approved collector, avoid hardcoded credentials in public Pages. Sanitize data and station labels, enforce HTTP allowlists and schema validation. Public static deployment gets only an approved read-only normalized payload.
3. **Per-site isolation:** separate configurations, credentials, cache namespaces, URLs and monitoring. One site's failure must not leak or overwrite another site's data. Avoid PHI, patient-level data and internal hospital network addresses.
4. **Availability and recoverability:** stale data is visibly marked historical, missing is unavailable, source failures retry with bounded backoff; keep last-known-good only within clearly labelled staleness rules. Provide one-click rollback to exact tested SHA/config.
5. **Accessibility and low-end operation:** physical 432×40 and narrow mobile readouts, keyboard/ARIA, contrast, reduced motion, animation poster fallback, intermittent network handling. Verify Canvas/3D is decorative and never the only communication channel.
6. **Observability:** track per-source fetch successes/failures, data freshness, selected adapter/site config revision, number of unavailable widgets, asset version and deploy SHA. Do not log secrets or private hospital operational data.
7. **Data contracts and tests:** schema validation + sample fixtures for all statuses and site-specific units; verify no cross-site data bleed; exact provider timestamps and datum compatibility; test clock/timezone around midnight and daylight-saving locales.

## 7. Incremental implementation plan (separate future Work Orders)

| Phase | Deliverable | Gate |
| --- | --- | --- |
| 0 — Contract inventory | Audit all hardcoded Uthai identities, provider routes, CSS/asset assumptions, licenses | Verified source schema + site ownership, no Production mutation |
| 1 — Site Profile | Typed config schema + Uthai profile as regression baseline; explicit unknown values | Uthai screenshots/behavior and data contract byte-equivalent |
| 2 — Provider Adapter | Trusted adapters behind existing UthApiClient contracts; fixture and error tests | Security review, valid units, origin/terms, no fake observations |
| 3 — Second-site pilot | Single additional non-production example with consenting organization and approved station data | Independent QA all 3 modules, site owner validation and no Uthai data leakage |
| 4 — Packaging | Document deployment/config, per-site release/version/rollback, optional site profile selector | License cleared, deployment reproducible, owner sign-off |
| 5 — General availability | Migration guide + stable documented extension interface | Independent production pilots, support/maintenance ownership |

**Version intention (not a promised shipped feature):** v1.0.0 is Uthai single-site. A later backwards-compatible release can introduce a profile abstraction; publish multi-site only after pilots and contract/security verification. A major version may be warranted if existing API assumptions change incompatibly. Version numbers alone do not grant multi-site capability.

## 8. Adoption readiness and licensing decisions

Before inviting other hospitals to fork/deploy publicly, explicitly decide and document:
- Software copyright ownership and LICENSE text (currently not verified as present on inspected main); do **not** infer an open-source license simply because GitHub is public.
- Redistribution rights for 2.5D artwork, hospital photographs, provider logos and third-party data; new adopter must replace institution-specific branding where required.
- Data-processing obligations, attribution, rate limits and permission to republish provider data.
- Site governance: who confirms coordinates/stations, health messaging, operator contact, stale/fault alerts, source outages and on-site viewing/maintenance.

## 9. Next safe action / verification checklist

**Not implemented:** no dynamic site switcher, arbitrary API endpoint, new remote collector or rehosted live configuration exists in this release. Existing canonical Uthai Sheet/Apps Script remains authoritative for Uthai.

Create a new approved Work Order for Phase 0, read current AGENTS.md / SESSION-HANDOFF.md / current GitHub main, and inventory hardcoded location/provider constants in actual sources. Present a minimal profile schema and two-site mock **in a separate branch**; never mutate the production backend without a security/data governance decision. Preserve one-writer-per-hotspot, exact-SHA tests, independent review and Pages verification.
