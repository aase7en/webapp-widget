# Five-tier Atmospheric Motion - Alpha Sprite Atlas Prototype
Each master atmosphere has one transparent 8-frame RGBA haze atlas. It is 2592x224 as 4 columns x 2 rows. Each frame measures 648x112. The sprite renderer should index x by frame % 4 and y by floor(frame/4).

- See motion-manifest.json for artistic color and intensity, not sensor measurements or health thresholds.
- Per-tier GIF is REVIEW ONLY, composited from the tier's scenic LED crop plus its transparent motion layer.
- Motion generator build_motion.py can deterministically rebuild each atlas and GIF.
- Keep clock, numeric PM reading, status, source and measured timestamp as DOM text above the sprites.
- Respect reduced-motion and missing asset fallback, and render a single still scene.
- KiloCode owns rendering code and verification in a separate worktree. This branch owns assets only.
- No production use before visual acceptance, FPS/frame pacing, and LED readability QA.
- Scenic images were generated with ImageGen. Motion overlays are procedural art layers, not additional ImageGen images or real PM observations.
