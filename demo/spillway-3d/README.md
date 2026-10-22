# UTH Spillway Demo (simulation)

Standalone interactive Three.js WebGL scene at `/demo/spillway-3d/`. No production widget files modified. All water flow and gate movement are **SIMULATED**, not telemetry, hospital data, or evidence a physical dam is releasing water.

Uses a pinned Three.js static CDN (three@0.180.0, addons from the same pinned CDN via import map, no local vendoring, no external assets). Photoreal pass: chamfered ogee-spillway geometry with 3 gated bays, piers, hoist beam and railed walkway (merged draw calls + instanced balusters/bolts); procedural canvas albedo/roughness textures (wet concrete, brushed steel); layered GLSL water — upstream reservoir with fresnel, FBM-advected gate-discharge sheets with gravity acceleration and aerated breakup, displaced plunge pool with impact foam, breaking fringe, splash particles, mist quads and ripple rings; warm sun with PCFSoft shadows and PMREM procedural environment, ACES tone mapping, subtle desktop-only bloom, atmospheric fog. Drag-orbit (OrbitControls, damped), camera presets 1/2/3, flow/pause/reset controls, adaptive pixel ratio, SVG fallback when WebGL is unavailable, static composed frame under reduced motion, draw-call-safe disposal on pagehide.

Flow slider drives discharge intensity including gate opening height. WebGL unsupported: SVG fallback. Reduced-motion: static scene (orbit still allowed). Load only this demo route; independent of 432×40 live widgets.

No changes to PM, weather, HII station data, API calls, flood risk thresholds, Apps Script, or the main homepage.
