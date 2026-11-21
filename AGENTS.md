## Current owner decision — measured data freshness 6 hours (2026-11-21)

- For both PM2.5 and Water, use the latest VERIFIED Google Sheet observation for up to 6h measured from original observedAt; at >6h show — and ข้อมูลเก่าเกิน 6 ชม.; missing remains unavailable and never 0. This supersedes older 3h display rules, but does not alter Weather model freshness (3h).
- Same canonical Sheet API Report_PM2.5 and bound Apps Script remain operational. Browser PM can recover the hourly value from validated existing pm25_history for age 3–6h if the unchanged bound Apps Script snapshot filters after 3h; do not invent 24h averages/health tier. Water browser reclassifies via observedAt from verified Sheet station payload. No direct new provider APIs, Sheet creation, or source/trigger edits.
- This UI hotfix does NOT mean the bound Apps Script's internal 3h status policy has been deployed or changed. Backend alignment requires separately authorized script deployment, verified identity/rollback. Read docs/work-orders/WO-WIDGET-SIX-HOUR-FRESHNESS-20261121.md.
- Owner protects old animation/PM chart, station datum/identity, current source provenance, accessible values, and 432x40 readability. Use isolated clean worktrees; root untracked files are not ours.

# Shared AI Agent Instructions

## Prompt placement pointer

When handing a prompt/instruction to the user for another AI agent, session, Goal, CLI, or UI surface, follow the canonical protocol in `aase7en/A-Wiki:docs/protocols/prompt-placement-protocol.md`.

Before the prompt/instruction, state the exact `PLACEMENT`, `MODE`, `PURPOSE`, whether it replaces/appends/interrupts/queues, and `WHEN TO SEND`.

This pointer does not create task authority or override repository-specific safety, Git, review, or continuity rules.

## Repository current-state and water public-readability routing (2026-11-21)

- Source of Truth order: actual Git/repo/runtime → GitHub main/PR/CI/Pages → source/test → tracked handoff → chat/memory. Never treat archival README/Handoff as the active task by itself.
- For project context, read README.md, docs/readme/VERSIONS.md, docs/DESIGN-SYSTEM.md and root SESSION-HANDOFF.md; use docs/work-orders/WO-WATER-PUBLIC-PERCENT-20261121.md for the public Water Level proposal. The historical UI lessons log docs/defects/LED-UX-DEFECT-MEMORY.md is non-authoritative memory, not a parallel SSoT.
- There is one canonical tracked handoff file: SESSION-HANDOFF.md. The file AGENT.md (singular) and a separate persistent agent memory registry are not present on audited main; do not create competing sources just to satisfy a filename.
- Water percentage design WAS accepted and deployed to widget Production via PR #109, merged main SHA 33926944e3535f7e7fae14ac4584f60de01e4b29. Preserve original Water 2.5D animation/graph and real canonical UthApiClient, never substitute DEMO fixtures. Existing Water is single-site Uthai; configurable provider adapters and site profiles are a FUTURE PLAN ONLY, see docs/architecture/MULTI-SITE-ADOPTION-PLAN.md. VERSION and CHANGELOG.md are product-version authority, not cache key IDs.
- Water percent formula = (levelMsl-groundMsl)/(bankM-groundMsl)×100 using verified same-datum MSL and positive interval; read along with remaining vertical metres to lowest bank, station identity and observed time. This is NOT flood probability, a river-capacity measure, warning/evacuation instruction, or evidence that the hospital is safe. No invented threshold, stale-as-live or missing-as-zero.
- Root/main checkout may contain unknown dirty work; use separately owned clean worktrees and protect ongoing PRs. Before release require exact-SHA review, tests, CI, Pages and HTTP checks. Keep SIMULATED vs LATEST/HISTORICAL/UNAVAILABLE separate.

## UTH[AI] widget backend — standing source-of-truth contract (2026-10-22)

- This repository is **webapp-widget**, NOT `env-wastewater-webapp`.
- **One canonical Google Spreadsheet for all widget data:** existing `API Report_PM2.5` (ID `1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w`). Use its existing tabs including `Water_Level_History` and **the Apps Script already bound to it**. Never create a separate Google Sheet or standalone Apps Script for widget data without the owner's explicit new instruction.
- Do not install the superseded standalone water prototype from closed PR #18; its separate Sheet was deleted. Existing GitHub `water-data` is a temporary data-transport fallback pending verified migration, not a separate canonical Google backend.
- Keep `observed_at` separate from `fetched_at` and storage timestamps; distinguish measured/current, old/historical, simulated and unavailable. Never convert missing to zero or use historical station values as live flood safety claims.
- For changing sessions, read tracked `SESSION-HANDOFF.md` and, when requested, use `.agents/skills/handoff/SKILL.md` to update that **single handoff file** after source-of-truth verification. Local dirty state belongs to its owner and must not be overwritten.
