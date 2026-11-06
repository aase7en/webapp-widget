# Shared AI Agent Instructions

## Prompt placement pointer

When handing a prompt/instruction to the user for another AI agent, session, Goal, CLI, or UI surface, follow the canonical protocol in `aase7en/A-Wiki:docs/protocols/prompt-placement-protocol.md`.

Before the prompt/instruction, state the exact `PLACEMENT`, `MODE`, `PURPOSE`, whether it replaces/appends/interrupts/queues, and `WHEN TO SEND`.

This pointer does not create task authority or override repository-specific safety, Git, review, or continuity rules.

## UTH[AI] widget backend — standing source-of-truth contract (2026-10-22)

- This repository is **webapp-widget**, NOT `env-wastewater-webapp`.
- **One canonical Google Spreadsheet for all widget data:** existing `API Report_PM2.5` (ID `1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w`). Use its existing tabs including `Water_Level_History` and **the Apps Script already bound to it**. Never create a separate Google Sheet or standalone Apps Script for widget data without the owner's explicit new instruction.
- Do not install the superseded standalone water prototype from closed PR #18; its separate Sheet was deleted. Existing GitHub `water-data` is a temporary data-transport fallback pending verified migration, not a separate canonical Google backend.
- Keep `observed_at` separate from `fetched_at` and storage timestamps; distinguish measured/current, old/historical, simulated and unavailable. Never convert missing to zero or use historical station values as live flood safety claims.
- For changing sessions, read tracked `SESSION-HANDOFF.md` and, when requested, use `.agents/skills/handoff/SKILL.md` to update that **single handoff file** after source-of-truth verification. Local dirty state belongs to its owner and must not be overwritten.

## Weather redesign and shared hourly data — 2026-10-30

- For continuation, read `SESSION-HANDOFF.md` and `docs/weather-design/WEATHER-DESIGN-HANDOFF.md`, including the saved concept and owner reference. Recheck Git, PR #67, Sheet, Apps Script and deployment status; a handoff is not live-state evidence.
- The owner approved the Weather visual direction, not finished animation or a production deployment. Produce a true 432 × 40 demo, verify readable data and motion, and preserve other worktrees and the existing single-Sheet contract. Keep simulated values distinguishable from real data.
