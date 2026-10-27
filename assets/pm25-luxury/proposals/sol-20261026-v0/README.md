# PM2.5 five-tier scenic asset proposal v0

STATUS: ART REVIEW ONLY; no live/frontend/classification changes.

Isolated asset-only proposal for concurrent KiloCode engineering; do not modify Kilo hot files.

## Contents
- master-blue.webp / master-green.webp / master-yellow.webp / master-orange.webp / master-red.webp: five 1296×160 static backgrounds; no baked-in text/numbers.
- green-haze-8f.png: transparent GREEN loop prototype; 8 frames, 4 columns × 2 rows, each frame 648×80.
- manifest.json: tier colors, frames, dimensions and SHA-256 provenance.
- generate.py: deterministic procedural source with locked skyline/building layout in every scene.
- review-contact-sheet.webp: design-review image with annotations outside the master source files.

These are procedural **first-pass graphics** produced on the Mac worktree, NOT the more cinematic ImageGen concept previews shown in chat. Do not conflate source provenance or claim photoreal acceptance.

## Ownership and integration
Read-only for Kilo engineering until owner approves the look. Original KiloCode task owns JS/CSS/HTML, PM data contract, tests and all real production changes. One writer per hotspot. This PR owns only files in this proposal subdirectory.

These plates are aesthetic illustrations, NOT observed conditions, and cannot classify PM or imply health safety. Keep date/time, numeric PM, status and chart in DOM derived from verified canonical data. Check whether PM field is a true 24h average before 2026 DoH 5-tier classification.

Physical LED = 432×40. Scene source includes extra vertical art for crop control. Respect reduced-motion and missing-image static fallback. Never preload all tiers' atlases unnecessarily.

## Next design gate
Review five stills and one green 8-frame alpha strip at real LED size next to Water Luxury. Approve visual polish and tier consistency, then integrate into a demo and create the remaining four motion bands. No main merge from this proposal.
