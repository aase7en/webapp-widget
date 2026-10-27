# WO-PM25-LOCKED-SCENE-MOTION-V4-20261027

Status: DEMO FIX. No production / backend modification approved.
Owner feedback: V3 clouds/leaves/reflections imperceptible, birds resemble insects and 16 frame claim requires proof. Owner explicitly authorized the assistant to fix the entire demo.
Repo: aase7en/webapp-widget. Source branch assets/pm25-luxury-scene-proposals-20261026 at exact SHA 34cebfa9bcf81316d67742452d6158368c3d7b0f.
Isolated worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-motion-fix-20261027; branch fix/pm25-locked-scene-motion-v4-20261027. Sole writer integrator. Protected dirty root and existing visual worktree untouched. Read repo AGENTS before mutation.
Allowed paths: assets/pm25-luxury/locked-scene-v3/**, this work order, append-only SESSION-HANDOFF.md. Do not edit the live LED index, weather, Water, Apps Script, Google Sheet or other agents' branches.
Gate: SOURCE/WORKTREE VERIFIED. SAFE_TO_MUTATE_DEMO=YES; SAFE_TO_MUTATE_PRODUCTION=NO.

## Actual frame truth and root cause
Original source collages: BLUE 12 cells, GREEN/YELLOW/ORANGE/RED 10 each. The claimed 16 were authored composite animation keys, NOT 16 independent frames from the original storyboard. One geometrically locked master stays still while ten transparent layers vary.
Old clouds +/-14px and blur9/low alpha, birds 3-5px arcs, leaves 2-6px/1.6px motion, reflection 1px lines/alpha10-28. Baseline 16f adjacent RGB differences: BLUE 1.90, GREEN 1.62, YELLOW 1.38, ORANGE 1.29, RED 1.06 (average RGB intensity scale 0-255).

## Implementation and trade-offs
- Clouds: five coherent banks, ~62px drift, clear but feathered cumulus, master skyline/buildings fixed.
- Leaves: coherent nearby branch clusters rooted to foreground greenery, larger leaves and ~9.5px sweep.
- Birds: 60+px wing silhouette with head/body/tail, wing flap, one-way traverse and fade at frame seam. At physical 432x40 these are much larger than insects.
- Water: reflected horizontal bands and bright specular shimmers in lower water part, not across the sky.
- Rebuild each of five master-linked 16f composites and all transparent effect atlases. Rebuild 5 composite atlases, 5 MP4s, generate 5 per-tier 4x4 contact sheets and 1 all-tiers comparison.
- RGB difference alone is not perceptual approval; it is a deterministic guard. Chrome Canvas and actual LED-size visual inspection required. Loops must not hard jump at frame 16->1.
- Fixed original source scenes remain illustrative, never sensor photography or live readings. No fake PM values or inferred health risks. Reduced motion/static fallback retained.
- Existing video export requires ffprobe, not installed on Mac; exporter now validates via ffmpeg decode fallback, with frame count 192 per video.

## Verification
- Run python3 verify_pack.py, verify_motion.py, and create_contact_proof.py.
- Use browser to check each of five tiers loads, animated canvas hash changes, pause freezes, clouds/leaves/birds/water reflection each changes pixels, no JS errors.
- Full repo Node suite passes. Check that input originals and five master PNG/WebP hashes are unchanged from source commit. Browser screenshot and contact images kept in qa.
- Do not deploy to main. Push to Draft PR only; owner to judge visual motion on real 432x40 LED crop prior to any later integration.

## Completed deterministic and browser verification
- Actual run: full root Node suite 313/313 PASS; verify_pack.py 5/5 plus true original 12/10 crops + 16 exported WebP frames per tier; verify_motion.py 5/5 PASS with no >2.1x loop-seam jump.
- New adjacent mean RGB deltas after regenerated 16f previews: BLUE 7.43, GREEN 6.90, YELLOW 5.47, ORANGE 5.24, RED 5.04 (previously 1.90/1.62/1.38/1.29/1.06). Numbers represent composited image differences, not source PM data.
- Actual Chrome Canvas: playback changes sampled canvas hash, pause yields identical hash, toggling cloud/leaf/bird/water individually changes actual RGB with mean deltas 3.826/0.9853/0.2973/2.3963; no uncaught JS exception. Screenshot on Mac /tmp/uth-pm25-v4-green-browser.png. Each click still uses authored frame atlas; proof photos in qa folder.
- ffmpeg decoded/verified 192 frames at 30fps and 1296x120 for each of five MP4 exports. Five user original collages and all five master images are byte-unchanged per git check.
- Independent read-only code review by separate external coding model returned PASS for 16-frame integrity, moving cloud/leaves/birds/water, reduced motion and no backend effect. This is code review, NOT owner visual signoff.
- Current stage: candidate DEMO COMPLETE. Original Work Order prohibits production. Next action is owner review using Demo URL and Contact Sheet; high-end LED physical subjective acceptance remains pending.
