# UTH Widget LED Design System — observed production tokens and demo boundary

Audit date 2026-11-21, widget GitHub main 6b4111ec5413983ece25788a074dc3e7e9c2b95b. This records evidence from CSS and known layout, not a replacement for source code or permission to release.

## Production visual baseline
- LED native output 432x40 px within a larger 432x288 device. Water luxury board logical 1296x120 px scales to one-third. Root rotates PM2.5, Weather and Water.
- Water CSS source v2/water-luxury-live.css: --bg #050d1f, --panel #08182e, --line rgba(96,210,255,.5), --glow #55d7ff, --text #ecf7ff, --muted #9cc9df. Typography Inter / system-ui / Segoe UI fallback.
- Dark-glass/cyan rim is decorative; avoid losing measured-value contrast or hiding labels behind animation. Reduced Motion, valid accessible names, native 432x40 QA and mobile responsive reading remain mandatory.

## Water percent public-readability proposal — PREVIEW ONLY
- Main number: percent of ground-to-lowest-bank reference MSL interval, never official flood probability, capacity or sluice-opening percentage.
- Secondary number: plain-language below/at/above-bank distance in METRES. Station name, source and observed time remain visible or accessible. Retain m MSL for staff detail after implementation.
- Default two stations, optional single station focus. Teal/blue glow does not establish a warning category; no invented threshold. Historical/UNAVAILABLE != LIVE or normal.
- Static SIMULATED preview: https://aase7en.github.io/uth-weather-led-ab-preview-20261104/water-bank-clarity-20261121/ . Not connected to production data or authorized for Production deployment.

## Sources and verification
Check AGENTS.md, README.md, docs/readme/VERSIONS.md, SESSION-HANDOFF.md, docs/work-orders/WO-WATER-PUBLIC-PERCENT-20261121.md and real JS/CSS. Current GitHub/runtime outranks this design summary. Browser QA at 432x40 and physical LED observation are distinct gates.
