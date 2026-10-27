# Owner-selected PM2.5 / Weather Luxury LED references

**Scope:** artistic references only, 27 Oct 2026. Production LED remains untouched. Actual live Water Level Luxury is the premium visual source of truth: fixed 432×40 layout, aligned clock, large readings, feathered scenes and glowing border.

## Environmental source collages — ONE canonical copy

| Tier | Immutable original | Native frames |
|---|---|---:|
| BLUE / ฟ้า | [blue](../locked-scene-v3/originals/11D8EEE5-F7BA-433C-B47C-8226E57F61B6.jpeg) | 12 |
| GREEN / เขียว | [green](../locked-scene-v3/originals/B813DE0D-2580-4812-82D3-B56625221C3A.jpeg) | 10 |
| YELLOW / เหลือง | [yellow](../locked-scene-v3/originals/6E2935B0-DEE8-433E-A3A0-2F248755024E.jpeg) | 10 |
| ORANGE / ส้ม | [orange](../locked-scene-v3/originals/D28AAB6C-51CB-4CC9-9D20-FDA23E0CF092.jpeg) | 10 |
| RED / แดง | [red](../locked-scene-v3/originals/EB284AA1-DC81-4739-956B-912142A5CFBC.jpeg) | 10 |

Four original collages attached AGAIN in the owner's latest message (BLUE, GREEN, YELLOW and ORANGE) have SHA-256 values identical to these existing original files. **Do not copy them again.** The fifth, RED, was already in the same canonical source folder. File hashes and native frame counts are in [reference-manifest.json](./reference-manifest.json).

Pre-cropped original tiles: `../locked-scene-v3/source_frames/<tier>/original-cell-NN.webp`.
Frame-first V1 derived preview and provenance: `../frame-first-v1/`.

## Two layout concepts — owner visual guide

- [PM2.5 Luxury full-resolution reference](./pm25-layout-preview.jpg) (1536×512): clock left, very large reading, semi-background city, compact trend on right.
- [Weather Luxury full-resolution reference](./weather-layout-preview.jpg) (1536×512): same clock anchor, very large temperature, cinematic clouds, readable forecast.

**Fidelity and provenance:** the two repository references now have the owner composition’s full 1536×512 pixel dimensions, not the old 198×66 thumbnails. These JPEGs were exported via the owner-authorized connected asset transfer and **re-encoded** by the transfer service, so their file SHA-256 is *different* from the exact user-uploaded binary. The original attachment SHA-256 and the stored JPEG SHA-256 are recorded separately in the manifest. Original owner attachments are still the byte-exact source; these repository images are high-resolution review references, not a claim of bit-for-bit source identity.

Mockup numbers are not operational data. In the illustrative PM2.5 image, 22 µg/m³ labelled “ดีมาก” is not correct under the intended Thai 2026 five-tier concentration scheme: if a verified 24h PM2.5 value, 22 belongs to GREEN/ดี. Weather sample forecast is also illustrative only.

## Reference priority and duplicate policy

1. Actual live Water Luxury component/CSS and its verified fixed-clock geometry.
2. Owner PM and Weather mockups for composition and premium style, not measurements.
3. Canonical five original collages for natural sky, water reflection, haze and light progression.
4. Verified API/Sheet data contract and official Thai public-health classification for numerical data.

Do not re-introduce the rejected bird/leaf/small-particle procedural overlays. Historic `../locked-scene-v3/effects/` outputs contain some exact duplicate atlases but are referenced by old manifest/tests; do NOT delete them in a reference-only task. Delete only unnecessary *new* copies or separately audit every downstream dependency before pruning historical files.

**Future agent rule:** look here FIRST; compare original SHA-256 before importing. Identical bytes -> reuse canonical path rather than duplicate. Do not create thumbnail copies of the full-size references. Historical sprite atlases were NOT deleted, as they are referenced by previous manifests/tests.
