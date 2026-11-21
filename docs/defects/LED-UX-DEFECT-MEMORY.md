# LED UX Defect Memory — historical lessons only

This is a compact engineering lessons log, NOT a second SSoT, task database, ChatGPT user memory, release register or replacement for root SESSION-HANDOFF.md. Current facts come from actual GitHub main, PR/CI and runtime.

| Evidence | Proven lesson |
| --- | --- |
| PR #102, 2026-11-13 | Physical LED Weather rain/cloud/storm needed contrast and lightning readable on the panel, not browser-only polish. |
| PR #103–104, 2026-11-13/14 | White missing-hour glyphs made PM graph distracting. Owner chose smooth visual-only connections; never create synthetic source readings. |
| PR #105, 2026-11-14 | PM area ribbons made a wavy lower edge; closed SVG area to baseline y=40 fixed the shape. |
| PR #106, 2026-11-14 | PM opacity needed progressive top-to-bottom fade while keeping the straight baseline. |
| Water public demo, 2026-11-21 | Large m MSL is technically valid but hard for the public. Percentage of ground-to-bank interval requires physical metres remaining, observed timestamp, station identity and clear disclaimer: NOT an official flood alert or probability. |

Guardrails: SIMULATED DEMO is not current data; null/unknown != zero; HISTORICAL != LIVE; external HII reference station data cannot establish whether Uthai Hospital is safe from flooding. A browser screenshot is not physical LED verification.

Use root SESSION-HANDOFF.md for current continuity and GitHub PR/CI/runtime for current facts. This file is evidence/defect memory only.
