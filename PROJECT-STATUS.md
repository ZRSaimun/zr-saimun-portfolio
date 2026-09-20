# Beyond Borders — development checkpoint

## Release status
GitHub main contains the current v4 implementation. The latest tide-water globe update is committed on main; GitHub Pages deployment is handled by the repository workflow.
The latest Version 4 brief supersedes earlier overlapping requests. Open-Meteo plus a separate Cinematic Weather Studio is approved.

## Implemented locally
- Repaired missing premium stylesheet; production compilation works.
- Shared registry: 28 destinations with stable IDs, country, coordinates and photo associations.
- Country galleries, city navigation, destination search, direct chapter opening, gallery zoom and keyboard navigation.
- 61 unique uploaded photographs processed in the earlier asset pass; original photos untouched. PHOTO-AUDIT.json records excluded duplicates. Current destination galleries reference 71 photos including existing archive photos.
- Original stylised grand-tourer and red/white jet models, driving controls, collision damage, breakable displays and repair.
- Animated full-ocean globe shader with moving swell, refracted highlights and three independent tide rings.
- Sound manager with 17 bundled MP3s, gesture-based enable, volume, engine pitch and ambience selection.
- Open-Meteo request flow, 15-minute destination cache, local observation time, timeout and clearly labelled simulated fallback.
- 15 cinematic preset selections, basic palette/fog/particle responses, snow-density slider and graphics quality control.
- Responsive CSS and image-containment changes. These have not yet passed visual QA.

## Executed verification
`node tools/check-project.mjs` passes: destination IDs/coordinates, media paths, per-city duplicate paths, WMO condition mapping, 15 preset entries, local HTML asset paths, all JS syntax and decoding all 17 MP3 files.
`npm run build -- --base=/zr-saimun-portfolio/` passes. JavaScript bundle remains large (about 623 KB uncompressed); code splitting/lazy scene loading is still required.

## Blocked verification
No installed browser was available. Playwright's Chromium download was blocked by environment network policy. No browser visual, audio playback, touch, end-to-end, FPS, memory, accessibility or live weather network test has passed. Do not describe the site as fully tested.

## Remaining work against the complete brief
- Real browser integration/visual QA, mobile overlap fixes and error checks are the immediate priority.
- Current car/jet/environment are stylised procedural models, not photorealistic assets or a licensed Aston Martin model; the tide globe is now a higher-fidelity water treatment.
- Presets are initial approximations: aurora ribbons, star field, layered snow with accumulation, wind gusts, cloud system, smooth weather blending and destination-specific architecture remain incomplete.
- No separate music/effects buses or music track are included yet. Recent Pixabay uploads are not copied locally; some existing audio provenance needs confirmation (AUDIO-SOURCES.md).
- Complete no-WebGL fallback, flight reset/pause/camera modes and full regression coverage remain to be tested/improved.
- Full physical collision fidelity, spatial attenuation, professional content/source revalidation and image deduplication across all non-gallery sections remain pending.
- Open-Meteo production-use/licensing suitability needs confirmation before commercial release. No API key should be committed to this static website.
- Optional VR deferred. No promise of literal physical 4D/5D.

## Reproduce / preview
1. `npm ci`
2. `npm run dev -- --host 127.0.0.1` (localhost preview)
3. `node tools/check-project.mjs` (requires ffmpeg)
4. `npm run build -- --base=/zr-saimun-portfolio/`
5. Serve the build at `/zr-saimun-portfolio/` for final project-path testing.

## Recovery
The original git history is unchanged. A full pre-v4 working-file archive was created at `../portfolio-before-v4.tar.gz`, excluding dependencies/build/git metadata. Restore into a separate folder to compare; do not overwrite the current worktree. Production publication requires separate explicit approval.
