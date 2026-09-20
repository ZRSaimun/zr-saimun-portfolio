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


## Integrated Version 4.0 release checkpoint — 20 September 2026

### Current branch
- Development branch: `release/v4-cinematic-world`
- Live production remains on `main`; do not merge or publish until the integrated release passes browser, mobile, audio and performance checks.

### Implemented on the release branch
- Textured Earth globe retained; animated ocean-only tidal overlay with moving current, reflective highlights and exaggerated cinematic bulge.
- Original civilian helicopter model with main/tail rotors, cockpit glass, lights and destination travel controls.
- Destination portals with proximity glow and arrival transition.
- Destination profiles change world lighting, ground, trees, asphalt, exposure and weather behaviour.
- Photo chapter action: “Enter [city] road scene” returns to that destination’s drive scene.
- Gallery handling for unavailable photographs and hidden broken thumbnails.
- Layered procedural trees, road guardrails and warm street lighting.

### Verified
- `npm run build -- --base=/zr-saimun-portfolio/` passes.
- `node tools/check-project.mjs` passes: 28 destinations, 71 photo references, 15 weather presets, 17 decodable MP3 files, asset paths and JavaScript syntax.

### Still required before publishing Version 4.0
- Browser visual QA on WebGL-capable desktop and real mobile device.
- Confirm helicopter flight handling, touch controls and camera modes.
- Confirm audio unlock, looping ambience, effects and volume controls on iOS/Safari.
- Test every destination portal and photo chapter end-to-end.
- Improve destination scenes beyond the shared procedural environment where verified assets exist.
- Performance/FPS/memory checks, reduced motion, keyboard navigation and no-WebGL fallback.
- Review uploaded image additions before adding them to the authoritative photo registry.

### Important boundaries
- Use original assets and legally licensed/open map data; do not copy GTA, Asphalt 9, Google Maps or military helicopter assets.
- Do not claim literal 4D/5D or live weather when the scene is cinematic simulation.
